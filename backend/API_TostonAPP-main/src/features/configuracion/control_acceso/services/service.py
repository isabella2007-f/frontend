from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.shared.services.models import Permiso, RolXPermiso, Rol
from src.features.configuracion.roles.services.service import (
    normalizar_y_validar_permisos,
)
from src.features.configuracion.roles.services.schemas import ROLES_PROTEGIDOS


def obtener_permisos(db: Session, busqueda: str = None) -> dict:
    """Lista todos los permisos disponibles en el sistema."""
    query = db.query(Permiso)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            Permiso.Permiso.ilike(termino) |
            Permiso.Descripcion.ilike(termino)
        )

    permisos = query.order_by(Permiso.ID_Permiso).all()
    return {
        "total": len(permisos),
        "permisos": [
            {
                "ID_Permiso":  p.ID_Permiso,
                "Permiso":     p.Permiso,
                "Descripcion": p.Descripcion,
            }
            for p in permisos
        ],
    }


def obtener_permiso(db: Session, id_permiso: int) -> dict:
    """Retorna un permiso por ID o lanza 404."""
    permiso = db.query(Permiso).filter(Permiso.ID_Permiso == id_permiso).first()
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")
    return {
        "ID_Permiso":  permiso.ID_Permiso,
        "Permiso":     permiso.Permiso,
        "Descripcion": permiso.Descripcion,
    }


def obtener_permisos_de_rol(db: Session, id_rol: int) -> dict:
    """Retorna todos los permisos asignados a un rol específico."""
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    permisos = (
        db.query(Permiso)
        .join(RolXPermiso, RolXPermiso.ID_Permiso == Permiso.ID_Permiso)
        .filter(RolXPermiso.ID_Rol == id_rol)
        .all()
    )
    return {
        "ID_Rol":  id_rol,
        "Rol":     rol.Rol,
        "total":   len(permisos),
        "permisos": [
            {
                "ID_Permiso":  p.ID_Permiso,
                "Permiso":     p.Permiso,
                "Descripcion": p.Descripcion,
            }
            for p in permisos
        ],
    }


def asignar_permisos_rol(db: Session, id_rol: int, permisos: list[str], actual: dict) -> dict:
    """
    Reemplaza todos los permisos del rol con la nueva lista de NOMBRES.
    Lista vacía = quitar todos los permisos.

    Comparte la validación con `roles`: anti-escalación de privilegios y forzado
    del permiso `ver_` de cada módulo (`normalizar_y_validar_permisos`).
    """
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if id_rol in ROLES_PROTEGIDOS:
        raise HTTPException(
            status_code=403,
            detail="El rol Admin está protegido: tiene todos los permisos por defecto",
        )

    ids_final = normalizar_y_validar_permisos(db, actual, permisos)

    db.query(RolXPermiso).filter(RolXPermiso.ID_Rol == id_rol).delete(synchronize_session=False)
    for id_permiso in dict.fromkeys(ids_final):
        db.add(RolXPermiso(ID_Rol=id_rol, ID_Permiso=id_permiso))

    db.commit()
    return obtener_permisos_de_rol(db, id_rol)
