import unicodedata
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.shared.services.models import (
    Usuario, TarifaEmpleado, RegistroHoras, Liquidacion,
    OrdenProduccion, Domicilio,
)
from .schemas import (
    TarifaCreate, RegistroHorasCreate, LiquidacionCreate,
    LiquidacionEdit, LiquidacionPago, LiquidacionAnulacion,
)

_BOGOTA = ZoneInfo("America/Bogota")


def _now() -> datetime:
    return datetime.now(_BOGOTA).replace(tzinfo=None)


def _nombre_empleado(u: Optional[Usuario]) -> Optional[str]:
    if not u:
        return None
    return f"{u.Nombre} {u.Apellidos}"


def _empleado_activo(db: Session, id_empleado: int) -> Usuario:
    u = db.query(Usuario).filter(Usuario.ID_Usuario == id_empleado).first()
    if not u:
        raise HTTPException(404, "Empleado no encontrado")
    if u.Estado not in (1,):  # 1 = Activo
        raise HTTPException(400, "El empleado no está activo")
    return u


def _normalizar(texto: str) -> str:
    """Elimina tildes y convierte a minúsculas para búsqueda."""
    nfkd = unicodedata.normalize("NFD", texto)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()


def obtener_empleados_para_liquidaciones(db: Session) -> list:
    usuarios = (
        db.query(Usuario)
        .filter(
            Usuario.Estado == 1,
            or_(Usuario.ID_Rol != 3, Usuario.ID_Rol.is_(None)),
        )
        .order_by(Usuario.Nombre, Usuario.Apellidos)
        .all()
    )
    return [
        {"id": u.ID_Usuario, "nombre": u.Nombre, "apellidos": u.Apellidos}
        for u in usuarios
    ]


# ── Tarifas ───────────────────────────────────────────────────────────────────

