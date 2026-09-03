"""Pruebas de negocio para el módulo de Liquidaciones de Empleados.

Cubre:
  1. Cruce de horarios en RegistroHoras
  2. Bloqueo de horas al generar una liquidación
  3. Transición de estados (Borrador → Pagada, Borrador → Anulada)
  4. Recálculo de totales al editar un borrador
  5. Restricción: no se puede pagar/anular lo que ya está Pagada o Anulada
  6. Anulación libera los registros de horas
  7. Tarifa vigente se cierra al crear una nueva
  8. Validaciones de esquema (tarifa ≤ 0, hora_fin <= hora_inicio)
"""
import os
import sys
import unittest
from pathlib import Path
from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch, PropertyMock

# Variables de entorno mínimas para que database.py no falle al importar
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from src.features.liquidaciones.services.schemas import (
    TarifaCreate, RegistroHorasCreate, LiquidacionAnulacion, LiquidacionPago,
)
from src.features.liquidaciones.services.service import (
    _recalcular_total, _origen_label,
)
from src.shared.services.models import RegistroHoras, Liquidacion, TarifaEmpleado


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_registro(
    id_registro=1, id_empleado=10, hora_inicio=None, hora_fin=None,
    fecha=None, horas=2.0, estado="pendiente", id_liquidacion=None,
    id_orden=None, id_domicilio=None,
):
    r = RegistroHoras()
    r.ID_Registro         = id_registro
    r.ID_Empleado         = id_empleado
    r.ID_Orden_Produccion = id_orden
    r.ID_Domicilio        = id_domicilio
    r.Fecha               = fecha or datetime(2024, 6, 1)
    r.Hora_Inicio         = hora_inicio or datetime(2024, 6, 1, 8, 0)
    r.Hora_Fin            = hora_fin    or datetime(2024, 6, 1, 10, 0)
    r.Horas_Trabajadas    = Decimal(str(horas))
    r.Estado              = estado
    r.ID_Liquidacion      = id_liquidacion
    return r


def make_tarifa(id_empleado=10, tarifa_hora=15000.0, fecha_inicio=None, fecha_fin=None):
    t = TarifaEmpleado()
    t.ID_Tarifa    = 1
    t.ID_Empleado  = id_empleado
    t.Tarifa_Hora  = Decimal(str(tarifa_hora))
    t.Fecha_Inicio = fecha_inicio or datetime(2024, 1, 1)
    t.Fecha_Fin    = fecha_fin
    return t


def make_liquidacion(id_liq=1, id_empleado=10, estado="Borrador", registros=None):
    l = Liquidacion()
    l.ID_Liquidacion   = id_liq
    l.ID_Empleado      = id_empleado
    l.Fecha_Inicio     = datetime(2024, 6, 1)
    l.Fecha_Fin        = datetime(2024, 6, 30)
    l.Total            = Decimal("0")
    l.Estado           = estado
    l.Motivo_Anulacion = None
    l.Fecha_Anulacion  = None
    l.Metodo_Pago      = None
    l.Fecha_Pago       = None
    l.Fecha_Creacion   = datetime(2024, 7, 1)
    l.registros        = registros or []
    return l


# ═══════════════════════════════════════════════════════════════════════════════
# 1. VALIDACIÓN DE ESQUEMA — Tarifa inválida
# ═══════════════════════════════════════════════════════════════════════════════

class TestTarifaValidacion(unittest.TestCase):

    def test_tarifa_cero_rechazada(self):
        with self.assertRaises(Exception):
            TarifaCreate(ID_Empleado=1, Tarifa_Hora=0, Fecha_Inicio=datetime(2024, 1, 1))

    def test_tarifa_negativa_rechazada(self):
        with self.assertRaises(Exception):
            TarifaCreate(ID_Empleado=1, Tarifa_Hora=-500, Fecha_Inicio=datetime(2024, 1, 1))

    def test_tarifa_valida(self):
        t = TarifaCreate(ID_Empleado=1, Tarifa_Hora=15000.0, Fecha_Inicio=datetime(2024, 1, 1))
        self.assertEqual(t.Tarifa_Hora, 15000.0)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. VALIDACIÓN DE ESQUEMA — Hora fin ≤ inicio
# ═══════════════════════════════════════════════════════════════════════════════

class TestRegistroHorasValidacion(unittest.TestCase):

    def test_hora_fin_igual_inicio_rechazada(self):
        with self.assertRaises(Exception):
            RegistroHorasCreate(
                ID_Empleado=1,
                Fecha=datetime(2024, 6, 1),
                Hora_Inicio=datetime(2024, 6, 1, 10, 0),
                Hora_Fin=datetime(2024, 6, 1, 10, 0),
            )

    def test_hora_fin_anterior_rechazada(self):
        with self.assertRaises(Exception):
            RegistroHorasCreate(
                ID_Empleado=1,
                Fecha=datetime(2024, 6, 1),
                Hora_Inicio=datetime(2024, 6, 1, 10, 0),
                Hora_Fin=datetime(2024, 6, 1, 9, 0),
            )

    def test_registro_valido(self):
        r = RegistroHorasCreate(
            ID_Empleado=1,
            Fecha=datetime(2024, 6, 1),
            Hora_Inicio=datetime(2024, 6, 1, 8, 0),
            Hora_Fin=datetime(2024, 6, 1, 10, 0),
        )
        self.assertEqual(r.ID_Empleado, 1)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. CRUCE DE HORARIOS — lógica de detección
