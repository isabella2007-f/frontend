from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Dict, Any
import requests as _requests
import random
import uuid
import os
import time
from collections import defaultdict

from src.shared.services.models import (
    Usuario, Rol, Permiso, RolXPermiso, VerificacionEmail
)

load_dotenv()

SECRET_KEY   = os.getenv("SECRET_KEY")
ALGORITHM    = os.getenv("ALGORITHM", "HS256")
EXPIRE_MIN   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
API_URL      = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

RESET_TOKEN_EXPIRE_MIN = 10
CODE_EXPIRE_MIN        = 10

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM     = "Brom's <onboarding@resend.dev>"

# Almacén en memoria: { correo_lower: { "codigo": "123456", "expires": datetime } }
_codigos_reset: Dict[str, Dict[str, Any]] = {}

# Rate limiting de login: { correo_lower: [timestamps de intentos fallidos] }
_intentos_login: Dict[str, list] = defaultdict(list)
_VENTANA_LOGIN  = 300   # 5 minutos en segundos
_MAX_INTENTOS   = 5

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────

def verificar_contrasena(contrasena_plana: str, contrasena_hash: str) -> bool:
    return pwd_context.verify(contrasena_plana, contrasena_hash)


def hashear_contrasena(contrasena: str) -> str:
    return pwd_context.hash(contrasena)


def crear_token(data: dict) -> str:
    payload = data.copy()
    payload.update({"exp": datetime.utcnow() + timedelta(minutes=EXPIRE_MIN)})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def crear_reset_token(correo: str) -> str:
    payload = {
        "correo": correo,
        "tipo":   "reset",
        "exp":    datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MIN),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def validar_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Token inválido o expirado")

    if payload.get("tipo") != "reset":
        raise ValueError("El token proporcionado no es un token de recuperación")

    correo = payload.get("correo")
    if not correo:
        raise ValueError("Token malformado")

    return correo


# ─────────────────────────────────────────
# BÚSQUEDA Y AUTENTICACIÓN
# ─────────────────────────────────────────

def buscar_por_correo(db: Session, correo: str):
    """Busca por correo en la tabla Usuarios (tabla unificada)."""
    usuario = db.query(Usuario).filter(Usuario.Correo == correo).first()
    if usuario:
        tipo = "cliente" if usuario.ID_Rol == 3 else "empleado"
        return usuario, tipo
    return None, None


def obtener_nombre_rol(db: Session, id_rol: int) -> str:
    rol = db.query(Rol).filter(Rol.ID_Rol == id_rol).first()
    return rol.Rol if rol else None


def _verificar_limite_login(correo: str) -> None:
    """Bloquea el login si hay demasiados intentos fallidos recientes."""
    ahora    = time.time()
    clave    = correo.lower()
    recientes = [t for t in _intentos_login[clave] if ahora - t < _VENTANA_LOGIN]
    _intentos_login[clave] = recientes
    if len(recientes) >= _MAX_INTENTOS:
        minutos = _VENTANA_LOGIN // 60
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos fallidos. Espera {minutos} minutos antes de intentar de nuevo.",
        )


def autenticar(db: Session, correo: str, contrasena: str):
    clave = correo.lower()
    _verificar_limite_login(clave)

    registro, tipo = buscar_por_correo(db, correo)

    if not registro or not verificar_contrasena(contrasena, registro.Contrasena):
        _intentos_login[clave].append(time.time())
        return None, None

    if getattr(registro, "Estado", None) == 2:
        if tipo == "cliente":
            raise HTTPException(
                status_code=403,
                detail="Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
            )
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta está desactivada. Contacta al administrador.",
        )

    # Login exitoso: limpia el historial de intentos
    _intentos_login[clave] = []
    return registro, tipo


# ─────────────────────────────────────────
# REGISTRO
# ─────────────────────────────────────────

