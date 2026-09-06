from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timedelta
import uuid

from sqlalchemy.exc import IntegrityError

from src.shared.services.models import (
    Usuario, Rol, RolXPermiso, Permiso, Venta, Domicilio, VerificacionEmail,
    Devolucion, CreditoCliente,
    TarifaEmpleado, Liquidacion, RegistroHoras, Salida,
)
from src.features.auth.services.service import (
    hashear_contrasena, _enviar_email_verificacion,
    _enviar_email_bienvenida_empleado,
    RESEND_API_KEY, GMAIL_CLIENT_ID, BREVO_API_KEY,
)
from src.features.auth.services.dependencies import (
    rol_tiene_permiso, SUPER_ADMIN_ID, ROL_ADMIN, ROL_CLIENTE,
)
from .schemas import (
    EmpleadoCreate, UsuarioCreate, PersonaUpdate,
    validar_cedula, validar_telefono, validar_contrasena,
)

# Permisos que hacen de un rol un "gestor de usuarios". Un usuario con cualquiera
# de estos no puede ser editado / desactivado / eliminado / re-roleado por otro
# usuario que no sea Admin o super admin (evita que un par degrade a otro par).
_PERMISOS_GESTION_USUARIOS = (
    "ver_usuarios", "crear_usuarios", "editar_usuarios",
    "eliminar_usuarios", "cambiar_rol_usuarios",
)


def _tipo_desde_rol(id_rol: int) -> str:
    return "cliente" if id_rol == ROL_CLIENTE else "empleado"


# ─────────────────────────────────────────
# BLINDAJE: super admin, admin normales, jerarquía
# ─────────────────────────────────────────

def _es_super_admin(actual: dict) -> bool:
    return getattr(actual["registro"], "ID_Usuario", None) == SUPER_ADMIN_ID


def _puede_cambiar_rol(db, actual: dict) -> bool:
    """
    ¿Este usuario puede asignar un rol (al crear un usuario o con la acción
    rápida)? Super admin y Admin siempre; el resto necesita el permiso
    `cambiar_rol_usuarios`.
    """
    registro = actual["registro"]
    if registro.ID_Usuario == SUPER_ADMIN_ID or registro.ID_Rol == ROL_ADMIN:
        return True
    return rol_tiene_permiso(db, registro.ID_Rol, "cambiar_rol_usuarios")


def _rol_gestiona_usuarios(db, id_rol: int) -> bool:
    if not id_rol or id_rol == ROL_ADMIN:
        return True
    return (
        db.query(RolXPermiso)
        .join(Permiso, Permiso.ID_Permiso == RolXPermiso.ID_Permiso)
        .filter(
            RolXPermiso.ID_Rol == id_rol,
            Permiso.Permiso.in_(_PERMISOS_GESTION_USUARIOS),
        )
        .first()
        is not None
    )


def _puede_gestionar(db, actual: dict, objetivo: Usuario, *, permitir_self: bool = True):
    """
    Blindaje de jerarquía para editar / cambiar estado / eliminar / cambiar rol
    de OTRO usuario. El permiso puntual ya lo exige `requiere_permiso` en el
    router; esto añade:
      - El super admin (usuario ID 1) es intocable para todos menos para sí mismo.
      - Un admin normal (ID_Rol == 1, ID_Usuario != 1) solo lo gestiona el super
        admin: ni otro admin normal ni nadie por debajo.
      - Un usuario que también gestiona usuarios (tiene algún permiso *_usuarios)
        solo lo gestiona un Admin / super admin: un par no degrada a otro par.
    Devuelve (ok: bool, motivo: str | None).
    """
    actor = actual["registro"]

    if objetivo.ID_Usuario == actor.ID_Usuario:
        if permitir_self:
            return True, None
        return False, "No puedes realizar esta acción sobre tu propia cuenta."

    if objetivo.ID_Usuario == SUPER_ADMIN_ID:
        return False, "El super administrador no puede ser modificado."

    actor_es_admin = actor.ID_Usuario == SUPER_ADMIN_ID or actor.ID_Rol == ROL_ADMIN

    if objetivo.ID_Rol == ROL_ADMIN and actor.ID_Usuario != SUPER_ADMIN_ID:
        return False, "Solo el super administrador puede gestionar a un administrador."

    if not actor_es_admin and _rol_gestiona_usuarios(db, objetivo.ID_Rol):
        return False, "No puedes gestionar a otro usuario con permisos de gestión de usuarios."

    return True, None


