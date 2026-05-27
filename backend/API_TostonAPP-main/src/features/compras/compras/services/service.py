from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime
from decimal import Decimal

from src.shared.services.models import (
    Compra, DetalleCompra, LoteCompra, Insumo, Proveedor, Estado
)
from src.shared.services.notificaciones_utils import notificar_stock_insumo
from .schemas import CompraCreate


ESTADO_PENDIENTE  = 3
ESTADO_COMPLETADA = 11
ESTADO_ANULADA    = 12


# ─────────────────────────────────────────
# HELPERS DE STOCK
# ─────────────────────────────────────────

def _actualizar_estado_insumo(insumo: Insumo) -> None:
    stock  = insumo.Stock_Actual or 0
    minimo = insumo.Stock_Minimo or 0
    if stock == 0:
        insumo.Estado = 15
    elif stock <= minimo:
        insumo.Estado = 14
    else:
        insumo.Estado = 1


# ─────────────────────────────────────────
# FORMATO DE RESPUESTA
# ─────────────────────────────────────────

def _formato_detalle(detalle: DetalleCompra, db: Session) -> dict:
    insumo = db.query(Insumo).filter(Insumo.ID_Insumo == detalle.ID_Insumo).first()
    return {
        "ID_Detalle_Compra": detalle.ID_Detalle_Compra,
        "ID_Insumo":         detalle.ID_Insumo,
        "nombre_insumo":     insumo.Nombre if insumo else None,
        "ID_Lote_Compra":    detalle.ID_Lote_Compra,
        "Cantidad":          detalle.Cantidad,
        "Precio_Und":        detalle.Precio_Und,
        "Notas":             detalle.Notas,
    }


def _formato_compra(compra: Compra, db: Session) -> dict:
    proveedor = db.query(Proveedor).filter(
        Proveedor.ID_Proveedor == compra.ID_Proveedor
    ).first()
    estado = db.query(Estado).filter(Estado.ID_Estados == compra.Estado).first()
    detalles = db.query(DetalleCompra).filter(
        DetalleCompra.ID_Compra == compra.ID_Compra
    ).all()

    return {
        "ID_Compra":         compra.ID_Compra,
        "ID_Proveedor":      compra.ID_Proveedor,
        "nombre_proveedor":  proveedor.Responsable if proveedor else None,
        "Total_Pago":        compra.Total_Pago,
        "Fecha_Compra":      compra.Fecha_Compra,
        "Fecha_Llegada":     getattr(compra, "Fecha_Llegada", None),
        "Estado":            compra.Estado,
        "estado_label":      estado.Estado if estado else None,
        "Metodo_Pago":       compra.Metodo_Pago,
        "detalles":          [_formato_detalle(d, db) for d in detalles],
    }


# ─────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────

def obtener_compras(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None,
    id_proveedor: int = None,
) -> dict:
    query = db.query(Compra)

    if id_proveedor:
        query = query.filter(Compra.ID_Proveedor == id_proveedor)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(Compra.Metodo_Pago.ilike(termino))

    total   = query.count()
    offset  = (pagina - 1) * por_pagina
    compras = query.order_by(Compra.Fecha_Compra.desc()).offset(offset).limit(por_pagina).all()

    return {
        "total":      total,
        "pagina":     pagina,
        "por_pagina": por_pagina,
        "compras":    [_formato_compra(c, db) for c in compras],
    }


def obtener_compra(db: Session, id_compra: int) -> dict:
    compra = db.query(Compra).filter(Compra.ID_Compra == id_compra).first()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    return _formato_compra(compra, db)


