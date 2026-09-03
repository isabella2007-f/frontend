"""Banco de pruebas de los paneles: la API real, entrada por HTTP.

Los demás tests llaman a las funciones de servicio. Estos levantan la
aplicación FastAPI completa —routers, tokens, permisos, esquemas— sobre una
SQLite en memoria y la recorren con peticiones, que es exactamente lo que
hacen el panel de administración, la tienda del cliente y la app del
domiciliario. Sirve para ver lo que ninguna prueba de servicio ve: que el
endpoint exista, que el permiso deje pasar a quien debe, que el cuerpo que
manda la pantalla valide, y que la respuesta traiga los campos que la pantalla
lee.

No toca ninguna base de datos real: `get_db` se sustituye por la sesión de
SQLite y el `startup` de migraciones de MySQL no corre (TestClient solo lo
dispara si se usa como context manager).

Corre sin credenciales:
    python tests/test_paneles_e2e.py
"""
import os
from datetime import datetime, timedelta
from decimal import Decimal

# database.py arma el engine al importarse; con esto no se conecta a nada.
os.environ.setdefault("DB_USER", "u")
os.environ.setdefault("DB_PASSWORD", "p")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "clave-de-prueba-no-usada-en-produccion")
os.environ.setdefault("ALGORITHM", "HS256")

import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.shared.services.database import get_db
from src.shared.services.models import (
    Base,
    CreditoCliente,
    Domicilio,
    Estado,
    FichaTecnica,
    FichaTecnicaInsumo,
    Insumo,
    LoteCompra,
    LoteProducto,
    OrdenProduccion,
    Permiso,
    Producto,
    Rol,
    RolXPermiso,
    UnidadMedida,
    Usuario,
    Venta,
    VentaXProducto,
)

API = "/api"

# ── Quiénes entran ────────────────────────────────────────────────────────
ROL_ADMIN = 1
ROL_EMPLEADO = 2
ROL_CLIENTE = 3
ROL_DOMICILIARIO = 4

ID_ADMIN = 1
ID_CLIENTE = 2
ID_REPARTIDOR = 3
ID_OTRO_CLIENTE = 4
ID_OTRO_REPARTIDOR = 5

# ── Qué se vende ──────────────────────────────────────────────────────────
PRECIO = Decimal("10000")
ID_TOSTON = 1     # stock 20, no se fabrica: sale de la vitrina
ID_TORTA = 2      # stock 2, con ficha técnica: su faltante se hornea
ID_HARINA = 1

STOCK_TOSTON = 20
STOCK_TORTA = 2
GRAMOS_POR_TORTA = 200.0
STOCK_HARINA = 4000.0

# ── Estados (tabla global) ────────────────────────────────────────────────
PEDIDO_PENDIENTE = 1
PEDIDO_CONFIRMADO = 4
PEDIDO_CANCELADO = 5
PEDIDO_ENTREGADO = 8
PEDIDO_EN_CAMINO = 9
PEDIDO_LISTO = 11
PEDIDO_EN_PRODUCCION = 13
PEDIDO_FECHA_PROPUESTA = 16

DOM_PENDIENTE = 3
DOM_CANCELADO = 5
DOM_ENTREGADO = 8
DOM_EN_CAMINO = 9
DOM_ASIGNADO = 10

ORDEN_PENDIENTE = 1
ORDEN_EN_PROCESO = 13
ORDEN_COMPLETADA = 11
ORDEN_CANCELADA = 5

# Los de la tabla global, como los usa el módulo de devoluciones.
DEV_PENDIENTE = 3
DEV_APROBADA = 6
DEV_RECHAZADA = 7

# Lo que el rol de reparto tiene concedido en Rol_x_Permiso. Es la lista real
# que se le carga desde Configuración → Roles.
PERMISOS_REPARTO = ["ver_domicilios", "ver_detalle_domicilios", "cambiar_estado_domicilios"]

# Lo que necesita el rol Cliente para comprar. `requiere_permiso` NO exceptúa a
# los clientes (su docstring dice que sí, pero el código solo exceptúa al rol
# Administrador), así que sin este permiso cargado en Rol_x_Permiso la tienda
# entera devuelve 403 al confirmar el pedido. Se siembra igual que en producción
# para que estas pruebas reproduzcan lo que ve el cliente de verdad.
PERMISOS_CLIENTE = ["crear_pedidos"]

