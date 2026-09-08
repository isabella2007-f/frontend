"""Módulo Ubicaciones — jerarquía, estado en cascada, ofertas de domicilio y la
FUNCIÓN ÚNICA de cálculo del precio del domicilio.

Se prueban con base SQLite real, llamando a los services igual que el router.
Atención especial a la aritmética del precio (recargos → descuentos, piso 0,
techo TECHO_DOMICILIO) y al snapshot inmutable.

    python tests/test_ubicaciones.py
"""
import os
import sys
import unittest
from datetime import datetime
from pathlib import Path

os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "clave-de-prueba")
os.environ.setdefault("ALGORITHM", "HS256")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.shared.services.models import (
    Base, Departamento, Ciudad, Barrio, OfertaDomicilio, OfertaXBarrio,
    Usuario, Venta, Domicilio,
)
from src.features.ventas.ubicaciones.services import service as svc
from src.features.ventas.ubicaciones.services import ofertas as ofs
from src.features.ventas.ubicaciones.services.service import TECHO_DOMICILIO
from src.features.ventas.ubicaciones.services.schemas import (
    BarrioCreate, BarrioUpdate, OfertaCreate, OfertaUpdate, AccionMasivaInput,
    validar_nombre_barrio, normalizar_nombre,
)

# Un lunes cualquiera: 2024-06-03 es lunes (ISO weekday 1), día del mes 3.
LUNES = datetime(2024, 6, 3, 12, 0)
MARTES = datetime(2024, 6, 4, 12, 0)


class Base_(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        # Antioquia > Medellín > Centro (base 5000), El Poblado (base 8000)
        self.db.add(Departamento(ID_Departamento=1, Nombre="Antioquia", Estado=1))
        self.db.add(Departamento(ID_Departamento=2, Nombre="Cundinamarca", Estado=1))
        self.db.add(Ciudad(ID_Ciudad=1, ID_Departamento=1, Nombre="Medellín", Estado=1))
        self.db.add(Ciudad(ID_Ciudad=2, ID_Departamento=2, Nombre="Bogotá D.C.", Estado=1))
        self.db.add(Barrio(ID_Barrio=1, ID_Ciudad=1, Nombre="Centro", Precio=5000, Es_Base=True, Estado=1))
        self.db.add(Barrio(ID_Barrio=2, ID_Ciudad=1, Nombre="El Poblado", Precio=8000, Es_Base=True, Estado=1))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _oferta(self, *, tipo="descuento", pesos=None, pct=None, dias_sem=(1,), dias_mes=(), barrios=(1,), estado=1):
        of = OfertaDomicilio(
            Nombre=f"of-{tipo}", Tipo=tipo, Monto_Pesos=pesos, Porcentaje=pct,
            Dias_Semana=svc._to_csv(dias_sem), Dias_Mes=svc._to_csv(dias_mes),
            Estado=estado, Fecha_Creacion=LUNES,
        )
        self.db.add(of)
        self.db.flush()
        for b in barrios:
            self.db.add(OfertaXBarrio(ID_Oferta=of.ID_Oferta, ID_Barrio=b))
        self.db.commit()
        return of


# ══════════════════════════════════════════════════════════════════════════
# 1. Validación de nombre y precio
# ══════════════════════════════════════════════════════════════════════════
class ValidacionTests(Base_):
    def test_nombre_valido(self):
        for n in ("Manrique", "San José La Cima", "Barrio 20 de Julio", "Ñuñoa"):
            self.assertEqual(validar_nombre_barrio(n), n)

    def test_nombre_invalido(self):
        for n in (" Manrique", "Manrique ", "San  José", "Man-rique", "Barrio!", "", "x" * 36):
            with self.assertRaises(ValueError):
                validar_nombre_barrio(n)

    def test_normalizar_ignora_tildes_y_mayusculas(self):
        self.assertEqual(normalizar_nombre("Manrique"), normalizar_nombre("mánrique"))
        self.assertEqual(normalizar_nombre("San  José "), "san jose")

    def test_precio_fuera_de_rango(self):
        with self.assertRaises(Exception):
            BarrioCreate(ID_Ciudad=1, Nombre="X", Precio=-1)
        with self.assertRaises(Exception):
            BarrioCreate(ID_Ciudad=1, Nombre="X", Precio=10_000_000)


# ══════════════════════════════════════════════════════════════════════════
# 2. Crear / editar / eliminar barrio
# ══════════════════════════════════════════════════════════════════════════
class BarrioTests(Base_):
    def test_crear_barrio_creado_no_es_base(self):
        d = svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="Nuevo Barrio", Precio=6000))
        self.assertFalse(d["Es_Base"])
        self.assertEqual(d["Precio"], 6000)
        self.assertTrue(d["estado_efectivo"])

    def test_duplicado_ignora_tildes_y_case(self):
        svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="Manrique", Precio=6000))
        with self.assertRaises(HTTPException) as ctx:
            svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="mánrique", Precio=6000))
        self.assertEqual(ctx.exception.status_code, 409)

    def test_creado_no_puede_coincidir_con_base(self):
        with self.assertRaises(HTTPException):
            svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="centro", Precio=6000))

    def test_editar_base_solo_precio(self):
        d = svc.editar_barrio(self.db, 1, BarrioUpdate(Precio=7000))
        self.assertEqual(d["Precio"], 7000)
        with self.assertRaises(HTTPException):
            svc.editar_barrio(self.db, 1, BarrioUpdate(Nombre="Otro Centro"))

    def test_editar_sin_cambios(self):
        with self.assertRaises(HTTPException) as ctx:
            svc.editar_barrio(self.db, 1, BarrioUpdate(Precio=5000))
        self.assertEqual(ctx.exception.status_code, 422)

    def test_no_eliminar_base(self):
        with self.assertRaises(HTTPException):
            svc.eliminar_barrio(self.db, 1)

    def test_eliminar_creado_sin_referencias(self):
        d = svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="Efímero", Precio=6000))
        svc.eliminar_barrio(self.db, d["ID_Barrio"])
        self.assertIsNone(self.db.query(Barrio).filter(Barrio.ID_Barrio == d["ID_Barrio"]).first())

    def test_no_eliminar_creado_referenciado_por_usuario(self):
        d = svc.crear_barrio(self.db, BarrioCreate(ID_Ciudad=1, Nombre="Con Cliente", Precio=6000))
        self.db.add(Usuario(ID_Usuario=1, Nombre="C", Apellidos="L", Correo="c@l.test",
                            ID_Rol=3, Estado=1, ID_Barrio=d["ID_Barrio"]))
        self.db.commit()
        with self.assertRaises(HTTPException) as ctx:
            svc.eliminar_barrio(self.db, d["ID_Barrio"])
        self.assertEqual(ctx.exception.status_code, 409)


