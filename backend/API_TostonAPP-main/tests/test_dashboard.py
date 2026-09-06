"""Pruebas de la lógica pura del dashboard (rangos, granularidad, buckets,
disponibilidad de historial). No tocan base de datos.

Corre sin credenciales:
    python -m unittest tests.test_dashboard
"""
import os

# database.py arma el engine al importarse; con esto no se conecta a nada.
os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "clave-de-prueba")
os.environ.setdefault("ALGORITHM", "HS256")

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.features.dashboard.services import service as svc


class FakeDB:
    """Sustituye a la Session solo para _fecha_mas_antigua."""
    def __init__(self, earliest):
        self._earliest = earliest

    def query(self, *args, **kwargs):
        return self

    def scalar(self):
        return self._earliest


class RangoFechasTests(unittest.TestCase):
    def test_custom_invertido_se_corrige(self):
        a = datetime(2026, 3, 10)
        b = datetime(2026, 3, 1)
        ini, fin, _, _ = svc._rango_fechas("custom", a, b)
        self.assertLess(ini, fin)
        self.assertEqual(ini.day, 1)
        self.assertEqual(fin.day, 10)

    def test_no_permite_futuro(self):
        futuro = svc._ahora() + timedelta(days=400)
        ini, fin, _, _ = svc._rango_fechas("custom", svc._ahora() - timedelta(days=5), futuro)
        self.assertLessEqual(fin, svc._ahora() + timedelta(seconds=1))

    def test_periodo_anterior_misma_duracion(self):
        a = datetime(2026, 1, 1)
        b = datetime(2026, 1, 10, 23, 59, 59, 999999)
        ini, fin, ini_ant, fin_ant = svc._rango_fechas("custom", a, b)
        dur = fin - ini
        dur_ant = fin_ant - ini_ant
        self.assertAlmostEqual(dur.total_seconds(), dur_ant.total_seconds(), delta=1)
        self.assertLess(fin_ant, ini)


class GranularidadTests(unittest.TestCase):
    def _dur(self, dias):
        ini = datetime(2025, 1, 1)
        return svc._granularidad("custom", ini, ini + timedelta(days=dias - 1))

    def test_tabla_3_5(self):
        self.assertEqual(svc._granularidad("hoy", datetime(2025, 1, 1), datetime(2025, 1, 1)), "hora")
        self.assertEqual(svc._granularidad("semana", datetime(2025, 1, 1), datetime(2025, 1, 7)), "dia")
        self.assertEqual(svc._granularidad("mes", datetime(2025, 1, 1), datetime(2025, 1, 28)), "semana")
        self.assertEqual(self._dur(10), "dia")       # < 2 semanas
        self.assertEqual(self._dur(30), "semana")    # 2 sem – < 2 meses
        self.assertEqual(self._dur(120), "mes")      # 2 meses – < 2 años
        self.assertEqual(self._dur(1000), "anio")    # >= 2 años


class BucketsTests(unittest.TestCase):
    def test_dia_cubre_todo_el_rango(self):
        ini = datetime(2026, 2, 1)
        fin = datetime(2026, 2, 5, 23, 59, 59)
        edges = svc._bucket_edges(ini, fin, "dia")
        self.assertEqual(len(edges), 5)
        self.assertEqual(edges[0]["start"], ini)
        self.assertLessEqual(edges[-1]["end"], fin)

    def test_mes_no_revienta_en_enero(self):
        ini = datetime(2025, 12, 15)
        fin = datetime(2026, 2, 15, 23, 59, 59)
        edges = svc._bucket_edges(ini, fin, "mes")
        self.assertEqual([e["label"][:3] for e in edges], ["dic", "ene", "feb"])


class VariacionTests(unittest.TestCase):
    def test_sin_anterior_es_indefinido(self):
        # base 0 → el cambio porcentual no se puede calcular (no se inventa 100%)
        self.assertEqual(svc._variacion(100, 0), (None, True, True))
        self.assertEqual(svc._variacion(0, 0), (None, None, True))

    def test_normal(self):
        pct, sube, sin_base = svc._variacion(150, 100)
        self.assertEqual(pct, 50.0)
        self.assertTrue(sube)
        self.assertFalse(sin_base)
        pct, sube, sin_base = svc._variacion(80, 100)
        self.assertEqual(pct, -20.0)
        self.assertFalse(sube)
        self.assertFalse(sin_base)

    def test_tarjeta_sin_comparar(self):
        t = svc._tarjeta(500, 300, comparar=False)
        self.assertIsNone(t["variacion_pct"])
        self.assertIsNone(t["subiendo"])
        self.assertFalse(t["sin_base"])

    def test_tarjeta_base_cero(self):
        t = svc._tarjeta(500, 0, comparar=True)
        self.assertIsNone(t["variacion_pct"])
        self.assertTrue(t["sin_base"])


