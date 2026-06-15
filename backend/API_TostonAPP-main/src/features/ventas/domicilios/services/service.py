from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timedelta

from collections import defaultdict
from src.shared.services.models import Domicilio, Venta, Usuario, Estado, Producto, VentaXProducto, Rol

# Chat en memoria — temporal (se pierde al reiniciar el servidor)
_chat: dict = defaultdict(list)
_chat_counter: dict = defaultdict(int)
from .schemas import DomicilioCreate, DomicilioUpdate


def _label_estado(db: Session, id_estado: int) -> str:
    estado = db.query(Estado).filter(Estado.ID_Estados == id_estado).first()
    return estado.Estado if estado else None


def _formato_domicilio(dom: Domicilio, db: Session) -> dict:
    """Construye el dict con cliente, repartidor, estado y datos de la venta."""
    # Obtiene el cliente desde la venta
    venta   = db.query(Venta).filter(Venta.ID_Venta == dom.ID_Venta).first()
    cliente = db.query(Usuario).filter(
        Usuario.ID_Usuario == venta.ID_Usuario
    ).first() if venta else None

    # Obtiene el repartidor (ahora en la tabla Usuarios)
    repartidor = db.query(Usuario).filter(
        Usuario.ID_Usuario == dom.ID_Empleado
    ).first() if dom.ID_Empleado else None

    # Datos de la venta: total, metodo_pago y productos
    total       = float(venta.Total) if venta and venta.Total else 0.0
    metodo_pago = venta.Metodo_Pago or "" if venta else ""
    productos   = []
    if venta:
        items = db.query(VentaXProducto).filter(
            VentaXProducto.ID_Venta == venta.ID_Venta
        ).all()
        for item in items:
            prod   = db.query(Producto).filter(
                Producto.ID_Producto == item.ID_Producto
            ).first()
            precio = float(prod.Precio_venta) if prod and prod.Precio_venta else 0.0
            productos.append({
                "ID_Producto":     item.ID_Producto,
                "nombre_producto": prod.nombre if prod else "",
                "Cantidad":        item.Cantidad,
                "precio_unitario": precio,
                "subtotal":        precio * (item.Cantidad or 0),
            })

    return {
        "ID_Domicilio":         dom.ID_Domicilio,
        "ID_Venta":             dom.ID_Venta,
        "nombre_cliente":       f"{cliente.Nombre} {cliente.Apellidos}" if cliente else None,
        "ID_Empleado":          dom.ID_Empleado,
        "nombre_repartidor":    f"{repartidor.Nombre} {repartidor.Apellidos}" if repartidor else None,
        "Fecha_asignacion":     dom.Fecha_asignacion,
        "Fecha_entrega":        dom.Fecha_entrega,
        "Observaciones":        dom.Observaciones,
        "Estado":               dom.Estado,
        "estado_label":         _label_estado(db, dom.Estado) if dom.Estado else None,
        "Direccion_entrega":    dom.Direccion_entrega,
        "Municipio_entrega":    dom.Municipio_entrega,
        "Departamento_entrega": dom.Departamento_entrega,
        "total":                total,
        "metodo_pago":          metodo_pago,
        "productos":            productos,
        "telefono_cliente":     cliente.Telefono if cliente else "",
    }


def obtener_repartidores(db: Session) -> list:
    """Usuarios cuyo rol contiene 'domiciliario'."""
    repartidores = (
        db.query(Usuario)
        .join(Rol, Usuario.ID_Rol == Rol.ID_Rol)
        .filter(Rol.Rol.ilike("%domiciliario%"))
        .all()
    )
    return [
        {"id": u.ID_Usuario, "nombre": f"{u.Nombre} {u.Apellidos}"}
        for u in repartidores
    ]


def obtener_resumen_dia(db: Session, id_empleado: int) -> dict:
    hoy_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin    = hoy_inicio + timedelta(days=1)

    base = db.query(Domicilio).filter(Domicilio.ID_Empleado == id_empleado)

    activos        = base.filter(Domicilio.Estado.in_([10, 13, 9])).count()
    entregados_hoy = base.filter(
        Domicilio.Estado == 8,
        Domicilio.Fecha_entrega >= hoy_inicio,
        Domicilio.Fecha_entrega < hoy_fin,
    ).count()
    total_hoy = base.filter(
        Domicilio.Fecha_asignacion >= hoy_inicio,
        Domicilio.Fecha_asignacion < hoy_fin,
    ).count()

    return {"activos": activos, "entregados_hoy": entregados_hoy, "total_hoy": total_hoy}