def crear_compra(db: Session, datos: CompraCreate) -> dict:
    """
    Registra una compra en estado Pendiente (3).
    El stock NO se aplica al crear — solo al confirmar con completar_compra().
    """
    proveedor = db.query(Proveedor).filter(
        Proveedor.ID_Proveedor == datos.ID_Proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    total_pago = sum(
        Decimal(str(d.Precio_Und)) * d.Cantidad
        for d in datos.detalles
    )

    nueva_compra = Compra(
        ID_Proveedor = datos.ID_Proveedor,
        Total_Pago   = total_pago,
        Fecha_Compra = datos.Fecha_Compra or datetime.now(),
        Estado       = ESTADO_PENDIENTE,
        Metodo_Pago  = datos.Metodo_Pago,
    )
    db.add(nueva_compra)
    db.flush()

    for item in datos.detalles:
        insumo = db.query(Insumo).filter(Insumo.ID_Insumo == item.ID_Insumo).first()
        if not insumo:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail=f"Insumo con ID {item.ID_Insumo} no encontrado"
            )

        lote = LoteCompra(
            ID_Insumo         = item.ID_Insumo,
            Fecha_Vencimiento = item.Fecha_Vencimiento,
            Cantidad_Inicial  = item.Cantidad,
            Estado            = 1,
        )
        db.add(lote)
        db.flush()

        detalle = DetalleCompra(
            ID_Compra      = nueva_compra.ID_Compra,
            ID_Insumo      = item.ID_Insumo,
            ID_Lote_Compra = lote.ID_Lote_Compra,
            Cantidad       = item.Cantidad,
            Precio_Und     = item.Precio_Und,
            Notas          = item.Notas,
        )
        db.add(detalle)

    db.commit()
    db.refresh(nueva_compra)
    return _formato_compra(nueva_compra, db)


def completar_compra(db: Session, id_compra: int, fecha_llegada=None) -> dict:
    """
    Confirma la llegada de la compra: aplica el stock de cada insumo y pasa a Completada (4).
    Solo puede completarse desde Pendiente (3).
    """
    compra = db.query(Compra).filter(Compra.ID_Compra == id_compra).first()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    if compra.Estado != ESTADO_PENDIENTE:
        raise HTTPException(
            status_code=400,
            detail="Solo se puede completar una compra en estado Pendiente"
        )

    detalles = db.query(DetalleCompra).filter(DetalleCompra.ID_Compra == id_compra).all()

    for detalle in detalles:
        insumo = db.query(Insumo).filter(Insumo.ID_Insumo == detalle.ID_Insumo).first()
        if insumo:
            insumo.Stock_Actual = (insumo.Stock_Actual or 0) + detalle.Cantidad
            insumo.ID_Lote_Compra = detalle.ID_Lote_Compra
            _actualizar_estado_insumo(insumo)

    compra.Estado = ESTADO_COMPLETADA
    if fecha_llegada:
        compra.Fecha_Llegada = fecha_llegada
    else:
        from datetime import datetime as _dt
        compra.Fecha_Llegada = _dt.now()
    db.commit()
    db.refresh(compra)

    for detalle in detalles:
        insumo = db.query(Insumo).filter(Insumo.ID_Insumo == detalle.ID_Insumo).first()
        if insumo:
            notificar_stock_insumo(db, insumo)
    db.commit()

    return _formato_compra(compra, db)


def anular_compra(db: Session, id_compra: int) -> dict:
    """
    Anula la compra.
    - Desde Pendiente (3): solo cambia estado, sin afectar stock.
    - Desde Completada (4): revierte el stock de cada insumo antes de anular.
    """
    compra = db.query(Compra).filter(Compra.ID_Compra == id_compra).first()
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    if compra.Estado not in {ESTADO_PENDIENTE, ESTADO_COMPLETADA}:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden anular compras en estado Pendiente o Completada"
        )

    if compra.Estado == ESTADO_COMPLETADA:
        detalles = db.query(DetalleCompra).filter(DetalleCompra.ID_Compra == id_compra).all()
        for detalle in detalles:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == detalle.ID_Insumo).first()
            if insumo:
                insumo.Stock_Actual = max(0, (insumo.Stock_Actual or 0) - detalle.Cantidad)
                _actualizar_estado_insumo(insumo)

        for detalle in detalles:
            insumo = db.query(Insumo).filter(Insumo.ID_Insumo == detalle.ID_Insumo).first()
            if insumo:
                notificar_stock_insumo(db, insumo)

    compra.Estado = ESTADO_ANULADA
    db.commit()
    db.refresh(compra)
    return _formato_compra(compra, db)