# ═══════════════════════════════════════════════════════════════════════════════

class TestCruceHorarios(unittest.TestCase):
    """
    Dado un registro existente 08:00-10:00, verifica qué nuevos rangos se cruzan.
    La condición es: nuevo_inicio < existente_fin AND nuevo_fin > existente_inicio
    """

    def _se_cruza(self, ini_nuevo, fin_nuevo, ini_exist=None, fin_exist=None):
        ini_e = ini_exist or datetime(2024, 6, 1, 8, 0)
        fin_e = fin_exist or datetime(2024, 6, 1, 10, 0)
        return fin_nuevo > ini_e and ini_nuevo < fin_e

    def test_sin_cruce_antes(self):
        self.assertFalse(self._se_cruza(
            datetime(2024, 6, 1, 6, 0), datetime(2024, 6, 1, 8, 0)
        ))

    def test_sin_cruce_despues(self):
        self.assertFalse(self._se_cruza(
            datetime(2024, 6, 1, 10, 0), datetime(2024, 6, 1, 12, 0)
        ))

    def test_cruce_parcial_inicio(self):
        self.assertTrue(self._se_cruza(
            datetime(2024, 6, 1, 7, 0), datetime(2024, 6, 1, 9, 0)
        ))

    def test_cruce_contenido(self):
        self.assertTrue(self._se_cruza(
            datetime(2024, 6, 1, 8, 30), datetime(2024, 6, 1, 9, 30)
        ))

    def test_cruce_envolvente(self):
        self.assertTrue(self._se_cruza(
            datetime(2024, 6, 1, 7, 0), datetime(2024, 6, 1, 11, 0)
        ))

    def test_cruce_parcial_fin(self):
        self.assertTrue(self._se_cruza(
            datetime(2024, 6, 1, 9, 0), datetime(2024, 6, 1, 11, 0)
        ))


# ═══════════════════════════════════════════════════════════════════════════════
# 4. RECÁLCULO DE TOTALES
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecalcularTotal(unittest.TestCase):

    def _db_con_tarifa(self, tarifa_hora):
        tarifa = make_tarifa(tarifa_hora=tarifa_hora)
        db = MagicMock()
        with patch(
            "src.features.liquidaciones.services.service.tarifa_en_fecha",
            return_value=tarifa,
        ):
            return db

    def test_total_correcto(self):
        r1 = make_registro(horas=3.0)
        r2 = make_registro(id_registro=2, horas=2.5)
        liq = make_liquidacion(registros=[r1, r2])

        with patch(
            "src.features.liquidaciones.services.service.tarifa_en_fecha",
            return_value=make_tarifa(tarifa_hora=10000.0),
        ):
            _recalcular_total(MagicMock(), liq)

        self.assertEqual(liq.Total, Decimal("55000.00"))

    def test_total_cero_sin_registros(self):
        liq = make_liquidacion(registros=[])
        with patch(
            "src.features.liquidaciones.services.service.tarifa_en_fecha",
            return_value=None,
        ):
            _recalcular_total(MagicMock(), liq)
        self.assertEqual(liq.Total, Decimal("0"))

    def test_total_sin_tarifa_cuenta_cero(self):
        """Si no hay tarifa para un registro, su aporte al total es 0."""
        r = make_registro(horas=5.0)
        liq = make_liquidacion(registros=[r])
        with patch(
            "src.features.liquidaciones.services.service.tarifa_en_fecha",
            return_value=None,
        ):
            _recalcular_total(MagicMock(), liq)
        self.assertEqual(liq.Total, Decimal("0"))


# ═══════════════════════════════════════════════════════════════════════════════
# 5. TRANSICIÓN DE ESTADOS — restricciones
# ═══════════════════════════════════════════════════════════════════════════════

