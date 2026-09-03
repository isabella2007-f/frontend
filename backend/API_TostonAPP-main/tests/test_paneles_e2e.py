"""Los tres paneles, recorridos por HTTP contra la API real.

Cada clase es una pantalla o un recorrido: crear el pedido de todas las formas
que existen, el panel del cliente, el del administrador, el de producción, el
del domiciliario y las devoluciones. El andamiaje está en `panel.py`.

Corre sin credenciales:
    python tests/test_paneles_e2e.py
"""
import sys
import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from panel import *  # noqa: F401,F403
from panel import (
    DEV_APROBADA, DEV_PENDIENTE, DEV_RECHAZADA,
    DOM_ASIGNADO, DOM_CANCELADO, DOM_EN_CAMINO, DOM_ENTREGADO, DOM_PENDIENTE,
    GRAMOS_POR_TORTA, ID_CLIENTE, ID_HARINA, ID_OTRO_CLIENTE, ID_REPARTIDOR,
    ID_OTRO_REPARTIDOR, ID_TORTA, ID_TOSTON, ORDEN_CANCELADA, ORDEN_COMPLETADA,
    ORDEN_EN_PROCESO, ORDEN_PENDIENTE, PEDIDO_CANCELADO, PEDIDO_CONFIRMADO,
    PEDIDO_EN_CAMINO, PEDIDO_EN_PRODUCCION, PEDIDO_ENTREGADO,
    PEDIDO_FECHA_PROPUESTA, PEDIDO_LISTO, PEDIDO_PENDIENTE, PRECIO,
    STOCK_HARINA, STOCK_TORTA, STOCK_TOSTON, PanelBase,
)


COSTO_DOMICILIO = Decimal("5000")


