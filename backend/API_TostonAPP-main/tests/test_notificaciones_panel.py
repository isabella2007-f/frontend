"""Vaciar el panel de notificaciones y que no vuelvan.

El admin las vaciaba, la pantalla quedaba limpia, y al recargar estaban todas
otra vez. Dos cosas las traían de vuelta:

1. "Limpiar" borraba solo las LEÍDAS, así que todo lo que no se había abierto
   seguía en la base: nunca se había ido.
2. Las de stock las vuelve a crear el propio listado mientras el insumo siga
   bajo. Borrarlas no servía de nada.

Lo que se prueba acá es el ciclo entero por HTTP —vaciar, volver a listar— que
es donde se veía el problema y donde ninguna prueba miraba.

Corre sin credenciales:
    python tests/test_notificaciones_panel.py
"""
import unittest
from datetime import datetime

from panel import PanelBase

from src.shared.services.models import Insumo, Notificacion


class NotificacionesDelPanelTests(PanelBase):

    def notificar(self, tipo="pedido_nuevo", titulo="Pedido nuevo", ref=1):
        """Una notificación cualquiera, de las que no dependen del stock."""
        self.db.add(Notificacion(
            Tipo=tipo, Titulo=titulo, Mensaje="…",
            Referencia_ID=ref, Ruta="/ventas/pedidos",
            Fecha=datetime.now(), Leida=False,
        ))
        self.db.commit()

    def listar(self):
        return self.afirmar_ok(self.get("/notificaciones/", self.admin))

    def vaciar(self):
        return self.afirmar_ok(
            self.delete("/notificaciones/limpiar", self.admin))

    # ── Lo que no depende del stock ──────────────────────────────────────
    def test_vaciar_saca_tambien_las_que_no_se_abrieron(self):
        """El caso que fallaba: sin abrir, no se borraban.

        Se listaba, se vaciaba, y al volver a listar seguían todas.
        """
        self.notificar(ref=1)
        self.notificar(ref=2)
        self.assertEqual(self.listar()["total"], 2)

        self.vaciar()
        self.assertEqual(self.listar()["total"], 0)

    def test_una_leida_y_una_sin_leer_se_van_las_dos(self):
        self.notificar(ref=1)
        self.notificar(ref=2)
        primera = self.listar()["notificaciones"][0]["ID_Notificacion"]
        self.afirmar_ok(
            self.patch(f"/notificaciones/{primera}/leer", self.admin))

        self.vaciar()
        self.assertEqual(self.listar()["total"], 0)

    def test_vaciar_dos_veces_no_falla(self):
        self.notificar()
        self.vaciar()
        self.vaciar()
        self.assertEqual(self.listar()["total"], 0)

    def test_lo_que_llega_despues_de_vaciar_sí_se_ve(self):
        """Vaciar limpia lo de antes, no silencia el panel para siempre."""
        self.notificar(ref=1)
        self.vaciar()

        self.notificar(ref=2, titulo="Pedido nuevo — #2")
        listado = self.listar()
        self.assertEqual(listado["total"], 1)
        self.assertEqual(listado["notificaciones"][0]["Titulo"],
                         "Pedido nuevo — #2")

    def test_borrar_una_sola_no_toca_las_demas(self):
        self.notificar(ref=1)
        self.notificar(ref=2)
        una = self.listar()["notificaciones"][0]["ID_Notificacion"]

        self.afirmar_ok(self.delete(f"/notificaciones/{una}", self.admin))
        self.assertEqual(self.listar()["total"], 1)

    # ── Las de stock, que el listado regenera ────────────────────────────
    def insumo_bajo(self):
        """Deja la harina en estado de stock agotado (14/15)."""
        harina = self.db.query(Insumo).first()
        harina.Stock_Actual = 0
        harina.Estado = 15
        self.db.commit()
        return harina

    def test_la_alerta_de_stock_se_crea_sola(self):
        self.insumo_bajo()
        tipos = [n["Tipo"] for n in self.listar()["notificaciones"]]
        self.assertTrue(
            any("stock" in t for t in tipos),
            f"el listado tenía que crear la alerta de stock: {tipos}")

    def test_vaciada_la_alerta_de_stock_no_vuelve(self):
        """El corazón del problema.

        La alerta la vuelve a crear el propio listado mientras el insumo siga
        bajo, así que borrarla no servía: a los dos segundos estaba de nuevo.
        """
        self.insumo_bajo()
        self.assertGreater(self.listar()["total"], 0)

        self.vaciar()
        self.assertEqual(self.listar()["total"], 0, "volvió a aparecer")
        # Y sigue sin volver por más veces que se recargue.
        self.assertEqual(self.listar()["total"], 0)

    def test_si_el_stock_se_recompone_y_vuelve_a_caer_avisa_otra_vez(self):
        """Descartar no es silenciar para siempre.

        Un problema nuevo tiene que avisar, aunque el anterior se haya
        descartado: si no, se estaría escondiendo un faltante real.
        """
        harina = self.insumo_bajo()
        # El listado es el que crea la alerta; vaciar descarta lo que ya está.
        self.assertGreater(self.listar()["total"], 0)
        self.vaciar()
        self.assertEqual(self.listar()["total"], 0)

        # Entra mercadería: el problema se resolvió.
        harina.Stock_Actual = 100
        harina.Estado = 1
        self.db.commit()
        self.assertEqual(self.listar()["total"], 0)

        # Y vuelve a caer: es un faltante nuevo y hay que avisarlo.
        harina.Stock_Actual = 0
        harina.Estado = 15
        self.db.commit()
        self.assertGreater(self.listar()["total"], 0,
                           "una caída nueva tiene que avisar")

    def test_el_cliente_no_puede_vaciar_el_panel(self):
        """El panel es del personal: sus notificaciones no son de nadie más."""
        self.notificar()
        respuesta = self.delete("/notificaciones/limpiar", self.cliente)
        self.assertIn(respuesta.status_code, (401, 403),
                      self.detalle(respuesta))
        self.assertEqual(self.listar()["total"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
