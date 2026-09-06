"""Un cliente puede borrar su propia cuenta.

La app decía "sin conexión con el servidor" y la web no decía nada. Estas
pruebas van directo al endpoint para separar las dos posibilidades: que el
servidor esté fallando, o que sea el cliente el que no sabe leer la respuesta.
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import *  # noqa: F401,F403
from panel import ID_ADMIN, ID_CLIENTE, ID_TOSTON, PanelBase

from sqlalchemy import text

from src.features.auth.services.service import ESTADO_CUENTA_ELIMINADA
from src.shared.services.models import Usuario


class EliminarCuentaTests(PanelBase):
    def usuario(self, id_usuario):
        return self.db.query(Usuario).filter(
            Usuario.ID_Usuario == id_usuario).first()

    def test_un_cliente_sin_historial_borra_su_cuenta(self):
        respuesta = self.client.delete("/api/auth/mi-cuenta",
                                       headers=self.cliente)
        self.assertEqual(respuesta.status_code, 200, respuesta.text)
        self.assertIn("mensaje", respuesta.json())

    def test_la_respuesta_es_json_y_trae_el_mensaje(self):
        # La app hace jsonDecode del cuerpo: si viniera vacío o en HTML,
        # reventaría y mostraría "sin conexión al servidor" tapando el error.
        respuesta = self.client.delete("/api/auth/mi-cuenta",
                                       headers=self.cliente)
        self.assertEqual(
            respuesta.headers.get("content-type", "").split(";")[0],
            "application/json")
        self.assertTrue(respuesta.json().get("mensaje"))

    def test_con_pedidos_la_cuenta_se_desactiva_y_libera_el_correo(self):
        # No se puede borrar de verdad: las ventas la referencian. Se anonimiza
        # para que el correo quede libre y no se pueda volver a entrar.
        self.afirmar_ok(self.post("/ventas/", self.cliente, {
            "ID_Usuario": ID_CLIENTE,
            "Metodo_Pago": "Efectivo",
            "productos": [{"ID_Producto": ID_TOSTON, "Cantidad": 1}],
        }), 201)
        correo_antes = self.usuario(ID_CLIENTE).Correo

        respuesta = self.client.delete("/api/auth/mi-cuenta",
                                       headers=self.cliente)
        self.assertEqual(respuesta.status_code, 200, respuesta.text)

        u = self.usuario(ID_CLIENTE)
        self.assertIsNotNone(u, "la cuenta con ventas no se borra físicamente")
        self.assertEqual(u.Estado, ESTADO_CUENTA_ELIMINADA)
        self.assertNotEqual(u.Correo, correo_antes)

    def test_el_administrador_no_puede_borrar_la_suya(self):
        respuesta = self.client.delete("/api/auth/mi-cuenta",
                                       headers=self.admin)
        self.assertEqual(respuesta.status_code, 403)
        self.assertIsNotNone(self.usuario(ID_ADMIN))

    def test_sin_sesion_no_se_borra_nada(self):
        respuesta = self.client.delete("/api/auth/mi-cuenta")
        self.assertIn(respuesta.status_code, (401, 403))
        self.assertIsNotNone(self.usuario(ID_CLIENTE))



class EliminarCuentaConLlavesForaneasTests(PanelBase):
    """Lo mismo, pero con las llaves foráneas encendidas.

    SQLite las ignora por omisión; MySQL —que es lo que corre en producción—
    no. Sin este encendido, la prueba pasa acá y el borrado revienta allá.
    """

    def setUp(self):
        super().setUp()
        self.db.execute(text("PRAGMA foreign_keys=ON"))

    def test_la_cuenta_con_pedidos_se_desactiva_sin_romper_las_llaves(self):
        # El caso real: un cliente que ya compró. No se puede borrar de verdad
        # —las ventas lo referencian— así que se anonimiza. El estado con el
        # que queda tiene que existir en el catálogo de Estados, o el commit
        # revienta contra la llave foránea y el cliente ve un error de red.
        self.afirmar_ok(self.post("/ventas/", self.cliente, {
            "ID_Usuario": ID_CLIENTE,
            "Metodo_Pago": "Efectivo",
            "productos": [{"ID_Producto": ID_TOSTON, "Cantidad": 1}],
        }), 201)

        respuesta = self.client.delete("/api/auth/mi-cuenta",
                                       headers=self.cliente)
        self.assertEqual(respuesta.status_code, 200, respuesta.text)

        u = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first()
        self.assertEqual(u.Estado, ESTADO_CUENTA_ELIMINADA)
        self.assertEqual(u.Correo_Verificado, 0)

    def test_el_estado_con_el_que_queda_existe_en_el_catalogo(self):
        from src.shared.services.models import Estado
        catalogo = self.db.query(Estado).filter(
            Estado.ID_Estados == ESTADO_CUENTA_ELIMINADA).first()
        self.assertIsNotNone(
            catalogo,
            "el estado de cuenta eliminada tiene que existir en Estados: "
            "si no, MySQL rechaza el commit por llave foránea")

    def test_sin_historial_la_cuenta_se_borra_de_verdad(self):
        # Nada la referencia, así que se puede borrar la fila y el correo queda
        # libre de inmediato para volver a registrarse.
        self.client.delete("/api/auth/mi-cuenta", headers=self.cliente)
        self.assertIsNone(self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first())

    def test_con_historial_el_correo_queda_libre_y_no_se_puede_entrar(self):
        self.afirmar_ok(self.post("/ventas/", self.cliente, {
            "ID_Usuario": ID_CLIENTE,
            "Metodo_Pago": "Efectivo",
            "productos": [{"ID_Producto": ID_TOSTON, "Cantidad": 1}],
        }), 201)
        correo_original = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first().Correo

        self.client.delete("/api/auth/mi-cuenta", headers=self.cliente)

        u = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first()
        self.assertNotEqual(u.Correo, correo_original)
        self.assertIn(u.Estado, (0, 2),
                      "el login bloquea 0 y 2; con otro estado se podría entrar")


if __name__ == "__main__":
    unittest.main()
