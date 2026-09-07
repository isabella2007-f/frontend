from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import obtener_usuario_actual
from .schemas import LandingConfigUpdate
from .service import obtener_config, guardar_config

router = APIRouter(prefix="/configuracion/landing", tags=["Landing"])


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
    """Guarda la configuración de la landing page. Solo empleados/admin."""
    if actual.get("tipo") == "cliente":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sin acceso")
    return guardar_config(db, datos.model_dump(exclude_none=True))
