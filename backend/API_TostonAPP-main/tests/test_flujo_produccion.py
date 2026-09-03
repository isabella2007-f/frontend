"""Recorrido de un pedido que requiere producción.

El pedido no puede figurar como "Confirmado" (listo para despachar) mientras su
producción esté pendiente. El recorrido correcto es:

  admin crea            → En producción (13)
  cliente acepta fecha  → En producción (13)
  producción completa   → Listo (11)      [lo hace el módulo de producción]
"""
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.features.ventas.gestion_ventas.services.service import (
    _crear_ordenes_produccion_para_venta,
)
from src.features.ventas.pedidos.services.estados import EstadoPedido
from src.shared.services.models import (
    FichaTecnica, OrdenProduccion, Producto, VentaXProducto,
)


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *_):
        return self

    def order_by(self, *_):
        return self

    def distinct(self):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def all(self):
        return list(self.rows)

    def count(self):
        return len(self.rows)


class FakeDB:
    """DB mínima que resuelve tanto por modelo como por columna.

    El service pide solo el id cuando le basta con saber qué productos son
    fabricables (`db.query(Producto.ID_Producto)`), así que el fake tiene que
    devolver tuplas de una columna en esos casos. El `filter` no se interpreta:
    cada rama ya entrega las filas que la consulta real dejaría pasar.
    """

    def __init__(self, items, productos, fichas=None, ordenes=None):
        self.items     = items
        self.productos = productos
        self.fichas    = fichas or []
        self.ordenes   = ordenes or []
        self.added     = []

    def query(self, entidad, *_):
        if entidad is VentaXProducto:
            return FakeQuery(self.items)
        if entidad is Producto:
            return FakeQuery(self.productos)
        if entidad is FichaTecnica:
            return FakeQuery(self.fichas)
        if entidad is OrdenProduccion:
            return FakeQuery(self.ordenes)
        # Consultas de una sola columna
        if entidad is Producto.ID_Producto:
            return FakeQuery([
                (p.ID_Producto,) for p in self.productos
                if getattr(p, "Requiere_Produccion", 0)
            ])
        if entidad is FichaTecnica.ID_Producto:
            return FakeQuery([(f.ID_Producto,) for f in self.fichas])
        if entidad is OrdenProduccion.ID_Producto:
            return FakeQuery([
                (o.ID_Producto,) for o in self.ordenes if o.Estado != 5
            ])
        return FakeQuery([])

    def add(self, obj):
        self.added.append(obj)


def item(id_producto, cantidad, preorden=None):
    """Línea de una venta.

    Lo que se fabrica es Cantidad_Preorden (el déficit contra el stock), no
    Cantidad: de un pedido de 10 con 3 en stock se producen 7. Estos objetos se
    habían quedado sin ese campo cuando se agregó, y los tests reventaban con
    AttributeError contra código que estaba bien.

    Por defecto el déficit es toda la cantidad, que es el caso de un producto
    agotado y lo que asumían estos tests.
    """
    return type("VxP", (), {
        "ID_Producto": id_producto,
        "Cantidad": cantidad,
        "Cantidad_Preorden": cantidad if preorden is None else preorden,
    })()


def producto(id_producto, requiere_produccion):
    return type("Producto", (), {
        "ID_Producto": id_producto,
        "nombre": "Tostón",
        "Requiere_Produccion": requiere_produccion,
    })()


def ficha(id_producto, id_ficha=1):
    return type("Ficha", (), {
        "ID_Producto": id_producto,
        "ID_Ficha": id_ficha,
        "Estado": 1,
    })()


def orden(id_producto, estado=1):
    return type("OP", (), {
        "ID_Producto": id_producto,
        "ID_Ficha": None,
        "ID_Insumo": None,
        "Estado": estado,
    })()


