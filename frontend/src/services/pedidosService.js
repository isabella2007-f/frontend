import { apiFetch } from "../utils/api";

const adaptPedido = (p) => {
  const cli = p.cliente || p.Cliente || {};
  return {
    id:               p.ID_Venta        || p.id,
    numero:           p.Numero_Pedido   || p.numero_pedido   || p.numero   || `V-${p.ID_Venta || p.id}`,
    estado:           p.Estado          || p.estado          || "Pendiente",
    metodo_pago:      p.Metodo_Pago     || p.metodo_pago     || "",
    domicilio:        !!(p.Domicilio    ?? p.domicilio),
    direccion_entrega:p.Direccion_Entrega || p.direccion_entrega || "",
    subtotal:         p.Subtotal        || p.subtotal        || 0,
    descuento:        p.Descuento       || p.descuento       || 0,
    total:            p.Total           || p.total           || 0,
    notas:            p.Notas           || p.notas           || "",
    fecha_pedido:     p.Fecha_Pedido    || p.fecha_pedido    || "",
    idEmpleado:       p.ID_Empleado     || p.id_empleado     || null,
    orden_produccion: !!(p.Orden_Produccion ?? p.orden_produccion),
    comprobante:      !!(p.Comprobante  ?? p.comprobante),
    cliente: {
      nombre:   cli.Nombre   || cli.nombre   || "",
      correo:   cli.Correo   || cli.correo   || "",
      telefono: cli.Telefono || cli.telefono || "",
    },
    productosItems: (p.productos || p.Productos || []).map(i => ({
      idProducto: i.ID_Producto || i.id_producto,
      nombre:     i.Nombre     || i.nombre     || "",
      precio:     i.Precio_venta || i.precio   || 0,
      cantidad:   i.Cantidad   || i.cantidad   || 0,
    })),
  };
};

export const getPedidos = async ({ pagina = 1, porPagina = 100 } = {}) => {
  const data = await apiFetch(`/pedidos/?pagina=${pagina}&por_pagina=${porPagina}`);
  return {
    total:     data.total,
    pagina:    data.pagina,
    por_pagina:data.por_pagina,
    pedidos:   (data.pedidos || []).map(adaptPedido),
  };
};

export const getPedido = async (id) => {
  const data = await apiFetch(`/pedidos/${id}`);
  return adaptPedido(data);
};

export const confirmarPedido = async (id) => {
  return apiFetch(`/pedidos/${id}/confirmar`, { method: "PATCH" });
};

export const cancelarPedido = async (id) => {
  return apiFetch(`/pedidos/${id}/cancelar`, { method: "PATCH" });
};