def _validar_rol_asignable(db, id_rol: int, actual: dict) -> Rol:
    """El rol destino debe existir, estar activo, y solo el super admin puede
    asignar el rol Admin."""
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    if not rol:
        raise HTTPException(status_code=400, detail="El rol indicado no existe.")
    if rol.Estado == 2:
        raise HTTPException(
            status_code=400,
            detail=f'No se puede asignar el rol "{rol.Rol}": está desactivado.',
        )
    if id_rol == ROL_ADMIN and not _es_super_admin(actual):
        raise HTTPException(
            status_code=403,
            detail="Solo el super administrador puede asignar el rol de administrador.",
        )
    return rol


def _formato_persona(registro: Usuario, rol_nombre: str = None) -> dict:
    id_rol = registro.ID_Rol or 0
    return {
        "id":             registro.ID_Usuario,
        "Cedula":         registro.Cedula,
        "Tipo_Documento": registro.Tipo_Documento,
        "Nombre":         registro.Nombre,
        "Apellidos":      registro.Apellidos,
        "Correo":         registro.Correo,
        "Direccion":      registro.Direccion,
        "Municipio":      registro.Municipio,
        "Departamento":   registro.Departamento,
        "Indicaciones":   getattr(registro, "Indicaciones", None),
        "Telefono":       registro.Telefono,
        "Foto":           registro.Foto_perfil,
        "ID_Rol":         id_rol,
        "nombre_rol":     rol_nombre,
        "Estado":         registro.Estado,
        "Fecha_creacion": registro.Fecha_creacion,
        "tipo":           _tipo_desde_rol(id_rol),
    }


def _rol_nombre(db: Session, id_rol: int) -> str | None:
    if not id_rol:
        return None
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    return rol.Rol if rol else None


def obtener_todos(db: Session, pagina: int = 1, por_pagina: int = 10, busqueda: str = None) -> dict:
    q = db.query(Usuario)
    if busqueda:
        t = f"%{busqueda}%"
        q = q.filter(
            Usuario.Nombre.ilike(t) |
            Usuario.Apellidos.ilike(t) |
            Usuario.Correo.ilike(t) |
            Usuario.Cedula.ilike(t)
        )

    total  = q.count()
    offset = (pagina - 1) * por_pagina
    users  = q.offset(offset).limit(por_pagina).all()

    rol_ids   = list({u.ID_Rol for u in users if u.ID_Rol})
    roles_map = {r.ID_Rol: r.Rol for r in db.query(Rol).filter(Rol.ID_Rol.in_(rol_ids)).all()} if rol_ids else {}

    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "personas": [_formato_persona(u, roles_map.get(u.ID_Rol)) for u in users]}


def obtener_persona(db: Session, id_persona: int) -> dict:
    registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return _formato_persona(registro, _rol_nombre(db, registro.ID_Rol))


def _cedula_en_uso(db: Session, cedula: str, excluir_id: int = None) -> bool:
    q = db.query(Usuario).filter(Usuario.Cedula == cedula)
    if excluir_id:
        q = q.filter(Usuario.ID_Usuario != excluir_id)
    return q.first() is not None