# ══════════════════════════════════════════════════════════════════════════
# 1. Crear el pedido de todas las maneras que existen
# ══════════════════════════════════════════════════════════════════════════
class CrearPedidoTests(PanelBase):
    """Cada camino por el que entra un pedido a la panadería."""

    def test_efectivo_para_recoger_en_tienda(self):
        pedido = self.crear_pedido()
        self.assertEqual(Decimal(pedido["Total"]), Decimal("20000.00"))
        self.assertEqual(pedido["Estado"], PEDIDO_PENDIENTE)
        self.assertIsNone(self.domicilio())
        # Recoger en tienda: el stock no se toca hasta confirmar.
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON)

    def test_efectivo_con_domicilio_suma_el_costo_de_envio(self):
        pedido = self.crear_pedido(domicilio=self.direccion())
        self.assertEqual(Decimal(pedido["Total"]), Decimal("20000") + COSTO_DOMICILIO)
        dom = self.domicilio()
        self.assertIsNotNone(dom)
        self.assertEqual(dom.Estado, DOM_PENDIENTE)   # sin repartidor todavía

    def test_transferencia_con_comprobante_queda_esperando_validacion(self):
        pedido = self.crear_pedido(
            Metodo_Pago="Transferencia",
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        self.assertEqual(self.venta(pedido["ID_Venta"]).Estado_Pago, "pendiente_validacion")

    def test_mixto_reparte_el_total_entre_efectivo_y_transferencia(self):
        pedido = self.crear_pedido(
            Metodo_Pago="Mixto",
            pago_efectivo_monto=7000,
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        venta = self.venta(pedido["ID_Venta"])
        self.assertEqual(Decimal(str(venta.Monto_Efectivo)), Decimal("7000.00"))
        self.assertEqual(
            Decimal(str(venta.Monto_Efectivo)) + Decimal(str(venta.Monto_Transferencia)),
            Decimal(str(venta.Total)),
        )

    def test_con_saldo_a_favor_baja_el_total_y_se_descuenta_del_saldo(self):
        self.dar_saldo(15000)
        pedido = self.crear_pedido(usar_credito=True, credito_monto=15000)
        self.assertEqual(Decimal(pedido["Total"]), Decimal("5000.00"))
        self.assertEqual(self.saldo(), Decimal("0"))

    def test_el_saldo_parcial_deja_el_resto_guardado(self):
        self.dar_saldo(15000)
        self.crear_pedido(usar_credito=True, credito_monto=5000)
        self.assertEqual(self.saldo(), Decimal("10000"))

    def test_el_mostrador_crea_el_pedido_ya_confirmado_y_reserva_stock(self):
        pedido = self.crear_pedido(quien=self.admin, creado_por_admin=True)
        self.assertEqual(pedido["Estado"], PEDIDO_CONFIRMADO)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)

    def test_el_pedido_con_faltante_abre_su_orden_de_produccion(self):
        pedido = self.pedido_con_faltante()
        venta = self.venta(pedido["ID_Venta"])
        self.assertEqual(venta.Sobre_Stock, 1)
        self.assertEqual(venta.Requiere_Anticipo, 1)
        orden = self.orden(pedido["ID_Venta"])
        self.assertIsNotNone(orden)
        self.assertEqual(orden.Cantidad, 6 - STOCK_TORTA)

    def test_el_faltante_chico_entra_sin_pedir_anticipo(self):
        """3 tortas = $30.000: una por hornear, por debajo del umbral."""
        pedido = self.crear_pedido(
            productos=[{"ID_Producto": ID_TORTA, "Cantidad": 3}],
        )
        venta = self.venta(pedido["ID_Venta"])
        self.assertEqual(venta.Sobre_Stock, 1)
        self.assertEqual(venta.Requiere_Anticipo or 0, 0)

    def test_el_pedido_grande_por_encargo_sin_anticipo_se_rechaza(self):
        respuesta = self.post("/ventas/", self.cliente, self.cuerpo_pedido(
            productos=[{"ID_Producto": ID_TORTA, "Cantidad": 6}],
        ))
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("anticipo", self.detalle(respuesta).lower())

    def test_sin_telefono_no_se_puede_pedir_a_domicilio(self):
        from src.shared.services.models import Usuario
        u = self.db.query(Usuario).filter(Usuario.ID_Usuario == ID_CLIENTE).first()
        u.Telefono = None
        self.db.commit()

        respuesta = self.post("/ventas/", self.cliente, self.cuerpo_pedido(
            domicilio=self.direccion(),
        ))
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("teléfono", self.detalle(respuesta).lower())

    def test_un_producto_fuera_de_la_tienda_no_se_puede_pedir(self):
        from src.shared.services.models import Producto
        p = self.db.query(Producto).filter(Producto.ID_Producto == ID_TOSTON).first()
        p.Publicado = 0
        self.db.commit()

        respuesta = self.post("/ventas/", self.cliente, self.cuerpo_pedido())
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("disponible", self.detalle(respuesta).lower())

    def test_un_producto_que_no_existe_da_404(self):
        respuesta = self.post("/ventas/", self.cliente, self.cuerpo_pedido(
            productos=[{"ID_Producto": 999, "Cantidad": 1}],
        ))
        self.assertEqual(respuesta.status_code, 404)

    def test_el_mostrador_si_puede_vender_a_nombre_de_un_cliente(self):
        """La regla es solo para clientes: el personal vende en mostrador."""
        cuerpo = self.crear_pedido(
            quien=self.admin, creado_por_admin=True, ID_Usuario=ID_OTRO_CLIENTE,
        )
        self.assertEqual(self.venta(cuerpo["ID_Venta"]).ID_Usuario, ID_OTRO_CLIENTE)

    def test_el_pedido_queda_a_nombre_de_quien_lo_hace(self):
        """El ID del cuerpo no puede mandar sobre el del token.

        Si mandara, cualquier cliente podría hacer pedidos a nombre de otro
        —y gastarle el saldo a favor, que se toma del ID_Usuario del pedido—.
        """
        self.dar_saldo(50000, id_usuario=ID_OTRO_CLIENTE)
        cuerpo = self.afirmar_ok(self.post("/ventas/", self.cliente, self.cuerpo_pedido(
            ID_Usuario=ID_OTRO_CLIENTE,
            usar_credito=True,
            credito_monto=20000,
        )), 201)
        self.assertEqual(
            self.venta(cuerpo["ID_Venta"]).ID_Usuario, ID_CLIENTE,
            "el pedido quedó a nombre de otro cliente",
        )
        self.assertEqual(
            self.saldo(ID_OTRO_CLIENTE), Decimal("50000"),
            "se gastó el saldo a favor de otro cliente",
        )
        # Y el pedido no aparece en el historial de la otra persona.
        ajenas = self.afirmar_ok(self.get("/ventas/mis-ventas", self.otro_cliente))
        self.assertEqual(ajenas["total"], 0)


# ══════════════════════════════════════════════════════════════════════════
# 2. Panel del cliente
# ══════════════════════════════════════════════════════════════════════════
class PanelClienteTests(PanelBase):
    """Lo que el cliente ve y puede hacer con sus propios pedidos."""

    def test_mis_ventas_solo_trae_las_suyas(self):
        self.crear_pedido()
        self.post("/ventas/", self.otro_cliente, self.cuerpo_pedido(ID_Usuario=ID_OTRO_CLIENTE))

        cuerpo = self.afirmar_ok(self.get("/ventas/mis-ventas", self.cliente))
        self.assertEqual(cuerpo["total"], 1)
        self.assertEqual(cuerpo["ventas"][0]["ID_Usuario"], ID_CLIENTE)

    def test_no_puede_abrir_el_pedido_de_otro(self):
        pedido = self.crear_pedido()
        respuesta = self.get(f"/ventas/mis-ventas/{pedido['ID_Venta']}", self.otro_cliente)
        self.assertIn(respuesta.status_code, (403, 404))

    def test_ve_su_saldo_a_favor(self):
        self.dar_saldo(12000)
        cuerpo = self.afirmar_ok(self.get("/ventas/mi-credito", self.cliente))
        self.assertEqual(Decimal(str(cuerpo["saldo"])), Decimal("12000"))

    def test_el_detalle_trae_lo_que_la_pantalla_muestra(self):
        pedido = self.crear_pedido(domicilio=self.direccion())
        cuerpo = self.afirmar_ok(
            self.get(f"/ventas/mis-ventas/{pedido['ID_Venta']}", self.cliente)
        )
        self.assertEqual(cuerpo["estado_label"], "Pendiente")
        self.assertTrue(cuerpo["productos"])
        self.assertEqual(cuerpo["productos"][0]["nombre_producto"], "Tostón")
        self.assertTrue(cuerpo["tiene_domicilio"])
        self.assertEqual(cuerpo["direccion_entrega"], "Calle 10 #20-30")
        self.assertIsNotNone(cuerpo["ID_Domicilio"])

    def test_cancela_su_propio_pedido_pendiente(self):
        pedido = self.crear_pedido()
        self.afirmar_ok(
            self.patch(f"/pedidos/{pedido['ID_Venta']}/cancelar-mi-pedido", self.cliente)
        )
        self.assertEqual(self.venta(pedido["ID_Venta"]).Estado, PEDIDO_CANCELADO)

    def test_no_cancela_el_pedido_de_otro(self):
        pedido = self.crear_pedido()
        respuesta = self.patch(
            f"/pedidos/{pedido['ID_Venta']}/cancelar-mi-pedido", self.otro_cliente
        )
        self.assertIn(respuesta.status_code, (403, 404))
        self.assertEqual(self.venta(pedido["ID_Venta"]).Estado, PEDIDO_PENDIENTE)

    def test_cancelar_devuelve_el_saldo_que_se_habia_usado(self):
        self.dar_saldo(15000)
        pedido = self.crear_pedido(usar_credito=True, credito_monto=15000)
        self.assertEqual(self.saldo(), Decimal("0"))

        self.afirmar_ok(
            self.patch(f"/pedidos/{pedido['ID_Venta']}/cancelar-mi-pedido", self.cliente)
        )
        self.assertEqual(self.saldo(), Decimal("15000"))

    def test_acepta_la_fecha_que_le_propone_el_administrador(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        fecha = (datetime.now() + timedelta(days=3)).isoformat()

        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/proponer-fecha", self.admin, {"fecha_entrega": fecha}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_FECHA_PROPUESTA)

        self.afirmar_ok(self.patch(f"/ventas/{id_venta}/aceptar-fecha", self.cliente))
        self.assertIn(
            self.venta(id_venta).Estado, (PEDIDO_CONFIRMADO, PEDIDO_EN_PRODUCCION)
        )

    def test_rechazar_la_fecha_cancela_el_pedido(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        fecha = (datetime.now() + timedelta(days=3)).isoformat()
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/proponer-fecha", self.admin, {"fecha_entrega": fecha}
        ))

        self.afirmar_ok(self.patch(f"/ventas/{id_venta}/rechazar-fecha", self.cliente))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CANCELADO)

    def test_no_acepta_la_fecha_de_un_pedido_ajeno(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        fecha = (datetime.now() + timedelta(days=3)).isoformat()
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/proponer-fecha", self.admin, {"fecha_entrega": fecha}
        ))

        respuesta = self.patch(f"/ventas/{id_venta}/aceptar-fecha", self.otro_cliente)
        self.assertIn(respuesta.status_code, (403, 404))

    def test_el_cliente_no_entra_al_panel_de_gestion(self):
        self.crear_pedido()
        for ruta in ("/pedidos/", "/ventas/", "/domicilios/", "/devoluciones/"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.get(ruta, self.cliente).status_code, 403)


