from sqlalchemy.orm import Session
from fastapi import HTTPException
from decimal import Decimal

from src.shared.services.models import OrdenProduccion, Producto, Insumo, FichaTecnica, FichaTecnicaInsumo, Estado, Venta, LoteProducto, LoteCompra, UnidadMedida
from src.shared.services.notificaciones_utils import notificar_stock_insumo, notificar_stock_producto
from .schemas import OrdenCreate, OrdenUpdate


# ── Conversión de unidades ────────────────────────────────────
_CONV = {
    ("ml", "L"):   1 / 1000,
    ("L",  "ml"):  1000,
    ("g",  "kg"):  1 / 1000,
    ("kg", "g"):   1000,
    ("lb", "kg"):  0.453592,
    ("kg", "lb"):  2.20462,
    ("lb", "g"):   453.592,
    ("g",  "lb"):  1 / 453.592,
}

def _convertir(cantidad: float, desde: str, hasta: str) -> float:
    """Convierte cantidad entre unidades compatibles. Lanza HTTPException si son incompatibles."""
    desde = (desde or "").strip()
    hasta = (hasta or "").strip()
    if desde == hasta or not desde or not hasta:
        return cantidad
    factor = _CONV.get((desde, hasta))
    if factor is None:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede convertir de '{desde}' a '{hasta}'. Revisa las unidades en la ficha técnica."
        )
    return cantidad * factor


# ── FEFO: descontar lotes del que vence primero al último ────
def _descontar_fefo(db: Session, id_insumo: int, cantidad: float) -> None:
    """Descuenta `cantidad` del insumo consumiendo los lotes en orden FEFO."""
    lotes = (
        db.query(LoteCompra)
        .filter(
            LoteCompra.ID_Insumo == id_insumo,
            LoteCompra.Cantidad_Actual > 0,
            LoteCompra.Estado == 1,
        )
        .order_by(LoteCompra.Fecha_Vencimiento.asc().nullslast())
        .all()
    )
    restante = float(cantidad)
    for lote in lotes:
        if restante <= 0:
            break
        disponible = float(lote.Cantidad_Actual or 0)
        tomar = min(disponible, restante)
        lote.Cantidad_Actual = round(disponible - tomar, 4)
        restante -= tomar


def _restaurar_fefo(db: Session, id_insumo: int, cantidad: float) -> None:
    """Devuelve `cantidad` al insumo en orden FEFO inverso (del último al primero en vencer)."""
    lotes = (
        db.query(LoteCompra)
        .filter(
            LoteCompra.ID_Insumo == id_insumo,
            LoteCompra.Estado == 1,
        )
        .order_by(LoteCompra.Fecha_Vencimiento.desc().nullsfirst())
        .all()
    )
    restante = float(cantidad)
    for lote in lotes:
        if restante <= 0:
            break
        inicial   = float(lote.Cantidad_Inicial or 0)
        actual    = float(lote.Cantidad_Actual  or 0)
        espacio   = max(0.0, inicial - actual)
        devolver  = min(espacio, restante)
        lote.Cantidad_Actual = round(actual + devolver, 4)
        restante -= devolver


ESTADO_PENDIENTE  = 1
ESTADO_EN_PROCESO = 13
ESTADO_COMPLETADA = 11
ESTADO_CANCELADA  = 5


def _actualizar_estado_insumo(insumo: Insumo) -> None:
    stock  = insumo.Stock_Actual or 0
    minimo = insumo.Stock_Minimo or 0
    if stock == 0:
        insumo.Estado = 15
    elif stock <= minimo:
        insumo.Estado = 14
    else:
        insumo.Estado = 1


def _actualizar_estado_producto(producto: Producto) -> None:
    stock  = producto.Stock or 0
    minimo = getattr(producto, "Stock_Minimo", 0) or 0
    if stock == 0:
        producto.Estado = 15
    elif stock <= minimo:
        producto.Estado = 14
    else:
        producto.Estado = 1


def _label_estado(db: Session, id_estado: int) -> str:
    """Obtiene el nombre del estado desde la tabla Estados."""
    estado = db.query(Estado).filter(Estado.ID_Estados == id_estado).first()
    return estado.Estado if estado else None


def _precio_ultimo_lote(db: Session, id_insumo: int) -> Decimal:
    """Precio unitario del insumo en su compra más reciente."""
    from src.shared.services.models import DetalleCompra
    detalle = (
        db.query(DetalleCompra)
        .filter(DetalleCompra.ID_Insumo == id_insumo)
        .order_by(DetalleCompra.ID_Detalle_Compra.desc())
        .first()
    )
    return Decimal(str(detalle.Precio_Und)) if (detalle and detalle.Precio_Und) else Decimal("0")


