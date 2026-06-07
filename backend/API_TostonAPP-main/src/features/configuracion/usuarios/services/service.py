from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timedelta
import uuid

from src.shared.services.models import Empleado, Usuario, Rol, UsuarioXRol, Venta, Domicilio, VerificacionEmail
from src.features.auth.services.service import (
    hashear_contrasena, _enviar_email_verificacion, RESEND_API_KEY,
)
from .schemas import EmpleadoCreate, UsuarioCreate, PersonaUpdate


def _formato_persona(registro, tipo: str, rol_nombre: str = None, id_rol: int = None) -> dict:
    id_persona = registro.ID_Empleado if tipo == "empleado" else registro.ID_Usuario
    return {
        "id":             id_persona,
        "Cedula":         registro.Cedula,
        "Tipo_Documento": getattr(registro, "Tipo_Documento", None),
        "Nombre":         registro.Nombre,
        "Apellidos":      registro.Apellidos,
        "Correo":         registro.Correo,
        "Direccion":      registro.Direccion,
        "Municipio":      registro.Municipio,
        "Departamento":   registro.Departamento,
        "Telefono":       registro.Telefono,
        "ID_Rol":         id_rol if id_rol is not None else getattr(registro, "ID_Rol", None),
        "nombre_rol":     rol_nombre,
        "Estado":         registro.Estado,
        "Fecha_creacion": registro.Fecha_creacion,
        "tipo":           tipo,
    }


def obtener_todos(db: Session, pagina: int = 1, por_pagina: int = 10, busqueda: str = None) -> dict:
    termino = f"%{busqueda}%" if busqueda else None

    q_emp = db.query(Empleado)
    q_usr = db.query(Usuario)

    if termino:
        q_emp = q_emp.filter(
            Empleado.Nombre.ilike(termino) |
            Empleado.Apellidos.ilike(termino) |
            Empleado.Correo.ilike(termino) |
            Empleado.Cedula.ilike(termino)
        )
        q_usr = q_usr.filter(
            Usuario.Nombre.ilike(termino) |
            Usuario.Apellidos.ilike(termino) |
            Usuario.Correo.ilike(termino) |
            Usuario.Cedula.ilike(termino)
        )

    resultado = []
    for emp in q_emp.all():
        rol = db.query(Rol).filter(Rol.ID_Rol == emp.ID_Rol).first()
        resultado.append(_formato_persona(emp, "empleado", rol.Rol if rol else None))
    for cli in q_usr.all():
        uxr = db.query(UsuarioXRol).filter(UsuarioXRol.ID_Usuario == cli.ID_Usuario).first()
        rol = db.query(Rol).filter(Rol.ID_Rol == uxr.ID_Rol).first() if uxr else None
        resultado.append(_formato_persona(cli, "cliente", rol.Rol if rol else None, uxr.ID_Rol if uxr else None))

    total    = len(resultado)
    offset   = (pagina - 1) * por_pagina
    paginado = resultado[offset: offset + por_pagina]

    return {"total": total, "pagina": pagina, "por_pagina": por_pagina, "personas": paginado}


def obtener_persona(db: Session, id_persona: int, tipo: str) -> dict:
    if tipo == "empleado":
        registro = db.query(Empleado).filter(Empleado.ID_Empleado == id_persona).first()
        rol = db.query(Rol).filter(Rol.ID_Rol == registro.ID_Rol).first() if registro else None
        return _formato_persona(registro, tipo, rol.Rol if rol else None)
    else:
        registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
        if not registro:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        uxr = db.query(UsuarioXRol).filter(UsuarioXRol.ID_Usuario == id_persona).first()
        rol = db.query(Rol).filter(Rol.ID_Rol == uxr.ID_Rol).first() if uxr else None
        return _formato_persona(registro, tipo, rol.Rol if rol else None, uxr.ID_Rol if uxr else None)


def _cedula_en_uso(db: Session, cedula: str, excluir_empleado_id: int = None, excluir_usuario_id: int = None) -> bool:
    """Verifica si la cédula ya está registrada en Empleados o Usuarios."""
    q_emp = db.query(Empleado).filter(Empleado.Cedula == cedula)
    if excluir_empleado_id:
        q_emp = q_emp.filter(Empleado.ID_Empleado != excluir_empleado_id)
    if q_emp.first():
        return True

    q_usr = db.query(Usuario).filter(Usuario.Cedula == cedula)
    if excluir_usuario_id:
        q_usr = q_usr.filter(Usuario.ID_Usuario != excluir_usuario_id)
    return q_usr.first() is not None


