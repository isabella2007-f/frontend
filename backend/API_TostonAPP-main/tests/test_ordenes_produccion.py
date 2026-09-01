import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.features.ventas.gestion_ventas.services.service import _crear_ordenes_produccion_para_venta
from src.shared.services.models import (
    FichaTecnica, OrdenProduccion, Producto, VentaXProducto,
)


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def order_by(self, *args, **kwargs):
        return self

    def distinct(self):
        return self

    def all(self):
        return list(self.rows)

    def count(self):
        return len(self.rows)


class FakeDB:
    """Resuelve consultas por modelo y por columna suelta.

    El service solo pide el id cuando le basta con saber qué productos son
    fabricables, así que esas ramas devuelven tuplas de una columna.
    """

    def __init__(self, venta_productos, productos, ordenes=None, fichas=None):
        self.venta_productos = venta_productos
        self.productos       = productos
        self.ordenes         = ordenes or []
        self.fichas          = fichas or []
        self.added           = []

    def query(self, model, *_):
        if model is VentaXProducto:
            return FakeQuery(self.venta_productos)
        if model is Producto:
            return FakeQuery(self.productos)
        if model is FichaTecnica:
            return FakeQuery(self.fichas)
        if model is OrdenProduccion:
            return FakeQuery(self.ordenes)
        if model is Producto.ID_Producto:
            return FakeQuery([
                (p.ID_Producto,) for p in self.productos
                if getattr(p, "Requiere_Produccion", 0)
            ])
        if model is FichaTecnica.ID_Producto:
            return FakeQuery([(f.ID_Producto,) for f in self.fichas])
        if model is OrdenProduccion.ID_Producto:
            return FakeQuery([
                (o.ID_Producto,) for o in self.ordenes if o.Estado != 5
            ])
        return FakeQuery([])

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        return None


class OrdenesProduccionTests(unittest.TestCase):
    def test_crea_orden_para_producto_requiere_produccion(self):
        # Cantidad_Preorden es lo que se fabrica (el déficit contra el stock);
        # sin stock coincide con lo pedido. Faltaba en este objeto y el test
        # reventaba con AttributeError contra código que estaba bien.
        venta_producto = type("VentaProducto", (), {
            "ID_Venta": 10, "ID_Producto": 6,
            "Cantidad": 2, "Cantidad_Preorden": 2,
        })()
        producto = type("Producto", (), {"ID_Producto": 6, "Requiere_Produccion": 1, "Stock": 0})()
        db = FakeDB([venta_producto], [producto])

        _crear_ordenes_produccion_para_venta(db, 10, "2026-01-01")

        self.assertEqual(len(db.added), 1)
        orden = db.added[0]
        self.assertEqual(orden.ID_Venta, 10)
        self.assertEqual(orden.ID_Producto, 6)
        self.assertEqual(orden.Cantidad, 2)
        self.assertEqual(orden.Estado, 1)

    def test_la_orden_cubre_solo_el_faltante(self):
        """5 en stock y 10 pedidos → se manda a producir 5, no 10."""
        venta_producto = type("VentaProducto", (), {
            "ID_Venta": 11, "ID_Producto": 6,
            "Cantidad": 10, "Cantidad_Preorden": 5,
        })()
        producto = type("Producto", (), {"ID_Producto": 6, "Requiere_Produccion": 1, "Stock": 5})()
        db = FakeDB([venta_producto], [producto])

        creadas = _crear_ordenes_produccion_para_venta(db, 11, "2026-01-01")

        self.assertEqual(creadas, 1)
        self.assertEqual(db.added[0].Cantidad, 5)
        self.assertEqual(db.added[0].Estado, 1)  # nace Pendiente


if __name__ == "__main__":
    unittest.main()
