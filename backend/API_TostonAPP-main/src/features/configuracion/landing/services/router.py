from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import obtener_usuario_actual
from .schemas import LandingConfigUpdate
from .service import obtener_config, guardar_config, CAMPOS_HORARIO

router = APIRouter(prefix="/configuracion/landing", tags=["Landing"])


def _es_admin(actual: dict) -> bool:
    registro = actual.get("registro")
    return bool(registro) and (
        getattr(registro, "ID_Usuario", None) == 1
        or getattr(registro, "ID_Rol", None) == 1
    )


@router.get("")
def get_landing(db: Session = Depends(get_db)):
    """Devuelve la configuración de la landing page. Es público."""
    return obtener_config(db)


@router.put("")
def put_landing(
    datos: LandingConfigUpdate,
    db:    Session = Depends(get_db),
    actual: dict   = Depends(obtener_usuario_actual),
):
    """Guarda la configuración de la landing page. Solo empleados/admin; el
    horario de atención solo lo puede cambiar un administrador."""
    if actual.get("tipo") == "cliente":
        raise HTTPException(status_code=403, detail="Sin acceso")

    campos = datos.model_dump(exclude_none=True)

    # El horario de atención lo edita SOLO un admin. Para el resto se ignoran
    # esos campos (el panel envía el formulario completo).
    if not _es_admin(actual):
        for campo in CAMPOS_HORARIO:
            campos.pop(campo, None)

    return guardar_config(db, campos)
