"""Lo que la respuesta del login tiene que traer.

El encabezado de la web muestra la foto de perfil al lado del nombre, y salía
la inicial: la respuesta del login no traía la foto y la sesión guardada
tampoco. La única forma de que apareciera era que la página del perfil la
escribiera en el navegador — una copia local que no sobrevivía a cerrar sesión.

Es la misma trampa de siempre en este proyecto: un campo que el servicio tiene
y el esquema no declara desaparece sin que nadie se entere. Acá se mira el
esquema directamente, porque el login no se puede recorrer en las pruebas
(necesita el backend de bcrypt, que no se instala a propósito).

Corre sin credenciales:
    python tests/test_login_contrato.py
"""
import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.features.auth.services.schemas import TokenResponse


class RespuestaDelLoginTests(unittest.TestCase):
    """Los campos que la sesión guarda apenas alguien entra."""

    def respuesta(self, **extra):
        base = dict(
            access_token="jwt", tipo="cliente", cedula=7,
            nombre="Ana", apellidos="García",
        )
        base.update(extra)
        return TokenResponse(**base).model_dump()

    def test_trae_lo_que_la_sesion_necesita(self):
        r = self.respuesta(rol="Cliente", foto_perfil="https://x/yo.jpg")
        for campo in ("access_token", "token_type", "tipo", "cedula",
                      "nombre", "apellidos", "rol", "correo_verificado",
                      "foto_perfil"):
            self.assertIn(campo, r, f"el esquema borró {campo}")

    def test_la_foto_llega_tal_cual(self):
        url = "https://res.cloudinary.com/demo/image/upload/yo.jpg"
        self.assertEqual(self.respuesta(foto_perfil=url)["foto_perfil"], url)

    def test_quien_no_tiene_foto_no_rompe_el_login(self):
        """La mayoría no tiene: el campo es opcional y llega en null."""
        self.assertIsNone(self.respuesta()["foto_perfil"])

    def test_el_login_arma_la_respuesta_con_la_foto(self):
        """Que el campo exista en el esquema no basta si nadie lo llena."""
        import inspect

        from src.features.auth.services import router

        codigo = inspect.getsource(router.login)
        self.assertIn("foto_perfil", codigo,
                      "el login declara la foto pero no la manda")


if __name__ == "__main__":
    unittest.main(verbosity=2)