# ══════════════════════════════════════════════════════════════════════════
# 3. Estado en cascada
# ══════════════════════════════════════════════════════════════════════════
class CascadaTests(Base_):
    def test_padre_inactivo_deja_hijo_no_disponible_sin_tocar_su_estado(self):
        svc.cambiar_estado_departamento(self.db, 1, 2)  # Antioquia inactiva
        b = self.db.query(Barrio).filter(Barrio.ID_Barrio == 1).first()
        self.assertEqual(b.Estado, 1)  # su estado propio NO cambió
        disp, motivo = svc.estado_efectivo_barrio(self.db, b)
        self.assertFalse(disp)
        self.assertIn("Antioquia", motivo)

    def test_reactivar_padre_no_pisa_hijo_desactivado_a_mano(self):
        svc.cambiar_estado_barrio(self.db, 1, 2)          # barrio desactivado a mano
        svc.cambiar_estado_departamento(self.db, 1, 2)    # depto inactivo
        svc.cambiar_estado_departamento(self.db, 1, 1)    # depto reactivado
        b = self.db.query(Barrio).filter(Barrio.ID_Barrio == 1).first()
        self.assertEqual(b.Estado, 2)  # sigue desactivado a mano
        disp, _ = svc.estado_efectivo_barrio(self.db, b)
        self.assertFalse(disp)

    def test_no_activar_hijo_con_padre_inactivo(self):
        svc.cambiar_estado_ciudad(self.db, 1, 2)
        svc.cambiar_estado_barrio(self.db, 1, 2)
        with self.assertRaises(HTTPException):
            svc.cambiar_estado_barrio(self.db, 1, 1)

    def test_accion_masiva_activar_respeta_padre(self):
        svc.cambiar_estado_departamento(self.db, 1, 2)
        for b in self.db.query(Barrio).all():
            b.Estado = 2
        self.db.commit()
        r = svc.accion_masiva_estado(self.db, AccionMasivaInput(nivel="barrios", id_padre=1, Estado=1))
        self.assertEqual(r["afectados"], 0)
        self.assertGreaterEqual(r["omitidos"], 2)


