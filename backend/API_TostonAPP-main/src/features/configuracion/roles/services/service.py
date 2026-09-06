from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from src.shared.services.models import (
    Rol, Permiso, RolXPermiso, Usuario
)
from src.shared.services.permisos_catalogo import (
    MODULO_DE_PERMISO, VER_DE_MODULO,
)
from src.features.auth.services.dependencies import rol_tiene_permiso
from .schemas import RolUpdate, ROLES_PROTEGIDOS, ROLES_ESTATICOS

# Estados quemados
ESTADO_ACTIVO   = 1
ESTADO_INACTIVO = 2


def normalizar_y_validar_permisos(
    db:      Session,
    actual:  dict,
    nombres: list[str],
) -> list[int]:
    """
    Convierte una lista de NOMBRES de permiso en IDs, aplicando dos reglas de
    seguridad que NO dependen del frontend:

    1. Anti-escalación: un usuario no-Admin no puede asignar a un rol un permiso
       que él mismo no posee.
    2. `ver_` obligatorio: si el rol termina con cualquier acción ≠ "ver" de un
       módulo, se fuerza el `ver_` de ese módulo.

    Nombres desconocidos → 400 (antes se ignoraban en silencio).
    """
    pedidos = list(dict.fromkeys(nombres))  # dedup conservando orden

    filas = db.query(Permiso).filter(Permiso.Permiso.in_(pedidos)).all() if pedidos else []
    id_por_nombre = {p.Permiso: p.ID_Permiso for p in filas}

    desconocidos = [n for n in pedidos if n not in id_por_nombre]
    if desconocidos:
        raise HTTPException(
            status_code=400,
            detail=f"Permiso(s) inexistente(s): {', '.join(desconocidos)}",
        )

    es_admin = actual["registro"].ID_Rol == 1
    if not es_admin:
        ajenos = [
            n for n in pedidos
            if not rol_tiene_permiso(db, actual["registro"].ID_Rol, n)
        ]
        if ajenos:
            raise HTTPException(
                status_code=403,
                detail=(
                    "No puedes asignar permisos que tú mismo no posees: "
                    + ", ".join(ajenos)
                ),
            )

    # Forzar el `ver_` de cada módulo que tenga alguna acción ≠ "ver"
    # (aquí SÍ cuenta `crear_`: si el rol crea en un módulo, debe poder verlo).
    finales = set(pedidos)
    for n in pedidos:
        modulo = MODULO_DE_PERMISO.get(n)
        ver = VER_DE_MODULO.get(modulo) if modulo else None
        if ver and n != ver:
            finales.add(ver)

    faltan_ver = [v for v in finales if v not in id_por_nombre]
    if faltan_ver:
        extra = db.query(Permiso).filter(Permiso.Permiso.in_(faltan_ver)).all()
        id_por_nombre.update({p.Permiso: p.ID_Permiso for p in extra})

    return [id_por_nombre[n] for n in finales if n in id_por_nombre]


def _es_protegido(id_rol: int) -> bool:
    """No se puede cambiar el estado del rol (solo Admin)."""
    return id_rol in ROLES_PROTEGIDOS


def _es_estatico(id_rol: int) -> bool:
    """No se puede editar (nombre/ícono/permisos) ni eliminar el rol."""
    return id_rol in ROLES_ESTATICOS



def _contar_usuarios(db: Session, id_rol: int) -> int:
    return (
        db.query(func.count(Usuario.ID_Usuario))
        .filter(Usuario.ID_Rol == id_rol)
        .scalar()
    ) or 0


def _formato_rol(rol, db: Session) -> dict:
    """Construye el dict de respuesta con permisos, conteo de usuarios y flag protegido."""
    permisos = (
        db.query(Permiso)
        .join(RolXPermiso, RolXPermiso.ID_Permiso == Permiso.ID_Permiso)
        .filter(RolXPermiso.ID_Rol == rol.ID_Rol)
        .all()
    )
    return {
        "ID_Rol":         rol.ID_Rol,
        "Rol":            rol.Rol,
        "Icono":          rol.Icono,  # URL de Cloudinary, emoji, o None
        "Estado":         rol.Estado,
        "total_usuarios": _contar_usuarios(db, rol.ID_Rol),
        "protegido":      _es_protegido(rol.ID_Rol),
        "es_estatico":    _es_estatico(rol.ID_Rol),
        "permisos": [
            {
                "ID_Permiso":  p.ID_Permiso,
                "Permiso":     p.Permiso,
                "Descripcion": p.Descripcion,
            }
            for p in permisos
        ],
    }