# ══════════════════════════════════════════════════════════════════════════
# 3. Panel del administrador
# ══════════════════════════════════════════════════════════════════════════
class PanelAdminTests(PanelBase):

    def test_ve_el_pedido_en_su_listado(self):
        self.crear_pedido()
        cuerpo = self.afirmar_ok(self.get("/pedidos/", self.admin))
        self.assertEqual(cuerpo["total"], 1)
        self.assertEqual(cuerpo["pedidos"][0]["estado_label"], "Pendiente")

    def test_confirma_el_pedido_y_reserva_el_stock(self):
        pedido = self.crear_pedido()
        self.afirmar_ok(self.patch(f"/pedidos/{pedido['ID_Venta']}/confirmar", self.admin))
        self.assertEqual(self.venta(pedido["ID_Venta"]).Estado, PEDIDO_CONFIRMADO)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)

    def test_no_confirma_con_el_comprobante_sin_revisar(self):
        pedido = self.crear_pedido(
            Metodo_Pago="Transferencia",
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        respuesta = self.patch(f"/pedidos/{pedido['ID_Venta']}/confirmar", self.admin)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("comprobante", self.detalle(respuesta).lower())

    def test_aprobado_el_comprobante_el_pedido_se_confirma(self):
        pedido = self.crear_pedido(
            Metodo_Pago="Transferencia",
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/aprobar-comprobante", self.admin))
        self.assertEqual(self.venta(id_venta).Estado_Pago, "pagado_completo")

        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CONFIRMADO)

    def test_el_comprobante_rechazado_bloquea_la_confirmacion(self):
        pedido = self.crear_pedido(
            Metodo_Pago="Transferencia",
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(
            f"/pedidos/{id_venta}/rechazar-comprobante", self.admin,
            {"motivo": "La imagen no se ve"},
        ))
        respuesta = self.patch(f"/pedidos/{id_venta}/confirmar", self.admin)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("rechazado", self.detalle(respuesta).lower())

    def test_registra_el_cobro_en_efectivo(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(
            f"/pedidos/{id_venta}/registrar-cobro", self.admin,
            {"recibido": True, "monto": 20000},
        ))
        self.assertEqual(self.venta(id_venta).Estado_Pago, "efectivo_recibido")

    def test_el_recorrido_completo_de_un_pedido_en_tienda(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        self.cobrar_en_tienda(id_venta)
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_ENTREGADO)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)
        self.assertIsNotNone(self.venta(id_venta).Fecha_entrega)

    def test_cancelar_un_pedido_confirmado_devuelve_el_stock(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)

        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CANCELADO)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON)

    def test_no_entrega_en_tienda_sin_registrar_el_cobro(self):
        """La misma regla del domicilio, ahora también en el mostrador."""
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        respuesta = self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("efectivo", self.detalle(respuesta).lower())
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_LISTO)

    def test_declarar_que_no_se_cobro_tambien_deja_entregar_en_tienda(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        self.afirmar_ok(self.patch(
            f"/pedidos/{id_venta}/registrar-cobro", self.admin,
            {"recibido": False, "motivo": "se lo llevó y paga el lunes"},
        ))
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_ENTREGADO)

    def test_un_empleado_sin_permiso_no_toca_los_pedidos(self):
        from panel import ROL_EMPLEADO, _token
        from src.shared.services.models import Usuario
        self.db.add(Usuario(
            ID_Usuario=99, Nombre="Emi", Apellidos="Empleado",
            Correo="emi@toston.test", ID_Rol=ROL_EMPLEADO, Estado=1,
        ))
        self.db.commit()
        sin_permiso = {"Authorization": "Bearer " + _token(99, "empleado", "Empleado")}

        self.crear_pedido()
        self.assertEqual(self.get("/pedidos/", sin_permiso).status_code, 403)


# ══════════════════════════════════════════════════════════════════════════
# 4. Producción, desde el panel
# ══════════════════════════════════════════════════════════════════════════
class PanelProduccionTests(PanelBase):

    def test_la_orden_aparece_en_el_listado_del_panel(self):
        self.pedido_con_faltante()
        cuerpo = self.afirmar_ok(self.get("/ordenes-produccion/", self.admin))
        self.assertEqual(cuerpo["total"], 1)
        orden = cuerpo["ordenes"][0]
        self.assertEqual(orden["nombre_producto"], "Torta Tropical")
        self.assertEqual(orden["Cantidad"], 6 - STOCK_TORTA)
        self.assertEqual(orden["Estado"], ORDEN_PENDIENTE)

    def test_iniciarla_descuenta_los_insumos_de_la_receta(self):
        pedido = self.pedido_con_faltante()
        id_orden = self.orden(pedido["ID_Venta"]).ID_Orden_Produccion

        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_EN_PROCESO},
        ))
        gastado = GRAMOS_POR_TORTA * (6 - STOCK_TORTA)
        self.assertAlmostEqual(self.harina(), STOCK_HARINA - gastado, places=3)
        # FEFO: primero se vacía el lote que vence antes.
        self.assertAlmostEqual(float(self.lote_compra(1).Cantidad_Actual), 200.0, places=3)
        self.assertAlmostEqual(float(self.lote_compra(2).Cantidad_Actual), 3000.0, places=3)

    def test_completarla_repone_el_producto_y_crea_su_lote(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.hornear(id_venta)

        self.assertEqual(self.stock(ID_TORTA), STOCK_TORTA + (6 - STOCK_TORTA))
        lote = self.lote_producto()
        self.assertIsNotNone(lote)
        self.assertEqual(lote.Cantidad, 6 - STOCK_TORTA)

    def test_el_pedido_no_pasa_a_listo_con_la_orden_abierta(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_EN_PRODUCCION)

        respuesta = self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_LISTO}
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("producción", self.detalle(respuesta).lower())

    def test_completada_la_orden_el_pedido_queda_listo(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.hornear(id_venta)
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_LISTO)

    def test_sin_insumos_la_orden_no_arranca_y_no_toca_nada(self):
        pedido = self.pedido_con_faltante()
        id_orden = self.orden(pedido["ID_Venta"]).ID_Orden_Produccion
        from src.shared.services.models import Insumo
        insumo = self.db.query(Insumo).filter(Insumo.ID_Insumo == ID_HARINA).first()
        insumo.Stock_Actual = 100.0
        self.db.commit()

        respuesta = self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_EN_PROCESO},
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("insuficiente", self.detalle(respuesta).lower())
        self.assertEqual(self.orden().Estado, ORDEN_PENDIENTE)
        self.assertAlmostEqual(self.harina(), 100.0, places=3)

    def test_cancelarla_en_proceso_devuelve_los_insumos(self):
        pedido = self.pedido_con_faltante()
        id_orden = self.orden(pedido["ID_Venta"]).ID_Orden_Produccion
        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_EN_PROCESO},
        ))
        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_CANCELADA},
        ))
        self.assertAlmostEqual(self.harina(), STOCK_HARINA, places=3)

    def test_el_inventario_cierra_al_entregar_en_tienda(self):
        """El faltante horneado también tiene que salir del stock."""
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.hornear(id_venta)
        self.afirmar_ok(self.post(
            f"/ventas/{id_venta}/registrar-pago-final", self.admin,
            {"monto": 30000, "metodo_pago": "Efectivo"},
        ))
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        ))
        self.assertEqual(self.stock(ID_TORTA), 0)


