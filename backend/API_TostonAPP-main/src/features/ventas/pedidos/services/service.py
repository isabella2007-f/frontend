from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.shared.services.models import Venta, Estado
from src.features.ventas.gestion_ventas.services.service import _formato_venta


# IDs de estado — ajusta según tu tabla Estados
ESTADO_PENDIENTE   = 1      # pedido en carrito / sin confirmar
ESTADO_CONFIRMADO  = 2      # venta confirmada / pagada
ESTADO_CANCELADO   = 3      # pedido cancelado


def obtener_pedidos(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None
) -> dict:
    """
    Lista solo las ventas en estado Pendiente (pedidos sin confirmar).
    Busca por nombre del cliente.
    """
    from src.shared.services.models import Usuario

    query = db.query(Venta).filter(Venta.Estado == ESTADO_PENDIENTE)

    if busqueda:
        termino      = f"%{busqueda}%"
        usuarios_ids = (
            db.query(Usuario.ID_Usuario)
            .filter(
                Usuario.Nombre.ilike(termino) |
                Usuario.Apellidos.ilike(termino)
            )
            .subquery()
        )
        query = query.filter(Venta.ID_Usuario.in_(usuarios_ids))

    total   = query.count()
    offset  = (pagina - 1) * por_pagina
    pedidos = query.order_by(Venta.Fecha_pedido.desc()).offset(offset).limit(por_pagina).all()

    return {
        "total":      total,
        "pagina":     pagina,
        "por_pagina": por_pagina,
        "pedidos":    [_formato_venta(p, db) for p in pedidos],
    }


def obtener_pedido(db: Session, id_venta: int) -> dict:
    """Retorna un pedido por ID. Solo si está en estado Pendiente."""
    pedido = db.query(Venta).filter(
        Venta.ID_Venta == id_venta,
        Venta.Estado   == ESTADO_PENDIENTE
    ).first()
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado o ya fue procesado"
        )
    return _formato_venta(pedido, db)


def confirmar_pedido(db: Session, id_venta: int) -> dict:
    """
    Confirma el pedido → cambia estado a Confirmado.
    A partir de aquí se considera una venta pagada.
    """
    pedido = db.query(Venta).filter(
        Venta.ID_Venta == id_venta,
        Venta.Estado   == ESTADO_PENDIENTE
    ).first()
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado o ya fue procesado"
        )

    pedido.Estado = ESTADO_CONFIRMADO
    db.commit()
    db.refresh(pedido)
    return _formato_venta(pedido, db)


def cancelar_pedido(db: Session, id_venta: int, actual: dict = None) -> dict:
    """
    Cancela el pedido → cambia estado a Cancelado.
    - Stock NO se restaura: los pedidos Pendientes nunca decrementaron stock
      (el descuento de stock ocurre al pasar a Confirmado/estado 4).
    - Si se usó crédito, sí se devuelve porque fue deducido al crear el pedido.
    - Si actual es un cliente, solo puede cancelar su propio pedido.
    """
    from src.shared.services.models import CreditoCliente, MovimientoCredito, DetalleVenta
    from datetime import datetime

    pedido = db.query(Venta).filter(
        Venta.ID_Venta == id_venta,
        Venta.Estado   == ESTADO_PENDIENTE
    ).first()
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado o ya fue procesado"
        )

    # Clientes solo pueden cancelar sus propios pedidos
    if actual and actual.get("tipo") == "usuario":
        id_usuario = actual["registro"].ID_Usuario
        if pedido.ID_Usuario != id_usuario:
            raise HTTPException(status_code=403, detail="No puedes cancelar pedidos de otros clientes")

    # Los pedidos en estado Pendiente nunca tuvieron stock descontado,
    # por lo tanto no se restaura stock aquí.

    # Devuelve crédito si se usó (sí fue deducido al crear el pedido)
    detalle = db.query(DetalleVenta).filter(
        DetalleVenta.ID_Venta == id_venta
    ).first()
    if detalle and detalle.Descuento and detalle.Descuento > 0:
        credito = db.query(CreditoCliente).filter(
            CreditoCliente.ID_Usuario == pedido.ID_Usuario
        ).first()
        if credito:
            credito.Saldo        += detalle.Descuento
            credito.Fecha_Update  = datetime.now()
            db.add(MovimientoCredito(
                ID_Credito    = credito.ID_Credito,
                ID_Devolucion = None,
                ID_Venta      = id_venta,
                Tipo          = "recarga",
                Monto         = detalle.Descuento,
                Fecha         = datetime.now(),
            ))

    pedido.Estado = ESTADO_CANCELADO
    db.commit()
    db.refresh(pedido)
    return _formato_venta(pedido, db)