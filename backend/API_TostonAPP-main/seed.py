"""
seed_permisos.py
Siembra todos los permisos del sistema en la tabla Permisos.
Ejecutar una sola vez (o es idempotente: no duplica si ya existen).

Uso:
    python seed_permisos.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.shared.services.database import SessionLocal
from src.shared.services.models import Permiso
from src.shared.services.permisos_catalogo import PERMISOS as _CATALOGO

# (nombre, descripcion) — la fuente de verdad es permisos_catalogo.PERMISOS
PERMISOS = [(nombre, desc) for nombre, desc, _modulo, _accion in _CATALOGO]


def sembrar_permisos():
    db = SessionLocal()
    try:
        existentes = {p.Permiso for p in db.query(Permiso).all()}
        nuevos = 0

        for nombre, descripcion in PERMISOS:
            if nombre not in existentes:
                db.add(Permiso(Permiso=nombre, Descripcion=descripcion))
                nuevos += 1

        db.commit()
        print(f"✅ {nuevos} permiso(s) nuevo(s) sembrado(s). {len(existentes)} ya existían.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error al sembrar permisos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    sembrar_permisos()