def obtener_roles(
    db:       Session,
    busqueda: str = None,
    estado:   int = None,
):
    query = db.query(Rol)
    if busqueda:
        query = query.filter(Rol.Rol.ilike(f"%{busqueda.strip()}%"))
    if estado is not None:
        query = query.filter(Rol.Estado == estado)

    roles = query.all()
    if not roles:
        return {"total": 0, "roles": []}

    rol_ids = [r.ID_Rol for r in roles]

    rxp_rows = (
        db.query(RolXPermiso, Permiso)
        .join(Permiso, Permiso.ID_Permiso == RolXPermiso.ID_Permiso)
        .filter(RolXPermiso.ID_Rol.in_(rol_ids))
        .all()
    )
    permisos_by_rol: dict = {}
    for rxp, perm in rxp_rows:
        permisos_by_rol.setdefault(rxp.ID_Rol, []).append({
            "ID_Permiso":  perm.ID_Permiso,
            "Permiso":     perm.Permiso,
            "Descripcion": perm.Descripcion,
        })

    count_rows = (
        db.query(Usuario.ID_Rol, func.count(Usuario.ID_Usuario).label("cnt"))
        .filter(Usuario.ID_Rol.in_(rol_ids))
        .group_by(Usuario.ID_Rol)
        .all()
    )
    count_by_rol = {r.ID_Rol: r.cnt for r in count_rows}

    return {
        "total": len(roles),
        "roles": [
            {
                "ID_Rol":         r.ID_Rol,
                "Rol":            r.Rol,
                "Icono":          r.Icono,
                "Estado":         r.Estado,
                "total_usuarios": count_by_rol.get(r.ID_Rol, 0),
                "protegido":      _es_protegido(r.ID_Rol),
                "es_estatico":    _es_estatico(r.ID_Rol),
                "permisos":       permisos_by_rol.get(r.ID_Rol, []),
            }
            for r in roles
        ],
    }


def obtener_rol(db: Session, id_rol: int):
    """Retorna un rol por ID o lanza 404."""
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return _formato_rol(rol, db)


def crear_rol(
    db:      Session,
    nombre:  str,
    icono:   str | None,
    estado:  int,
    actual:  dict | None = None,
    permisos: list[str] | None = None,
):
    """
    Crea un nuevo rol.
    - Valida nombre duplicado ignorando mayúsculas y espacios extras.
    - Ícono: URL de Cloudinary o emoji (string), enviado por el frontend.
    - Estado inicial enviado por el frontend (default: Activo=1).
    - `permisos` (nombres): opcional, permite crear el rol ya con permisos en
      una sola petición. Un rol con solo `crear_roles` (sin `editar_roles`) no
      podría asignarlos después.
    """
    nombre_limpio = " ".join(nombre.strip().split())

    duplicado = (
        db.query(Rol)
        .filter(func.lower(func.trim(Rol.Rol)) == nombre_limpio.lower())
        .first()
    )
    if duplicado:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un rol con ese nombre"
        )

    ids_permiso = None
    if permisos:
        if actual is None:
            raise HTTPException(status_code=400, detail="Falta el usuario solicitante")
        ids_permiso = normalizar_y_validar_permisos(db, actual, permisos)

    nuevo = Rol(
        Rol    = nombre_limpio,
        Icono  = icono,
        Estado = estado,
    )
    db.add(nuevo)
    db.flush()

    if ids_permiso:
        for id_permiso in dict.fromkeys(ids_permiso):
            db.add(RolXPermiso(ID_Rol=nuevo.ID_Rol, ID_Permiso=id_permiso))

    db.commit()
    db.refresh(nuevo)
    return _formato_rol(nuevo, db)