def obtener_domicilios(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None,
    estado: int = None,
    id_empleado: int = None,
    fecha_inicio: datetime = None,
    fecha_fin: datetime = None,
) -> dict:
    """Lista paginada. Busca por nombre de cliente o repartidor. Filtra por estado o empleado asignado."""
    query = db.query(Domicilio)

    if id_empleado:
        query = query.filter(Domicilio.ID_Empleado == id_empleado)

    if estado:
        query = query.filter(Domicilio.Estado == estado)

    if fecha_inicio:
        query = query.filter(Domicilio.Fecha_asignacion >= fecha_inicio)

    if fecha_fin:
        query = query.filter(Domicilio.Fecha_asignacion < fecha_fin)

    if busqueda:
        termino = f"%{busqueda}%"

        # IDs de clientes que coinciden
        clientes_ids = (
            db.query(Venta.ID_Venta)
            .join(Usuario, Usuario.ID_Usuario == Venta.ID_Usuario)
            .filter(
                Usuario.Nombre.ilike(termino) |
                Usuario.Apellidos.ilike(termino)
            )
            .subquery()
        )

        # IDs de repartidores que coinciden (en Usuarios)
        repartidores_ids = (
            db.query(Usuario.ID_Usuario)
            .filter(
                Usuario.Nombre.ilike(termino) |
                Usuario.Apellidos.ilike(termino)
            )
            .subquery()
        )

        query = query.filter(
            Domicilio.ID_Venta.in_(clientes_ids) |
            Domicilio.ID_Empleado.in_(repartidores_ids) |
            Domicilio.Direccion_entrega.ilike(termino)
        )

    total      = query.count()
    offset     = (pagina - 1) * por_pagina
    domicilios = query.offset(offset).limit(por_pagina).all()

    return {
        "total":      total,
        "pagina":     pagina,
        "por_pagina": por_pagina,
        "domicilios": [_formato_domicilio(d, db) for d in domicilios],
    }


def obtener_domicilio(db: Session, id_domicilio: int) -> dict:
    dom = db.query(Domicilio).filter(Domicilio.ID_Domicilio == id_domicilio).first()
    if not dom:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")
    return _formato_domicilio(dom, db)


