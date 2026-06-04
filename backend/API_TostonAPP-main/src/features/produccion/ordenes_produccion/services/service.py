from sqlalchemy.orm import Session
from fastapi import HTTPException
from decimal import Decimal

from src.shared.services.models import OrdenProduccion, Producto, Insumo, FichaTecnica, FichaTecnicaInsumo, Estado, Venta, LoteProducto
from src.shared.services.notificaciones_utils import notificar_stock_insumo, notificar_stock_producto
from .schemas import OrdenCreate, OrdenUpdate


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


def _calcular_costo(db: Session, id_insumo: int, cantidad: int) -> Decimal:
    """
    Calcula el costo de la orden buscando el precio unitario del insumo
    en su último lote de compra.
    Fórmula: precio_unitario_lote * cantidad
    Si no hay lote, retorna 0.
    """
    from src.shared.services.models import LoteCompra, DetalleCompra

    # Busca el último detalle de compra del insumo para obtener el precio unitario
    detalle = (
        db.query(DetalleCompra)
        .filter(DetalleCompra.ID_Insumo == id_insumo)
        .order_by(DetalleCompra.ID_Detalle_Compra.desc())
        .first()
    )

    if detalle and detalle.Precio_Und:
        return Decimal(str(detalle.Precio_Und)) * Decimal(str(cantidad))
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

    costo = _calcular_costo(db, datos.ID_Insumo, datos.Cantidad) if datos.ID_Insumo else Decimal("0")

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

    # Recalcula costo si cambió cantidad o insumo
    if datos.Cantidad or datos.ID_Insumo:
        orden.Costo = _calcular_costo(db, orden.ID_Insumo, orden.Cantidad)

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
        # Validar que todos los insumos tienen stock suficiente
        for fi in insumos_ficha:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == fi.ID_Insumo).first()
            if not insumo:
                raise HTTPException(status_code=404, detail=f"Insumo ID {fi.ID_Insumo} no encontrado")
            necesario = float(fi.Cantidad or 0) * orden.Cantidad
            if (insumo.Stock_Actual or 0) < necesario:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente de '{insumo.Nombre}': necesario {necesario:.0f}, disponible {insumo.Stock_Actual or 0}"
                )
        # Descontar todos los insumos
        for fi in insumos_ficha:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == fi.ID_Insumo).first()
            necesario = float(fi.Cantidad or 0) * orden.Cantidad
            insumo.Stock_Actual = max(0, (insumo.Stock_Actual or 0) - int(necesario))
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
                    devolver = int(float(fi.Cantidad or 0) * orden.Cantidad)
                    insumo.Stock_Actual = (insumo.Stock_Actual or 0) + devolver
                    _actualizar_estado_insumo(insumo)
                    notificar_stock_insumo(db, insumo)
        elif orden.ID_Insumo:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == orden.ID_Insumo).first()
            if insumo:
                insumo.Stock_Actual = (insumo.Stock_Actual or 0) + orden.Cantidad
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