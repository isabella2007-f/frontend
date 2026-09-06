"""
Reconocer el rol de reparto.

El rol de reparto no siempre es el ID 4: desde Configuración → Roles se puede
crear otro ("Repartidor", "Domiciliario 2"…), así que también se reconoce por
el nombre, normalizado sin acentos y en minúscula.

Esta regla estaba escrita dos veces y no coincidían: `domicilios/router.py`
comparaba por contenido (correcto) y `notificaciones/router.py` exigía
`rol == "domiciliario"` exacto, así que a un repartidor con el rol nombrado de
cualquier otra forma el endpoint le respondía 403 y la campana del panel se
quedaba vacía sin decir por qué. Misma regla que `utils/roles.js` en el panel
web y `session_service.dart` en la app móvil.
"""

import unicodedata

ID_ROL_REPARTIDOR = 4


def normalizar_rol(rol: str | None) -> str:
    """Minúsculas y sin acentos, para comparar por contenido."""
    texto = unicodedata.normalize("NFD", (rol or "").lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def es_nombre_rol_repartidor(rol: str | None) -> bool:
    nombre = normalizar_rol(rol)
    return "domicil" in nombre or "repart" in nombre


def es_repartidor(actual: dict) -> bool:
    """¿Quien llama es de reparto? Por ID de rol o por nombre."""
    if getattr(actual.get("registro"), "ID_Rol", None) == ID_ROL_REPARTIDOR:
        return True
    return es_nombre_rol_repartidor(actual.get("rol"))