def crear_empleado(db: Session, datos: EmpleadoCreate, actual: dict) -> dict:
    # Crear un usuario con rol de personal requiere poder asignar roles.
    if not _puede_cambiar_rol(db, actual):
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para asignar un rol. Solo puedes crear clientes.",
        )
    _validar_rol_asignable(db, datos.ID_Rol, actual)

    error_cedula = validar_cedula(datos.Cedula, datos.Tipo_Documento)
    if error_cedula:
        raise HTTPException(status_code=400, detail=error_cedula)
    error_telefono = validar_telefono(datos.Telefono) if datos.Telefono else None
    if error_telefono:
        raise HTTPException(status_code=400, detail=error_telefono)
    error_pass = validar_contrasena(datos.Contrasena)
    if error_pass:
        raise HTTPException(status_code=400, detail=error_pass)
    if db.query(Usuario).filter(Usuario.Correo == datos.Correo).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    if _cedula_en_uso(db, datos.Cedula):
        raise HTTPException(status_code=400, detail="Cédula ya registrada")

    nuevo = Usuario(
        Cedula            = datos.Cedula,
        Tipo_Documento    = datos.Tipo_Documento,
        Nombre            = datos.Nombre,
        Apellidos         = datos.Apellidos,
        Correo            = datos.Correo,
        Direccion         = datos.Direccion,
        Municipio         = datos.Municipio,
        Departamento      = datos.Departamento,
        Telefono          = datos.Telefono,
        Foto_perfil       = datos.Foto,
        ID_Rol            = datos.ID_Rol,
        Contrasena        = hashear_contrasena(datos.Contrasena),
        Fecha_creacion    = datetime.now(),
        Estado            = 1,
        Correo_Verificado = 1,  # admin crea la cuenta directamente — sin verificación por email
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    if GMAIL_CLIENT_ID or BREVO_API_KEY or RESEND_API_KEY:
        try:
            # No se envía la contraseña por correo: el correo solo avisa que la
            # cuenta existe; la clave la comunica el admin por otro canal o el
            # empleado la establece con "¿Olvidaste tu contraseña?".
            _enviar_email_bienvenida_empleado(datos.Correo, datos.Nombre)
        except Exception:
            pass  # el email es informativo; la cuenta ya fue creada

    return _formato_persona(nuevo, _rol_nombre(db, nuevo.ID_Rol))


def crear_cliente(db: Session, datos: UsuarioCreate, actual: dict) -> dict:
    error_cedula = validar_cedula(datos.Cedula, datos.Tipo_Documento)
    if error_cedula:
        raise HTTPException(status_code=400, detail=error_cedula)
    error_telefono = validar_telefono(datos.Telefono) if datos.Telefono else None
    if error_telefono:
        raise HTTPException(status_code=400, detail=error_telefono)
    error_pass = validar_contrasena(datos.Contrasena)
    if error_pass:
        raise HTTPException(status_code=400, detail=error_pass)
    if db.query(Usuario).filter(Usuario.Correo == datos.Correo).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    if _cedula_en_uso(db, datos.Cedula):
        raise HTTPException(status_code=400, detail="Cédula ya registrada")

    # Sin permiso para cambiar roles → nace Cliente y se ignora cualquier ID_Rol
    # que venga en el payload. Con permiso, se valida el rol pedido.
    if datos.ID_Rol is not None and _puede_cambiar_rol(db, actual):
        _validar_rol_asignable(db, datos.ID_Rol, actual)
        id_rol = datos.ID_Rol
    else:
        id_rol = ROL_CLIENTE

    nuevo = Usuario(
        Cedula         = datos.Cedula,
        Tipo_Documento = datos.Tipo_Documento,
        Nombre         = datos.Nombre,
        Apellidos      = datos.Apellidos,
        Correo         = datos.Correo,
        Direccion      = datos.Direccion,
        Municipio      = datos.Municipio,
        Departamento   = datos.Departamento,
        Telefono       = datos.Telefono,
        Foto_perfil    = datos.Foto,
        ID_Rol         = id_rol,
        Contrasena     = hashear_contrasena(datos.Contrasena),
        Fecha_creacion = datetime.now(),
        Estado         = 1,  # activo de inmediato (puede iniciar sesión)
        Correo_Verificado = 0,  # debe verificar el correo para recuperar contraseña
    )
    db.add(nuevo)
    db.flush()

    token = str(uuid.uuid4())
    db.add(VerificacionEmail(
        ID_Usuario = nuevo.ID_Usuario,
        Token      = token,
        Expira_En  = datetime.utcnow() + timedelta(hours=24),
        Usado      = False,
    ))

    if RESEND_API_KEY:
        try:
            _enviar_email_verificacion(datos.Correo, token, datos.Nombre)
        except Exception:
            pass

    db.commit()
    db.refresh(nuevo)
    return _formato_persona(nuevo, _rol_nombre(db, nuevo.ID_Rol))


def editar_persona(db: Session, id_persona: int, datos: PersonaUpdate, actual: dict) -> dict:
    registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    ok, motivo = _puede_gestionar(db, actual, registro, permitir_self=True)
    if not ok:
        raise HTTPException(status_code=403, detail=motivo)

    if datos.Cedula and datos.Cedula != registro.Cedula:
        error_cedula = validar_cedula(datos.Cedula, datos.Tipo_Documento or registro.Tipo_Documento)
        if error_cedula:
            raise HTTPException(status_code=400, detail=error_cedula)
        if _cedula_en_uso(db, datos.Cedula, excluir_id=id_persona):
            raise HTTPException(status_code=400, detail="Cédula ya registrada")

    if datos.Telefono:
        error_telefono = validar_telefono(datos.Telefono)
        if error_telefono:
            raise HTTPException(status_code=400, detail=error_telefono)

    if datos.Contrasena:
        error_pass = validar_contrasena(datos.Contrasena)
        if error_pass:
            raise HTTPException(status_code=400, detail=error_pass)

    for campo, valor in datos.model_dump(exclude_none=True).items():
        if campo == "Foto":
            setattr(registro, "Foto_perfil", valor)
        elif campo == "Contrasena":
            registro.Contrasena = hashear_contrasena(valor)
        else:
            setattr(registro, campo, valor)

    db.commit()
    db.refresh(registro)
    return _formato_persona(registro, _rol_nombre(db, registro.ID_Rol))


def cambiar_estado(db: Session, id_persona: int, nuevo_estado: int, actual: dict) -> dict:
    registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    if registro.ID_Usuario == SUPER_ADMIN_ID:
        raise HTTPException(
            status_code=400,
            detail="No se puede cambiar el estado del super administrador.",
        )

    ok, motivo = _puede_gestionar(db, actual, registro, permitir_self=False)
    if not ok:
        raise HTTPException(status_code=403, detail=motivo)

    if nuevo_estado == 1:
        rol = db.query(Rol).filter(Rol.ID_Rol == registro.ID_Rol).first()
        if rol and rol.Estado == 2:
            raise HTTPException(
                status_code=400,
                detail=f'No se puede activar este usuario: el rol "{rol.Rol}" está desactivado. Activa el rol primero.',
            )

    registro.Estado = nuevo_estado
    db.commit()
    db.refresh(registro)
    return _formato_persona(registro, _rol_nombre(db, registro.ID_Rol))


def eliminar_persona(db: Session, id_persona: int, actual: dict) -> dict:
    registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    if registro.ID_Usuario == SUPER_ADMIN_ID:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar al super administrador.",
        )

    ok, motivo = _puede_gestionar(db, actual, registro, permitir_self=False)
    if not ok:
        raise HTTPException(status_code=403, detail=motivo)

    # Restricciones de integridad: un usuario con historial NO se borra (rompería
    # FKs → 500). Se avisa con 400 y el detalle de qué lo bloquea.
    bloqueos: list[str] = []

    def _cuenta(modelo, condicion, etiqueta):
        n = db.query(modelo).filter(condicion).count()
        if n > 0:
            bloqueos.append(f"{n} {etiqueta}")

    if registro.ID_Rol == ROL_CLIENTE:
        _cuenta(Venta, Venta.ID_Usuario == id_persona, "venta(s)")
        _cuenta(Devolucion, Devolucion.ID_Usuario == id_persona, "devolución(es)")
        credito = db.query(CreditoCliente).filter(CreditoCliente.ID_Usuario == id_persona).first()
        if credito is not None and (credito.Saldo or 0) > 0:
            bloqueos.append(f"crédito a favor de ${credito.Saldo}")
    else:
        _cuenta(Domicilio, Domicilio.ID_Empleado == id_persona, "domicilio(s) asignado(s)")
        _cuenta(Liquidacion, Liquidacion.ID_Empleado == id_persona, "liquidación(es)")
        _cuenta(RegistroHoras, RegistroHoras.ID_Empleado == id_persona, "registro(s) de horas")
        _cuenta(TarifaEmpleado, TarifaEmpleado.ID_Empleado == id_persona, "tarifa(s)")
        _cuenta(Salida, Salida.ID_Empleado == id_persona, "salida(s) registrada(s)")

    if bloqueos:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: el usuario tiene " + ", ".join(bloqueos) + ".",
        )

    try:
        db.delete(registro)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: el usuario tiene registros asociados en el sistema.",
        )
    return {"mensaje": f"Usuario {id_persona} eliminado correctamente"}


