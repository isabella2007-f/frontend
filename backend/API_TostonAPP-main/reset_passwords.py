"""
reset_passwords.py
Re-hashea la contrasena Admin123@ para TODOS los empleados y usuarios de la BD.
Ejecutar cuando passlib lanza UnknownHashError al intentar login.

Uso (desde la carpeta API_TostonAPP-main con el venv activo):
    python reset_passwords.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
from src.shared.services.database import SessionLocal
from src.shared.services.models import Usuario

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
CONTRASENA  = "Admin123@"

def reset():
    db = SessionLocal()
    try:
        nuevo_hash = pwd_context.hash(CONTRASENA)
        print(f"Hash generado: {nuevo_hash[:30]}...")

        usuarios = db.query(Usuario).all()
        for u in usuarios:
            u.Contrasena = nuevo_hash
        print(f"  {len(usuarios)} usuario(s) actualizados")

        db.commit()
        print("OK - Contrasenas restablecidas. Usa Admin123@ para todos los usuarios.")
    except Exception as ex:
        db.rollback()
        print(f"ERROR: {ex}")
    finally:
        db.close()

if __name__ == "__main__":
    reset()
