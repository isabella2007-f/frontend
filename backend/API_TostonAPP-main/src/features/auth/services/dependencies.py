from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

from src.shared.services.database import get_db
from src.shared.services.models import Usuario, Rol, RolXPermiso, Permiso
from src.shared.services.permisos_catalogo import PERMISOS_VER, VER_HERMANO
from .schemas import TokenData

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")

oauth2_scheme = HTTPBearer()


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Decodifica el token y retorna el usuario o empleado activo."""
    token = credentials.credentials

    credenciales_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload    = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id_persona = payload.get("id")
        tipo       = payload.get("tipo")

        # Rechazar tokens de reset usados como tokens de sesión
        if payload.get("tipo") == "reset":
            raise credenciales_error

        if id_persona is None:
            raise credenciales_error

        token_data = TokenData(cedula=id_persona, tipo=tipo or "usuario", rol=payload.get("rol"))

    except JWTError:
        raise credenciales_error

    registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()

    if registro is None:
        raise credenciales_error

    if getattr(registro, "Estado", None) == 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esta cuenta ha sido desactivada",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Deriva tipo desde el rol real del registro (ignora el tipo del token para consistencia)
    tipo_real = "cliente" if registro.ID_Rol == 3 else "empleado"
    return {"registro": registro, "tipo": tipo_real, "rol": token_data.rol}


def solo_empleados(actual: dict = Depends(obtener_usuario_actual)):
    """
    Protege endpoints exclusivos de empleados (cualquier rol que no sea Cliente).
    """
    if actual["tipo"] == "cliente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este recurso"
        )
    return actual


def rol_tiene_permiso(db: Session, id_rol: int, nombre_permiso: str) -> bool:
    """
    True si el rol tiene el permiso en Rol_x_Permiso.

    Regla de auto-otorgado de `ver_`: si se pide un permiso `ver_X` y el rol no
    lo tiene explícito pero SÍ tiene cualquier otra acción del mismo módulo
    (editar_X, crear_X, anular_X, …), se considera que también tiene `ver_X`.
    Un permiso sin "ver" no sirve de nada si no puedes abrir el módulo.
    Admin (ID_Rol=1) siempre pasa.
    """
    if id_rol == 1:
        return True

    tiene = (
        db.query(RolXPermiso)
        .join(Permiso, Permiso.ID_Permiso == RolXPermiso.ID_Permiso)
        .filter(RolXPermiso.ID_Rol == id_rol, Permiso.Permiso == nombre_permiso)
        .first()
        is not None
    )
    if tiene:
        return True

    if nombre_permiso in PERMISOS_VER:
        hermanos = [p for p, ver in VER_HERMANO.items() if ver == nombre_permiso]
        if hermanos:
            return (
                db.query(RolXPermiso)
                .join(Permiso, Permiso.ID_Permiso == RolXPermiso.ID_Permiso)
                .filter(
                    RolXPermiso.ID_Rol == id_rol,
                    Permiso.Permiso.in_(hermanos),
                )
                .first()
                is not None
            )

    return False


def requiere_permiso(nombre_permiso: str):
    """
    Dependencia factory que verifica si el usuario autenticado
    tiene el permiso requerido según su rol en Rol_x_Permiso.

    Reglas:
    - Admin (ID_Rol=1): bypass total
    - TODOS los demás, clientes incluidos: el permiso tiene que estar en
      Rol_x_Permiso (con el auto-otorgado de `ver_`, ver `rol_tiene_permiso`).
      El rol Cliente necesita `crear_pedidos` cargado ahí para poder comprar;
      quitárselo deja la tienda entera devolviendo 403 al confirmar el pedido.
    """
    def verificar(
        actual: dict    = Depends(obtener_usuario_actual),
        db:     Session = Depends(get_db)
    ):
        id_rol = actual["registro"].ID_Rol

        if not rol_tiene_permiso(db, id_rol, nombre_permiso):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para realizar esta acción"
            )

        return actual

    return verificar