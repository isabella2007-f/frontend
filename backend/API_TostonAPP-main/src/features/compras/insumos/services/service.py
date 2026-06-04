from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime

from src.shared.services.models import Insumo, CategoriaInsumo, UnidadMedida, LoteCompra, OrdenProduccion
from .schemas import InsumoCreate, InsumoUpdate


def _formato_insumo(insumo: Insumo, db: Session) -> dict:
    """Construye el dict de respuesta con categoria, unidad y lote."""
    categoria = db.query(CategoriaInsumo).filter(
        CategoriaInsumo.ID_Categoria == insumo.ID_Categoria
    ).first()

    unidad = db.query(UnidadMedida).filter(
        UnidadMedida.ID_Unidad_Medida == insumo.Unidad_Medida
    ).first()

    hoy = datetime.utcnow()
    proximo_lote = (
        db.query(LoteCompra)
        .filter(
            LoteCompra.ID_Insumo == insumo.ID_Insumo,
            LoteCompra.Fecha_Vencimiento != None,
        )
        .order_by(LoteCompra.Fecha_Vencimiento.asc())
        .first()
    )

    proximo_venc = None
    dias_para_vencer = None
    if proximo_lote and proximo_lote.Fecha_Vencimiento:
        proximo_venc = proximo_lote.Fecha_Vencimiento.strftime("%Y-%m-%d")
        dias_para_vencer = (proximo_lote.Fecha_Vencimiento - hoy).days

    return {
        "ID_Insumo":          insumo.ID_Insumo,
        "Nombre":             insumo.Nombre,
        "ID_Categoria":       insumo.ID_Categoria,
        "nombre_categoria":   categoria.Nombre_Categoria if categoria else None,
        "Unidad_Medida":      insumo.Unidad_Medida,
        "simbolo_unidad":     unidad.Simbolo if unidad else None,
        "Stock_Actual":       insumo.Stock_Actual,
        "Stock_Minimo":       insumo.Stock_Minimo,
        "Estado":             insumo.Estado,
        "proximo_vencimiento": proximo_venc,
        "dias_para_vencer":   dias_para_vencer,
    }


def _calcular_resumen(db: Session) -> dict:
    """Calcula las 4 tarjetas del tope de la página."""
    todos = db.query(Insumo).all()
    total       = len(todos)
    agotados    = sum(1 for i in todos if i.Stock_Actual == 0)
    stock_bajo  = sum(1 for i in todos if 0 < i.Stock_Actual <= i.Stock_Minimo)
    disponibles = total - agotados - stock_bajo
    return {
        "total":       total,
        "disponibles": disponibles,
        "stock_bajo":  stock_bajo,
        "agotados":    agotados,
    }


def obtener_insumos(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None
) -> dict:
    """Lista paginada con resumen. Busca por nombre, categoría o lote."""
    query = db.query(Insumo)

    if busqueda:
        termino = f"%{busqueda}%"
        # Busca en nombre del insumo o nombre de categoría
        query = query.join(
            CategoriaInsumo,
            CategoriaInsumo.ID_Categoria == Insumo.ID_Categoria,
            isouter=True
        ).filter(
            Insumo.Nombre.ilike(termino) |
            CategoriaInsumo.Nombre_Categoria.ilike(termino)
        )

    total   = query.count()
    offset  = (pagina - 1) * por_pagina
    insumos = query.offset(offset).limit(por_pagina).all()

    return {
        "resumen":    _calcular_resumen(db),
        "total":      total,
        "pagina":     pagina,
        "por_pagina": por_pagina,
        "insumos":    [_formato_insumo(i, db) for i in insumos],
    }


def obtener_insumo(db: Session, id_insumo: int) -> dict:
    """Retorna un insumo por ID o lanza 404."""
    insumo = db.query(Insumo).filter(Insumo.ID_Insumo == id_insumo).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    return _formato_insumo(insumo, db)