def registrar_cliente(db: Session, datos) -> None:
    """
    Crea un nuevo usuario (cliente) con Estado=2 (inactivo hasta verificar correo).
    Asigna el rol Cliente directamente en la columna ID_Rol.
    Genera un token UUID de verificación y lo envía por email.
    """
    if buscar_por_correo(db, datos.Correo)[0]:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    rol_cliente = db.query(Rol).filter(Rol.Rol == "Cliente").first()
    if not rol_cliente:
        raise HTTPException(status_code=500, detail="Rol Cliente no encontrado en el sistema")

    nuevo = Usuario(
        Nombre         = datos.Nombre,
        Apellidos      = datos.Apellidos,
        Correo         = datos.Correo,
        Contrasena     = hashear_contrasena(datos.Contrasena),
        Fecha_creacion = datetime.now(),
        Estado         = 2,
        ID_Rol         = rol_cliente.ID_Rol,
        Cedula         = None,
        Tipo_Documento = None,
        Direccion      = None,
        Municipio      = None,
        Departamento   = None,
        Telefono       = None,
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
            pass  # Estado=2 queda igual; el usuario puede pedir un nuevo enlace
    else:
        nuevo.Estado = 1  # solo en dev local sin RESEND configurado

    db.commit()


# ─────────────────────────────────────────
# VERIFICACIÓN DE EMAIL
# ─────────────────────────────────────────

def _resend_http(to_email: str, subject: str, html: str) -> None:
    """Envía email vía Resend HTTP API — usa requests para timeout confiable (cubre DNS + TLS + lectura)."""
    key = (os.getenv("RESEND_API_KEY") or RESEND_API_KEY or "").strip()
    if not key:
        raise ValueError("RESEND_API_KEY no está configurado en las variables de entorno")

    try:
        resp = _requests.post(
            "https://api.resend.com/emails",
            json    = {"from": EMAIL_FROM, "to": [to_email], "subject": subject, "html": html},
            headers = {"Authorization": f"Bearer {key}"},
            timeout = 12,  # cubre connect + read
        )
        if resp.status_code >= 400:
            raise ValueError(f"Resend respondió {resp.status_code}: {resp.text}")
    except _requests.exceptions.Timeout:
        raise ValueError("Timeout al contactar Resend API (>12s)")
    except _requests.exceptions.RequestException as e:
        raise ValueError(f"Error de red al contactar Resend: {e}")


def _enviar_email_verificacion(correo_destino: str, token: str, nombre: str = "", endpoint: str = "verificar-email") -> None:
    link   = f"{API_URL}/api/auth/{endpoint}?token={token}"
    saludo = f"Hola <strong>{nombre}</strong>," if nombre else "Hola,"
    html   = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#2E7D32,#66BB6A);padding:24px;border-radius:14px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">🌿 Brom's</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Verificación de correo</p>
      </div>
      <p style="color:#333;">{saludo}</p>
      <p style="color:#555;font-size:14px;">Gracias por registrarte. Haz clic en el botón para activar tu cuenta:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{link}" style="background:#2E7D32;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:bold;display:inline-block;">
          Verificar mi correo
        </a>
      </div>
      <p style="color:#999;font-size:12px;">El enlace es válido por 24 horas. Si no creaste esta cuenta, ignora este correo.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#bbb;font-size:11px;text-align:center;">Brom's · Correo automático, no respondas a este mensaje.</p>
    </div>
    """
    _resend_http(correo_destino, "✅ Verifica tu correo — Brom's", html)


def crear_token_verificacion_empleado(id_usuario: int) -> str:
    """Genera un JWT para verificar el email de un usuario empleado (válido 24 h)."""
    payload = {
        "id_usuario": id_usuario,
        "tipo":       "verificar_empleado",
        "exp":        datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token_empleado(db: Session, token: str) -> str:
    """Valida el JWT y activa al usuario (Estado=1). Retorna URL de redirect."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Token inválido o expirado")

    if payload.get("tipo") != "verificar_empleado":
        raise ValueError("Token inválido")

    id_usuario = payload.get("id_usuario")
    usuario = db.query(Usuario).filter(Usuario.ID_Usuario == id_usuario).first()
    if not usuario:
        raise ValueError("Usuario no encontrado")
    if usuario.Estado == 1:
        return f"{FRONTEND_URL}/login?verificado=1"

    usuario.Estado = 1
    db.commit()
    return f"{FRONTEND_URL}/login?verificado=1"


