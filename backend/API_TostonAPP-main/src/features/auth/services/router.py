from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import obtener_usuario_actual
from .schemas import (
    LoginInput, TokenResponse, RegistroInput, RegistroResponse,
    RecuperarContrasenaInput, RecuperarContrasenaResponse,
    VerificarCodigoInput, VerificarCodigoResponse,
    ResetearContrasenaInput, ResetearContrasenaResponse,
    CambiarContrasenaInput, CambiarContrasenaResponse,
    PerfilUpdate, FotoUrlInput,
    ReenviarVerificacionInput, ReenviarVerificacionResponse,
)
from .service import (
    autenticar, crear_token, obtener_nombre_rol,
    registrar_cliente, solicitar_recuperacion,
    verificar_codigo_recuperacion, resetear_contrasena,
    cambiar_contrasena, actualizar_foto_perfil, eliminar_foto_perfil,
    obtener_mis_permisos, verificar_email_token, reenviar_verificacion,
    verificar_token_empleado,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _formato_perfil(actual: dict) -> dict:
    registro = actual["registro"]
    return {
        "id":             registro.ID_Usuario,
        "Nombre":         registro.Nombre,
        "Apellidos":      registro.Apellidos,
        "Correo":         registro.Correo,
        "Cedula":         registro.Cedula,
        "Tipo_Documento": getattr(registro, "Tipo_Documento", None),
        "Telefono":       registro.Telefono,
        "Direccion":      registro.Direccion,
        "Municipio":      registro.Municipio,
        "Departamento":   registro.Departamento,
        "Foto_perfil":    registro.Foto_perfil,
        "Fecha_creacion": registro.Fecha_creacion,
        "Estado":         registro.Estado,
        "tipo":           actual["tipo"],
        "rol":            actual.get("rol"),
    }


# ─────────────────────────────────────────
# AUTH PÚBLICA
# ─────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(datos: LoginInput, db: Session = Depends(get_db)):
    registro, tipo = autenticar(db, datos.correo, datos.contrasena)
    if not registro:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    id_campo   = registro.ID_Usuario
    nombre_rol = obtener_nombre_rol(db, registro.ID_Rol) if registro.ID_Rol else None

    token = crear_token({"id": id_campo, "tipo": tipo, "rol": nombre_rol})

    return TokenResponse(
        access_token = token,
        token_type   = "bearer",
        tipo         = tipo,
        cedula       = id_campo,
        nombre       = registro.Nombre,
        apellidos    = registro.Apellidos,
        rol          = nombre_rol,
    )


@router.post("/registro", response_model=RegistroResponse, status_code=201)
def registro_cliente(datos: RegistroInput, db: Session = Depends(get_db)):
    registrar_cliente(db, datos)
    return RegistroResponse(
        mensaje="Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión."
    )


@router.get("/verificar-empleado")
def verificar_empleado(token: str, db: Session = Depends(get_db)):
    try:
        redirect_url = verificar_token_empleado(db, token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(url=redirect_url)


@router.get("/verificar-email")
def verificar_email(token: str, db: Session = Depends(get_db)):
    try:
        redirect_url = verificar_email_token(db, token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RedirectResponse(url=redirect_url)


@router.post("/reenviar-verificacion", response_model=ReenviarVerificacionResponse)
def reenviar_verificacion_endpoint(datos: ReenviarVerificacionInput, db: Session = Depends(get_db)):
    try:
        reenviar_verificacion(db, datos.correo)
    except Exception:
        pass  # no revelar nada
    return ReenviarVerificacionResponse(
        mensaje="Si el correo está registrado y pendiente de verificación, recibirás un nuevo enlace."
    )


@router.post("/recuperar-contrasena", response_model=RecuperarContrasenaResponse)
def recuperar_contrasena(datos: RecuperarContrasenaInput, db: Session = Depends(get_db)):
    solicitar_recuperacion(db, datos.correo)
    return {"mensaje": "Si el correo está registrado, recibirás un código de verificación."}


@router.post("/verificar-codigo", response_model=VerificarCodigoResponse)
def verificar_codigo(datos: VerificarCodigoInput, db: Session = Depends(get_db)):
    try:
        reset_token = verificar_codigo_recuperacion(db, datos.correo, datos.codigo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"reset_token": reset_token, "mensaje": "Código verificado correctamente"}


@router.post("/resetear-contrasena", response_model=ResetearContrasenaResponse)
def resetear_contrasena_endpoint(datos: ResetearContrasenaInput, db: Session = Depends(get_db)):
    try:
        resetear_contrasena(db, datos.token, datos.nueva_contrasena)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"mensaje": "Contraseña actualizada correctamente"}


# ─────────────────────────────────────────
# PERFIL (requiere token)
# ─────────────────────────────────────────

@router.get("/me")
def perfil_basico(actual: dict = Depends(obtener_usuario_actual)):
    registro = actual["registro"]
    return {
        "id":        registro.ID_Usuario,
        "nombre":    registro.Nombre,
        "apellidos": registro.Apellidos,
        "correo":    registro.Correo,
        "tipo":      actual["tipo"],
        "rol":       actual.get("rol"),
    }


@router.get("/perfil")
def perfil_completo(actual: dict = Depends(obtener_usuario_actual)):
    return _formato_perfil(actual)


@router.put("/perfil")
def actualizar_perfil(
    datos:  PerfilUpdate,
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    registro = actual["registro"]
    campos   = datos.model_dump(exclude_none=True)

    # Cedula y Tipo_Documento solo se pueden establecer si aún no tienen valor
    for campo_unico in ("Cedula", "Tipo_Documento"):
        if campo_unico in campos:
            valor_actual = getattr(registro, campo_unico, None)
            if valor_actual:          # ya tiene valor → ignorar
                del campos[campo_unico]

    for campo, valor in campos.items():
        setattr(registro, campo, valor)

    db.commit()
    db.refresh(registro)
    return _formato_perfil(actual)


@router.post("/cambiar-contrasena", response_model=CambiarContrasenaResponse)
def cambiar_password(
    datos:  CambiarContrasenaInput,
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    try:
        cambiar_contrasena(db, actual, datos.contrasena_actual, datos.nueva_contrasena)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"mensaje": "Contraseña actualizada correctamente"}


@router.post("/foto-perfil")
def subir_foto_perfil(
    datos:  FotoUrlInput,
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    url = actualizar_foto_perfil(db, actual, datos.url)
    return {"foto_perfil": url}


@router.delete("/foto-perfil")
def borrar_foto_perfil(
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    eliminar_foto_perfil(db, actual)
    return {"mensaje": "Foto de perfil eliminada"}


# ─────────────────────────────────────────
# PERMISOS
# ─────────────────────────────────────────

@router.get("/mis-permisos")
def mis_permisos(
    db:     Session = Depends(get_db),
    actual: dict    = Depends(obtener_usuario_actual),
):
    return {"permisos": obtener_mis_permisos(db, actual)}
