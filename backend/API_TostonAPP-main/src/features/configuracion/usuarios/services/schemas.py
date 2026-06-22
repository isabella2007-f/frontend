from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


def validar_cedula(cedula: str, tipo_documento: str) -> Optional[str]:
    limpia = cedula.replace(" ", "").replace("-", "")
    if not limpia.isdigit():
        return "La cédula debe contener solo números"
    min_d = 9 if tipo_documento == "NIT" else 8
    max_d = 11 if tipo_documento == "NIT" else 10
    if not (min_d <= len(limpia) <= max_d):
        return f"La cédula debe tener entre {min_d} y {max_d} dígitos"
    return None


def validar_telefono(telefono: str) -> Optional[str]:
    limpio = telefono.replace(" ", "").replace("-", "")
    if not limpio.isdigit():
        return "El teléfono debe contener solo números"
    if not (7 <= len(limpio) <= 15):
        return "El teléfono debe tener entre 7 y 15 dígitos"
    return None


# ── Crear empleado (cualquier rol no-cliente) ──
class EmpleadoCreate(BaseModel):
    Cedula:         str
    Tipo_Documento: str
    Nombre:         str
    Apellidos:      str
    Correo:         EmailStr
    Contrasena:     str
    Direccion:      Optional[str] = None
    Municipio:      Optional[str] = None
    Departamento:   Optional[str] = None
    Telefono:       Optional[str] = None
    Foto:           Optional[str] = None
    ID_Rol:         int


# ── Crear cliente ──
class UsuarioCreate(BaseModel):
    Cedula:         str
    Tipo_Documento: str
    Nombre:         str
    Apellidos:      str
    Correo:         EmailStr
    Contrasena:     str
    Direccion:      Optional[str] = None
    Municipio:      Optional[str] = None
    Departamento:   Optional[str] = None
    Telefono:       Optional[str] = None
    Foto:           Optional[str] = None
    ID_Rol:         Optional[int] = None  # por defecto rol Cliente


# ── Editar (aplica para todos) ──
class PersonaUpdate(BaseModel):
    Cedula:         Optional[str]       = None
    Tipo_Documento: Optional[str]       = None
    Nombre:         Optional[str]       = None
    Apellidos:      Optional[str]       = None
    Correo:         Optional[EmailStr]  = None
    Direccion:      Optional[str]       = None
    Municipio:      Optional[str]       = None
    Departamento:   Optional[str]       = None
    Indicaciones:   Optional[str]       = None
    Telefono:       Optional[str]       = None
    Foto:           Optional[str]       = None
    Contrasena:     Optional[str]       = None
    ID_Rol:         Optional[int]       = None


# ── Cambiar estado ON/OFF ──
class PersonaEstado(BaseModel):
    Estado: int


# ── Respuesta unificada ──
class PersonaResponse(BaseModel):
    id:             int             # ID_Usuario
    Cedula:         Optional[str]   = None
    Tipo_Documento: Optional[str]   = None
    Nombre:         str
    Apellidos:      str
    Correo:         str
    Direccion:      Optional[str]   = None
    Municipio:      Optional[str]   = None
    Departamento:   Optional[str]   = None
    Indicaciones:   Optional[str]   = None
    Telefono:       Optional[str]   = None
    Foto:           Optional[str]   = None
    ID_Rol:         Optional[int]   = None
    nombre_rol:     Optional[str]   = None
    Estado:         Optional[int]   = None
    Fecha_creacion: Optional[datetime] = None
    tipo:           str             # "empleado" o "cliente"

    class Config:
        from_attributes = True


# ── Respuesta paginada ──
class PersonaListResponse(BaseModel):
    total:      int
    pagina:     int
    por_pagina: int
    personas:   list[PersonaResponse]