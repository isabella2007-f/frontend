import { apiFetch } from "../utils/api";

const adaptDevolucion = (d) => {
  const cli = d.cliente || d.Cliente || {};
  return {
    id:            d.ID_Devolucion    || d.id,
    numero:        d.Numero_Devolucion || d.numero_devolucion || d.numero || `DEV-${d.ID_Devolucion || d.id}`,
    numeroPedido:  d.Numero_Pedido    || d.numero_pedido    || d.numeroPedido    || "",
    idCliente:     d.ID_Cliente       || d.id_cliente       || null,
    estado:        d.Estado           || d.estado           || "Pendiente",
    motivo:        d.Motivo           || d.motivo           || "",
    comentario:    d.Comentario       || d.comentario       || "",
    fechaSolicitud:d.Fecha_Solicitud  || d.fecha_solicitud  || "",
    fechaAprobacion:d.Fecha_Aprobacion|| d.fecha_aprobacion || null,
    totalDevuelto: d.Total_Devuelto   || d.total_devuelto   || 0,
    motivoRechazo: d.Motivo_Rechazo   || d.motivo_rechazo   || "",
    cliente: {
      nombre:   cli.Nombre   || cli.nombre   || "",
      correo:   cli.Correo   || cli.correo   || "",
      telefono: cli.Telefono || cli.telefono || "",
    },
    productos: (d.productos || d.Productos || []).map(p => ({
      idProducto:    p.ID_Producto    || p.id_producto,
      nombre:        p.Nombre        || p.nombre        || "",
      cantidad:      p.Cantidad      || p.cantidad      || 0,
      precioUnitario:p.Precio_Unitario || p.precio_unitario || p.precio || 0,
      subtotal:      p.Subtotal      || p.subtotal      || 0,
    })),
    evidencia: d.evidencia || d.Evidencia || null,
  };
};

export const getDevoluciones = async ({ pagina = 1, porPagina = 100, estado = "" } = {}) => {
  const q = estado ? `&estado=${encodeURIComponent(estado)}` : "";
  const data = await apiFetch(`/devoluciones/?pagina=${pagina}&por_pagina=${porPagina}${q}`);
  return {
    total:       data.total,
    pagina:      data.pagina,
    por_pagina:  data.por_pagina,
    devoluciones:(data.devoluciones || []).map(adaptDevolucion),
  };
};

export const crearDevolucion = async (payload) => {
  const body = {
    ID_Venta:    payload.idPedido,
    Motivo:      payload.motivo,
    Comentario:  payload.comentario || "",
    productos:   (payload.productos || []).map(p => ({
      ID_Producto:    p.idProducto,
      Cantidad:       p.cantidad,
      Precio_Unitario:p.precioUnitario,
    })),
  };
  const data = await apiFetch("/devoluciones/", { method: "POST", body: JSON.stringify(body) });
  return adaptDevolucion(data);
};

export const resolverDevolucion = async (id, decision, motivoRechazo = "") => {
  const body = { decision };
  if (motivoRechazo) body.motivo_rechazo = motivoRechazo;
  return apiFetch(`/devoluciones/${id}/resolver`, { method: "PATCH", body: JSON.stringify(body) });
};