def verificar_email_token(db: Session, token: str) -> str:
    """
    Valida el token UUID de verificación.
    Si es válido → activa el usuario (Estado=1) y marca el token como Usado.
    Retorna la URL del frontend para el redirect.
    """
    verificacion = db.query(VerificacionEmail).filter(VerificacionEmail.Token == token).first()

    if not verificacion:
        raise ValueError("Token de verificación inválido o inexistente.")

    if verificacion.Usado:
        raise ValueError("Este enlace ya fue utilizado.")

    if datetime.utcnow() > verificacion.Expira_En:
        raise ValueError("El enlace de verificación ha expirado. Solicita uno nuevo.")

    usuario = db.query(Usuario).filter(Usuario.ID_Usuario == verificacion.ID_Usuario).first()
    if not usuario:
        raise ValueError("El usuario asociado al token no existe.")

    usuario.Estado       = 1
    verificacion.Usado   = True
    db.commit()

    return f"{FRONTEND_URL}/login?verificado=1"


def reenviar_verificacion(db: Session, correo: str) -> None:
    """
    Invalida tokens anteriores del correo, genera uno nuevo y lo envía.
    No revela si el correo existe o no para evitar enumeración.
    """
    usuario = db.query(Usuario).filter(Usuario.Correo == correo).first()
    if not usuario or usuario.Estado != 2:
        return  # no revelar

    # Invalidar tokens previos
    db.query(VerificacionEmail).filter(
        VerificacionEmail.ID_Usuario == usuario.ID_Usuario,
        VerificacionEmail.Usado      == False,
    ).update({"Usado": True})

    token = str(uuid.uuid4())
    db.add(VerificacionEmail(
        ID_Usuario = usuario.ID_Usuario,
        Token      = token,
        Expira_En  = datetime.utcnow() + timedelta(hours=24),
        Usado      = False,
    ))
    db.commit()

    nombre = usuario.Nombre or ""
    try:
        _enviar_email_verificacion(correo, token, nombre)
    except Exception:
        pass  # no revelar el error, el token ya fue generado


# ─────────────────────────────────────────
# RECUPERACIÓN DE CONTRASEÑA
# ─────────────────────────────────────────

