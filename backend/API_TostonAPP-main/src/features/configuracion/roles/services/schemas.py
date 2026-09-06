from pydantic import BaseModel
from typing import Optional


# ── Roles con naturaleza fija ──
#
# ROLES_PROTEGIDOS  → no se les puede cambiar el ESTADO (activo/inactivo).
#                     Solo Admin: bloquearlo dejaría al sistema sin administración.
# ROLES_ESTATICOS   → no se les puede editar (nombre / ícono / permisos) ni
#                     eliminar. Su estado SÍ se puede cambiar (salvo lo que diga
#                     ROLES_PROTEGIDOS). Admin (1) y Cliente (3): el
#                     comportamiento de un cliente se decide por ID_Rol == 3 en
#                     el código, no por permisos del rol.
ROLES_PROTEGIDOS = [1]      # Admin
ROLES_ESTATICOS  = [1, 3]   # Admin, Cliente


# ── Respuesta de un permiso ──
class PermisoResponse(BaseModel):
    ID_Permiso:  int
    Permiso:     str
    Descripcion: Optional[str] = None

    class Config:
        from_attributes = True


# ── Respuesta de un rol ──
class RolResponse(BaseModel):
    ID_Rol:          int
    Rol:             str
    Icono:           Optional[str] = None   # base64 string o None
    Estado:          Optional[int] = None
    total_usuarios:  int = 0
    protegido:       bool = False   # no se puede cambiar el estado (solo Admin)
    es_estatico:     bool = False   # no se puede editar ni eliminar (Admin, Cliente)
    permisos:        list[PermisoResponse] = []

    class Config:
        from_attributes = True


# ── Respuesta paginada ──
class RolListResponse(BaseModel):
    total: int
    roles: list[RolResponse]


# ── Cambiar estado ON/OFF ──
class RolEstado(BaseModel):
    Estado: int


# ── Asignar/quitar permisos a un rol (por NOMBRE de permiso) ──
class AsignarPermisos(BaseModel):
    permisos: list[str] = []


# ── Update parcial (usado internamente, el router usa Form) ──
class RolUpdate(BaseModel):
    Rol:   Optional[str] = None
    Icono: Optional[str] = None