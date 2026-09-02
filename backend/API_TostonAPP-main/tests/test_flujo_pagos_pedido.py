"""Qué falta cobrar y qué falta aprobar en un pedido.

Estas preguntas viven en tres capas —web, app móvil y API— y tienen que
contestar lo mismo. Si la app le muestra al repartidor el botón de cobrar pero
el servidor no exige ese cobro, el pedido se entrega sin la plata; si el
servidor exige algo que la app no sabe pedir, el repartidor queda trabado.

El caso que más se colaba es el pedido mixto: lleva comprobante Y efectivo en
mano, y aprobar el comprobante lo dejaba en 'anticipo_pagado', que se leía como
"ya está pago" aunque la plata en mano siguiera sin cobrarse.
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

from src.shared.services.pagos_utils import (
    cobro_efectivo_pendiente,
    comprobante_sin_aprobar,
    es_pago_efectivo,
    es_pago_mixto,
    es_pago_transferencia,
)


def venta(metodo, estado_pago="pendiente", comprobante=None, pago_final=0):
    return type("Venta", (), {
        "Metodo_Pago": metodo,
        "Estado_Pago": estado_pago,
        "Comprobante_Pago": comprobante,
        "Pago_Final_Registrado": pago_final,
    })()


class MetodoDePagoTests(unittest.TestCase):
    """Las tres preguntas básicas, con las variantes que se escriben de verdad."""

    def test_el_mixto_lleva_las_dos_cargas(self):
        self.assertTrue(es_pago_mixto("Mixto"))
        self.assertTrue(es_pago_transferencia("Mixto"))
        self.assertTrue(es_pago_efectivo("Mixto"))

    def test_reconoce_las_billeteras_como_transferencia(self):
        for metodo in ("Transferencia", "Nequi", "Daviplata", "Bancolombia", "QR"):
            self.assertTrue(es_pago_transferencia(metodo), metodo)
            self.assertFalse(es_pago_efectivo(metodo), metodo)

    def test_reconoce_el_contra_entrega_como_efectivo(self):
        for metodo in ("Efectivo", "Contra entrega", "cash"):
            self.assertTrue(es_pago_efectivo(metodo), metodo)
            self.assertFalse(es_pago_transferencia(metodo), metodo)

    def test_el_metodo_vacio_no_rompe(self):
        self.assertFalse(es_pago_efectivo(None))
        self.assertFalse(es_pago_transferencia(""))


class CobroEfectivoPendienteTests(unittest.TestCase):
    def test_el_efectivo_recien_pedido_esta_pendiente(self):
        self.assertTrue(cobro_efectivo_pendiente(venta("Efectivo")))

    def test_cobrado_ya_no_esta_pendiente(self):
        self.assertFalse(cobro_efectivo_pendiente(
            venta("Efectivo", estado_pago="efectivo_recibido")))

    def test_declarar_que_no_se_cobro_tambien_cuenta_como_registrado(self):
        # 'no_recibido' exige motivo de 10+ caracteres y queda auditado: el
        # repartidor dijo qué pasó, que es lo que se le pide antes de entregar.
        self.assertFalse(cobro_efectivo_pendiente(
            venta("Efectivo", estado_pago="no_recibido")))

    def test_la_transferencia_pura_no_tiene_nada_que_cobrar_en_mano(self):
        self.assertFalse(cobro_efectivo_pendiente(
            venta("Transferencia", estado_pago="pendiente")))

    def test_el_mixto_con_el_comprobante_aprobado_sigue_debiendo_el_efectivo(self):
        # Regresión: 'anticipo_pagado' se leía como pagado y el pedido mixto se
        # entregaba sin recibir la plata en mano.
        self.assertTrue(cobro_efectivo_pendiente(
            venta("Mixto", estado_pago="anticipo_pagado")))

    def test_el_mixto_con_el_efectivo_ya_registrado_no_esta_pendiente(self):
        # El admin puede cobrar la mitad en efectivo antes de que se apruebe el
        # comprobante: ahí el estado queda 'anticipo_pagado' pero la plata entró.
        self.assertFalse(cobro_efectivo_pendiente(
            venta("Mixto", estado_pago="anticipo_pagado", pago_final=1)))

    def test_el_mixto_saldado_no_esta_pendiente(self):
        self.assertFalse(cobro_efectivo_pendiente(
            venta("Mixto", estado_pago="pagado_completo")))

    def test_el_mixto_esperando_validacion_sigue_debiendo_el_efectivo(self):
        self.assertTrue(cobro_efectivo_pendiente(
            venta("Mixto", estado_pago="pendiente_validacion")))


class ComprobanteSinAprobarTests(unittest.TestCase):
    def test_el_comprobante_recien_subido_esta_sin_aprobar(self):
        self.assertTrue(comprobante_sin_aprobar(
            venta("Transferencia", estado_pago="pendiente_validacion",
                  comprobante="https://cloudinary.test/c.jpg")))

    def test_el_comprobante_aprobado_ya_no_frena(self):
        self.assertFalse(comprobante_sin_aprobar(
            venta("Transferencia", estado_pago="pagado_completo",
                  comprobante="https://cloudinary.test/c.jpg")))

    def test_el_comprobante_rechazado_sigue_frenando(self):
        self.assertTrue(comprobante_sin_aprobar(
            venta("Transferencia", estado_pago="comprobante_rechazado",
                  comprobante="https://cloudinary.test/c.jpg")))

    def test_sin_comprobante_adjunto_no_hay_nada_que_aprobar(self):
        # No se puede exigir aprobar algo que el admin no tiene forma de
        # aprobar: dejaria el pedido sin salida.
        self.assertFalse(comprobante_sin_aprobar(
            venta("Transferencia", estado_pago="pendiente")))

    def test_el_efectivo_puro_no_pasa_por_esta_puerta(self):
        self.assertFalse(comprobante_sin_aprobar(
            venta("Efectivo", estado_pago="pendiente")))

    def test_el_mixto_tambien_trae_comprobante_que_aprobar(self):
        self.assertTrue(comprobante_sin_aprobar(
            venta("Mixto", estado_pago="pendiente_validacion",
                  comprobante="https://cloudinary.test/c.jpg")))

    def test_en_el_mixto_aprobar_el_comprobante_lo_deja_pasar(self):
        self.assertFalse(comprobante_sin_aprobar(
            venta("Mixto", estado_pago="anticipo_pagado",
                  comprobante="https://cloudinary.test/c.jpg")))


if __name__ == "__main__":
    unittest.main()