def _enviar_email_codigo(correo_destino: str, codigo: str, nombre: str = "") -> None:
    saludo = f"Hola <strong>{nombre}</strong>," if nombre else "Hola,"
    html   = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#2E7D32,#66BB6A);padding:24px;border-radius:14px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:22px;">🌿 Brom's</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">Recuperación de contraseña</p>
      </div>
      <p style="color:#333;">{saludo}</p>
      <p style="color:#555;font-size:14px;">Recibimos una solicitud para restablecer tu contraseña. Ingresa el siguiente código:</p>
      <div style="background:#f5f9f5;border:2px solid #C8E6C9;border-radius:14px;padding:28px;text-align:center;margin:24px 0;">
        <div style="font-size:42px;font-weight:bold;letter-spacing:14px;color:#2E7D32;font-family:monospace;">{codigo}</div>
        <p style="color:#888;margin:10px 0 0;font-size:12px;">Válido por {CODE_EXPIRE_MIN} minutos</p>
      </div>
      <p style="color:#999;font-size:12px;">Si no solicitaste esto, ignora este correo. Tu contraseña no será modificada.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
      <p style="color:#bbb;font-size:11px;text-align:center;">Brom's · Correo automático, no respondas a este mensaje.</p>
    </div>
    """
    _resend_http(correo_destino, "🔑 Código de recuperación — Brom's", html)


def solicitar_recuperacion(db: Session, correo: str) -> None:
    """
    Genera un código de 6 dígitos, lo almacena con expiración de 10 minutos
    y lo envía al correo del usuario.
    Siempre responde igual para no revelar si el correo existe o no.
    """
    registro, _ = buscar_por_correo(db, correo)
    if not registro:
        return  # No revelar que el correo no existe

    codigo = str(random.randint(100000, 999999))
    _codigos_reset[correo.lower()] = {
        "codigo":  codigo,
        "expires": datetime.utcnow() + timedelta(minutes=CODE_EXPIRE_MIN),
    }

    nombre = getattr(registro, "Nombre", "") or ""
    try:
        _enviar_email_codigo(correo, codigo, nombre)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo enviar el correo de recuperación. Verifica que el RESEND_API_KEY esté configurado en Render. ({e})"
        )


def verificar_codigo_recuperacion(db: Session, correo: str, codigo: str) -> str:
    """
    Valida el código. Si es correcto lo elimina (uso único)
    y retorna un JWT de reset de 10 minutos.
    """
    key   = correo.lower()
    entry = _codigos_reset.get(key)

    if not entry:
        raise ValueError("No hay una solicitud activa para este correo. Solicita un nuevo código.")

    if datetime.utcnow() > entry["expires"]:
        _codigos_reset.pop(key, None)
        raise ValueError("El código ha expirado. Solicita uno nuevo.")

    if entry["codigo"] != codigo.strip():
        raise ValueError("Código incorrecto. Verifica e intenta de nuevo.")

    _codigos_reset.pop(key, None)   # consumir el código

    registro, _ = buscar_por_correo(db, correo)
    if not registro:
        raise ValueError("Correo no encontrado.")

    return crear_reset_token(correo)


def resetear_contrasena(db: Session, token: str, nueva_contrasena: str) -> None:
    correo = validar_reset_token(token)

    registro, _ = buscar_por_correo(db, correo)
    if not registro:
        raise ValueError("El correo asociado al token no existe en el sistema")

    registro.Contrasena = hashear_contrasena(nueva_contrasena)
    db.commit()


# ─────────────────────────────────────────
# CAMBIO DE CONTRASEÑA AUTENTICADO
# ─────────────────────────────────────────

def cambiar_contrasena(db: Session, actual: dict, contrasena_actual: str, nueva_contrasena: str) -> None:
    """
    Cambia la contraseña de un usuario o empleado autenticado.
    Valida que la contraseña actual sea correcta antes de actualizar.
    Funciona para tipo 'usuario' y tipo 'empleado'.
    """
    registro = actual["registro"]

    if not verificar_contrasena(contrasena_actual, registro.Contrasena):
        raise ValueError("La contraseña actual es incorrecta")

    registro.Contrasena = hashear_contrasena(nueva_contrasena)
    db.commit()


# ─────────────────────────────────────────
# FOTO DE PERFIL (Cloudinary)
# ─────────────────────────────────────────

def serializar_foto(url: str | None) -> str | None:
    """Retorna la URL de Cloudinary tal cual (ya no hay base64)."""
    return url or None


def actualizar_foto_perfil(db: Session, actual: dict, url: str) -> str:
    """
    Guarda la URL de Cloudinary en Foto_perfil del usuario o empleado.
    El frontend sube la imagen a Cloudinary y envía solo la URL resultante.
    """
    registro = actual["registro"]
    registro.Foto_perfil = url
    db.commit()
    db.refresh(registro)
    return registro.Foto_perfil


def eliminar_foto_perfil(db: Session, actual: dict) -> None:
    """Elimina la foto de perfil poniendo el campo en NULL."""
    registro = actual["registro"]
    registro.Foto_perfil = None
    db.commit()


# ─────────────────────────────────────────
# PERMISOS DEL USUARIO ACTUAL
# ─────────────────────────────────────────

def obtener_mis_permisos(db: Session, actual: dict) -> list[str]:
    """
    Retorna los nombres de permisos del usuario autenticado.
    Admin (ID_Rol=1) recibe todos los permisos existentes sin consultar Rol_x_Permiso.
    """
    registro = actual["registro"]
    id_rol   = getattr(registro, "ID_Rol", None)

    if not id_rol:
        return []
    if id_rol == 1:
        return [p.Permiso for p in db.query(Permiso).all()]

    return [
        p.Permiso
        for p in (
            db.query(Permiso)
            .join(RolXPermiso, RolXPermiso.ID_Permiso == Permiso.ID_Permiso)
            .filter(RolXPermiso.ID_Rol == id_rol)
            .all()
        )
    ]