# Todos los permisos que tocan los módulos de venta/producción, para poder darle
# a un rol exactamente los que hagan falta en cada caso. Una venta es un pedido
# completado: no hay permisos "*_ventas" separados.
PERMISOS = [
    "ver_pedidos", "crear_pedidos", "editar_pedidos", "cancelar_pedidos",
    "ver_domicilios", "ver_detalle_domicilios", "crear_domicilios",
    "editar_domicilios", "cambiar_estado_domicilios",
    "ver_devoluciones", "editar_devoluciones", "aprobar_devoluciones",
    "ver_ordenes", "crear_ordenes", "editar_ordenes",
    "cambiar_estado_ordenes", "anular_ordenes",
    "ver_productos", "crear_productos", "editar_productos",
]

ESTADOS = {
    1: "Pendiente", 2: "Inactivo", 3: "Pendiente", 4: "Confirmado",
    5: "Cancelado", 6: "Aprobada", 7: "Rechazada", 8: "Entregado",
    9: "En camino", 10: "Asignado", 11: "Completada", 13: "En proceso",
    14: "Stock bajo", 15: "Agotado", 16: "Fecha propuesta",
}


def _token(id_usuario: int, tipo: str, rol: str) -> str:
    return jwt.encode(
        {"id": id_usuario, "tipo": tipo, "rol": rol},
        os.environ["SECRET_KEY"],
        algorithm=os.environ["ALGORITHM"],
    )


