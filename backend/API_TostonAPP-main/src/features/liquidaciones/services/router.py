from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso
from .schemas import (
    TarifaCreate, RegistroHorasCreate, LiquidacionCreate,
    LiquidacionEdit, LiquidacionPago, LiquidacionAnulacion,
)
from .service import (
    crear_tarifa, obtener_tarifas,
    crear_registro, obtener_registros, eliminar_registro,
    generar_liquidacion, obtener_liquidaciones, obtener_liquidacion,
    editar_liquidacion, registrar_pago, anular_liquidacion,
)

router = APIRouter(prefix="/liquidaciones", tags=["Liquidaciones"])

# Todos los endpoints requieren ver_liquidaciones.
# Admin (ID_Rol==1) tiene bypass total; ningún otro rol tiene este permiso.
_P = "ver_liquidaciones"


# ── Tarifas ───────────────────────────────────────────────────────────────────

@router.get("/tarifas")
def listar_tarifas(
    id_empleado: Optional[int] = Query(None),
    db:          Session       = Depends(get_db),
    _actual:     dict          = Depends(requiere_permiso(_P)),
):
    tarifas = obtener_tarifas(db, id_empleado)
    from .service import _formato_tarifa
    return [_formato_tarifa(t, db) for t in tarifas]


@router.post("/tarifas", status_code=201)
def crear_nueva_tarifa(
    datos:   TarifaCreate,
    db:      Session = Depends(get_db),
    _actual: dict    = Depends(requiere_permiso(_P)),
):
    t = crear_tarifa(db, datos)
    from .service import _formato_tarifa
    return _formato_tarifa(t, db)


# ── Registros de horas ────────────────────────────────────────────────────────

@router.get("/registros")
def listar_registros(
    pagina:       int            = Query(1, ge=1),
    por_pagina:   int            = Query(20, ge=1, le=100),
    id_empleado:  Optional[int]  = Query(None),
    estado:       Optional[str]  = Query(None),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin:    Optional[datetime] = Query(None),
    db:           Session        = Depends(get_db),
    _actual:      dict           = Depends(requiere_permiso(_P)),
):
    return obtener_registros(db, pagina, por_pagina, id_empleado, estado, fecha_inicio, fecha_fin)


@router.post("/registros", status_code=201)
def registrar_horas(
    datos:   RegistroHorasCreate,
    db:      Session = Depends(get_db),
    _actual: dict    = Depends(requiere_permiso(_P)),
):
    from .service import _formato_registro
    r = crear_registro(db, datos)
    return _formato_registro(r, db)


@router.delete("/registros/{id_registro}", status_code=204)
def borrar_registro(
    id_registro: int,
    db:          Session = Depends(get_db),
    _actual:     dict    = Depends(requiere_permiso(_P)),
):
    eliminar_registro(db, id_registro)


# ── Liquidaciones ─────────────────────────────────────────────────────────────

@router.get("/")
def listar_liquidaciones(
    pagina:       int            = Query(1, ge=1),
    por_pagina:   int            = Query(20, ge=1, le=100),
    id_empleado:  Optional[int]  = Query(None),
    estado:       Optional[str]  = Query(None),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin:    Optional[datetime] = Query(None),
    busqueda:     Optional[str]  = Query(None),
    db:           Session        = Depends(get_db),
    _actual:      dict           = Depends(requiere_permiso(_P)),
):
    return obtener_liquidaciones(
        db, pagina, por_pagina, id_empleado, estado, fecha_inicio, fecha_fin, busqueda
    )


@router.post("/", status_code=201)
def nueva_liquidacion(
    datos:   LiquidacionCreate,
    db:      Session = Depends(get_db),
    _actual: dict    = Depends(requiere_permiso(_P)),
):
    liq = generar_liquidacion(db, datos)
    return obtener_liquidacion(db, liq.ID_Liquidacion)


@router.get("/{id_liquidacion}")
def detalle_liquidacion(
    id_liquidacion: int,
    db:             Session = Depends(get_db),
    _actual:        dict    = Depends(requiere_permiso(_P)),
):
    return obtener_liquidacion(db, id_liquidacion)


@router.put("/{id_liquidacion}")
def actualizar_liquidacion(
    id_liquidacion: int,
    datos:          LiquidacionEdit,
    db:             Session = Depends(get_db),
    _actual:        dict    = Depends(requiere_permiso(_P)),
):
    return editar_liquidacion(db, id_liquidacion, datos)


@router.post("/{id_liquidacion}/pagar")
def pagar_liquidacion(
    id_liquidacion: int,
    datos:          LiquidacionPago,
    db:             Session = Depends(get_db),
    _actual:        dict    = Depends(requiere_permiso(_P)),
):
    return registrar_pago(db, id_liquidacion, datos)


@router.post("/{id_liquidacion}/anular")
def anular_liq(
    id_liquidacion: int,
    datos:          LiquidacionAnulacion,
    db:             Session = Depends(get_db),
    _actual:        dict    = Depends(requiere_permiso(_P)),
):
    return anular_liquidacion(db, id_liquidacion, datos)