def crear_domicilio(db: Session, datos: DomicilioCreate) -> dict:
    """Crea un domicilio. Si viene ID_Empleado el estado es Asignado, si no Pendiente."""
    venta = db.query(Venta).filter(Venta.ID_Venta == datos.ID_Venta).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    cliente = db.query(Usuario).filter(Usuario.ID_Usuario == venta.ID_Usuario).first()
    if not cliente or not cliente.Telefono:
        raise HTTPException(
            status_code=400,
            detail="El cliente debe tener un número de teléfono registrado para recibir domicilios"
        )

    if datos.ID_Empleado:
        if not db.query(Usuario).filter(Usuario.ID_Usuario == datos.ID_Empleado).first():
            raise HTTPException(status_code=404, detail="Repartidor no encontrado")

    # Estado inicial según si viene repartidor o no (IDs de la tabla Estados global)
    ESTADO_PENDIENTE = 3   # Pendiente
    ESTADO_ASIGNADO  = 10  # Asignado
    estado_inicial   = ESTADO_ASIGNADO if datos.ID_Empleado else ESTADO_PENDIENTE

    nuevo = Domicilio(
        ID_Venta             = datos.ID_Venta,
        ID_Empleado          = datos.ID_Empleado,
        Fecha_asignacion     = datetime.now(),
        Fecha_entrega        = datos.Fecha_entrega,
        Observaciones        = datos.Observaciones,
        Estado               = estado_inicial,
        Direccion_entrega    = datos.Direccion_entrega,
        Municipio_entrega    = datos.Municipio_entrega,
        Departamento_entrega = datos.Departamento_entrega,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _formato_domicilio(nuevo, db)


def editar_domicilio(db: Session, id_domicilio: int, datos: DomicilioUpdate) -> dict:
    dom = db.query(Domicilio).filter(Domicilio.ID_Domicilio == id_domicilio).first()
    if not dom:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")

    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(dom, campo, valor)

    db.commit()
    db.refresh(dom)
    return _formato_domicilio(dom, db)


def asignar_repartidor(db: Session, id_domicilio: int, id_empleado: int) -> dict:
    """
    Asigna un repartidor al domicilio.
    Si estaba Pendiente, cambia automáticamente a Asignado.
    """
    import traceback

    dom = db.query(Domicilio).filter(Domicilio.ID_Domicilio == id_domicilio).first()
    if not dom:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")

    if not db.query(Usuario).filter(Usuario.ID_Usuario == id_empleado).first():
        raise HTTPException(status_code=404, detail="Repartidor no encontrado")

    ESTADO_PENDIENTE = 3   # Pendiente
    ESTADO_ASIGNADO  = 10  # Asignado

    try:
        dom.ID_Empleado = id_empleado
        if dom.Estado == ESTADO_PENDIENTE:
            dom.Estado = ESTADO_ASIGNADO
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"COMMIT_ERROR | {type(e).__name__}: {e}")

    try:
        db.refresh(dom)
        return _formato_domicilio(dom, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FORMAT_ERROR | {type(e).__name__}: {e}")


def generar_otp(id_domicilio: int) -> str:
    return str((id_domicilio * 7331 + 4729) % 9000 + 1000)


def verificar_otp(id_domicilio: int, codigo: str) -> bool:
    return codigo.strip() == generar_otp(id_domicilio)


def obtener_mensajes(db: Session, id_domicilio: int) -> list:
    return list(_chat[id_domicilio])


def enviar_mensaje(
    db: Session,
    id_domicilio: int,
    contenido: str,
    tipo_remitente: str,
    id_remitente: int,
    nombre_remitente: str = None,
) -> dict:
    if not db.query(Domicilio).filter(Domicilio.ID_Domicilio == id_domicilio).first():
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")

    _chat_counter[id_domicilio] += 1
    msg = {
        "ID_Mensaje":       _chat_counter[id_domicilio],
        "ID_Domicilio":     id_domicilio,
        "Tipo_Remitente":   tipo_remitente,
        "ID_Remitente":     id_remitente,
        "Nombre_Remitente": nombre_remitente,
        "Contenido":        contenido.strip(),
        "Fecha":            datetime.now(),
    }
    _chat[id_domicilio].append(msg)
    return msg


def cambiar_estado(db: Session, id_domicilio: int, nuevo_estado: int, observaciones: str = None) -> dict:
    # La app móvil envía su propio numerado: 3=EnCamino, 4=Entregado, 5=Cancelado
    # La Venta.Estado usa IDs de la tabla global Estados:
    #   4=Confirmado, 9=EnCamino, 8=Entregado, 5=Cancelado
    FLUTTER_TO_VENTA = {
        3: 9,   # Flutter "en camino"  → DB Estado ID 9 "En Camino"
        4: 8,   # Flutter "entregado"  → DB Estado ID 8 "Entregado"
        5: 5,   # Flutter "cancelado"  → DB Estado ID 5 "Cancelado"
    }
    ESTADO_ENTREGADO_FLUTTER = 4
    ESTADOS_PROPAGAR = {3, 4, 5}

    dom = db.query(Domicilio).filter(Domicilio.ID_Domicilio == id_domicilio).first()
    if not dom:
        raise HTTPException(status_code=404, detail="Domicilio no encontrado")

    if nuevo_estado == ESTADO_ENTREGADO_FLUTTER:
        dom.Fecha_entrega = datetime.now()

    # Propagar a la Venta usando el ID correcto de la tabla global Estados
    if nuevo_estado in ESTADOS_PROPAGAR and dom.ID_Venta:
        venta = db.query(Venta).filter(Venta.ID_Venta == dom.ID_Venta).first()
        if venta:
            venta.Estado = FLUTTER_TO_VENTA.get(nuevo_estado, nuevo_estado)

    dom.Estado = nuevo_estado

    if observaciones is not None:
        dom.Observaciones = observaciones

    db.commit()
    db.refresh(dom)
    return _formato_domicilio(dom, db)