def crear_tarifa(db: Session, datos: TarifaCreate) -> TarifaEmpleado:
    _empleado_activo(db, datos.ID_Empleado)

    # Cierra la tarifa vigente anterior (Fecha_Fin NULL = vigente)
    activa = (
        db.query(TarifaEmpleado)
        .filter(
            TarifaEmpleado.ID_Empleado == datos.ID_Empleado,
            TarifaEmpleado.Fecha_Fin.is_(None),
        )
        .first()
    )
    if activa:
        activa.Fecha_Fin = datos.Fecha_Inicio

    nueva = TarifaEmpleado(
        ID_Empleado=datos.ID_Empleado,
        Tarifa_Hora=Decimal(str(datos.Tarifa_Hora)),
        Fecha_Inicio=datos.Fecha_Inicio,
        Fecha_Fin=None,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


def obtener_tarifas(db: Session, id_empleado: Optional[int] = None):
    q = db.query(TarifaEmpleado)
    if id_empleado:
        q = q.filter(TarifaEmpleado.ID_Empleado == id_empleado)
    return q.order_by(TarifaEmpleado.Fecha_Inicio.desc()).all()


def tarifa_en_fecha(db: Session, id_empleado: int, fecha: datetime) -> Optional[TarifaEmpleado]:
    """Retorna la tarifa vigente en una fecha dada."""
    return (
        db.query(TarifaEmpleado)
        .filter(
            TarifaEmpleado.ID_Empleado == id_empleado,
            TarifaEmpleado.Fecha_Inicio <= fecha,
            or_(
                TarifaEmpleado.Fecha_Fin.is_(None),
                TarifaEmpleado.Fecha_Fin > fecha,
            ),
        )
        .order_by(TarifaEmpleado.Fecha_Inicio.desc())
        .first()
    )


def _formato_tarifa(t: TarifaEmpleado, db: Session) -> dict:
    u = db.query(Usuario).filter(Usuario.ID_Usuario == t.ID_Empleado).first()
    return {
        "ID_Tarifa":       t.ID_Tarifa,
        "ID_Empleado":     t.ID_Empleado,
        "nombre_empleado": _nombre_empleado(u),
        "Tarifa_Hora":     float(t.Tarifa_Hora),
        "Fecha_Inicio":    t.Fecha_Inicio,
        "Fecha_Fin":       t.Fecha_Fin,
        "vigente":         t.Fecha_Fin is None,
    }


# ── Registros de horas ────────────────────────────────────────────────────────

def _origen_label(r: RegistroHoras) -> str:
    if r.ID_Orden_Produccion:
        return f"Orden de producción #{r.ID_Orden_Produccion}"
    if r.ID_Domicilio:
        return f"Entrega #{r.ID_Domicilio}"
    return "General"


def _formato_registro(r: RegistroHoras, db: Session) -> dict:
    u = db.query(Usuario).filter(Usuario.ID_Usuario == r.ID_Empleado).first()
    return {
        "ID_Registro":         r.ID_Registro,
        "ID_Empleado":         r.ID_Empleado,
        "nombre_empleado":     _nombre_empleado(u),
        "ID_Orden_Produccion": r.ID_Orden_Produccion,
        "ID_Domicilio":        r.ID_Domicilio,
        "origen_label":        _origen_label(r),
        "Fecha":               r.Fecha,
        "Hora_Inicio":         r.Hora_Inicio,
        "Hora_Fin":            r.Hora_Fin,
        "Horas_Trabajadas":    float(r.Horas_Trabajadas),
        "Estado":              r.Estado,
        "ID_Liquidacion":      r.ID_Liquidacion,
    }


def crear_registro(db: Session, datos: RegistroHorasCreate) -> RegistroHoras:
    _empleado_activo(db, datos.ID_Empleado)

    # Validar que la orden o domicilio existan si se especificaron
    if datos.ID_Orden_Produccion:
        op = db.query(OrdenProduccion).filter(
            OrdenProduccion.ID_Orden_Produccion == datos.ID_Orden_Produccion
        ).first()
        if not op:
            raise HTTPException(404, "Orden de producción no encontrada")

    if datos.ID_Domicilio:
        dom = db.query(Domicilio).filter(
            Domicilio.ID_Domicilio == datos.ID_Domicilio
        ).first()
        if not dom:
            raise HTTPException(404, "Domicilio no encontrado")

    # Verificar cruce de horarios con jornadas existentes del mismo empleado
    cruce = (
        db.query(RegistroHoras)
        .filter(
            RegistroHoras.ID_Empleado == datos.ID_Empleado,
            RegistroHoras.Hora_Fin   > datos.Hora_Inicio,
            RegistroHoras.Hora_Inicio < datos.Hora_Fin,
        )
        .first()
    )
    if cruce:
        raise HTTPException(
            409,
            f"El horario se cruza con un registro existente "
            f"({cruce.Hora_Inicio.strftime('%H:%M')} – {cruce.Hora_Fin.strftime('%H:%M')} "
            f"del {cruce.Fecha.strftime('%d/%m/%Y')})",
        )

    delta = datos.Hora_Fin - datos.Hora_Inicio
    horas = Decimal(str(round(delta.total_seconds() / 3600, 4)))

    r = RegistroHoras(
        ID_Empleado=datos.ID_Empleado,
        ID_Orden_Produccion=datos.ID_Orden_Produccion,
        ID_Domicilio=datos.ID_Domicilio,
        Fecha=datos.Fecha,
        Hora_Inicio=datos.Hora_Inicio,
        Hora_Fin=datos.Hora_Fin,
        Horas_Trabajadas=horas,
        Estado="pendiente",
        ID_Liquidacion=None,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def obtener_registros(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 20,
    id_empleado: Optional[int] = None,
    estado: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
) -> dict:
    q = db.query(RegistroHoras)
    if id_empleado:
        q = q.filter(RegistroHoras.ID_Empleado == id_empleado)
    if estado:
        q = q.filter(RegistroHoras.Estado == estado)
    if fecha_inicio:
        q = q.filter(RegistroHoras.Fecha >= fecha_inicio)
    if fecha_fin:
        q = q.filter(RegistroHoras.Fecha <= fecha_fin)

    total = q.count()
    items = q.order_by(RegistroHoras.Fecha.desc(), RegistroHoras.Hora_Inicio.desc())\
             .offset((pagina - 1) * por_pagina).limit(por_pagina).all()

    return {
        "items":     [_formato_registro(r, db) for r in items],
        "total":     total,
        "pagina":    pagina,
        "por_pagina": por_pagina,
    }


def eliminar_registro(db: Session, id_registro: int) -> None:
    r = db.query(RegistroHoras).filter(RegistroHoras.ID_Registro == id_registro).first()
    if not r:
        raise HTTPException(404, "Registro de horas no encontrado")
    if r.Estado != "pendiente":
        raise HTTPException(400, "Solo se pueden eliminar registros en estado pendiente")
    db.delete(r)
    db.commit()


# ── Liquidaciones ─────────────────────────────────────────────────────────────

def _recalcular_total(db: Session, liq: Liquidacion) -> None:
    """Recalcula el total de la liquidación sumando subtotales de cada registro."""
    total = Decimal("0")
    for r in liq.registros:
        tarifa = tarifa_en_fecha(db, r.ID_Empleado, r.Fecha)
        valor_hora = Decimal(str(tarifa.Tarifa_Hora)) if tarifa else Decimal("0")
        total += Decimal(str(r.Horas_Trabajadas)) * valor_hora
    liq.Total = total


def _formato_liquidacion(liq: Liquidacion, db: Session, con_registros: bool = False) -> dict:
    u = db.query(Usuario).filter(Usuario.ID_Usuario == liq.ID_Empleado).first()
    data = {
        "ID_Liquidacion":   liq.ID_Liquidacion,
        "ID_Empleado":      liq.ID_Empleado,
        "nombre_empleado":  _nombre_empleado(u),
        "Fecha_Inicio":     liq.Fecha_Inicio,
        "Fecha_Fin":        liq.Fecha_Fin,
        "Total":            float(liq.Total),
        "Estado":           liq.Estado,
        "Motivo_Anulacion": liq.Motivo_Anulacion,
        "Fecha_Anulacion":  liq.Fecha_Anulacion,
        "Metodo_Pago":      liq.Metodo_Pago,
        "Fecha_Pago":       liq.Fecha_Pago,
        "Fecha_Creacion":   liq.Fecha_Creacion,
        "registros":        None,
    }
    if con_registros:
        desglose = []
        for r in liq.registros:
            tarifa = tarifa_en_fecha(db, r.ID_Empleado, r.Fecha)
            valor_hora = float(tarifa.Tarifa_Hora) if tarifa else 0.0
            subtotal = round(float(r.Horas_Trabajadas) * valor_hora, 2)
            desglose.append({
                "ID_Registro":      r.ID_Registro,
                "Fecha":            r.Fecha,
                "Hora_Inicio":      r.Hora_Inicio,
                "Hora_Fin":         r.Hora_Fin,
                "Horas_Trabajadas": float(r.Horas_Trabajadas),
                "origen_label":     _origen_label(r),
                "tarifa_aplicada":  valor_hora,
                "subtotal":         subtotal,
            })
        data["registros"] = desglose
    return data


def generar_liquidacion(db: Session, datos: LiquidacionCreate) -> Liquidacion:
    _empleado_activo(db, datos.ID_Empleado)

    # Busca registros pendientes en el rango
    registros = (
        db.query(RegistroHoras)
        .filter(
            RegistroHoras.ID_Empleado == datos.ID_Empleado,
            RegistroHoras.Estado == "pendiente",
            RegistroHoras.Fecha >= datos.Fecha_Inicio,
            RegistroHoras.Fecha <= datos.Fecha_Fin,
        )
        .all()
    )

    if not registros:
        raise HTTPException(
            400,
            "El empleado no tiene registros de horas pendientes en el rango indicado",
        )

    # Calcula el total usando la tarifa vigente en cada fecha
    total = Decimal("0")
    for r in registros:
        tarifa = tarifa_en_fecha(db, datos.ID_Empleado, r.Fecha)
        if not tarifa:
            raise HTTPException(
                400,
                f"El empleado no tiene tarifa registrada para la fecha "
                f"{r.Fecha.strftime('%d/%m/%Y')}. Configure una tarifa primero.",
            )
        total += Decimal(str(r.Horas_Trabajadas)) * Decimal(str(tarifa.Tarifa_Hora))

    liq = Liquidacion(
        ID_Empleado=datos.ID_Empleado,
        Fecha_Inicio=datos.Fecha_Inicio,
        Fecha_Fin=datos.Fecha_Fin,
        Total=total,
        Estado="Borrador",
        Fecha_Creacion=_now(),
    )
    db.add(liq)
    db.flush()  # obtiene ID_Liquidacion sin commit

    # Bloquea los registros
    for r in registros:
        r.Estado = "en_liquidacion"
        r.ID_Liquidacion = liq.ID_Liquidacion

    db.commit()
    db.refresh(liq)
    return liq


def obtener_liquidaciones(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 20,
    id_empleado: Optional[int] = None,
    estado: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    busqueda: Optional[str] = None,
) -> dict:
    q = db.query(Liquidacion)
    if id_empleado:
        q = q.filter(Liquidacion.ID_Empleado == id_empleado)
    if estado:
        q = q.filter(Liquidacion.Estado == estado)
    if fecha_inicio:
        q = q.filter(Liquidacion.Fecha_Inicio >= fecha_inicio)
    if fecha_fin:
        q = q.filter(Liquidacion.Fecha_Fin <= fecha_fin)
    if busqueda:
        # filtrar por nombre de empleado: se hace en Python tras traer resultados
        norm = _normalizar(busqueda)
        todos = q.all()
        filtrados = []
        for liq in todos:
            u = db.query(Usuario).filter(Usuario.ID_Usuario == liq.ID_Empleado).first()
            nombre = _normalizar(f"{u.Nombre} {u.Apellidos}") if u else ""
            if norm in nombre:
                filtrados.append(liq)
        total = len(filtrados)
        pagina_items = filtrados[(pagina - 1) * por_pagina: pagina * por_pagina]
        return {
            "items":     [_formato_liquidacion(l, db) for l in pagina_items],
            "total":     total,
            "pagina":    pagina,
            "por_pagina": por_pagina,
        }

    total = q.count()
    items = q.order_by(Liquidacion.Fecha_Creacion.desc())\
             .offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    return {
        "items":     [_formato_liquidacion(l, db) for l in items],
        "total":     total,
        "pagina":    pagina,
        "por_pagina": por_pagina,
    }


def obtener_liquidacion(db: Session, id_liquidacion: int) -> dict:
    liq = db.query(Liquidacion).filter(Liquidacion.ID_Liquidacion == id_liquidacion).first()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    return _formato_liquidacion(liq, db, con_registros=True)


def editar_liquidacion(db: Session, id_liquidacion: int, datos: LiquidacionEdit) -> dict:
    liq = db.query(Liquidacion).filter(Liquidacion.ID_Liquidacion == id_liquidacion).first()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.Estado != "Borrador":
        raise HTTPException(
            400,
            f"Solo se pueden editar liquidaciones en Borrador. "
            f"Esta está en estado '{liq.Estado}'.",
        )

    # Quitar registros
    for id_r in datos.registros_quitar:
        r = db.query(RegistroHoras).filter(RegistroHoras.ID_Registro == id_r).first()
        if not r:
            continue
        if r.ID_Liquidacion != id_liquidacion:
            raise HTTPException(400, f"El registro {id_r} no pertenece a esta liquidación")
        r.Estado = "pendiente"
        r.ID_Liquidacion = None

    # Agregar registros
    for id_r in datos.registros_agregar:
        r = db.query(RegistroHoras).filter(RegistroHoras.ID_Registro == id_r).first()
        if not r:
            raise HTTPException(404, f"Registro {id_r} no encontrado")
        if r.Estado != "pendiente":
            raise HTTPException(
                400, f"El registro {id_r} ya está en estado '{r.Estado}' y no está disponible"
            )
        if r.ID_Empleado != liq.ID_Empleado:
            raise HTTPException(400, f"El registro {id_r} no pertenece al mismo empleado")
        r.Estado = "en_liquidacion"
        r.ID_Liquidacion = id_liquidacion

    db.flush()
    # Recalcular total
    _recalcular_total(db, liq)
    db.commit()
    db.refresh(liq)
    return _formato_liquidacion(liq, db, con_registros=True)


def registrar_pago(db: Session, id_liquidacion: int, datos: LiquidacionPago) -> dict:
    liq = db.query(Liquidacion).filter(Liquidacion.ID_Liquidacion == id_liquidacion).first()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.Estado != "Borrador":
        raise HTTPException(
            400,
            f"No se puede registrar pago en una liquidación con estado '{liq.Estado}'",
        )

    liq.Estado = "Pagada"
    liq.Metodo_Pago = datos.Metodo_Pago
    liq.Fecha_Pago = datos.Fecha_Pago

    # Marcar registros como liquidados
    for r in liq.registros:
        r.Estado = "liquidado"

    db.commit()
    db.refresh(liq)
    return _formato_liquidacion(liq, db, con_registros=True)


def anular_liquidacion(db: Session, id_liquidacion: int, datos: LiquidacionAnulacion) -> dict:
    liq = db.query(Liquidacion).filter(Liquidacion.ID_Liquidacion == id_liquidacion).first()
    if not liq:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.Estado == "Anulada":
        raise HTTPException(400, "La liquidación ya está anulada")
    if liq.Estado == "Pagada":
        raise HTTPException(400, "No se puede anular una liquidación ya pagada")

    liq.Estado = "Anulada"
    liq.Motivo_Anulacion = datos.Motivo_Anulacion
    liq.Fecha_Anulacion = _now()

    # Liberar registros de horas
    for r in liq.registros:
        r.Estado = "pendiente"
        r.ID_Liquidacion = None

    db.commit()
    db.refresh(liq)
    return _formato_liquidacion(liq, db, con_registros=True)
