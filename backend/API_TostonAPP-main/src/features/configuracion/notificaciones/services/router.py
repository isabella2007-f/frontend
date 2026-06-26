from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso, obtener_usuario_actual
from .schemas import (
    NotificacionResponse, NotificacionesResponse,
    NotificacionesClienteResponse,
)
from .service import (
    obtener_notificaciones, marcar_leida, eliminar_notificacion, limpiar_leidas,
    obtener_notificaciones_cliente,
)

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("/mis-notificaciones", response_model=NotificacionesClienteResponse)
def mis_notificaciones(
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    """Notificaciones derivadas para el cliente autenticado."""
    if actual["tipo"] != "cliente":
        raise HTTPException(status_code=403, detail="Solo disponible para clientes")
    id_usuario = actual["registro"].ID_Usuario
    return obtener_notificaciones_cliente(db, id_usuario)


@router.get("/", response_model=NotificacionesResponse)
def listar_notificaciones(
    db: Session = Depends(get_db),
    _:  dict    = Depends(requiere_permiso("ver_dashboard")),
):
    return obtener_notificaciones(db)


@router.patch("/{id_notificacion}/leer", response_model=NotificacionResponse)
def leer_notificacion(
    id_notificacion: int,
    db: Session = Depends(get_db),
    _:  dict    = Depends(requiere_permiso("ver_dashboard")),
):
    return marcar_leida(db, id_notificacion)


@router.delete("/limpiar")
def limpiar_notificaciones(
    db: Session = Depends(get_db),
    _:  dict    = Depends(requiere_permiso("ver_dashboard")),
):
    return limpiar_leidas(db)


@router.delete("/{id_notificacion}")
def borrar_notificacion(
    id_notificacion: int,
    db: Session = Depends(get_db),
    _:  dict    = Depends(requiere_permiso("ver_dashboard")),
):
    return eliminar_notificacion(db, id_notificacion)