# ══════════════════════════════════════════════════════════════════════════
# 5. Panel del domiciliario
# ══════════════════════════════════════════════════════════════════════════
class PanelDomiciliarioTests(PanelBase):
    """Lo que ve y hace el repartidor desde su app."""

    def preparar_domicilio(self, aprobar_comprobante=False, **kw):
        """Pedido a domicilio, confirmado, listo y asignado al repartidor.

        El pedido que llega con comprobante no se confirma hasta que alguien
        lo aprueba, así que el recorrido del repartidor arranca después de
        ese paso.
        """
        pedido = self.crear_pedido(domicilio=self.direccion(), **kw)
        id_venta = pedido["ID_Venta"]
        if aprobar_comprobante:
            self.afirmar_ok(self.patch(
                f"/pedidos/{id_venta}/aprobar-comprobante", self.admin
            ))
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_LISTO}
        ))
        dom = self.domicilio(id_venta)
        self.afirmar_ok(self.patch(
            f"/domicilios/{dom.ID_Domicilio}/repartidor", self.admin,
            {"ID_Empleado": ID_REPARTIDOR},
        ))
        return id_venta, dom.ID_Domicilio

    def test_asignarlo_lo_pasa_a_asignado(self):
        _, id_dom = self.preparar_domicilio()
        self.assertEqual(self.domicilio().Estado, DOM_ASIGNADO)
        self.assertEqual(self.domicilio().ID_Empleado, ID_REPARTIDOR)

    def test_el_repartidor_ve_su_resumen_del_dia(self):
        self.preparar_domicilio()
        cuerpo = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        self.assertEqual(cuerpo["activos"], 1)
        self.assertEqual(cuerpo["entregados_hoy"], 0)

    def test_el_listado_solo_le_muestra_lo_suyo(self):
        self.preparar_domicilio()
        # Un segundo domicilio, de otro repartidor.
        pedido = self.crear_pedido(domicilio=self.direccion())
        otro = self.domicilio(pedido["ID_Venta"])
        self.afirmar_ok(self.patch(
            f"/domicilios/{otro.ID_Domicilio}/repartidor", self.admin,
            {"ID_Empleado": ID_OTRO_REPARTIDOR},
        ))

        cuerpo = self.afirmar_ok(self.get("/domicilios/", self.repartidor))
        self.assertEqual(cuerpo["total"], 1)
        self.assertEqual(cuerpo["domicilios"][0]["ID_Empleado"], ID_REPARTIDOR)

    def test_no_abre_el_domicilio_de_otro_repartidor(self):
        _, id_dom = self.preparar_domicilio()
        respuesta = self.get(f"/domicilios/{id_dom}", self.otro_repartidor)
        self.assertEqual(respuesta.status_code, 403)

    def test_no_cambia_el_estado_de_un_domicilio_ajeno(self):
        _, id_dom = self.preparar_domicilio()
        respuesta = self.patch(
            f"/domicilios/{id_dom}/estado", self.otro_repartidor,
            {"Estado": DOM_EN_CAMINO},
        )
        self.assertEqual(respuesta.status_code, 403)

    def test_el_detalle_trae_lo_que_necesita_para_entregar(self):
        _, id_dom = self.preparar_domicilio()
        cuerpo = self.afirmar_ok(self.get(f"/domicilios/{id_dom}", self.repartidor))
        self.assertEqual(cuerpo["telefono_cliente"], "3001234567")
        self.assertEqual(cuerpo["Direccion_entrega"], "Calle 10 #20-30")
        self.assertEqual(cuerpo["metodo_pago"], "Efectivo")
        self.assertTrue(cuerpo["productos"])
        self.assertEqual(cuerpo["indicaciones_cliente"], "Portón verde")
        # El código de entrega se quitó del flujo: ya no viaja en la respuesta.
        self.assertNotIn("otp", cuerpo)

    def test_sale_en_camino_y_el_pedido_lo_sigue(self):
        id_venta, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_EN_CAMINO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_EN_CAMINO)

    def test_no_entrega_sin_registrar_el_cobro_en_efectivo(self):
        _, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_EN_CAMINO}
        ))
        respuesta = self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_ENTREGADO}
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("cobro", self.detalle(respuesta).lower())

    def test_registrado_el_cobro_entrega_y_descuenta_el_stock(self):
        id_venta, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_EN_CAMINO}
        ))
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": True, "monto": 25000},
        ))
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_ENTREGADO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_ENTREGADO)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)

    def test_el_cobro_exige_el_monto_exacto(self):
        _, id_dom = self.preparar_domicilio()
        respuesta = self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": True, "monto": 1000},
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_declarar_que_no_cobro_exige_un_motivo(self):
        _, id_dom = self.preparar_domicilio()
        respuesta = self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": False, "motivo": "no"},
        )
        self.assertIn(respuesta.status_code, (400, 422))

    def test_declarar_que_no_cobro_con_motivo_deja_entregar(self):
        id_venta, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_EN_CAMINO}
        ))
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": False, "motivo": "el cliente no tenia el efectivo"},
        ))
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_ENTREGADO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_ENTREGADO)

    def test_el_cobro_no_se_registra_dos_veces(self):
        _, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": True, "monto": 25000},
        ))
        respuesta = self.patch(
            f"/domicilios/{id_dom}/registrar-pago-efectivo", self.repartidor,
            {"recibido": True, "monto": 25000},
        )
        self.assertEqual(respuesta.status_code, 409)

    def test_entregar_ya_no_pide_ningun_codigo(self):
        """El código de entrega se retiró: sus endpoints ya no existen."""
        _, id_dom = self.preparar_domicilio()
        for ruta in (f"/domicilios/{id_dom}/verificar-otp",
                     f"/domicilios/{id_dom}/regenerar-otp"):
            with self.subTest(ruta=ruta):
                respuesta = self.post(ruta, self.repartidor, {"codigo": "123456"})
                self.assertEqual(respuesta.status_code, 404)
        self.assertIsNone(self.domicilio().OTP)

    def test_el_chat_lo_ven_el_cliente_y_su_repartidor(self):
        _, id_dom = self.preparar_domicilio()
        self.afirmar_ok(self.post(
            f"/domicilios/{id_dom}/mensajes", self.repartidor, {"Contenido": "Voy llegando"}
        ))
        self.afirmar_ok(self.post(
            f"/domicilios/{id_dom}/mensajes", self.cliente, {"Contenido": "Gracias"}
        ))
        mensajes = self.afirmar_ok(self.get(f"/domicilios/{id_dom}/mensajes", self.cliente))
        self.assertEqual(len(mensajes), 2)
        self.assertEqual(mensajes[0]["Tipo_Remitente"], "domiciliario")

    def test_el_chat_no_lo_ve_un_extraño(self):
        _, id_dom = self.preparar_domicilio()
        for quien, etiqueta in ((self.otro_cliente, "otro cliente"),
                                (self.otro_repartidor, "otro repartidor")):
            with self.subTest(quien=etiqueta):
                respuesta = self.get(f"/domicilios/{id_dom}/mensajes", quien)
                self.assertEqual(respuesta.status_code, 403)

    def test_el_pedido_mixto_pide_cobrar_solo_la_parte_en_efectivo(self):
        id_venta, id_dom = self.preparar_domicilio(
            aprobar_comprobante=True,
            Metodo_Pago="Mixto",
            pago_efectivo_monto=10000,
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        cuerpo = self.afirmar_ok(self.get(f"/domicilios/{id_dom}", self.repartidor))
        self.assertEqual(Decimal(str(cuerpo["monto_efectivo"])), Decimal("10000.00"))

    def test_el_mixto_no_se_entrega_solo_con_el_comprobante_aprobado(self):
        id_venta, id_dom = self.preparar_domicilio(
            aprobar_comprobante=True,
            Metodo_Pago="Mixto",
            pago_efectivo_monto=10000,
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_EN_CAMINO}
        ))
        respuesta = self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_ENTREGADO}
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("efectivo", self.detalle(respuesta).lower())


