from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso
from .schemas import CompraCreate, CompraUpdate, CompraResponse, CompraListResponse, CompletarCompraInput
from .service import obtener_compras, obtener_compra, crear_compra, editar_compra, completar_compra, anular_compra

router = APIRouter(prefix="/compras", tags=["Compras"])


@router.get("/", response_model=CompraListResponse)
def listar_compras(
    pagina:       int           = Query(1, ge=1),
    por_pagina:   int           = Query(10, ge=1, le=100),
    busqueda:     Optional[str] = Query(None),
    id_proveedor: Optional[int] = Query(None),
    db:           Session       = Depends(get_db),
    _:            dict          = Depends(requiere_permiso("ver_insumos")),
):
    """Lista paginada de compras. Filtra por proveedor o busca por método de pago."""
    return obtener_compras(db, pagina, por_pagina, busqueda, id_proveedor)


@router.get("/{id_compra}", response_model=CompraResponse)
def ver_compra(
    id_compra: int,
    db:        Session = Depends(get_db),
    _:         dict    = Depends(requiere_permiso("ver_insumos")),
):
    """Retorna el detalle completo de una compra con sus ítems."""
    return obtener_compra(db, id_compra)


@router.post("/", response_model=CompraResponse, status_code=201)
def registrar_compra(
    datos: CompraCreate,
    db:    Session = Depends(get_db),
    _:     dict    = Depends(requiere_permiso("crear_insumos")),
):
    """Registra la compra en estado Pendiente. El stock se aplica al confirmar llegada."""
    return crear_compra(db, datos)


@router.put("/{id_compra}", response_model=CompraResponse)
def actualizar_compra(
    id_compra: int,
    datos:     CompraUpdate,
    db:        Session = Depends(get_db),
    _:         dict    = Depends(requiere_permiso("editar_compras")),
):
    """Edita los campos básicos de una compra (método, notas, proveedor si está pendiente)."""
    return editar_compra(db, id_compra, datos)


@router.patch("/{id_compra}/completar", response_model=CompraResponse)
def confirmar_llegada(
    id_compra: int,
    datos:     Optional[CompletarCompraInput] = Body(None),
    db:        Session = Depends(get_db),
    _:         dict    = Depends(requiere_permiso("editar_insumos")),
):
    """Confirma la llegada de la compra: aplica stock y la marca como Completada."""
    fecha_llegada = datos.Fecha_Llegada if datos else None
    return completar_compra(db, id_compra, fecha_llegada)


@router.patch("/{id_compra}/anular", response_model=CompraResponse)
def anular(
    id_compra: int,
    db:        Session = Depends(get_db),
    _:         dict    = Depends(requiere_permiso("editar_insumos")),
):
    """Anula la compra. Si estaba Completada, revierte el stock de los insumos."""
    return anular_compra(db, id_compra)
