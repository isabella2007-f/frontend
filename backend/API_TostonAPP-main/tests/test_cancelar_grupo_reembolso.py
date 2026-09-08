"""Prueba que cancelar_grupo_pendiente devuelve el anticipo PROPORCIONAL al grupo.

Bug original (pedidos 167-169): el cálculo usaba VentaXProducto.Cantidad
(cantidad TOTAL del pedido) en vez de GrupoEnvioItem.Cantidad (cantidad del
grupo específico). Eso hacía que valor_grupo == total_venta para cada grupo,
devolviendo el 100 % del anticipo en CADA cancelación.

Invariante que se prueba:
    sum(reembolso_A, reembolso_B) <= anticipo_pagado
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

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.features.ventas.gestion_ventas.services.service import cancelar_grupo_pendiente
from src.shared.services.models import (
    Base,
    CreditoCliente,
    GrupoEnvio,
    GrupoEnvioItem,
    MovimientoCredito,
    OrdenProduccion,
    Producto,
    Usuario,
    Venta,
    VentaXProducto,
)

ADMIN = {"tipo": "admin"}
ID_CLIENTE = 1


class CancelarGrupoBase(unittest.TestCase):
    """Base: SQLite en memoria, siembra compartida."""

    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        self.db.add(Usuario(
            ID_Usuario=ID_CLIENTE, Nombre="Test", Apellidos="Cliente",
            Correo="c@test.com", Telefono="3001234567", ID_Rol=3, Estado=1,
        ))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _credito_saldo(self) -> Decimal:
        c = self.db.query(CreditoCliente).filter(
            CreditoCliente.ID_Usuario == ID_CLIENTE
        ).first()
        return Decimal(str(c.Saldo)) if c else Decimal("0")

    def _movimientos(self, id_venta: int) -> list:
        cr = self.db.query(CreditoCliente).filter(
            CreditoCliente.ID_Usuario == ID_CLIENTE
        ).first()
        if not cr:
            return []
        return self.db.query(MovimientoCredito).filter(
            MovimientoCredito.ID_Credito == cr.ID_Credito,
            MovimientoCredito.ID_Venta == id_venta,
        ).all()


class TestReembolsoProporcional(CancelarGrupoBase):
    """Escenario 1: 1 producto con 2 unidades, split 1 + 1.

    Reproduce el patrón exacto de los pedidos 167-169:
      - Anticipo = precio_unitario × 2 (= 100 % del total)
      - Grupo A: 1 unidad → reembolso esperado = anticipo × (1/2)
      - Grupo B: 1 unidad → reembolso esperado = anticipo × (1/2)
      - Suma esperada = anticipo
    """

    PRECIO = Decimal("245000")
    ANTICIPO = Decimal("490000")  # = PRECIO × 2
    ID_PRODUCTO = 10
    ID_VENTA = 1

    def setUp(self):
        super().setUp()

        self.db.add(Producto(
            ID_Producto=self.ID_PRODUCTO, nombre="Tostón",
            Precio_venta=self.PRECIO, Stock=0, Estado=1, Publicado=1,
        ))
        self.db.add(Venta(
            ID_Venta=self.ID_VENTA, ID_Usuario=ID_CLIENTE,
            Total=self.ANTICIPO, Estado=4,
            Anticipo_Monto=self.ANTICIPO,
            Anticipo_Registrado=1,
        ))
        self.db.add(VentaXProducto(
            ID_Venta=self.ID_VENTA, ID_Producto=self.ID_PRODUCTO, Cantidad=2,
        ))

        grupo_a = GrupoEnvio(
            ID_Venta=self.ID_VENTA, Tipo="anticipado",
            Estado="pendiente", Tipo_Entrega="recoger",
        )
        grupo_b = GrupoEnvio(
            ID_Venta=self.ID_VENTA, Tipo="programado",
            Estado="pendiente", Tipo_Entrega="recoger",
        )
        self.db.add(grupo_a)
        self.db.add(grupo_b)
        self.db.flush()

        self.db.add(GrupoEnvioItem(
            ID_Grupo=grupo_a.ID_Grupo, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_PRODUCTO, Cantidad=1,
        ))
        self.db.add(GrupoEnvioItem(
            ID_Grupo=grupo_b.ID_Grupo, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_PRODUCTO, Cantidad=1,
        ))
        self.db.commit()

        self.id_grupo_a = grupo_a.ID_Grupo
        self.id_grupo_b = grupo_b.ID_Grupo

    def test_reembolso_grupo_a_es_proporcional(self):
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)

        movs = self._movimientos(self.ID_VENTA)
        self.assertEqual(len(movs), 1)
        reembolso_a = Decimal(str(movs[0].Monto))
        self.assertEqual(reembolso_a, Decimal("245000"),
                         f"reembolso_A esperado=245000, obtenido={reembolso_a}")

    def test_suma_reembolsos_no_supera_anticipo(self):
        """Al cancelar ambos grupos en secuencia, la suma total devuelta
        no debe superar el anticipo pagado. Este es el bug original."""
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)

        movs = self._movimientos(self.ID_VENTA)
        suma = sum(Decimal(str(m.Monto)) for m in movs)

        self.assertLessEqual(
            suma, self.ANTICIPO,
            f"Se devolvió {suma} pero el anticipo pagado fue {self.ANTICIPO}"
        )
        self.assertEqual(len(movs), 2, "Se esperaban exactamente 2 movimientos de crédito")

    def test_suma_reembolsos_igual_anticipo_en_split_50_50(self):
        """Split exactamente 50/50: la suma debe ser exactamente el anticipo."""
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)

        movs = self._movimientos(self.ID_VENTA)
        suma = sum(Decimal(str(m.Monto)) for m in movs)
        self.assertEqual(suma, self.ANTICIPO,
                         f"Suma={suma} != anticipo={self.ANTICIPO}")


class TestReembolsoProporcionalSplit3070(CancelarGrupoBase):
    """Escenario 2: 2 productos distintos, grupos con valores 40 % y 60 %.

    Valida que con proporciones no-enteras la suma tampoco supera el anticipo.
    """

    ID_PROD_A = 20   # precio 200.000 × 1 unidad → 40 %
    ID_PROD_B = 21   # precio 300.000 × 1 unidad → 60 %
    PRECIO_A = Decimal("200000")
    PRECIO_B = Decimal("300000")
    TOTAL_BRUTO = Decimal("500000")
    ANTICIPO = Decimal("250000")   # 50 % del total
    ID_VENTA = 2

    def setUp(self):
        super().setUp()

        self.db.add(Producto(
            ID_Producto=self.ID_PROD_A, nombre="Chips",
            Precio_venta=self.PRECIO_A, Stock=0, Estado=1, Publicado=1,
        ))
        self.db.add(Producto(
            ID_Producto=self.ID_PROD_B, nombre="Torta",
            Precio_venta=self.PRECIO_B, Stock=0, Estado=1, Publicado=1,
        ))
        self.db.add(Venta(
            ID_Venta=self.ID_VENTA, ID_Usuario=ID_CLIENTE,
            Total=self.TOTAL_BRUTO, Estado=4,
            Anticipo_Monto=self.ANTICIPO,
            Anticipo_Registrado=1,
        ))
        self.db.add(VentaXProducto(
            ID_Venta=self.ID_VENTA, ID_Producto=self.ID_PROD_A, Cantidad=1,
        ))
        self.db.add(VentaXProducto(
            ID_Venta=self.ID_VENTA, ID_Producto=self.ID_PROD_B, Cantidad=1,
        ))

        grupo_a = GrupoEnvio(
            ID_Venta=self.ID_VENTA, Tipo="anticipado",
            Estado="pendiente", Tipo_Entrega="recoger",
        )
        grupo_b = GrupoEnvio(
            ID_Venta=self.ID_VENTA, Tipo="programado",
            Estado="pendiente", Tipo_Entrega="recoger",
        )
        self.db.add(grupo_a)
        self.db.add(grupo_b)
        self.db.flush()

        # Grupo A ← solo Producto A (200.000 = 40 % del total)
        self.db.add(GrupoEnvioItem(
            ID_Grupo=grupo_a.ID_Grupo, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_PROD_A, Cantidad=1,
        ))
        # Grupo B ← solo Producto B (300.000 = 60 % del total)
        self.db.add(GrupoEnvioItem(
            ID_Grupo=grupo_b.ID_Grupo, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_PROD_B, Cantidad=1,
        ))
        self.db.commit()

        self.id_grupo_a = grupo_a.ID_Grupo
        self.id_grupo_b = grupo_b.ID_Grupo

    def test_suma_no_supera_anticipo_split_asimetrico(self):
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)

        movs = self._movimientos(self.ID_VENTA)
        suma = sum(Decimal(str(m.Monto)) for m in movs)
        self.assertEqual(len(movs), 2)
        self.assertLessEqual(
            suma, self.ANTICIPO,
            f"Reembolso total {suma} superó el anticipo {self.ANTICIPO}"
        )

    def test_reembolso_a_es_40_pct(self):
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        movs = self._movimientos(self.ID_VENTA)
        reembolso_a = Decimal(str(movs[0].Monto))
        # 250.000 × 0.4 = 100.000; con ROUND_CEILING sigue siendo 100.000
        self.assertEqual(reembolso_a, Decimal("100000"))

    def test_reembolso_b_es_60_pct(self):
        # Cancelar A primero (requerido para poder cancelar B después)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)
        movs = self._movimientos(self.ID_VENTA)
        reembolso_b = Decimal(str(movs[1].Monto))
        # 250.000 × 0.6 = 150.000
        self.assertEqual(reembolso_b, Decimal("150000"))


class TestReembolsoSegunLoHorneado(CancelarGrupoBase):
    """Lo horneado de un grupo no congela la plata del otro.

    Dos productos, uno por grupo. Solo el del grupo A entró al horno y salió.
    Cancelar B tiene que devolver su parte —de ese grupo no se gastó un insumo—
    y cancelar A no, porque esa plata ya se fue en harina.

    Antes la pregunta era por el pedido entero: bastaba que algo estuviera
    horneado para que ningún grupo devolviera nada.
    """

    PRECIO = Decimal("100000")
    ANTICIPO = Decimal("100000")   # la mitad de un pedido de 200.000
    ID_HORNEADO = 20               # va en el grupo A y ya salió del horno
    ID_PENDIENTE = 21              # va en el grupo B, ni se empezó
    ID_VENTA = 1

    def setUp(self):
        super().setUp()
        for id_prod, nombre in ((self.ID_HORNEADO, "Torta"),
                                (self.ID_PENDIENTE, "Pan")):
            self.db.add(Producto(
                ID_Producto=id_prod, nombre=nombre,
                Precio_venta=self.PRECIO, Stock=0, Estado=1, Publicado=1,
            ))
        self.db.add(Venta(
            ID_Venta=self.ID_VENTA, ID_Usuario=ID_CLIENTE,
            Total=self.PRECIO * 2, Estado=4,
            Anticipo_Monto=self.ANTICIPO,
            Anticipo_Registrado=1,
        ))
        for id_prod in (self.ID_HORNEADO, self.ID_PENDIENTE):
            self.db.add(VentaXProducto(
                ID_Venta=self.ID_VENTA, ID_Producto=id_prod, Cantidad=1,
            ))

        grupo_a = GrupoEnvio(ID_Venta=self.ID_VENTA, Tipo="anticipado",
                             Estado="pendiente", Tipo_Entrega="recoger")
        grupo_b = GrupoEnvio(ID_Venta=self.ID_VENTA, Tipo="programado",
                             Estado="pendiente", Tipo_Entrega="recoger")
        self.db.add(grupo_a)
        self.db.add(grupo_b)
        self.db.flush()
        self.id_grupo_a = grupo_a.ID_Grupo
        self.id_grupo_b = grupo_b.ID_Grupo

        self.db.add(GrupoEnvioItem(
            ID_Grupo=self.id_grupo_a, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_HORNEADO, Cantidad=1,
        ))
        self.db.add(GrupoEnvioItem(
            ID_Grupo=self.id_grupo_b, ID_Venta=self.ID_VENTA,
            ID_Producto=self.ID_PENDIENTE, Cantidad=1,
        ))
        # Lo del grupo A ya salió del horno (11 = Completada).
        self.db.add(OrdenProduccion(
            ID_Venta=self.ID_VENTA, ID_Producto=self.ID_HORNEADO,
            Cantidad=1, Estado=11,
        ))
        self.db.commit()

    def test_el_grupo_sin_hornear_si_recupera_su_parte(self):
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)
        self.assertEqual(
            self._credito_saldo(), self.ANTICIPO / 2,
            "de este grupo no se gastó un insumo: su mitad tiene que volver")

    def test_el_grupo_ya_horneado_no_mueve_la_plata(self):
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        self.assertEqual(
            self._credito_saldo(), Decimal("0"),
            "esa plata ya se fue en harina: qué pasa con ella se acuerda aparte")

    def test_cancelar_el_horneado_no_le_quita_al_otro_lo_suyo(self):
        # El orden no cambia el resultado: cada grupo responde por lo suyo.
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_a, ADMIN)
        cancelar_grupo_pendiente(self.db, self.ID_VENTA, self.id_grupo_b, ADMIN)
        self.assertEqual(self._credito_saldo(), self.ANTICIPO / 2)


if __name__ == "__main__":
    unittest.main()