def editar_rol(
    db:            Session,
    id_rol:        int,
    nombre:        str | None,
    icono:         str | None,
    limpiar_icono: bool,
):
    """
    Edita nombre e ícono de un rol.
    - Roles estáticos (Admin, Cliente) no se pueden editar.
    - limpiar_icono=True permite quitar el ícono sin enviar uno nuevo.
    - Valida nombre duplicado si se cambia.
    """
    if _es_estatico(id_rol):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este rol es estático y no puede editarse",
        )

    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if nombre is not None:
        nombre_limpio = " ".join(nombre.strip().split())
        duplicado = (
            db.query(Rol)
            .filter(
                func.lower(func.trim(Rol.Rol)) == nombre_limpio.lower(),
                Rol.ID_Rol != id_rol,
            )
            .first()
        )
        if duplicado:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un rol con ese nombre"
            )
        rol.Rol = nombre_limpio

    if icono is not None:
        rol.Icono = icono
    elif limpiar_icono:
        rol.Icono = None

    db.commit()
    db.refresh(rol)
    return _formato_rol(rol, db)


def cambiar_estado(db: Session, id_rol: int, nuevo_estado: int):
    """
    Cambia el estado de un rol (Activo/Inactivo).
    - Roles protegidos (Admin) no se pueden modificar.
    - Al DESACTIVAR: se desactivan también todos los usuarios con ese rol (les
      cierra el acceso mientras el rol esté inactivo).
    - Al REACTIVAR: NO se tocan los usuarios. Reactivar el rol solo levanta la
      barrera; los usuarios que estaban activos se reactivan uno a uno desde
      Gestión de Usuarios. Así no se "resucita" a quien fue desactivado a mano.
    """
    if _es_protegido(id_rol):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El rol Admin está protegido y no puede modificarse",
        )

    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if nuevo_estado not in (ESTADO_ACTIVO, ESTADO_INACTIVO):
        raise HTTPException(
            status_code=400,
            detail="Estado inválido. Use 1 (Activo) o 2 (Inactivo)"
        )

    rol.Estado = nuevo_estado

    if nuevo_estado == ESTADO_INACTIVO:
        (
            db.query(Usuario)
            .filter(Usuario.ID_Rol == id_rol, Usuario.Estado == ESTADO_ACTIVO)
            .update({"Estado": ESTADO_INACTIVO}, synchronize_session=False)
        )

    db.commit()
    db.refresh(rol)
    return _formato_rol(rol, db)


def eliminar_rol(db: Session, id_rol: int):
    """
    Elimina un rol.
    - Roles estáticos (Admin, Cliente) nunca se pueden eliminar.
    - Si tiene usuarios o empleados asociados, retorna error 400.
    """
    if _es_estatico(id_rol):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este rol es estático y no puede eliminarse",
        )

    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    total = _contar_usuarios(db, id_rol)
    if total > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar: el rol tiene {total} usuario(s) asociado(s)"
        )

    db.query(RolXPermiso).filter(RolXPermiso.ID_Rol == id_rol).delete()
    db.delete(rol)
    db.commit()
    return {"mensaje": f"Rol '{rol.Rol}' eliminado correctamente"}


def asignar_permisos(db: Session, id_rol: int, permisos: list[str], actual: dict):
    """
    Reemplaza todos los permisos del rol con la nueva lista (NOMBRES de permiso).
    Lista vacía = quitar todos los permisos.

    Aplica anti-escalación y forzado de `ver_` (ver `normalizar_y_validar_permisos`).
    Roles estáticos:
      - Admin (bypass total en `requiere_permiso`): gestionar su `Rol_x_Permiso`
        no tiene efecto y solo ensucia datos.
      - Cliente: es estático y sin permisos por diseño (su comportamiento se
        decide por ID_Rol == 3).
    En ambos casos se bloquea.
    """
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    if _es_estatico(id_rol):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este rol es estático: sus permisos no se pueden modificar",
        )

    ids_final = normalizar_y_validar_permisos(db, actual, permisos)

    db.query(RolXPermiso).filter(RolXPermiso.ID_Rol == id_rol).delete(
        synchronize_session=False
    )
    for id_permiso in dict.fromkeys(ids_final):
        db.add(RolXPermiso(ID_Rol=id_rol, ID_Permiso=id_permiso))

    db.commit()
    return _formato_rol(rol, db)