def crear_empleado(db: Session, datos: EmpleadoCreate) -> dict:
    if db.query(Empleado).filter(Empleado.Correo == datos.Correo).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    if _cedula_en_uso(db, datos.Cedula):
        raise HTTPException(status_code=400, detail="Cédula ya registrada")

    nuevo = Empleado(
        Cedula         = datos.Cedula,
        Tipo_Documento = datos.Tipo_Documento,
        Nombre         = datos.Nombre,
        Apellidos      = datos.Apellidos,
        Correo         = datos.Correo,
        Direccion      = datos.Direccion,
        Municipio      = datos.Municipio,
        Departamento   = datos.Departamento,
        Telefono       = datos.Telefono,
        ID_Rol         = datos.ID_Rol,
        Contrasena     = hashear_contrasena(datos.Contrasena),
        Fecha_creacion = datetime.now(),
        Estado         = 1  # admin los crea directamente activos
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _formato_persona(nuevo, "empleado")


def crear_cliente(db: Session, datos: UsuarioCreate) -> dict:
    if db.query(Usuario).filter(Usuario.Correo == datos.Correo).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")
    if _cedula_en_uso(db, datos.Cedula):
        raise HTTPException(status_code=400, detail="Cédula ya registrada")

    rol_cliente = db.query(Rol).filter(Rol.Rol == "Cliente").first()

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
        Contrasena     = hashear_contrasena(datos.Contrasena),
        Fecha_creacion = datetime.now(),
        Estado         = 2,   # inactivo hasta verificar correo
    )
    db.add(nuevo)
    db.flush()

    if rol_cliente:
        db.add(UsuarioXRol(ID_Rol=rol_cliente.ID_Rol, ID_Usuario=nuevo.ID_Usuario))

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
            pass  # Estado=2 queda; el usuario puede pedir un nuevo enlace
    else:
        nuevo.Estado = 1  # dev local sin RESEND

    db.commit()
    db.refresh(nuevo)
    return _formato_persona(nuevo, "cliente")


def editar_persona(db: Session, id_persona: int, tipo: str, datos: PersonaUpdate) -> dict:
    if tipo == "empleado":
        registro = db.query(Empleado).filter(Empleado.ID_Empleado == id_persona).first()
    else:
        registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    if datos.Cedula and datos.Cedula != registro.Cedula:
        excluir_emp = id_persona if tipo == "empleado" else None
        excluir_usr = id_persona if tipo == "cliente" else None
        if _cedula_en_uso(db, datos.Cedula, excluir_emp, excluir_usr):
            raise HTTPException(status_code=400, detail="Cédula ya registrada")

    for campo, valor in datos.model_dump(exclude_none=True).items():
        if campo == "ID_Rol" and tipo == "cliente":
            continue
        setattr(registro, campo, valor)

    db.commit()
    db.refresh(registro)
    return _formato_persona(registro, tipo)


def cambiar_estado(db: Session, id_persona: int, tipo: str, nuevo_estado: int) -> dict:
    if tipo == "empleado":
        registro = db.query(Empleado).filter(Empleado.ID_Empleado == id_persona).first()
    else:
        registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    if tipo == "empleado" and getattr(registro, "ID_Rol", None) == 1:
        raise HTTPException(
            status_code=400,
            detail="No se puede desactivar al administrador del sistema.",
        )

    registro.Estado = nuevo_estado
    db.commit()
    db.refresh(registro)
    return _formato_persona(registro, tipo)


def eliminar_persona(db: Session, id_persona: int, tipo: str) -> dict:
    if tipo == "empleado":
        registro = db.query(Empleado).filter(Empleado.ID_Empleado == id_persona).first()
        if not registro:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        if getattr(registro, "ID_Rol", None) == 1:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar al administrador del sistema.",
            )
        domicilios = db.query(Domicilio).filter(Domicilio.ID_Empleado == id_persona).count()
        if domicilios > 0:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar: el empleado tiene {domicilios} domicilio(s) asignado(s).",
            )
    else:
        registro = db.query(Usuario).filter(Usuario.ID_Usuario == id_persona).first()
        if not registro:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        ventas = db.query(Venta).filter(Venta.ID_Usuario == id_persona).count()
        if ventas > 0:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede eliminar: el cliente tiene {ventas} venta(s) registrada(s).",
            )

    db.delete(registro)
    db.commit()
    return {"mensaje": f"{tipo.capitalize()} {id_persona} eliminado correctamente"}