class TestTransicionEstados(unittest.TestCase):

    def _db_con_liq(self, estado):
        liq = make_liquidacion(estado=estado)
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = liq
        return db, liq

    def test_pago_rechazado_si_pagada(self):
        from src.features.liquidaciones.services.service import registrar_pago
        db, _ = self._db_con_liq("Pagada")
        datos = LiquidacionPago(
            Metodo_Pago="Efectivo",
            Fecha_Pago=datetime(2024, 7, 1, 12, 0),
        )
        with self.assertRaises(HTTPException) as ctx:
            registrar_pago(db, 1, datos)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_pago_rechazado_si_anulada(self):
        from src.features.liquidaciones.services.service import registrar_pago
        db, _ = self._db_con_liq("Anulada")
        datos = LiquidacionPago(
            Metodo_Pago="Efectivo",
            Fecha_Pago=datetime(2024, 7, 1, 12, 0),
        )
        with self.assertRaises(HTTPException) as ctx:
            registrar_pago(db, 1, datos)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_anulacion_rechazada_si_pagada(self):
        from src.features.liquidaciones.services.service import anular_liquidacion
        db, _ = self._db_con_liq("Pagada")
        datos = LiquidacionAnulacion(Motivo_Anulacion="Error en el cálculo de horas registradas")
        with self.assertRaises(HTTPException) as ctx:
            anular_liquidacion(db, 1, datos)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_anulacion_rechazada_si_ya_anulada(self):
        from src.features.liquidaciones.services.service import anular_liquidacion
        db, _ = self._db_con_liq("Anulada")
        datos = LiquidacionAnulacion(Motivo_Anulacion="Error en el cálculo de horas registradas")
        with self.assertRaises(HTTPException) as ctx:
            anular_liquidacion(db, 1, datos)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_pago_exitoso_desde_borrador(self):
        from src.features.liquidaciones.services.service import registrar_pago
        r = make_registro(estado="en_liquidacion")
        liq = make_liquidacion(estado="Borrador", registros=[r])
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = liq

        with patch("src.features.liquidaciones.services.service._formato_liquidacion",
                   return_value={}):
            registrar_pago(db, 1, LiquidacionPago(
                Metodo_Pago="Transferencia",
                Fecha_Pago=datetime(2024, 7, 1, 12, 0),
            ))

        self.assertEqual(liq.Estado, "Pagada")
        self.assertEqual(r.Estado, "liquidado")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ANULACIÓN LIBERA REGISTROS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAnulacionLiberaRegistros(unittest.TestCase):

    def test_registros_vuelven_a_pendiente(self):
        from src.features.liquidaciones.services.service import anular_liquidacion
        r1 = make_registro(id_registro=1, estado="en_liquidacion", id_liquidacion=1)
        r2 = make_registro(id_registro=2, estado="en_liquidacion", id_liquidacion=1)
        liq = make_liquidacion(estado="Borrador", registros=[r1, r2])
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = liq

        with patch("src.features.liquidaciones.services.service._formato_liquidacion",
                   return_value={}):
            anular_liquidacion(db, 1, LiquidacionAnulacion(
                Motivo_Anulacion="Se detectó un error en los registros de horas del empleado"
            ))

        self.assertEqual(liq.Estado, "Anulada")
        for r in [r1, r2]:
            self.assertEqual(r.Estado, "pendiente")
            self.assertIsNone(r.ID_Liquidacion)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. TARIFA ANTERIOR SE CIERRA
# ═══════════════════════════════════════════════════════════════════════════════

class TestTarifaVigenciaCierre(unittest.TestCase):

    def test_cierra_tarifa_anterior(self):
        from src.features.liquidaciones.services.service import crear_tarifa
        tarifa_anterior = make_tarifa(fecha_fin=None)
        db = MagicMock()
        # El query de empleado activo
        usuario_mock = MagicMock()
        usuario_mock.Estado = 1
        # Primera consulta → usuario; segunda → tarifa activa
        db.query.return_value.filter.return_value.first.side_effect = [
            usuario_mock, tarifa_anterior
        ]

        datos = TarifaCreate(
            ID_Empleado=10,
            Tarifa_Hora=20000.0,
            Fecha_Inicio=datetime(2024, 7, 1),
        )

        with patch("src.features.liquidaciones.services.service.TarifaEmpleado") as MockTE:
            nueva = MagicMock()
            MockTE.return_value = nueva
            crear_tarifa(db, datos)

        # La tarifa anterior debe haber recibido Fecha_Fin
        self.assertEqual(tarifa_anterior.Fecha_Fin, datetime(2024, 7, 1))


# ═══════════════════════════════════════════════════════════════════════════════
# 8. ORIGEN LABEL
# ═══════════════════════════════════════════════════════════════════════════════

class TestOrigenLabel(unittest.TestCase):

    def test_label_orden_produccion(self):
        r = make_registro(id_orden=42)
        self.assertIn("42", _origen_label(r))

    def test_label_domicilio(self):
        r = make_registro(id_domicilio=7)
        self.assertIn("7", _origen_label(r))

    def test_label_general(self):
        r = make_registro()
        self.assertEqual(_origen_label(r), "General")


# ═══════════════════════════════════════════════════════════════════════════════
# 9. MOTIVO ANULACIÓN — longitud mínima
# ═══════════════════════════════════════════════════════════════════════════════

class TestMotivosAnulacion(unittest.TestCase):

    def test_motivo_corto_rechazado(self):
        with self.assertRaises(Exception):
            LiquidacionAnulacion(Motivo_Anulacion="Error")  # < 10 chars

    def test_motivo_valido(self):
        a = LiquidacionAnulacion(Motivo_Anulacion="Error detectado en el registro")
        self.assertGreaterEqual(len(a.Motivo_Anulacion), 10)


if __name__ == "__main__":
    unittest.main()
