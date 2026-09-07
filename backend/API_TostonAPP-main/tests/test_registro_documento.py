"""El documento se guarda al registrarse.

La app no lo pedía y su cuerpo de registro ni siquiera lo incluía, así que toda
cuenta creada desde el celular nacía sin documento. Estas pruebas fijan que el
servidor lo acepta con los nombres que mandan los dos clientes y lo guarda
donde el perfil lo lee.
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import *  # noqa: F401,F403
from panel import PanelBase

from src.shared.services.models import Usuario


class RegistroDocumentoTests(PanelBase):
    def cuerpo(self, correo, **extra):
        datos = {
            "Nombre": "Ana",
            "Apellidos": "García",
            "Correo": correo,
            "Contrasena": "MiClave123@",
            "Confirmar_contrasena": "MiClave123@",
        }
        datos.update(extra)
        return datos

    def registrado(self, correo):
        return self.db.query(Usuario).filter(
            Usuario.Correo == correo).first()

    def test_el_documento_queda_guardado(self):
        correo = "ana.documento@correo.com"
        respuesta = self.client.post("/api/auth/registro", json=self.cuerpo(
            correo, Numero_documento="1020304050", Tipo_documento="CC"))
        self.assertEqual(respuesta.status_code, 201, respuesta.text)

        u = self.registrado(correo)
        self.assertEqual(u.Cedula, "1020304050")
        self.assertEqual(u.Tipo_Documento, "CC")

    def test_el_perfil_lo_devuelve(self):
        # Es lo que leen la app y la web para mostrarlo. Si el registro lo
        # guarda pero el perfil no lo devuelve, el cliente no lo ve igual.
        correo = "ana.perfil@correo.com"
        respuesta = self.client.post("/api/auth/registro", json=self.cuerpo(
            correo, Numero_documento="98765432", Tipo_documento="CE"))
        token = respuesta.json()["access_token"]

        perfil = self.client.get(
            "/api/auth/perfil",
            headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(perfil.status_code, 200, perfil.text)
        self.assertEqual(perfil.json()["Cedula"], "98765432")
        self.assertEqual(perfil.json()["Tipo_Documento"], "CE")

    def test_sin_documento_la_cuenta_igual_se_crea(self):
        # Las cuentas viejas de la app no lo tienen: el registro no puede
        # exigirlo del lado del servidor o dejaría de funcionar para ellas.
        correo = "ana.sindoc@correo.com"
        respuesta = self.client.post(
            "/api/auth/registro", json=self.cuerpo(correo))
        self.assertEqual(respuesta.status_code, 201, respuesta.text)
        self.assertIsNone(self.registrado(correo).Cedula)


if __name__ == "__main__":
    unittest.main()
