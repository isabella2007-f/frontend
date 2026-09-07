"""El barrio del cliente llega al panel.

`_formato_persona` lo arma, pero si `PersonaResponse` no lo declara, Pydantic
lo descarta en silencio y el panel ve a todos los clientes sin barrio. Es el
dato con el que el alta de pedidos sabe a dónde va el domicilio y cuánto vale.
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import *  # noqa: F401,F403
from panel import ID_BARRIO, ID_CLIENTE, PanelBase

from src.shared.services.models import Usuario


class BarrioEnUsuariosTests(PanelBase):
    def setUp(self):
        super().setUp()
        # El barrio ya viene sembrado por el harness; acá solo se le asigna.
        cliente = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first()
        cliente.ID_Barrio = ID_BARRIO
        self.db.commit()

    def test_el_listado_del_panel_lo_trae(self):
        r = self.client.get("/api/usuarios/?por_pagina=100", headers=self.admin)
        self.assertEqual(r.status_code, 200, r.text)
        cliente = next(p for p in r.json()["personas"]
                       if p["id"] == ID_CLIENTE)
        self.assertEqual(cliente["ID_Barrio"], ID_BARRIO)

    def test_el_detalle_tambien(self):
        r = self.client.get(f"/api/usuarios/{ID_CLIENTE}", headers=self.admin)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["ID_Barrio"], ID_BARRIO)

    def test_un_cliente_sin_barrio_lo_dice_con_null(self):
        # Es la diferencia entre "no tiene" y "no llegó": el panel avisa cosas
        # distintas según cuál sea.
        cliente = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE).first()
        cliente.ID_Barrio = None
        self.db.commit()
        r = self.client.get(f"/api/usuarios/{ID_CLIENTE}", headers=self.admin)
        self.assertIsNone(r.json()["ID_Barrio"])


if __name__ == "__main__":
    unittest.main()
