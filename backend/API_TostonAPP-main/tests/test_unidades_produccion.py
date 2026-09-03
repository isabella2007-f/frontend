"""Cómo se leen las unidades de una ficha técnica.

La receta pide gramos y el depósito guarda kilos: cada vez que una orden de
producción valida o descuenta insumos, alguien tiene que hacer esa cuenta. El
caso que lo destapó: una orden de 4 tortas con 20 g de azúcar cada una decía
"insumos insuficientes" y daba la azúcar por cero, con 100 kg en bodega.

Había dos tablas de conversión en el mismo módulo y no decían lo mismo: la del
consumo comparaba los símbolos tal cual venían escritos —una ficha en "gr" o un
insumo en "Kg" bastaba para romperla— y usaba la libra internacional, mientras
la de costos usaba la del mercado colombiano. La misma receta costaba una cosa
y consumía otra.

Corre sin credenciales:
    python tests/test_unidades_produccion.py
"""
import os
import sys
import unittest
from decimal import Decimal
from pathlib import Path

os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException

from src.features.produccion.ordenes_produccion.services.service import (
    _FACTOR,
    _convertir,
    _costo_un_insumo,
    _norm,
)


class NormalizarTests(unittest.TestCase):
    """El mismo gramo escrito de seis maneras."""

    def test_mayusculas_y_espacios_dan_igual(self):
        for escrito in ("kg", "Kg", "KG", "  kg  ", "kg."):
            with self.subTest(escrito=escrito):
                self.assertEqual(_norm(escrito), "kg")

    def test_reconoce_como_escribe_la_gente(self):
        casos = {
            "gr": "g", "grs": "g", "gramos": "g", "G": "g",
            "kilos": "kg", "Kilogramo": "kg",
            "lt": "l", "litros": "l",
            "libras": "lb",
            "und": "unidad", "uds": "unidad", "u": "unidad",
            "cdta": "cucharadita", "cdas": "cucharada",
        }
        for escrito, esperado in casos.items():
            with self.subTest(escrito=escrito):
                self.assertEqual(_norm(escrito), esperado)

    def test_lo_vacio_no_rompe(self):
        self.assertEqual(_norm(None), "")
        self.assertEqual(_norm("   "), "")


class ConvertirTests(unittest.TestCase):

    def test_el_caso_del_azucar(self):
        """4 tortas × 20 g de azúcar contra un insumo medido en kilos."""
        self.assertAlmostEqual(_convertir(20 * 4, "g", "kg"), 0.08, places=6)

    def test_el_azucar_sale_igual_escrito_de_cualquier_forma(self):
        for ficha, insumo in (("g", "kg"), ("gr", "Kg"), ("G", "KG"),
                              ("gramos", "kilos"), ("grs", "kg.")):
            with self.subTest(ficha=ficha, insumo=insumo):
                self.assertAlmostEqual(
                    _convertir(80, ficha, insumo), 0.08, places=6
                )

    def test_la_misma_unidad_no_se_toca(self):
        self.assertEqual(_convertir(80, "g", "g"), 80)
        self.assertEqual(_convertir(80, "g", "GRAMOS"), 80)

    def test_sin_unidad_se_deja_como_está(self):
        # No se inventa una conversión sobre un dato que no está.
        self.assertEqual(_convertir(80, "", "kg"), 80)
        self.assertEqual(_convertir(80, "g", None), 80)

    def test_va_y_vuelve(self):
        self.assertAlmostEqual(_convertir(_convertir(2.5, "kg", "g"), "g", "kg"), 2.5)

    def test_la_libra_es_la_del_mercado_colombiano(self):
        # 500 g, no 453,592. Antes el consumo usaba una y el costo la otra.
        self.assertEqual(_convertir(1, "lb", "g"), 500)
        self.assertEqual(_FACTOR["lb"], Decimal("500"))

    def test_volumen(self):
        self.assertAlmostEqual(_convertir(1500, "ml", "l"), 1.5, places=6)
        self.assertAlmostEqual(_convertir(2, "litros", "ml"), 2000, places=6)

    def test_las_medidas_de_cocina_se_usan_para_pesar(self):
        # "Una taza de harina": el módulo ya hacía esta equivalencia.
        self.assertAlmostEqual(_convertir(1, "taza", "g"), 240, places=6)
        self.assertAlmostEqual(_convertir(2, "cucharadas", "ml"), 30, places=6)

    def test_no_se_inventa_una_densidad(self):
        """Litros a kilos sería adivinar de qué está hecho el insumo."""
        with self.assertRaises(HTTPException) as ctx:
            _convertir(1, "l", "kg")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_una_unidad_desconocida_lo_dice(self):
        with self.assertRaises(HTTPException) as ctx:
            _convertir(1, "puñado", "g")
        self.assertIn("no se puede convertir", ctx.exception.detail.lower())
        self.assertIn("ficha", ctx.exception.detail.lower())

    def test_no_se_mezcla_peso_con_conteo(self):
        with self.assertRaises(HTTPException):
            _convertir(1, "unidad", "g")


class CostoUsaLaMismaTablaTests(unittest.TestCase):
    """El costo y el consumo tienen que leer la ficha igual.

    Si no, un insumo se descuenta con una equivalencia y se cobra con otra.
    """

    def test_la_libra_cuesta_lo_que_pesa(self):
        # $1.000 la libra (500 g) → 100 g de receta cuestan $200.
        costo, error = _costo_un_insumo(
            Decimal("1000"), "lb", Decimal("100"), "g",
        )
        self.assertIsNone(error)
        self.assertEqual(costo, Decimal("200"))

    def test_el_costo_tambien_entiende_como_escribe_la_gente(self):
        costo, error = _costo_un_insumo(
            Decimal("2000"), "Kilos", Decimal("500"), "gr",
        )
        self.assertIsNone(error)
        self.assertEqual(costo, Decimal("1000"))

    def test_unidades_incompatibles_dan_error_y_no_un_numero(self):
        costo, error = _costo_un_insumo(
            Decimal("1000"), "l", Decimal("100"), "g",
        )
        self.assertIsNotNone(error)
        self.assertEqual(costo, Decimal("0"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