class PanelBase(unittest.TestCase):
    """Panadería sembrada y tres sesiones abiertas: admin, cliente, repartidor."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # La app entera contra esta sesión. TestClient serializa las
        # peticiones, así que una sola sesión compartida es suficiente.
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)

        self._sembrar()

        self.admin = {"Authorization": "Bearer " + _token(ID_ADMIN, "empleado", "Administrador")}
        self.cliente = {"Authorization": "Bearer " + _token(ID_CLIENTE, "cliente", "Cliente")}
        self.otro_cliente = {"Authorization": "Bearer " + _token(ID_OTRO_CLIENTE, "cliente", "Cliente")}
        self.repartidor = {"Authorization": "Bearer " + _token(ID_REPARTIDOR, "empleado", "Domiciliario")}
        self.otro_repartidor = {"Authorization": "Bearer " + _token(ID_OTRO_REPARTIDOR, "empleado", "Domiciliario")}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    # ── Siembra ──────────────────────────────────────────────────────────
    def _sembrar(self):
        for id_estado, nombre in ESTADOS.items():
            self.db.add(Estado(ID_Estados=id_estado, Estado=nombre))

        self.db.add(Rol(ID_Rol=ROL_ADMIN, Rol="Administrador", Estado=1))
        self.db.add(Rol(ID_Rol=ROL_EMPLEADO, Rol="Empleado", Estado=1))
        self.db.add(Rol(ID_Rol=ROL_CLIENTE, Rol="Cliente", Estado=1))
        self.db.add(Rol(ID_Rol=ROL_DOMICILIARIO, Rol="Domiciliario", Estado=1))

        for i, nombre in enumerate(PERMISOS, start=1):
            self.db.add(Permiso(ID_Permiso=i, Permiso=nombre, Descripcion=nombre))
        # El rol de reparto solo tiene lo suyo: sin esto no entra ni a su panel.
        for nombre in PERMISOS_REPARTO:
            self.db.add(RolXPermiso(
                ID_Rol=ROL_DOMICILIARIO, ID_Permiso=PERMISOS.index(nombre) + 1,
            ))
        for nombre in PERMISOS_CLIENTE:
            self.db.add(RolXPermiso(
                ID_Rol=ROL_CLIENTE, ID_Permiso=PERMISOS.index(nombre) + 1,
            ))

        self.db.add(Usuario(
            ID_Usuario=ID_ADMIN, Nombre="Ana", Apellidos="Admin",
            Correo="admin@toston.test", Telefono="3000000001",
            ID_Rol=ROL_ADMIN, Estado=1,
        ))
        self.db.add(Usuario(
            ID_Usuario=ID_CLIENTE, Nombre="Carlos", Apellidos="Cliente",
            Correo="cliente@toston.test", Telefono="3001234567",
            Direccion="Calle 10 #20-30", Municipio="Medellín",
            Departamento="Antioquia", Indicaciones="Portón verde",
            ID_Rol=ROL_CLIENTE, Estado=1,
        ))
        self.db.add(Usuario(
            ID_Usuario=ID_REPARTIDOR, Nombre="Rita", Apellidos="Reparto",
            Correo="reparto@toston.test", Telefono="3000000003",
            ID_Rol=ROL_DOMICILIARIO, Estado=1,
        ))
        self.db.add(Usuario(
            ID_Usuario=ID_OTRO_CLIENTE, Nombre="Otra", Apellidos="Clienta",
            Correo="otra@toston.test", Telefono="3000000004",
            ID_Rol=ROL_CLIENTE, Estado=1,
        ))
        self.db.add(Usuario(
            ID_Usuario=ID_OTRO_REPARTIDOR, Nombre="Raúl", Apellidos="Reparto",
            Correo="reparto2@toston.test", Telefono="3000000005",
            ID_Rol=ROL_DOMICILIARIO, Estado=1,
        ))

        self.db.add(Producto(
            ID_Producto=ID_TOSTON, nombre="Tostón", Precio_venta=PRECIO,
            Stock=STOCK_TOSTON, Stock_Minimo=2, Estado=1, Publicado=1,
        ))
        self.db.add(Producto(
            ID_Producto=ID_TORTA, nombre="Torta Tropical", Precio_venta=PRECIO,
            Stock=STOCK_TORTA, Stock_Minimo=1, Estado=1, Publicado=1,
            Requiere_Produccion=1,
        ))

        # Receta de la torta: 200 g de harina por unidad, en dos lotes para
        # poder ver el consumo FEFO.
        self.db.add(UnidadMedida(ID_Unidad_Medida=1, Simbolo="g", Unidad_Medida="Gramos"))
        self.db.add(Insumo(
            ID_Insumo=ID_HARINA, Nombre="Harina", Unidad_Medida=1,
            Stock_Actual=STOCK_HARINA, Stock_Minimo=200, Estado=1,
        ))
        hoy = datetime.now()
        self.db.add(LoteCompra(
            ID_Lote_Compra=1, ID_Insumo=ID_HARINA,
            Fecha_Vencimiento=hoy + timedelta(days=10),
            Cantidad_Inicial=1000.0, Cantidad_Actual=1000.0, Estado=1,
        ))
        self.db.add(LoteCompra(
            ID_Lote_Compra=2, ID_Insumo=ID_HARINA,
            Fecha_Vencimiento=hoy + timedelta(days=120),
            Cantidad_Inicial=3000.0, Cantidad_Actual=3000.0, Estado=1,
        ))
        self.db.add(FichaTecnica(
            ID_Ficha=1, ID_Producto=ID_TORTA, Version="1", Estado=1,
            Dias_Vida_Util=5, Vida_Util_Unidad="dias",
        ))
        self.db.add(FichaTecnicaInsumo(
            ID_Ficha_Insumo=1, ID_Ficha=1, ID_Insumo=ID_HARINA,
            Cantidad=GRAMOS_POR_TORTA, Unidad="g",
        ))
        self.db.commit()

    # ── Atajos de petición ───────────────────────────────────────────────
    def get(self, ruta, quien, **kw):
        return self.client.get(API + ruta, headers=quien, **kw)

    def post(self, ruta, quien, cuerpo=None, **kw):
        return self.client.post(API + ruta, headers=quien, json=cuerpo or {}, **kw)

    def put(self, ruta, quien, cuerpo=None, **kw):
        return self.client.put(API + ruta, headers=quien, json=cuerpo or {}, **kw)

    def patch(self, ruta, quien, cuerpo=None, **kw):
        return self.client.patch(API + ruta, headers=quien, json=cuerpo or {}, **kw)

    def detalle(self, respuesta):
        """El mensaje de error, para poder afirmar sobre él sin repetir json()."""
        try:
            return (respuesta.json().get("detail") or "")
        except Exception:  # respuesta sin cuerpo JSON
            return respuesta.text

    def afirmar_ok(self, respuesta, esperado=200):
        self.assertEqual(
            respuesta.status_code, esperado,
            f"{respuesta.status_code}: {self.detalle(respuesta)}",
        )
        return respuesta.json()

    # ── Datos que arman las pantallas ────────────────────────────────────
    def cuerpo_pedido(self, **kw):
        """Lo que manda el checkout del cliente: tostones que hay en vitrina."""
        cuerpo = {
            "ID_Usuario": ID_CLIENTE,
            "Metodo_Pago": "Efectivo",
            "productos": [{"ID_Producto": ID_TOSTON, "Cantidad": 2}],
        }
        cuerpo.update(kw)
        return cuerpo

    def direccion(self, **kw):
        cuerpo = {
            "Direccion_entrega": "Calle 10 #20-30",
            "Municipio_entrega": "Medellín",
            "Departamento_entrega": "Antioquia",
        }
        cuerpo.update(kw)
        return cuerpo

    def crear_pedido(self, quien=None, **kw):
        """Crea el pedido por el endpoint y devuelve el cuerpo de la respuesta."""
        respuesta = self.post("/ventas/", quien or self.cliente, self.cuerpo_pedido(**kw))
        return self.afirmar_ok(respuesta, 201)

    def cobrar_en_tienda(self, id_venta, monto=20000):
        """El mostrador registra el efectivo antes de entregar."""
        return self.afirmar_ok(self.patch(
            f"/pedidos/{id_venta}/registrar-cobro", self.admin,
            {"recibido": True, "monto": monto},
        ))

    def dar_saldo(self, monto, id_usuario=ID_CLIENTE):
        self.db.add(CreditoCliente(ID_Usuario=id_usuario, Saldo=Decimal(str(monto))))
        self.db.commit()

    # ── Consultas directas, para verificar lo que quedó guardado ─────────
    def venta(self, id_venta):
        self.db.expire_all()
        return self.db.query(Venta).filter(Venta.ID_Venta == id_venta).first()

    def domicilio(self, id_venta=None):
        self.db.expire_all()
        q = self.db.query(Domicilio)
        if id_venta is not None:
            q = q.filter(Domicilio.ID_Venta == id_venta)
        return q.first()

    def orden(self, id_venta=None):
        self.db.expire_all()
        q = self.db.query(OrdenProduccion)
        if id_venta is not None:
            q = q.filter(OrdenProduccion.ID_Venta == id_venta)
        return q.first()

    def stock(self, id_producto):
        self.db.expire_all()
        return self.db.query(Producto).filter(
            Producto.ID_Producto == id_producto
        ).first().Stock

    def harina(self):
        self.db.expire_all()
        return float(self.db.query(Insumo).filter(
            Insumo.ID_Insumo == ID_HARINA
        ).first().Stock_Actual)

    def saldo(self, id_usuario=ID_CLIENTE):
        self.db.expire_all()
        credito = self.db.query(CreditoCliente).filter(
            CreditoCliente.ID_Usuario == id_usuario
        ).first()
        return Decimal(str(credito.Saldo)) if credito else Decimal("0")

    def lineas(self, id_venta):
        self.db.expire_all()
        return self.db.query(VentaXProducto).filter(
            VentaXProducto.ID_Venta == id_venta
        ).all()

    def lote_producto(self):
        self.db.expire_all()
        return self.db.query(LoteProducto).first()

    def lote_compra(self, id_lote):
        self.db.expire_all()
        return self.db.query(LoteCompra).filter(
            LoteCompra.ID_Lote_Compra == id_lote
        ).first()

    # ── Recorridos completos, para no repetirlos en cada caso ────────────
    def pedido_con_faltante(self, cantidad=6, **kw):
        """Pedido de tortas por encima del stock: 4 por hornear, $60.000.

        Lleva el anticipo registrado, que es lo que el checkout envía cuando
        el cliente lo paga.
        """
        cuerpo = dict(
            productos=[{"ID_Producto": ID_TORTA, "Cantidad": cantidad}],
            Metodo_Pago="Transferencia",
            requiere_anticipo=True,
            anticipo_monto=30000.0,
            anticipo_metodo_pago="Transferencia",
            anticipo_comprobante_url="https://cloudinary.test/ant.jpg",
            anticipo_registrado=True,
        )
        cuerpo.update(kw)
        return self.crear_pedido(**cuerpo)

    def hornear(self, id_venta):
        """Inicia y completa la orden del pedido, como el panel de producción."""
        id_orden = self.orden(id_venta).ID_Orden_Produccion
        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_EN_PROCESO},
        ))
        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_COMPLETADA},
        ))