def cambiar_rol_usuario(db: Session, id_objetivo: int, nuevo_id_rol: int, actual: dict) -> dict:
    """
    Cambia el rol de OTRO usuario, de forma transaccional. Reglas (backend, no
    solo UI):
      - Nadie cambia su propio rol, ni el super admin (salvaguarda dura, 3.6).
      - El rol del super admin (usuario ID 1) es inmutable, venga de quien venga.
      - Un admin normal solo lo gestiona el super admin (3.4).
      - Solo el super admin puede asignar el rol Admin (promover a admin).
      - El rol destino debe existir y estar activo.
      - Un ex-cliente promovido a personal queda con el correo verificado para
        poder usar los flujos de contraseña del panel.
    Tras el cambio, el comportamiento del usuario depende 100% de su ID_Rol
    actual (auth deriva `tipo`/`rol` en vivo, ver dependencies.obtener_usuario_actual).
    """
    objetivo = db.query(Usuario).filter(Usuario.ID_Usuario == id_objetivo).first()
    if not objetivo:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    if objetivo.ID_Usuario == SUPER_ADMIN_ID:
        raise HTTPException(
            status_code=403,
            detail="No se puede cambiar el rol del super administrador.",
        )

    ok, motivo = _puede_gestionar(db, actual, objetivo, permitir_self=False)
    if not ok:
        raise HTTPException(status_code=403, detail=motivo)

    _validar_rol_asignable(db, nuevo_id_rol, actual)

    if objetivo.ID_Rol == nuevo_id_rol:
        raise HTTPException(status_code=400, detail="El usuario ya tiene ese rol.")

    venia_de_cliente = objetivo.ID_Rol == ROL_CLIENTE
    objetivo.ID_Rol = nuevo_id_rol

    if venia_de_cliente and nuevo_id_rol != ROL_CLIENTE:
        objetivo.Correo_Verificado = 1

    db.commit()
    db.refresh(objetivo)
    return _formato_persona(objetivo, _rol_nombre(db, objetivo.ID_Rol))