# ══════════════════════════════════════════════════════════════════════════
# 4. Precio del domicilio — aritmética
# ══════════════════════════════════════════════════════════════════════════
class PrecioTests(Base_):
    def test_sin_ofertas_es_el_precio_base(self):
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 5000)
        self.assertEqual(r["ofertas"], [])

    def test_descuento_pesos(self):
        self._oferta(pesos=1000, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 4000)

    def test_descuento_pesos_no_aplica_otro_dia(self):
        self._oferta(pesos=1000, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, MARTES)
        self.assertEqual(r["final"], 5000)

    def test_descuento_pct_redondea_por_paso(self):
        self._oferta(pct=15, dias_sem=(1,))   # 5000 * 0.85 = 4250
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 4250)

    def test_acumulacion_pesos_luego_pct_compuesto(self):
        # base 5000 → -1000 = 4000 → -20% = 3200 → -15% = 2720
        self._oferta(pesos=1000, pct=20, dias_sem=(1,))
        self._oferta(pct=15, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 2720)
        self.assertEqual(sum(o["efecto"] for o in r["ofertas"]), 2720 - 5000)

    def test_piso_cero_domicilio_gratis(self):
        self._oferta(pesos=9000, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 0)
        self.assertTrue(r["piso_aplicado"])
        self.assertEqual(sum(o["efecto"] for o in r["ofertas"]), -5000)

    def test_recargo_antes_que_descuento(self):
        # base 5000 → +3000 recargo = 8000 → -50% descuento = 4000
        self._oferta(tipo="recargo", pesos=3000, dias_sem=(1,))
        self._oferta(tipo="descuento", pct=50, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 4000)

    def test_techo(self):
        self._oferta(tipo="recargo", pesos=9_999_999, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], TECHO_DOMICILIO)
        self.assertTrue(r["techo_aplicado"])

    def test_orden_determinista_por_id(self):
        # dos porcentajes: -10 y -30. Compuesto, el orden ID importa.
        # 5000 * 0.9 = 4500 * 0.7 = 3150
        self._oferta(pct=10, dias_sem=(1,))
        self._oferta(pct=30, dias_sem=(1,))
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 3150)

    def test_dias_semana_o_dias_mes_es_or(self):
        # aplica lunes O el día 4 del mes. En martes 2024-06-04 (día 4) aplica por el día del mes.
        self._oferta(pesos=1000, dias_sem=(1,), dias_mes=(4,))
        self.assertEqual(svc.precio_domicilio_final(self.db, 1, MARTES)["final"], 4000)

    def test_oferta_inactiva_no_aplica(self):
        self._oferta(pesos=1000, dias_sem=(1,), estado=2)
        self.assertEqual(svc.precio_domicilio_final(self.db, 1, LUNES)["final"], 5000)

    def test_barrio_sin_cobertura_no_aplica_ofertas(self):
        self._oferta(pesos=1000, dias_sem=(1,))
        svc.cambiar_estado_barrio(self.db, 1, 2)
        r = svc.precio_domicilio_final(self.db, 1, LUNES)
        self.assertEqual(r["final"], 5000)  # el precio base, sin ofertas

    def test_resolver_domicilio_rechaza_sin_cobertura(self):
        svc.cambiar_estado_ciudad(self.db, 1, 2)
        with self.assertRaises(HTTPException) as ctx:
            svc.resolver_domicilio(self.db, 1)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_cobertura_barrio_no_lanza(self):
        svc.cambiar_estado_barrio(self.db, 1, 2)
        r = svc.cobertura_barrio(self.db, 1)
        self.assertFalse(r["disponible"])
        self.assertIsNone(r["final"])