# ══════════════════════════════════════════════════════════════════════════
# 6. Devoluciones
# ══════════════════════════════════════════════════════════════════════════
class DevolucionesTests(PanelBase):

    def pedido_entregado(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        self.cobrar_en_tienda(id_venta)
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        ))
        return id_venta

    def cuerpo_devolucion(self, id_venta, **kw):
        cuerpo = {
            "ID_Venta": id_venta,
            "Motivo": "Llegó en mal estado",
            "productos": [
                {"ID_Producto": ID_TOSTON, "Cantidad": 1, "PrecioUnitario": 10000}
            ],
        }
        cuerpo.update(kw)
        return cuerpo

    def test_el_cliente_pide_la_devolucion_de_su_pedido_entregado(self):
        id_venta = self.pedido_entregado()
        cuerpo = self.afirmar_ok(
            self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)), 201
        )
        self.assertEqual(cuerpo["Estado"], DEV_PENDIENTE)
        self.assertEqual(Decimal(cuerpo["TotalDevuelto"]), Decimal("10000"))

    def test_no_se_puede_devolver_un_pedido_que_no_se_entrego(self):
        pedido = self.crear_pedido()
        respuesta = self.post(
            "/devoluciones/", self.cliente, self.cuerpo_devolucion(pedido["ID_Venta"])
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("entregados", self.detalle(respuesta).lower())

    def test_no_se_puede_devolver_el_pedido_de_otro(self):
        id_venta = self.pedido_entregado()
        respuesta = self.post(
            "/devoluciones/", self.otro_cliente, self.cuerpo_devolucion(id_venta)
        )
        self.assertEqual(respuesta.status_code, 403)

    def test_no_se_puede_pedir_dos_veces_por_el_mismo_pedido(self):
        id_venta = self.pedido_entregado()
        self.afirmar_ok(
            self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)), 201
        )
        respuesta = self.post(
            "/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("activa", self.detalle(respuesta).lower())

    def test_no_se_puede_devolver_un_producto_que_no_se_compro(self):
        id_venta = self.pedido_entregado()
        respuesta = self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(
            id_venta,
            productos=[{"ID_Producto": ID_TORTA, "Cantidad": 1, "PrecioUnitario": 10000}],
        ))
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("no pertenece", self.detalle(respuesta).lower())

    def test_no_se_pueden_devolver_mas_unidades_de_las_compradas(self):
        id_venta = self.pedido_entregado()
        respuesta = self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(
            id_venta,
            productos=[{"ID_Producto": ID_TOSTON, "Cantidad": 5, "PrecioUnitario": 10000}],
        ))
        self.assertEqual(respuesta.status_code, 400)

    def test_pasado_el_plazo_ya_no_se_puede_pedir(self):
        id_venta = self.pedido_entregado()
        venta = self.venta(id_venta)
        venta.Fecha_entrega = datetime.now() - timedelta(hours=40)
        self.db.commit()

        respuesta = self.post(
            "/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("plazo", self.detalle(respuesta).lower())

    def test_aprobarla_le_devuelve_el_saldo_al_cliente(self):
        id_venta = self.pedido_entregado()
        devolucion = self.afirmar_ok(
            self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)), 201
        )
        self.afirmar_ok(self.patch(
            f"/devoluciones/{devolucion['ID_Devolucion']}/resolver", self.admin,
            {"Estado": DEV_APROBADA, "Comentario": "Procede"},
        ))
        self.assertEqual(self.saldo(), Decimal("10000"))

    def test_rechazarla_no_le_devuelve_nada(self):
        id_venta = self.pedido_entregado()
        devolucion = self.afirmar_ok(
            self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)), 201
        )
        self.afirmar_ok(self.patch(
            f"/devoluciones/{devolucion['ID_Devolucion']}/resolver", self.admin,
            {"Estado": DEV_RECHAZADA, "Comentario": "No procede"},
        ))
        self.assertEqual(self.saldo(), Decimal("0"))

    def test_el_cliente_ve_sus_devoluciones_y_no_las_ajenas(self):
        id_venta = self.pedido_entregado()
        self.afirmar_ok(
            self.post("/devoluciones/", self.cliente, self.cuerpo_devolucion(id_venta)), 201
        )
        cuerpo = self.afirmar_ok(self.get("/devoluciones/mis-devoluciones", self.cliente))
        self.assertEqual(cuerpo["total"], 1)

        ajenas = self.afirmar_ok(
            self.get("/devoluciones/mis-devoluciones", self.otro_cliente)
        )
        self.assertEqual(ajenas["total"], 0)

    def test_el_precio_de_la_devolucion_lo_pone_el_servidor(self):
        """El cliente no puede declarar cuánto vale lo que devuelve.

        `PrecioUnitario` llega en el cuerpo y termina en `TotalDevuelto`, que al
        aprobarse se abona como saldo a favor. Si el servidor lo acepta tal
        cual, un pedido de $20.000 puede pedir la devolución de un millón.
        """
        id_venta = self.pedido_entregado()
        cuerpo = self.afirmar_ok(self.post(
            "/devoluciones/", self.cliente, self.cuerpo_devolucion(
                id_venta,
                productos=[
                    {"ID_Producto": ID_TOSTON, "Cantidad": 1,
                     "PrecioUnitario": 1000000}
                ],
            )), 201)
        self.assertEqual(
            Decimal(cuerpo["TotalDevuelto"]), PRECIO,
            "el cliente fijó el monto a devolver",
        )
        self.assertEqual(Decimal(cuerpo["productos"][0]["PrecioUnitario"]), PRECIO)

        # Y aprobarla abona el precio real, no el declarado.
        self.afirmar_ok(self.patch(
            f"/devoluciones/{cuerpo['ID_Devolucion']}/resolver", self.admin,
            {"Estado": DEV_APROBADA},
        ))
        self.assertEqual(self.saldo(), PRECIO)

    def test_no_se_devuelve_mas_de_lo_que_se_facturó(self):
        """Tope contra una subida de precios posterior a la compra.

        El precio del catálogo es el de hoy y el pedido pudo comprarse con
        otro; sin el tope, devolver saldría ganancia.
        """
        id_venta = self.pedido_entregado()
        from src.shared.services.models import Producto
        producto = self.db.query(Producto).filter(
            Producto.ID_Producto == ID_TOSTON
        ).first()
        producto.Precio_venta = PRECIO * 10
        self.db.commit()

        cuerpo = self.afirmar_ok(self.post(
            "/devoluciones/", self.cliente, self.cuerpo_devolucion(
                id_venta,
                productos=[{"ID_Producto": ID_TOSTON, "Cantidad": 2,
                            "PrecioUnitario": 100000}],
            )), 201)
        # Se pagó $20.000 por las dos unidades: no se devuelve más que eso.
        self.assertEqual(Decimal(cuerpo["TotalDevuelto"]), Decimal("20000"))