class GraficasTests(unittest.TestCase):
    def _buckets_2dias(self):
        b_ini = datetime(2026, 3, 3)
        b_fin = datetime(2026, 3, 4, 23, 59, 59, 999999)
        buckets = svc._bucket_edges(b_ini, b_fin, "dia")
        dur = (b_fin - b_ini) + timedelta(microseconds=1)
        return buckets, dur

    def test_indice_bucket(self):
        buckets, _ = self._buckets_2dias()
        self.assertEqual(svc._indice_bucket(buckets, datetime(2026, 3, 4, 15)), 1)
        self.assertEqual(svc._indice_bucket(buckets, datetime(2026, 1, 1)), -1)

    def test_recortar_top_recalcula_porcentaje(self):
        full = [
            {"ID_Producto": 1, "nombre": "A", "cantidad": 60, "ingresos": 0, "porcentaje": 60.0},
            {"ID_Producto": 2, "nombre": "B", "cantidad": 30, "ingresos": 0, "porcentaje": 30.0},
            {"ID_Producto": 3, "nombre": "C", "cantidad": 10, "ingresos": 0, "porcentaje": 10.0},
        ]
        top2 = svc._recortar_top(full, 2)
        self.assertEqual([p["ID_Producto"] for p in top2], [1, 2])
        self.assertEqual(round(sum(p["porcentaje"] for p in top2)), 100)
        self.assertEqual(top2[0]["porcentaje"], 66.7)

    def test_ventas_tiempo_actual_y_anterior(self):
        from decimal import Decimal
        buckets, dur = self._buckets_2dias()
        rows = [
            (1, datetime(2026, 3, 3, 10), 100),   # actual bucket 0
            (2, datetime(2026, 3, 4, 10), 200),   # actual bucket 1
            (3, datetime(2026, 3, 1, 10), 50),    # ventana anterior de bucket 0
        ]
        out = svc._ventas_tiempo(rows, buckets, dur, None, comparar=True)
        self.assertEqual(out[0]["actual"], Decimal("100"))
        self.assertEqual(out[1]["actual"], Decimal("200"))
        self.assertEqual(out[0]["anterior"], Decimal("50"))

    def test_ventas_tiempo_sin_comparar(self):
        buckets, dur = self._buckets_2dias()
        rows = [(1, datetime(2026, 3, 3, 10), 100)]
        out = svc._ventas_tiempo(rows, buckets, dur, None, comparar=False)
        self.assertIsNone(out[0]["anterior"])

    def test_ventas_tiempo_anterior_parcial_es_none(self):
        # el primer dato del historial cae dentro de la ventana anterior → punto parcial → None
        buckets, dur = self._buckets_2dias()
        rows = [(3, datetime(2026, 3, 1, 10), 50)]
        out = svc._ventas_tiempo(rows, buckets, dur, datetime(2026, 3, 1, 12), comparar=True)
        self.assertIsNone(out[0]["anterior"])


class DisponibilidadTests(unittest.TestCase):
    def test_sin_historial_en_absoluto(self):
        db = FakeDB(None)
        ini = datetime(2026, 3, 1)
        fin = datetime(2026, 3, 8, 23, 59)
        pa, comp, _, _ = svc._disponibilidad(db, ini, fin, ini - timedelta(days=8), ini)
        self.assertFalse(pa["disponible"])
        self.assertFalse(comp["disponible"])

    def test_rango_entero_antes_del_historial(self):
        db = FakeDB(datetime(2026, 6, 1))
        ini = datetime(2026, 3, 1)
        fin = datetime(2026, 3, 8, 23, 59)
        pa, comp, _, _ = svc._disponibilidad(db, ini, fin, ini - timedelta(days=8), ini)
        self.assertFalse(pa["disponible"])

    def test_comparacion_parcial(self):
        # historial arranca a mitad del periodo anterior
        db = FakeDB(datetime(2026, 2, 25))
        ini = datetime(2026, 3, 1)
        fin = datetime(2026, 3, 8, 23, 59, 59)
        ini_ant = datetime(2026, 2, 21)
        fin_ant = datetime(2026, 2, 28, 23, 59, 59)
        pa, comp, ini_ant_ef, _ = svc._disponibilidad(db, ini, fin, ini_ant, fin_ant)
        self.assertTrue(pa["disponible"])
        self.assertTrue(comp["disponible"])
        self.assertTrue(comp["parcial"])
        self.assertEqual(ini_ant_ef, datetime(2026, 2, 25))

    def test_comparacion_completa(self):
        db = FakeDB(datetime(2025, 1, 1))
        ini = datetime(2026, 3, 1)
        fin = datetime(2026, 3, 8, 23, 59, 59)
        ini_ant = datetime(2026, 2, 21)
        fin_ant = datetime(2026, 2, 28, 23, 59, 59)
        _pa, comp, _ef, _e = svc._disponibilidad(db, ini, fin, ini_ant, fin_ant)
        self.assertTrue(comp["disponible"])
        self.assertFalse(comp["parcial"])


if __name__ == "__main__":
    unittest.main()