# ══════════════════════════════════════════════════════════════════════════
# 5. Snapshot inmutable
# ══════════════════════════════════════════════════════════════════════════
class SnapshotTests(Base_):
    def test_cambiar_precio_no_afecta_snapshot_guardado(self):
        snap = svc.resolver_domicilio(self.db, 1)
        self.assertEqual(snap["final"], 5000)
        # simular el pedido: guardamos el snapshot en un Domicilio
        self.db.add(Usuario(ID_Usuario=1, Nombre="C", Apellidos="L", Correo="c@l.test", ID_Rol=3, Estado=1))
        self.db.add(Venta(ID_Venta=1, ID_Usuario=1, Total=25000, Estado=1))
        self.db.flush()
        self.db.add(Domicilio(
            ID_Domicilio=1, ID_Venta=1, Estado=3,
            ID_Barrio=1, Precio_Domicilio_Base=snap["base"],
            Precio_Domicilio_Final=snap["final"], Desglose_Ofertas=snap["desglose"],
        ))
        self.db.commit()
        # el admin sube el precio del barrio
        svc.editar_barrio(self.db, 1, BarrioUpdate(Precio=12000))
        dom = self.db.query(Domicilio).filter(Domicilio.ID_Domicilio == 1).first()
        self.assertEqual(dom.Precio_Domicilio_Final, 5000)  # congelado


# ══════════════════════════════════════════════════════════════════════════
# 6. Ofertas — CRUD y validaciones
# ══════════════════════════════════════════════════════════════════════════
class OfertaCrudTests(Base_):
    def test_crear_oferta(self):
        d = ofs.crear_oferta(self.db, OfertaCreate(
            Nombre="Martes de envío", Tipo="descuento", Monto_Pesos=1000,
            Dias_Semana=[2], barrios=[1, 2],
        ))
        self.assertEqual(len(d["barrios"]), 2)
        self.assertEqual(d["Dias_Semana"], [2])

    def test_oferta_sin_monto_ni_pct_rechazada(self):
        with self.assertRaises(Exception):
            OfertaCreate(Nombre="x", Dias_Semana=[1], barrios=[1])

    def test_oferta_sin_dias_rechazada(self):
        with self.assertRaises(Exception):
            OfertaCreate(Nombre="x", Monto_Pesos=1000, barrios=[1])

    def test_editar_sin_cambios(self):
        of = self._oferta(pesos=1000)
        with self.assertRaises(HTTPException) as ctx:
            ofs.editar_oferta(self.db, of.ID_Oferta, OfertaUpdate())
        self.assertEqual(ctx.exception.status_code, 422)

    def test_no_quitar_ultimo_barrio(self):
        of = self._oferta(pesos=1000, barrios=(1,))
        with self.assertRaises(HTTPException):
            ofs.editar_oferta(self.db, of.ID_Oferta, OfertaUpdate(barrios=[]))


# ══════════════════════════════════════════════════════════════════════════
# Resumen del catálogo (tarjetas del panel)
# ══════════════════════════════════════════════════════════════════════════
class ResumenTests(Base_):
    def test_contadores_y_precio_promedio(self):
        r = svc.resumen(self.db)
        self.assertEqual(r["departamentos"], 2)
        self.assertEqual(r["departamentos_activos"], 2)
        self.assertEqual(r["ciudades"], 2)
        self.assertEqual(r["barrios"], 2)
        # Centro y El Poblado con toda la cadena activa.
        self.assertEqual(r["barrios_con_cobertura"], 2)
        self.assertEqual(r["precio_min"], 5000)
        self.assertEqual(r["precio_max"], 8000)
        self.assertEqual(r["precio_promedio"], 6500)

    def test_barrio_sin_cadena_activa_no_cuenta_como_cobertura(self):
        svc.cambiar_estado_ciudad(self.db, 1, 2)   # Medellín inactiva
        r = svc.resumen(self.db)
        self.assertEqual(r["barrios"], 2)
        self.assertEqual(r["barrios_con_cobertura"], 0)
        self.assertEqual(r["precio_promedio"], 0)

    def test_cuenta_ofertas_activas(self):
        self._oferta(pesos=1000, estado=1)
        self._oferta(pesos=2000, estado=2)
        r = svc.resumen(self.db)
        self.assertEqual(r["ofertas"], 2)
        self.assertEqual(r["ofertas_activas"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