# ══════════════════════════════════════════════════════════════════════════
# 7. Cancelar: lo que hay que devolver y lo que hay que cerrar
# ══════════════════════════════════════════════════════════════════════════
class CancelarTests(PanelBase):
    """Un pedido cancelado tiene que dejar todo como estaba.

    Es el recorrido donde más cosas quedan a medias: el saldo que el cliente
    puso, el stock que se le reservó, la orden de producción que se abrió y
    los insumos que esa orden ya gastó.
    """

    def domicilio_en_curso(self, **kw):
        pedido = self.crear_pedido(domicilio=self.direccion(), **kw)
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_LISTO}
        ))
        dom = self.domicilio(id_venta)
        self.afirmar_ok(self.patch(
            f"/domicilios/{dom.ID_Domicilio}/repartidor", self.admin,
            {"ID_Empleado": ID_REPARTIDOR},
        ))
        return id_venta, dom.ID_Domicilio

    def test_cancelar_desde_el_panel_de_reparto_devuelve_el_saldo(self):
        """El mismo pedido cancelado por el otro camino sí lo devolvía.

        El módulo de domicilios escribía el estado de la venta a mano, saltando
        toda la devolución: al cliente le cancelaban el pedido y perdía la
        plata que había puesto.
        """
        self.dar_saldo(15000)
        id_venta, id_dom = self.domicilio_en_curso(
            usar_credito=True, credito_monto=15000,
        )
        self.assertEqual(self.saldo(), Decimal("0"))

        self.afirmar_ok(self.patch(
            f"/domicilios/{id_dom}/estado", self.repartidor, {"Estado": DOM_CANCELADO}
        ))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CANCELADO)
        self.assertEqual(self.domicilio(id_venta).Estado, DOM_CANCELADO)
        self.assertEqual(self.saldo(), Decimal("15000"))

    def test_cancelar_desde_gestion_cierra_el_domicilio(self):
        id_venta, _ = self.domicilio_en_curso()
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.domicilio(id_venta).Estado, DOM_CANCELADO)

    def test_cancelar_cierra_la_orden_de_produccion_del_pedido(self):
        """Si no, el panel de producción queda con trabajo de un pedido muerto."""
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.orden(id_venta).Estado, ORDEN_PENDIENTE)

        # Ya no lo cancela el cliente: en producción la decisión es de la
        # panadería.
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.orden(id_venta).Estado, ORDEN_CANCELADA)

    def test_cancelar_con_la_orden_ya_empezada_devuelve_los_insumos(self):
        """La harina ya estaba en la masa contable: hay que devolverla."""
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        id_orden = self.orden(id_venta).ID_Orden_Produccion
        self.afirmar_ok(self.patch(
            f"/ordenes-produccion/{id_orden}/estado", self.admin,
            {"Estado": ORDEN_EN_PROCESO},
        ))
        gastado = GRAMOS_POR_TORTA * (6 - STOCK_TORTA)
        self.assertAlmostEqual(self.harina(), STOCK_HARINA - gastado, places=3)

        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.orden(id_venta).Estado, ORDEN_CANCELADA)
        self.assertAlmostEqual(self.harina(), STOCK_HARINA, places=3)

    def test_lo_ya_horneado_se_queda_en_el_stock(self):
        """Las tortas existen: no se tiran porque el cliente se arrepienta."""
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.hornear(id_venta)
        self.assertEqual(self.stock(ID_TORTA), 6 - STOCK_TORTA)

        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        # Vuelven también las 2 que se habían reservado de la vitrina.
        self.assertEqual(self.stock(ID_TORTA), 6)

    def test_un_pedido_entregado_ya_no_se_cancela(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        self.cobrar_en_tienda(id_venta)
        self.afirmar_ok(self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_ENTREGADO}
        ))
        respuesta = self.patch(f"/pedidos/{id_venta}/cancelar", self.admin)
        self.assertEqual(respuesta.status_code, 404)

    def test_el_anticipo_no_se_devuelve_solo(self):
        """Qué pasa con esa plata lo acuerdan el cliente y el administrador.

        El sistema no toma esa decisión: no le abona el anticipo a nadie por su
        cuenta, ni antes ni después de hornear.
        """
        for producido in (False, True):
            with self.subTest(ya_producido=producido):
                self.setUp()
                pedido = self.pedido_con_faltante()
                id_venta = pedido["ID_Venta"]
                self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
                if producido:
                    self.hornear(id_venta)

                self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
                self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CANCELADO)
                self.assertEqual(self.saldo(), Decimal("0"))

    def test_el_saldo_a_favor_del_cliente_si_vuelve(self):
        """Es plata suya que puso en el pedido y nunca llegó a gastarse.

        No es el anticipo: es el saldo que ya tenía en la casa y que aplicó al
        pagar. Sigue volviendo aunque el pedido lleve anticipo.
        """
        self.dar_saldo(60000)
        pedido = self.pedido_con_faltante(usar_credito=True, credito_monto=60000)
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.saldo(), Decimal("0"))

        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.saldo(), Decimal("60000"))

    def test_el_cliente_solo_cancela_mientras_este_pendiente(self):
        """Aceptado el pedido, la cancelación la decide la panadería."""
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))

        respuesta = self.patch(f"/pedidos/{id_venta}/cancelar-mi-pedido", self.cliente)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("preparación", self.detalle(respuesta).lower())
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CONFIRMADO)

    def test_el_cliente_tampoco_cancela_lo_que_ya_esta_en_produccion(self):
        pedido = self.pedido_con_faltante()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_EN_PRODUCCION)

        respuesta = self.patch(f"/pedidos/{id_venta}/cancelar-mi-pedido", self.cliente)
        self.assertEqual(respuesta.status_code, 400)

    def test_la_panaderia_si_puede_cancelar_lo_que_ya_acepto(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_CANCELADO)

    def test_no_se_cancela_dos_veces(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/cancelar", self.admin))
        respuesta = self.patch(f"/pedidos/{id_venta}/cancelar", self.admin)
        self.assertEqual(respuesta.status_code, 404)


# ══════════════════════════════════════════════════════════════════════════
# 8. La máquina de estados y los accesos
# ══════════════════════════════════════════════════════════════════════════
class EstadosYAccesosTests(PanelBase):

    def test_un_pedido_pendiente_no_salta_pasos(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado, nombre in ((PEDIDO_ENTREGADO, "entregado"),
                               (PEDIDO_LISTO, "listo"),
                               (PEDIDO_EN_CAMINO, "en camino")):
            with self.subTest(destino=nombre):
                respuesta = self.patch(
                    f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
                )
                self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(self.venta(id_venta).Estado, PEDIDO_PENDIENTE)

    def test_un_pedido_para_recoger_no_sale_en_camino(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        for estado in (PEDIDO_CONFIRMADO, PEDIDO_LISTO):
            self.afirmar_ok(self.patch(
                f"/ventas/{id_venta}/estado", self.admin, {"Estado": estado}
            ))
        respuesta = self.patch(
            f"/ventas/{id_venta}/estado", self.admin, {"Estado": PEDIDO_EN_CAMINO}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_confirmar_dos_veces_no_descuenta_el_stock_dos_veces(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.patch(f"/pedidos/{id_venta}/confirmar", self.admin))
        self.patch(f"/pedidos/{id_venta}/confirmar", self.admin)
        self.assertEqual(self.stock(ID_TOSTON), STOCK_TOSTON - 2)

    def test_el_repartidor_no_entra_a_los_otros_modulos(self):
        for ruta in ("/pedidos/", "/ventas/", "/devoluciones/", "/ordenes-produccion/"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.get(ruta, self.repartidor).status_code, 403)

    def test_sin_token_no_se_entra_a_ningun_panel(self):
        for ruta in ("/pedidos/", "/domicilios/", "/ventas/mis-ventas"):
            with self.subTest(ruta=ruta):
                self.assertEqual(self.get(ruta, {}).status_code, 401)

    def test_una_cuenta_desactivada_no_entra(self):
        from src.shared.services.models import Usuario
        usuario = self.db.query(Usuario).filter(
            Usuario.ID_Usuario == ID_CLIENTE
        ).first()
        usuario.Estado = 2
        self.db.commit()
        respuesta = self.get("/ventas/mis-ventas", self.cliente)
        self.assertEqual(respuesta.status_code, 401)

    def test_el_listado_de_repartidores_alimenta_el_selector(self):
        cuerpo = self.afirmar_ok(self.get("/domicilios/repartidores", self.admin))
        ids = {r["id"] for r in cuerpo}
        self.assertEqual(ids, {ID_REPARTIDOR, ID_OTRO_REPARTIDOR})


# ══════════════════════════════════════════════════════════════════════════
# 9. Editar un pedido desde el panel
# ══════════════════════════════════════════════════════════════════════════
class EditarPedidoTests(PanelBase):
    """Cambiar el tipo de entrega tiene que mover el total y armar el domicilio."""

    def test_pasar_a_domicilio_cobra_el_envio(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, {
            "Domicilio": True,
            "Direccion_Entrega": "Cra 50 #1-2",
            "Municipio_entrega": "Envigado",
            "Departamento_entrega": "Antioquia",
        }))
        self.assertEqual(
            Decimal(str(self.venta(id_venta).Total)), Decimal("20000") + COSTO_DOMICILIO
        )

    def test_el_domicilio_agregado_nace_con_un_estado_valido(self):
        """Se creaba con el estado 1, que es "Pendiente" de un PEDIDO.

        No es un estado válido de domicilio, así que el panel lo listaba sin
        etiqueta.
        """
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, {
            "Domicilio": True,
            "Direccion_Entrega": "Cra 50 #1-2",
            "Municipio_entrega": "Envigado",
            "Departamento_entrega": "Antioquia",
        }))
        self.assertEqual(self.domicilio(id_venta).Estado, DOM_PENDIENTE)

        listado = self.afirmar_ok(self.get("/domicilios/", self.admin))
        self.assertEqual(listado["domicilios"][0]["estado_label"], "Pendiente")

    def test_quitar_el_domicilio_devuelve_el_envio(self):
        pedido = self.crear_pedido(domicilio=self.direccion())
        id_venta = pedido["ID_Venta"]
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, {"Domicilio": False}))
        self.assertEqual(Decimal(str(self.venta(id_venta).Total)), Decimal("20000"))
        self.assertIsNone(self.domicilio(id_venta))

    def test_guardar_dos_veces_no_cobra_el_envio_dos_veces(self):
        pedido = self.crear_pedido()
        id_venta = pedido["ID_Venta"]
        cuerpo = {
            "Domicilio": True,
            "Direccion_Entrega": "Cra 50 #1-2",
            "Municipio_entrega": "Envigado",
            "Departamento_entrega": "Antioquia",
        }
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, cuerpo))
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, cuerpo))
        self.assertEqual(
            Decimal(str(self.venta(id_venta).Total)), Decimal("20000") + COSTO_DOMICILIO
        )

    def test_editar_sin_tocar_la_entrega_no_mueve_el_total(self):
        pedido = self.crear_pedido(domicilio=self.direccion())
        id_venta = pedido["ID_Venta"]
        antes = Decimal(str(self.venta(id_venta).Total))
        self.afirmar_ok(self.put(f"/pedidos/{id_venta}", self.admin, {
            "Metodo_Pago": "Transferencia",
        }))
        self.assertEqual(Decimal(str(self.venta(id_venta).Total)), antes)