class CrearOrdenesTests(unittest.TestCase):
    def test_devuelve_cuantas_ordenes_creo(self):
        db = FakeDB([item(1, 3)], [producto(1, requiere_produccion=1)], fichas=[ficha(1)])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 1)
        self.assertEqual(len(db.added), 1)

    def test_sin_productos_de_produccion_no_crea_nada(self):
        db = FakeDB([item(1, 3)], [producto(1, requiere_produccion=0)])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)
        self.assertEqual(db.added, [])

    def test_producto_sin_ficha_no_crea_orden(self):
        """3.10 — marcado como producción pero sin receta: no se abre la orden."""
        db = FakeDB([item(1, 3)], [producto(1, requiere_produccion=1)])  # sin fichas
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)
        self.assertEqual(db.added, [])

    def test_venta_sin_items_devuelve_cero(self):
        db = FakeDB([], [])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)

    def test_cantidad_cero_no_genera_orden(self):
        db = FakeDB([item(1, 0)], [producto(1, requiere_produccion=1)], fichas=[ficha(1)])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)

    def test_se_fabrica_el_deficit_no_lo_pedido(self):
        """Con stock parcial solo se produce lo que falta."""
        db = FakeDB([item(1, 10, preorden=7)], [producto(1, requiere_produccion=1)], fichas=[ficha(1)])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 1)
        self.assertEqual(db.added[0].Cantidad, 7)

    def test_stock_suficiente_no_genera_orden(self):
        """Sin déficit no hay nada que fabricar, aunque sea por encargo."""
        db = FakeDB([item(1, 5, preorden=0)], [producto(1, requiere_produccion=1)], fichas=[ficha(1)])
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)

    def test_cuenta_una_orden_por_producto_de_produccion(self):
        db = FakeDB(
            [item(1, 2), item(2, 5), item(3, 1)],
            [producto(1, 1), producto(2, 0), producto(3, 1)],
            fichas=[ficha(1, id_ficha=1), ficha(3, id_ficha=3)],
        )
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 2)

    def test_producto_con_ficha_se_fabrica_sin_el_flag(self):
        """El pan de plátano con receta cargada pero sin marcar `Requiere_Produccion`.

        Es el caso que dejaba el faltante sin orden: el producto se fabrica —
        tiene ficha técnica — pero nadie le puso el flag al cargar el catálogo.
        """
        db = FakeDB(
            [item(1, 10, preorden=5)],
            [producto(1, requiere_produccion=0)],
            fichas=[ficha(1, id_ficha=7)],
        )
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 1)
        self.assertEqual(db.added[0].Cantidad, 5)
        self.assertEqual(db.added[0].ID_Ficha, 7)

    def test_no_duplica_la_orden_ya_abierta(self):
        """Se puede llamar en cada paso del pedido sin fabricar dos veces."""
        db = FakeDB(
            [item(1, 10, preorden=5)],
            [producto(1, requiere_produccion=1)],
            ordenes=[orden(1, estado=1)],
        )
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 0)
        self.assertEqual(db.added, [])

    def test_la_orden_cancelada_no_bloquea_una_nueva(self):
        db = FakeDB(
            [item(1, 10, preorden=5)],
            [producto(1, requiere_produccion=1)],
            fichas=[ficha(1)],
            ordenes=[orden(1, estado=5)],
        )
        self.assertEqual(_crear_ordenes_produccion_para_venta(db, 10, None), 1)


class EstadoSegunProduccionTests(unittest.TestCase):
    """El estado que deben fijar los llamadores según el resultado."""

    def _estado(self, ordenes_creadas):
        # Misma decisión que toman crear_venta y aceptar_fecha.
        return EstadoPedido.PREPARANDO if ordenes_creadas > 0 else EstadoPedido.CONFIRMADO

    def test_con_produccion_queda_en_produccion(self):
        self.assertEqual(self._estado(1), EstadoPedido.PREPARANDO)

    def test_sin_produccion_queda_confirmado(self):
        self.assertEqual(self._estado(0), EstadoPedido.CONFIRMADO)

    def test_en_produccion_no_es_confirmado(self):
        # Regresión: el pedido salía "Confirmado" sin haberse fabricado nada.
        self.assertNotEqual(EstadoPedido.PREPARANDO, EstadoPedido.CONFIRMADO)


if __name__ == "__main__":
    unittest.main()
