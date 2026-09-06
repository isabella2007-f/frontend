"""El plazo para pedir una devolución.

La app y la web esconden los pedidos vencidos, pero el que decide es el
servidor: si acá el número fuera otro, el cliente vería un pedido devolvible y
recibiría un rebote al enviar la solicitud.

Estas pruebas fijan el plazo en 48 horas y, sobre todo, fijan qué pasa cuando
al pedido le falta la fecha de entrega.
"""
import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.features.ventas.devoluciones.services.service import (
    HORAS_LIMITE_DEVOLUCION,
    plazo_vencido,
)


class TestPlazoDevolucion(unittest.TestCase):
    def setUp(self):
        self.ahora = datetime(2026, 9, 6, 12, 0, 0)

    def hace(self, horas):
        return self.ahora - timedelta(hours=horas)

    def test_el_plazo_es_de_48_horas(self):
        # Es el mismo número que muestran la app (kHorasLimiteDevolucion) y la
        # web. Si cambia acá, hay que cambiarlo allá.
        self.assertEqual(HORAS_LIMITE_DEVOLUCION, 48)

    def test_recien_entregado_se_puede_devolver(self):
        vencido, horas = plazo_vencido(self.hace(2), self.ahora)
        self.assertFalse(vencido)
        self.assertEqual(horas, 2)

    def test_justo_en_el_limite_todavia_se_puede(self):
        vencido, _ = plazo_vencido(
            self.hace(HORAS_LIMITE_DEVOLUCION), self.ahora)
        self.assertFalse(vencido)

    def test_pasado_el_limite_ya_no(self):
        vencido, horas = plazo_vencido(
            self.hace(HORAS_LIMITE_DEVOLUCION + 1), self.ahora)
        self.assertTrue(vencido)
        self.assertEqual(horas, HORAS_LIMITE_DEVOLUCION + 1)

    def test_sin_fecha_de_entrega_no_se_vence(self):
        # A los pedidos viejos les falta el timestamp. Rechazar por eso sería
        # castigar al cliente por un dato que nunca se guardó: se acepta la
        # solicitud y la revisa una persona.
        self.assertEqual(plazo_vencido(None, self.ahora), (False, 0))

    def test_las_horas_se_cuentan_hacia_abajo(self):
        # 47 horas y 59 minutos son 47 horas, no 48: el mensaje al cliente no
        # puede decirle que pasaron más de las que pasaron.
        _, horas = plazo_vencido(
            self.ahora - timedelta(hours=47, minutes=59), self.ahora)
        self.assertEqual(horas, 47)


if __name__ == "__main__":
    unittest.main()