# ══════════════════════════════════════════════════════════════════════════
# 10. El día del repartidor: resumen e historial
# ══════════════════════════════════════════════════════════════════════════
class DiaDelRepartidorTests(PanelBase):
    """Lo que el panel del domiciliario le dice que hizo hoy.

    El caso que lo destapó: el repartidor entregó dos pedidos, uno de ellos de
    un pedido que había entrado ayer. El resumen decía 2 entregas y el
    historial le mostraba 1, en la misma pantalla. El rango de fechas se medía
    contra `Fecha_asignacion`, que pese al nombre es la fecha en que se CREÓ el
    domicilio: nadie la toca al asignarle repartidor.
    """

    def test_el_historial_de_hoy_trae_lo_entregado_hoy(self):
        de_ayer = self.entrega_del_repartidor(creado_hace=1, entregado_hace=0)
        de_hoy  = self.entrega_del_repartidor(creado_hace=0, entregado_hace=0)
        self.entrega_del_repartidor(creado_hace=5, entregado_hace=5)

        desde, hasta = self.rango_de_hoy()
        cuerpo = self.afirmar_ok(self.get(
            f"/domicilios/?por_pagina=100&id_empleado={ID_REPARTIDOR}"
            f"&fecha_inicio={desde}&fecha_fin={hasta}", self.repartidor
        ))
        entregados = [d["ID_Domicilio"] for d in cuerpo["domicilios"]
                      if d["estado_label"] == "Entregado"]
        self.assertEqual(sorted(entregados), sorted([de_ayer, de_hoy]))

    def test_el_resumen_y_el_historial_dicen_lo_mismo(self):
        self.entrega_del_repartidor(creado_hace=1, entregado_hace=0)
        self.entrega_del_repartidor(creado_hace=0, entregado_hace=0)
        self.entrega_del_repartidor(creado_hace=3, entregado_hace=3)

        resumen = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        desde, hasta = self.rango_de_hoy()
        cuerpo = self.afirmar_ok(self.get(
            f"/domicilios/?por_pagina=100&id_empleado={ID_REPARTIDOR}"
            f"&fecha_inicio={desde}&fecha_fin={hasta}", self.repartidor
        ))
        entregados = [d for d in cuerpo["domicilios"] if d["estado_label"] == "Entregado"]
        self.assertEqual(resumen["entregados_hoy"], len(entregados))

    def test_lo_que_sigue_abierto_cuenta_por_el_dia_en_que_entro(self):
        """Sin fecha de entrega, el domicilio pertenece al día en que se creó."""
        abierto_hoy = self.entrega_del_repartidor(creado_hace=0, entregado=False)
        self.entrega_del_repartidor(creado_hace=4, entregado=False)

        desde, hasta = self.rango_de_hoy()
        cuerpo = self.afirmar_ok(self.get(
            f"/domicilios/?por_pagina=100&id_empleado={ID_REPARTIDOR}"
            f"&fecha_inicio={desde}&fecha_fin={hasta}", self.repartidor
        ))
        self.assertEqual(
            [d["ID_Domicilio"] for d in cuerpo["domicilios"]], [abierto_hoy]
        )

    def test_el_total_del_dia_son_pesos_y_no_un_conteo(self):
        """Contaba los domicilios CREADOS hoy bajo una etiqueta que promete plata."""
        self.entrega_del_repartidor(creado_hace=1, entregado_hace=0)
        self.entrega_del_repartidor(creado_hace=0, entregado_hace=0)

        resumen = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        # Dos pedidos de $20.000 + $5.000 de envío.
        esperado = float((Decimal("20000") + COSTO_DOMICILIO) * 2)
        self.assertEqual(resumen["entregados_hoy"], 2)
        self.assertEqual(resumen["total_hoy"], esperado)

    def test_el_efectivo_del_dia_es_solo_lo_que_recibio_en_mano(self):
        # Efectivo: entra completo.
        self.entrega_del_repartidor(creado_hace=0, entregado_hace=0)
        # Transferencia: no pasó por sus manos.
        self.entrega_del_repartidor(
            creado_hace=0, entregado_hace=0, estado_pago="pagado_completo",
            Metodo_Pago="Transferencia",
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )

        resumen = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        self.assertEqual(resumen["total_hoy"], float((Decimal("20000") + COSTO_DOMICILIO) * 2))
        self.assertEqual(resumen["efectivo_hoy"], float(Decimal("20000") + COSTO_DOMICILIO))

    def test_del_mixto_solo_cuenta_la_parte_en_efectivo(self):
        self.entrega_del_repartidor(
            creado_hace=0, entregado_hace=0, estado_pago="pagado_completo",
            Metodo_Pago="Mixto", pago_efectivo_monto=9000,
            comprobante_pago="https://cloudinary.test/comp.jpg",
        )
        resumen = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        self.assertEqual(resumen["efectivo_hoy"], 9000.0)

    def test_lo_que_no_se_pudo_cobrar_no_le_cuenta_como_recogido(self):
        self.entrega_del_repartidor(
            creado_hace=0, entregado_hace=0, estado_pago="no_recibido",
        )
        resumen = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        self.assertEqual(resumen["entregados_hoy"], 1)
        self.assertEqual(resumen["efectivo_hoy"], 0.0)

    def test_el_resumen_es_de_cada_repartidor(self):
        self.entrega_del_repartidor(creado_hace=0, entregado_hace=0)
        self.entrega_del_repartidor(
            creado_hace=0, entregado_hace=0, quien=ID_OTRO_REPARTIDOR,
        )

        mio = self.afirmar_ok(self.get("/domicilios/resumen", self.repartidor))
        self.assertEqual(mio["entregados_hoy"], 1)
        del_otro = self.afirmar_ok(self.get("/domicilios/resumen", self.otro_repartidor))
        self.assertEqual(del_otro["entregados_hoy"], 1)

    def test_el_listado_llega_ordenado_por_lo_ultimo_que_paso(self):
        viejo = self.entrega_del_repartidor(creado_hace=9, entregado_hace=9)
        reciente = self.entrega_del_repartidor(creado_hace=9, entregado_hace=0)

        cuerpo = self.afirmar_ok(self.get(
            f"/domicilios/?por_pagina=100&id_empleado={ID_REPARTIDOR}", self.repartidor
        ))
        ids = [d["ID_Domicilio"] for d in cuerpo["domicilios"]]
        self.assertEqual(ids.index(reciente), 0)
        self.assertLess(ids.index(reciente), ids.index(viejo))


if __name__ == "__main__":
    unittest.main(verbosity=2)
