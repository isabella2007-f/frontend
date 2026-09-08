"""Rutas del módulo Ubicaciones.

Prefijo: /api/ubicaciones

  - /checkout/*  → lectura para el cliente (autenticado, cualquier rol). Solo
                   devuelve lo disponible para domicilio. NO usa permisos de panel.
  - el resto     → panel de gestión, protegido con requiere_permiso("*_ubicaciones").
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso, obtener_usuario_actual

from . import service, ofertas
from .schemas import (
    BarrioCreate, BarrioUpdate, EstadoInput, AccionMasivaInput,
    OfertaCreate, OfertaUpdate,
    BarrioListResponse, BarrioDetalle, OfertaListResponse, OfertaOut,
)

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])


# ═══════════════════════════════════════════════════════════════════════
# CHECKOUT / CLIENTE — solo lectura de lo disponible
# ═══════════════════════════════════════════════════════════════════════

@router.get("/checkout/departamentos")
def checkout_departamentos(
    db: Session = Depends(get_db),
    _: dict = Depends(obtener_usuario_actual),
):
    return [d for d in service.listar_departamentos(db) if d["estado_efectivo"]]


@router.get("/checkout/ciudades")
def checkout_ciudades(
    id_departamento: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    _: dict = Depends(obtener_usuario_actual),
):
    return service.listar_ciudades(db, id_departamento=id_departamento, solo_activas=True)


@router.get("/checkout/barrios")
def checkout_barrios(
    id_ciudad: int = Query(..., gt=0),
    texto: Optional[str] = Query(None),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: dict = Depends(obtener_usuario_actual),
):
    return service.listar_barrios(
        db, pagina=pagina, por_pagina=por_pagina, id_ciudad=id_ciudad,
        texto=texto, solo_disponibles=True,
    )


@router.get("/checkout/cobertura/{id_barrio}")
def checkout_cobertura(
    id_barrio: int,
    db: Session = Depends(get_db),
    _: dict = Depends(obtener_usuario_actual),
):
    """Dado un barrio: ¿está disponible para domicilio? ¿a qué precio hoy
    (con ofertas)? Lo usa el checkout para mostrar precio tachado + etiqueta."""
    return service.cobertura_barrio(db, id_barrio)


# ═══════════════════════════════════════════════════════════════════════
# PANEL — jerarquía (lectura)
# ═══════════════════════════════════════════════════════════════════════

@router.get("/resumen")
def resumen(
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    """Contadores del catálogo (tarjetas del panel)."""
    return service.resumen(db)


@router.get("/departamentos")
def listar_departamentos(
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return service.listar_departamentos(db)


@router.get("/ciudades")
def listar_ciudades(
    id_departamento: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return service.listar_ciudades(db, id_departamento=id_departamento)


@router.get("/barrios", response_model=BarrioListResponse)
def listar_barrios(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    id_ciudad: Optional[int] = Query(None, gt=0),
    id_departamento: Optional[int] = Query(None, gt=0),
    texto: Optional[str] = Query(None),
    estado_efectivo: Optional[str] = Query(None, pattern="^(activo|inactivo)$"),
    es_base: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return service.listar_barrios(
        db, pagina=pagina, por_pagina=por_pagina, id_ciudad=id_ciudad,
        id_departamento=id_departamento, texto=texto,
        estado_efectivo=estado_efectivo, es_base=es_base,
    )


@router.get("/barrios/{id_barrio}", response_model=BarrioDetalle)
def detalle_barrio(
    id_barrio: int,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return service.detalle_barrio(db, id_barrio)


# ═══════════════════════════════════════════════════════════════════════
# PANEL — crear / editar / eliminar barrio
# ═══════════════════════════════════════════════════════════════════════

@router.post("/barrios", response_model=BarrioDetalle, status_code=201)
def crear_barrio(
    datos: BarrioCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("crear_ubicaciones")),
):
    return service.crear_barrio(db, datos)


@router.put("/barrios/{id_barrio}", response_model=BarrioDetalle)
def editar_barrio(
    id_barrio: int,
    datos: BarrioUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("editar_ubicaciones")),
):
    return service.editar_barrio(db, id_barrio, datos)


@router.delete("/barrios/{id_barrio}")
def eliminar_barrio(
    id_barrio: int,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("eliminar_ubicaciones")),
):
    return service.eliminar_barrio(db, id_barrio)


# ═══════════════════════════════════════════════════════════════════════
# PANEL — estados (individual + masivo)
# ═══════════════════════════════════════════════════════════════════════

@router.patch("/departamentos/{id_departamento}/estado")
def estado_departamento(
    id_departamento: int,
    datos: EstadoInput,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("cambiar_estado_ubicaciones")),
):
    return service.cambiar_estado_departamento(db, id_departamento, datos.Estado)


@router.patch("/ciudades/{id_ciudad}/estado")
def estado_ciudad(
    id_ciudad: int,
    datos: EstadoInput,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("cambiar_estado_ubicaciones")),
):
    return service.cambiar_estado_ciudad(db, id_ciudad, datos.Estado)


@router.patch("/barrios/{id_barrio}/estado")
def estado_barrio(
    id_barrio: int,
    datos: EstadoInput,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("cambiar_estado_ubicaciones")),
):
    return service.cambiar_estado_barrio(db, id_barrio, datos.Estado)


@router.post("/estado-masivo")
def estado_masivo(
    datos: AccionMasivaInput,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("cambiar_estado_ubicaciones")),
):
    return service.accion_masiva_estado(db, datos)


# ═══════════════════════════════════════════════════════════════════════
# PANEL — ofertas de domicilio
# ═══════════════════════════════════════════════════════════════════════

@router.get("/ofertas", response_model=OfertaListResponse)
def listar_ofertas(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    texto: Optional[str] = Query(None),
    estado: Optional[int] = Query(None, ge=1, le=2),
    tipo: Optional[str] = Query(None, pattern="^(descuento|recargo)$"),
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return ofertas.listar_ofertas(
        db, pagina=pagina, por_pagina=por_pagina, texto=texto, estado=estado, tipo=tipo,
    )


@router.get("/ofertas/{id_oferta}")
def obtener_oferta(
    id_oferta: int,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("ver_ubicaciones")),
):
    return ofertas.obtener_oferta(db, id_oferta)


@router.post("/ofertas", response_model=OfertaOut, status_code=201)
def crear_oferta(
    datos: OfertaCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("crear_ubicaciones")),
):
    return ofertas.crear_oferta(db, datos)


@router.put("/ofertas/{id_oferta}", response_model=OfertaOut)
def editar_oferta(
    id_oferta: int,
    datos: OfertaUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("editar_ubicaciones")),
):
    return ofertas.editar_oferta(db, id_oferta, datos)


@router.patch("/ofertas/{id_oferta}/estado")
def estado_oferta(
    id_oferta: int,
    datos: EstadoInput,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("cambiar_estado_ubicaciones")),
):
    return ofertas.cambiar_estado_oferta(db, id_oferta, datos.Estado)


@router.delete("/ofertas/{id_oferta}")
def eliminar_oferta(
    id_oferta: int,
    db: Session = Depends(get_db),
    _: dict = Depends(requiere_permiso("eliminar_ubicaciones")),
):
    return ofertas.eliminar_oferta(db, id_oferta)