def _calcular_costo(db: Session, id_ficha, id_insumo, cantidad: int) -> Decimal:
    """
    Costo estimado de producción:
    - Con ficha técnica: suma (precio_último_lote * cantidad_insumo_ficha * cantidad_a_producir)
      para cada insumo de la ficha.
    - Sin ficha (insumo directo): precio_último_lote * cantidad.
    """
    if id_ficha:
        insumos_ficha = db.query(FichaTecnicaInsumo).filter(
            FichaTecnicaInsumo.ID_Ficha == id_ficha
        ).all()
        total = Decimal("0")
        for fi in insumos_ficha:
            precio = _precio_ultimo_lote(db, fi.ID_Insumo)
            cant_fi = Decimal(str(fi.Cantidad or 0))
            total += precio * cant_fi * Decimal(str(cantidad))
        return total

    if id_insumo:
        return _precio_ultimo_lote(db, id_insumo) * Decimal(str(cantidad))

    return Decimal("0")


def _formato_orden(orden: OrdenProduccion, db: Session) -> dict:
    """Construye el dict de respuesta con nombres legibles."""
    producto = db.query(Producto).filter(
        Producto.ID_Producto == orden.ID_Producto
    ).first()

    insumo = db.query(Insumo).filter(
        Insumo.ID_Insumo == orden.ID_Insumo
    ).first()

    ficha = db.query(FichaTecnica).filter(
        FichaTecnica.ID_Ficha == orden.ID_Ficha
    ).first() if orden.ID_Ficha else None

    lote = db.query(LoteProducto).filter(
        LoteProducto.ID_Orden_Produccion == orden.ID_Orden_Produccion
    ).first()

    return {
        "ID_Orden_Produccion": orden.ID_Orden_Produccion,
        "ID_Venta":            orden.ID_Venta,
        "ID_Producto":         orden.ID_Producto,
        "nombre_producto":     producto.nombre if producto else None,
        "ID_Insumo":           orden.ID_Insumo,
        "nombre_insumo":       insumo.Nombre if insumo else None,
        "stock_insumo":        insumo.Stock_Actual if insumo else None,
        "ID_Ficha":            orden.ID_Ficha,
        "version_ficha":       ficha.Version if ficha else None,
        "Cantidad":            orden.Cantidad,
        "Fecha_inicio":        orden.Fecha_inicio,
        "Fecha_Entrega":       orden.Fecha_Entrega,
        "Estado":              orden.Estado,
        "estado_label":        _label_estado(db, orden.Estado) if orden.Estado else None,
        "Costo":               orden.Costo,
        "lote": {
            "ID_Lote_Producto":  lote.ID_Lote_Producto,
            "Numero_Lote":       lote.Numero_Lote,
            "Fecha_Produccion":  lote.Fecha_Produccion,
            "Fecha_Vencimiento": lote.Fecha_Vencimiento,
            "Cantidad":          lote.Cantidad,
        } if lote else None,
    }


def obtener_ordenes(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None
) -> dict:
    """Lista paginada. Busca por nombre de producto o código de orden."""
    query = db.query(OrdenProduccion)

    if busqueda:
        termino = f"%{busqueda}%"
        productos_ids = (
            db.query(Producto.ID_Producto)
            .filter(Producto.nombre.ilike(termino))
            .subquery()
        )
        query = query.filter(
            OrdenProduccion.ID_Producto.in_(productos_ids)
        )

    total  = query.count()
    offset = (pagina - 1) * por_pagina
    ordenes = query.offset(offset).limit(por_pagina).all()

    return {
        "total":      total,
        "pagina":     pagina,
        "por_pagina": por_pagina,
        "ordenes":    [_formato_orden(o, db) for o in ordenes],
    }


