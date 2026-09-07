"""Las indicaciones del perfil se pueden escribir y también borrar.

El endpoint arma los campos con `exclude_none`, así que mandar null significa
"no la toques". El formulario mandaba null cuando el campo quedaba vacío y
borrar el texto no borraba nada: el cliente vaciaba el campo, guardaba, y
seguía viendo lo de antes.
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import *  # noqa: F401,F403
from panel import ID_CLIENTE, PanelBase

from src.shared.services.models import Usuario


class PerfilIndicacionesTests(PanelBase):
    def cliente_db(self):
        return self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first()

    def guardar(self, cuerpo):
        return self.client.put("/api/auth/perfil", json=cuerpo,
                               headers=self.cliente)

    def test_se_guardan(self):
        r = self.guardar({"Indicaciones": "Portón verde, timbre 2"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.cliente_db().Indicaciones, "Portón verde, timbre 2")

    def test_el_perfil_las_devuelve(self):
        # Es de donde las lee el formulario para mostrarlas.
        self.guardar({"Indicaciones": "Casa esquinera"})
        perfil = self.client.get("/api/auth/perfil", headers=self.cliente)
        self.assertEqual(perfil.json()["Indicaciones"], "Casa esquinera")

    def test_vacias_las_borran(self):
        # El caso que no funcionaba: el cliente vacía el campo para sacarse un
        # texto viejo de encima.
        self.guardar({"Indicaciones": "Barrio Pachelly. Apto 302"})
        r = self.guardar({"Indicaciones": ""})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.cliente_db().Indicaciones or "", "")

    def test_null_las_deja_como_estaban(self):
        # Es lo que significa null acá, y por eso mandar null al vaciar el
        # campo no borraba nada.
        self.guardar({"Indicaciones": "No tocar"})
        self.guardar({"Telefono": "3001234567", "Indicaciones": None})
        self.assertEqual(self.cliente_db().Indicaciones, "No tocar")

    def test_no_hace_falta_mandar_todo_el_perfil(self):
        # El formulario manda solo lo que cambió; el resto no se pierde.
        antes = self.cliente_db().Nombre
        self.guardar({"Indicaciones": "Al lado de la tienda"})
        self.assertEqual(self.cliente_db().Nombre, antes)


if __name__ == "__main__":
    unittest.main()
