import os
import sys
import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.features.ventas.gestion_ventas.services.service import _crear_ordenes_produccion_para_venta
from src.features.produccion.ordenes_produccion.services.service import cambiar_estado
from src.shared.services.models import (
    Base, FichaTecnica, FichaTecnicaInsumo, GrupoEnvio, GrupoEnvioItem,
    Insumo, LoteCompra, OrdenProduccion,
    Producto, UnidadMedida, Usuario, Venta, VentaXProducto,
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

    # Necesario para cambiar_estado (OrdenProduccion se bloquea con FOR UPDATE)
    def with_for_update(self):
        return self

    # Necesario para el join GrupoEnvio ⟶ GrupoEnvioItem
    def join(self, *args, **kwargs):
        return self


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


def _ficha(id_producto, id_ficha=30):
    return type("Ficha", (), {"ID_Producto": id_producto, "ID_Ficha": id_ficha, "Estado": 1})()


class OrdenesProduccionTests(unittest.TestCase):
    def test_crea_orden_para_producto_con_ficha(self):
        # Cantidad_Preorden es lo que se fabrica (el déficit contra el stock);
        # sin stock coincide con lo pedido.
        venta_producto = type("VentaProducto", (), {
            "ID_Venta": 10, "ID_Producto": 6,
            "Cantidad": 2, "Cantidad_Preorden": 2,
        })()
        producto = type("Producto", (), {"ID_Producto": 6, "Requiere_Produccion": 1, "Stock": 0})()
        db = FakeDB([venta_producto], [producto], fichas=[_ficha(6, id_ficha=30)])

        _crear_ordenes_produccion_para_venta(db, 10, "2026-01-01")

        self.assertEqual(len(db.added), 1)
        orden = db.added[0]
        self.assertEqual(orden.ID_Venta, 10)
        self.assertEqual(orden.ID_Producto, 6)
        self.assertEqual(orden.Cantidad, 2)
        self.assertEqual(orden.Estado, 1)
        self.assertEqual(orden.ID_Ficha, 30)

    def test_la_orden_cubre_solo_el_faltante(self):
        """5 en stock y 10 pedidos → se manda a producir 5, no 10."""
        venta_producto = type("VentaProducto", (), {
            "ID_Venta": 11, "ID_Producto": 6,
            "Cantidad": 10, "Cantidad_Preorden": 5,
        })()
        producto = type("Producto", (), {"ID_Producto": 6, "Requiere_Produccion": 1, "Stock": 5})()
        db = FakeDB([venta_producto], [producto], fichas=[_ficha(6)])

        creadas = _crear_ordenes_produccion_para_venta(db, 11, "2026-01-01")

        self.assertEqual(creadas, 1)
        self.assertEqual(db.added[0].Cantidad, 5)
        self.assertEqual(db.added[0].Estado, 1)  # nace Pendiente

    def test_producto_sin_ficha_no_genera_orden(self):
        """3.10 — sin ficha técnica no se puede fabricar: no se abre la orden."""
        venta_producto = type("VentaProducto", (), {
            "ID_Venta": 12, "ID_Producto": 6,
            "Cantidad": 4, "Cantidad_Preorden": 4,
        })()
        producto = type("Producto", (), {"ID_Producto": 6, "Requiere_Produccion": 1, "Stock": 0})()
        db = FakeDB([venta_producto], [producto])   # sin fichas

        creadas = _crear_ordenes_produccion_para_venta(db, 12, "2026-01-01")

        self.assertEqual(creadas, 0)
        self.assertEqual(db.added, [])


class FakeDBCambiarEstado:
    """Stub mínimo para las queries que ejecuta cambiar_estado en el bloque de validación.

    Devuelve la orden, la venta y (opcionalmente) un GrupoEnvio programado+pendiente.
    Retorna lista vacía para todo lo demás (FichaTecnica, etc.), lo que provoca que
    _ficha_vigente devuelva None y la función falle con '400 ficha técnica' después de
    pasar el bloqueo por estado del pedido — ese error de ficha es la señal de que el
    fix funcionó.
    """

    def __init__(self, *, orden, venta, grupo_programado=None):
        self._orden = orden
        self._venta = venta
        self._grupo = grupo_programado

    def query(self, model, *_):
        if model is OrdenProduccion:
            return FakeQuery([self._orden])
        if model is Venta:
            return FakeQuery([self._venta])
        if model is GrupoEnvio:
            return FakeQuery([self._grupo] if self._grupo else [])
        return FakeQuery([])   # FichaTecnica y cualquier otro → vacío

    def commit(self):
        pass

    def rollback(self):
        pass

    def refresh(self, obj):
        pass

    def add(self, obj):
        pass


class CambiarEstadoSplitTests(unittest.TestCase):
    """Regresión para el bug de entrega dividida.

    Escenario original: pedido con split anticipado+programado. El grupo anticipado
    se despacha y venta.Estado pasa a 9 (En camino) o 18 (Parcialmente entregado).
    La OP del producto del grupo programado bloqueaba con 400 porque la validación
    solo miraba venta.Estado, no los grupos. El fix permite el avance cuando existe
    un GrupoEnvio tipo='programado' y estado='pendiente' con ese producto.
    """

    # ── helpers ──────────────────────────────────────────────────────────────

    def _orden(self, *, estado=1, id_ficha=None):
        return type("Orden", (), {
            "ID_Orden_Produccion": 1,
            "ID_Venta":    10,
            "ID_Producto": 7,
            "Estado":      estado,
            "ID_Ficha":    id_ficha,
        })()

    def _venta(self, estado):
        return type("Venta", (), {"ID_Venta": 10, "Estado": estado})()

    def _grupo_programado(self):
        return type("GrupoEnvio", (), {
            "ID_Grupo": 1,
            "ID_Venta": 10,
            "Tipo":     "programado",
            "Estado":   "pendiente",
        })()

    # ── casos de retrocompatibilidad: el bloqueo original debe mantenerse ──

    def test_bloquea_venta_en_camino_sin_grupos(self):
        """Sin grupos de envío, venta 'En camino' sigue bloqueando la OP."""
        db = FakeDBCambiarEstado(
            orden=self._orden(),
            venta=self._venta(9),   # EN_CAMINO
        )
        with self.assertRaises(HTTPException) as ctx:
            cambiar_estado(db, 1, 13, origen_manual=True)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("En camino", ctx.exception.detail)

    def test_bloquea_venta_pendiente_sin_grupos(self):
        """Pedido normal en 'Pendiente' sin grupos: bloqueo original intacto."""
        db = FakeDBCambiarEstado(
            orden=self._orden(),
            venta=self._venta(1),   # PENDIENTE
        )
        with self.assertRaises(HTTPException) as ctx:
            cambiar_estado(db, 1, 13, origen_manual=True)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Pendiente", ctx.exception.detail)



class SplitEntregaOPIntegrationTests(unittest.TestCase):
    """Integración SQLite: la OP del grupo 'programado' llega a Estado=13.

    Usa una BD real en memoria con el mismo seed que FlujoProduccionE2EBase.
    Verifica que, tras el fix de Archivo 1, cambiar_estado avanza la orden
    hasta En proceso (13) sin excepción cuando venta.Estado es 9 o 18.
    """

    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self._sembrar_base()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _sembrar_base(self):
        hoy = datetime.now()
        self.db.add(UnidadMedida(ID_Unidad_Medida=1, Simbolo="g", Unidad_Medida="Gramos"))
        self.db.add(Insumo(
            ID_Insumo=1, Nombre="Harina", Unidad_Medida=1,
            Stock_Actual=2000.0, Stock_Minimo=100, Estado=1,
        ))
        self.db.add(LoteCompra(
            ID_Lote_Compra=1, ID_Insumo=1,
            Fecha_Vencimiento=hoy + timedelta(days=30),
            Cantidad_Inicial=2000.0, Cantidad_Actual=2000.0, Estado=1,
        ))
        self.db.add(Producto(
            ID_Producto=1, nombre="Torta", Precio_venta=Decimal("10000"),
            Stock=0, Stock_Minimo=1, Estado=1, Publicado=1,
        ))
        self.db.add(FichaTecnica(
            ID_Ficha=1, ID_Producto=1, Version="1", Estado=1,
            Dias_Vida_Util=5, Vida_Util_Unidad="dias",
        ))
        self.db.add(FichaTecnicaInsumo(
            ID_Ficha_Insumo=1, ID_Ficha=1, ID_Insumo=1,
            Cantidad=200.0, Unidad="g",
        ))
        self.db.add(Usuario(
            ID_Usuario=1, Nombre="Cliente", Apellidos="Test",
            Correo="c@test.com", ID_Rol=3, Estado=1,
        ))
        self.db.commit()

    def _crear_escenario(self, estado_venta):
        hoy = datetime.now()
        venta = Venta(
            ID_Usuario=1, Total=10000, Estado=estado_venta,
            Metodo_Pago="Efectivo", Fecha_Venta=hoy, Fecha_pedido=hoy,
        )
        self.db.add(venta)
        self.db.flush()

        op = OrdenProduccion(
            ID_Venta=venta.ID_Venta, ID_Producto=1, ID_Ficha=1,
            Cantidad=1, Estado=1,
        )
        self.db.add(op)

        grupo = GrupoEnvio(
            ID_Venta=venta.ID_Venta, Tipo="programado", Estado="pendiente",
        )
        self.db.add(grupo)
        self.db.flush()

        self.db.add(GrupoEnvioItem(
            ID_Grupo=grupo.ID_Grupo, ID_Venta=venta.ID_Venta,
            ID_Producto=1, Cantidad=1,
        ))
        self.db.commit()
        return op

    def test_avance_op_venta_en_camino(self):
        """venta.Estado=9 (En camino) + grupo programado pendiente → OP Estado=13."""
        op = self._crear_escenario(estado_venta=9)
        cambiar_estado(self.db, op.ID_Orden_Produccion, 13, origen_manual=True)
        self.assertEqual(self.db.query(OrdenProduccion).first().Estado, 13)

    def test_avance_op_venta_parcialmente_entregado(self):
        """venta.Estado=18 (Parcialmente entregado) + grupo programado pendiente → OP Estado=13."""
        op = self._crear_escenario(estado_venta=18)
        cambiar_estado(self.db, op.ID_Orden_Produccion, 13, origen_manual=True)
        self.assertEqual(self.db.query(OrdenProduccion).first().Estado, 13)


if __name__ == "__main__":
    unittest.main()