def crear_insumo(db: Session, datos: InsumoCreate) -> dict:
    """
    Crea un insumo y opcionalmente crea su lote de compra.
    Orden correcto: insumo primero → lote con ID_Insumo → actualiza insumo con lote.
    """
    stock  = datos.Stock_Actual or 0
    minimo = datos.Stock_Minimo or 0
    if stock == 0:
        estado_inicial = 15
    elif stock <= minimo:
        estado_inicial = 14
    else:
        estado_inicial = 1

    nuevo = Insumo(
        Nombre         = datos.Nombre,
        ID_Categoria   = datos.ID_Categoria,
        Unidad_Medida  = datos.Unidad_Medida,
        Stock_Actual   = stock,
        Stock_Minimo   = minimo,
        ID_Lote_Compra = None,
        Estado         = estado_inicial,
    )
    db.add(nuevo)
    db.flush()  # obtiene ID_Insumo sin commit

    if datos.Lote_Compra and datos.Lote_Compra.Cantidad_Inicial is not None:
        nuevo_lote = LoteCompra(
            ID_Insumo         = nuevo.ID_Insumo,
            Fecha_Vencimiento = datos.Lote_Compra.Fecha_Vencimiento,
            Cantidad_Inicial  = datos.Lote_Compra.Cantidad_Inicial,
            Estado            = 1,
        )
        db.add(nuevo_lote)
        db.flush()
        nuevo.ID_Lote_Compra = nuevo_lote.ID_Lote_Compra

    db.commit()
    db.refresh(nuevo)
    return _formato_insumo(nuevo, db)


def editar_insumo(db: Session, id_insumo: int, datos: InsumoUpdate) -> dict:
    """Edita solo los campos enviados y recalcula el Estado si cambia el stock."""
    insumo = db.query(Insumo).filter(Insumo.ID_Insumo == id_insumo).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(insumo, campo, valor)

    stock  = insumo.Stock_Actual or 0
    minimo = insumo.Stock_Minimo or 0
    if stock == 0:
        insumo.Estado = 15
    elif stock <= minimo:
        insumo.Estado = 14
    else:
        insumo.Estado = 1

    db.commit()
    db.refresh(insumo)
    return _formato_insumo(insumo, db)


def _tiene_ficha_tecnica(db: Session, id_insumo: int) -> bool:
    return db.query(OrdenProduccion).filter(
        OrdenProduccion.ID_Insumo == id_insumo
    ).first() is not None


def cambiar_estado(db: Session, id_insumo: int, nuevo_estado: int) -> dict:
    """Cambia el estado ON/OFF del insumo."""
    insumo = db.query(Insumo).filter(Insumo.ID_Insumo == id_insumo).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    if nuevo_estado == 2 and _tiene_ficha_tecnica(db, id_insumo):
        raise HTTPException(
            status_code=400,
            detail="No se puede desactivar un insumo asociado a una ficha técnica de producción"
        )

    insumo.Estado = nuevo_estado
    db.commit()
    db.refresh(insumo)
    return _formato_insumo(insumo, db)


def obtener_lotes_insumo(db: Session, id_insumo: int) -> dict:
    """Retorna todos los lotes de compra de un insumo, separando activos y vencidos."""
    hoy = datetime.utcnow()
    lotes = (
        db.query(LoteCompra)
        .filter(LoteCompra.ID_Insumo == id_insumo)
        .order_by(LoteCompra.Fecha_Vencimiento.asc())
        .all()
    )
    resultado = []
    for l in lotes:
        fv = l.Fecha_Vencimiento
        vencido = bool(fv and fv < hoy)
        dias = None
        if fv:
            dias = (fv - hoy).days
        resultado.append({
            "id":               l.ID_Lote_Compra,
            "cantidad_inicial": l.Cantidad_Inicial,
            "fecha_vencimiento": fv.strftime("%Y-%m-%d") if fv else None,
            "vencido":          vencido,
            "dias_para_vencer": dias,
            "estado":           l.Estado,
        })
    return {"lotes": resultado, "total": len(resultado)}


def eliminar_insumo(db: Session, id_insumo: int) -> dict:
    """Elimina un insumo y su lote asociado si existe."""
    insumo = db.query(Insumo).filter(Insumo.ID_Insumo == id_insumo).first()
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")

    if _tiene_ficha_tecnica(db, id_insumo):
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un insumo asociado a una ficha técnica de producción"
        )

    # Elimina el lote asociado si existe
    if insumo.ID_Lote_Compra:
        lote = db.query(LoteCompra).filter(
            LoteCompra.ID_Lote_Compra == insumo.ID_Lote_Compra
        ).first()
        if lote:
            db.delete(lote)

    db.delete(insumo)
    db.commit()
    return {"mensaje": f"Insumo {id_insumo} eliminado correctamente"}