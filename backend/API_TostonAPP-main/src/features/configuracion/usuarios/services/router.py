from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso
from .schemas import (
    EmpleadoCreate, UsuarioCreate, PersonaUpdate, PersonaEstado,
    RolUpdateUsuario, PersonaResponse, PersonaListResponse,
)
from .service import (
    obtener_todos, obtener_persona, crear_empleado,
    crear_cliente, editar_persona, cambiar_estado, eliminar_persona,
    cambiar_rol_usuario,
)

router = APIRouter(prefix="/usuarios", tags=["Gestión de Usuarios"])


@router.get("/", response_model=PersonaListResponse)
def listar_todos(
    pagina:     int           = Query(1, ge=1),
    por_pagina: int           = Query(10, ge=1, le=100),
    busqueda:   Optional[str] = Query(None),
    db:         Session       = Depends(get_db),
    _:          dict          = Depends(requiere_permiso("ver_usuarios"))
):
    return obtener_todos(db, pagina, por_pagina, busqueda)


@router.get("/{id_persona}", response_model=PersonaResponse)
def ver_persona(
    id_persona: int,
    db:         Session = Depends(get_db),
    _:          dict    = Depends(requiere_permiso("ver_usuarios"))
):
    return obtener_persona(db, id_persona)


@router.post("/empleado", response_model=PersonaResponse, status_code=201)
def agregar_empleado(
    datos:  EmpleadoCreate,
    db:     Session = Depends(get_db),
    actual: dict    = Depends(requiere_permiso("crear_usuarios"))
):
    return crear_empleado(db, datos, actual)


@router.post("/cliente", response_model=PersonaResponse, status_code=201)
def agregar_cliente(
    datos:  UsuarioCreate,
    db:     Session = Depends(get_db),
    actual: dict    = Depends(requiere_permiso("crear_usuarios"))
):
    return crear_cliente(db, datos, actual)


@router.put("/{id_persona}", response_model=PersonaResponse)
def actualizar_persona(
    id_persona: int,
    datos:      PersonaUpdate,
    db:         Session = Depends(get_db),
    actual:     dict    = Depends(requiere_permiso("editar_usuarios"))
):
    return editar_persona(db, id_persona, datos, actual)


@router.patch("/{id_persona}/estado", response_model=PersonaResponse)
def toggle_estado(
    id_persona: int,
    datos:      PersonaEstado,
    db:         Session = Depends(get_db),
    actual:     dict    = Depends(requiere_permiso("editar_usuarios"))
):
    return cambiar_estado(db, id_persona, datos.Estado, actual)


@router.patch("/{id_persona}/rol", response_model=PersonaResponse)
def cambiar_rol(
    id_persona: int,
    datos:      RolUpdateUsuario,
    db:         Session = Depends(get_db),
    actual:     dict    = Depends(requiere_permiso("cambiar_rol_usuarios"))
):
    """Acción rápida: cambia el rol de un usuario. Blindaje completo en el service."""
    return cambiar_rol_usuario(db, id_persona, datos.ID_Rol, actual)


@router.delete("/{id_persona}")
def borrar_persona(
    id_persona: int,
    db:         Session = Depends(get_db),
    actual:     dict    = Depends(requiere_permiso("eliminar_usuarios"))
):
    return eliminar_persona(db, id_persona, actual)