def obtener_orden(db: Session, id_orden: int) -> dict:
    """Retorna una orden por ID o lanza 404."""
    orden = db.query(OrdenProduccion).filter(
        OrdenProduccion.ID_Orden_Produccion == id_orden
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return _formato_orden(orden, db)


def crear_orden(db: Session, datos: OrdenCreate) -> dict:
    """Crea la orden y calcula el costo automáticamente."""

    # Verifica que el producto existe
    if not db.query(Producto).filter(Producto.ID_Producto == datos.ID_Producto).first():
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Verifica insumo solo si viene explícito
    if datos.ID_Insumo and not db.query(Insumo).filter(Insumo.ID_Insumo == datos.ID_Insumo).first():
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    costo = _calcular_costo(db, datos.ID_Ficha, datos.ID_Insumo, datos.Cantidad)

    nueva = OrdenProduccion(
        ID_Producto   = datos.ID_Producto,
        ID_Insumo     = datos.ID_Insumo,
        ID_Ficha      = datos.ID_Ficha,
        Cantidad      = datos.Cantidad,
        Fecha_inicio  = datos.Fecha_inicio,
        Fecha_Entrega = datos.Fecha_Entrega,
        Estado        = ESTADO_PENDIENTE,
        Costo         = costo,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return _formato_orden(nueva, db)


def editar_orden(db: Session, id_orden: int, datos: OrdenUpdate) -> dict:
    """Edita la orden y recalcula el costo si cambia cantidad o insumo."""
    orden = db.query(OrdenProduccion).filter(
        OrdenProduccion.ID_Orden_Produccion == id_orden
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(orden, campo, valor)

    # Recalcula costo si cambió cantidad, insumo o ficha
    if datos.Cantidad or datos.ID_Insumo or datos.ID_Ficha:
        orden.Costo = _calcular_costo(db, orden.ID_Ficha, orden.ID_Insumo, orden.Cantidad)

    db.commit()
    db.refresh(orden)
    return _formato_orden(orden, db)


def cambiar_estado(db: Session, id_orden: int, datos) -> dict:
    """datos puede ser int o un objeto con atributos: Estado, Numero_Lote, Fecha_Vencimiento"""
    # compat: si pasaron solo un int
    if isinstance(datos, int):
        nuevo_estado = datos
        lote_info = {}
    else:
        nuevo_estado = datos.Estado
        lote_info = { 'Numero_Lote': getattr(datos, 'Numero_Lote', None), 'Fecha_Vencimiento': getattr(datos, 'Fecha_Vencimiento', None) }
    orden = db.query(OrdenProduccion).filter(
        OrdenProduccion.ID_Orden_Produccion == id_orden
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Al iniciar (13=En proceso): validar ficha, descontar todos los insumos de la receta
    if nuevo_estado == ESTADO_EN_PROCESO and orden.Estado == ESTADO_PENDIENTE:
        if not orden.ID_Ficha:
            raise HTTPException(
                status_code=400,
                detail="El producto debe tener una ficha técnica asignada antes de iniciar la producción"
            )
        insumos_ficha = db.query(FichaTecnicaInsumo).filter(
            FichaTecnicaInsumo.ID_Ficha == orden.ID_Ficha
        ).all()
        if not insumos_ficha:
            raise HTTPException(
                status_code=400,
                detail="La ficha técnica no tiene insumos registrados. Agrégalos antes de iniciar producción."
            )
        # Validar stock con conversión de unidades
        for fi in insumos_ficha:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == fi.ID_Insumo).first()
            if not insumo:
                raise HTTPException(status_code=404, detail=f"Insumo ID {fi.ID_Insumo} no encontrado")
            unidad_ins = db.query(UnidadMedida).filter(
                UnidadMedida.ID_Unidad_Medida == insumo.Unidad_Medida
            ).first()
            simbolo_ins = unidad_ins.Simbolo if unidad_ins else None
            necesario = _convertir(
                float(fi.Cantidad or 0) * orden.Cantidad,
                fi.Unidad or simbolo_ins,
                simbolo_ins,
            )
            if float(insumo.Stock_Actual or 0) < necesario:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente de '{insumo.Nombre}': necesario {necesario:.4g} {simbolo_ins}, disponible {float(insumo.Stock_Actual or 0):.4g} {simbolo_ins}"
                )

        # Descontar usando FEFO lote a lote
        for fi in insumos_ficha:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == fi.ID_Insumo).first()
            unidad_ins = db.query(UnidadMedida).filter(
                UnidadMedida.ID_Unidad_Medida == insumo.Unidad_Medida
            ).first()
            simbolo_ins = unidad_ins.Simbolo if unidad_ins else None
            necesario = _convertir(
                float(fi.Cantidad or 0) * orden.Cantidad,
                fi.Unidad or simbolo_ins,
                simbolo_ins,
            )
            _descontar_fefo(db, insumo.ID_Insumo, necesario)
            insumo.Stock_Actual = round(max(0.0, float(insumo.Stock_Actual or 0) - necesario), 4)
            _actualizar_estado_insumo(insumo)
            notificar_stock_insumo(db, insumo)

    # Al completar (11=Completada): incrementar stock del producto y crear lote
    elif nuevo_estado == ESTADO_COMPLETADA and orden.Estado == ESTADO_EN_PROCESO:
        from datetime import datetime, timedelta

        producto = db.query(Producto).filter(Producto.ID_Producto == orden.ID_Producto).first()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        producto.Stock = (producto.Stock or 0) + orden.Cantidad
        _actualizar_estado_producto(producto)
        notificar_stock_producto(db, producto)

        # Crear lote de producto
        hoy = datetime.now()
        ficha = db.query(FichaTecnica).filter(
            FichaTecnica.ID_Ficha == orden.ID_Ficha
        ).first() if orden.ID_Ficha else None

        dias_vida = (ficha.Dias_Vida_Util if ficha and ficha.Dias_Vida_Util else None)
        fecha_vencimiento = hoy + timedelta(days=dias_vida) if dias_vida else None

        # Use provided lote info if available, otherwise auto-generate
        numero_lote = lote_info.get('Numero_Lote') or f"LP-{orden.ID_Orden_Produccion}-{hoy.strftime('%Y%m%d')}"
        fecha_venc = lote_info.get('Fecha_Vencimiento') or fecha_vencimiento

        db.add(LoteProducto(
            ID_Orden_Produccion = orden.ID_Orden_Produccion,
            ID_Producto         = orden.ID_Producto,
            Numero_Lote         = numero_lote,
            Fecha_Produccion    = hoy,
            Fecha_Vencimiento   = fecha_venc,
            Cantidad            = orden.Cantidad,
            Estado              = 1,
        ))

        # Si la orden estaba ligada a un pedido, verificar si puede volver a Pendiente
        if orden.ID_Venta:
            venta = db.query(Venta).filter(Venta.ID_Venta == orden.ID_Venta).first()
            if venta and venta.Estado == 13:  # En proceso
                otras = db.query(OrdenProduccion).filter(
                    OrdenProduccion.ID_Venta            == orden.ID_Venta,
                    OrdenProduccion.ID_Orden_Produccion != orden.ID_Orden_Produccion,
                ).all()
                # La orden actual pasa a Completada; las demás deben ser Completadas o Canceladas
                if all(o.Estado in {ESTADO_COMPLETADA, ESTADO_CANCELADA} for o in otras):
                    venta.Estado = 1  # Vuelve a Pendiente — listo para que el admin confirme

    # Al cancelar (5): restaurar insumos si la orden estaba en proceso
    elif nuevo_estado == ESTADO_CANCELADA and orden.Estado == ESTADO_EN_PROCESO:
        if orden.ID_Ficha:
            insumos_ficha = db.query(FichaTecnicaInsumo).filter(
                FichaTecnicaInsumo.ID_Ficha == orden.ID_Ficha
            ).all()
            for fi in insumos_ficha:
                insumo = db.query(Insumo).filter(Insumo.ID_Insumo == fi.ID_Insumo).first()
                if insumo:
                    unidad_ins = db.query(UnidadMedida).filter(
                        UnidadMedida.ID_Unidad_Medida == insumo.Unidad_Medida
                    ).first()
                    simbolo_ins = unidad_ins.Simbolo if unidad_ins else None
                    devolver = _convertir(
                        float(fi.Cantidad or 0) * orden.Cantidad,
                        fi.Unidad or simbolo_ins,
                        simbolo_ins,
                    )
                    _restaurar_fefo(db, insumo.ID_Insumo, devolver)
                    insumo.Stock_Actual = round(float(insumo.Stock_Actual or 0) + devolver, 4)
                    _actualizar_estado_insumo(insumo)
                    notificar_stock_insumo(db, insumo)
        elif orden.ID_Insumo:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == orden.ID_Insumo).first()
            if insumo:
                devolver = float(orden.Cantidad)
                _restaurar_fefo(db, insumo.ID_Insumo, devolver)
                insumo.Stock_Actual = round(float(insumo.Stock_Actual or 0) + devolver, 4)
                _actualizar_estado_insumo(insumo)
                notificar_stock_insumo(db, insumo)

    orden.Estado = nuevo_estado
    db.commit()
    db.refresh(orden)
    return _formato_orden(orden, db)


def eliminar_orden(db: Session, id_orden: int) -> dict:
    """Elimina una orden de producción."""
    orden = db.query(OrdenProduccion).filter(
        OrdenProduccion.ID_Orden_Produccion == id_orden
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    db.delete(orden)
    db.commit()
    return {"mensaje": f"Orden {id_orden} eliminada correctamente"}