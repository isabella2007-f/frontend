import { apiFetch } from "../utils/api";

const ESTADO_PEDIDO_MAP = {
  1:  "Pendiente",
  2:  "Confirmado",   // registros legacy (antes Estado=2 se usaba para confirmar)
  4:  "Confirmado",   // Estado correcto: ID=4 = Confirmado en tabla Estados
  5:  "Cancelado",    // Estado correcto: ID=5 = Cancelado en tabla Estados
  3:  "Cancelado",    // registros legacy
  8:  "Entregado",
  9:  "En camino",
  13: "En producción",
};

const adaptPedido = (p) => {
  const estado = ESTADO_PEDIDO_MAP[p.Estado] || p.estado_label || "Pendiente";
  return {
    id:               p.ID_Venta          || p.id,
    numero:           p.Numero_Pedido     || p.numero_pedido   || p.numero || `V-${p.ID_Venta || p.id}`,
    estado,
    metodo_pago:      p.Metodo_Pago       || p.metodo_pago     || "",
    domicilio:        !!(p.tiene_domicilio ?? p.Domicilio ?? p.domicilio),
    id_domicilio:     p.ID_Domicilio || null,
    direccion_entrega: p.direccion_entrega    || "",
    municipio:         p.municipio_entrega    || "",
    departamento:      p.departamento_entrega || "",
    subtotal:         p.subtotal_bruto    || p.Subtotal         || p.subtotal || 0,
    descuento:        p.credito_aplicado  || p.Descuento        || p.descuento || 0,
    total:            p.Total             || p.total            || 0,
    notas:            p.Notas             || p.notas            || "",
    fecha_pedido:     p.Fecha_pedido      || p.Fecha_Pedido     || p.fecha_pedido || "",
    idCliente:        p.ID_Usuario        || p.ID_Cliente       || p.id_cliente   || null,
    idEmpleado:          p.ID_Empleado          || p.id_empleado         || null,
    nombre_domiciliario: p.nombre_domiciliario  || null,
    orden_produccion: (p.ordenes_produccion_pendientes > 0) || !!(p.Orden_Produccion ?? p.orden_produccion),
    comprobante:      !!(p.Comprobante    ?? p.comprobante),
    cliente: {
      nombre:   p.nombre_cliente   || "",
      correo:   p.correo_cliente   || "",
      telefono: p.telefono_cliente || "",
    },
    productosItems: (p.productos || p.Productos || []).map(i => ({
      idProducto: i.ID_Producto    || i.id_producto,
      nombre:     i.nombre_producto || i.Nombre || i.nombre || "",
      precio:     i.precio_unitario || i.Precio_venta || i.precio || 0,
      cantidad:   i.Cantidad        || i.cantidad || 0,
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

export const crearPedido = async (data) => {
  return apiFetch("/ventas/", { method: "POST", body: JSON.stringify(data) });
};

export const editarPedido = async (id, data) => {
  return apiFetch(`/pedidos/${id}`, { method: "PUT", body: JSON.stringify(data) });
};

export const eliminarPedido = async (id) => {
  return apiFetch(`/pedidos/${id}`, { method: "DELETE" });
};

export const getMiCredito = async () => {
  return apiFetch("/ventas/mi-credito");
};

export const getMisVentas = async ({ pagina = 1, porPagina = 100 } = {}) => {
  const data = await apiFetch(`/ventas/mis-ventas?pagina=${pagina}&por_pagina=${porPagina}`);
  return {
    total:   data.total,
    pedidos: (data.pedidos || data.ventas || []).map(adaptPedido),
  };
};
