import { apiFetch } from "../utils/api";

const adaptCompra = (c) => ({
  id:           c.ID_Compra        || c.id,
  idProveedor:  c.ID_Proveedor     || c.id_proveedor   || null,
  proveedor:    c.nombre_proveedor || c.proveedor       || "",
  metodoPago:   c.Metodo_Pago      || c.metodo_pago     || "",
  total:        c.Total_Pago       || c.Total           || c.total           || 0,
  estado:       (() => {
    const label = c.estado_label;
    if (label) {
      const m = { pendiente: "pendiente", confirmado: "completada", cancelado: "anulada", anulada: "anulada", completada: "completada" };
      return m[label.toLowerCase()] || "pendiente";
    }
    const raw = c.Estado ?? c.estado;
    if (typeof raw === "string") return raw.toLowerCase();
    const m = { 3: "pendiente", 4: "completada", 11: "completada", 5: "anulada", 12: "anulada" };
    return m[raw] || "pendiente";
  })(),
  fecha:        c.Fecha_Compra     || c.fecha_compra    || c.fecha || "",
  fecha_llegada: c.Fecha_Llegada  ? new Date(c.Fecha_Llegada).toISOString().split('T')[0] : null,
  notas:        c.Notas            || c.notas           || "",
  stockAplicado: [4, 11].includes(c.Estado ?? c.estado) || ["confirmado", "completada"].includes((c.estado_label || "").toLowerCase()),
  items: (c.items || c.detalles || []).map(i => ({
    idInsumo:   i.ID_Insumo    || i.id_insumo   || null,
    nombre:     i.nombre_insumo|| i.nombre      || "",
    cantidad:   i.Cantidad     || i.cantidad    || 0,
    precioUnd:  i.Precio_Und   || i.precio_und  || 0,
    subtotal:   i.Subtotal     || i.subtotal    || 0,
  })),
});

export async function getCompras({ pagina = 1, porPagina = 100, busqueda = "", idProveedor = null } = {}) {
  const params = new URLSearchParams({ pagina, por_pagina: porPagina });
  if (busqueda)    params.append("busqueda",     busqueda);
  if (idProveedor) params.append("id_proveedor", idProveedor);
  const data = await apiFetch(`/compras/?${params}`);
  return {
    total:   data.total,
    compras: (data.compras || []).map(adaptCompra),
  };
}

export async function getCompra(id) {
  const data = await apiFetch(`/compras/${id}`);
  return adaptCompra(data);
}

export async function crearCompra(payload) {
  // El backend valida contra {"Efectivo", "Transferencia", "Crédito", "Cheque"} (Primera letra mayúscula)
  const raw = payload.metodoPago || "";
  const metodoPago = raw.charAt(0).toUpperCase() + raw.slice(1);

  const body = {
    ID_Proveedor: Number(payload.idProveedor),
    Metodo_Pago:  metodoPago,
    Fecha_Compra: payload.fecha || null,
    detalles: (payload.detalles || []).map(i => ({
      ID_Insumo:         Number(i.idInsumo),
      Cantidad:          Number(i.cantidad),
      Precio_Und:        Number(i.precioUnd),
      Notas:             i.notas || null,
      Fecha_Vencimiento: i.fechaVencimiento || null,
    })),
  };
  const data = await apiFetch("/compras/", { method: "POST", body: JSON.stringify(body) });
  return adaptCompra(data);
}

export async function completarCompra(id, fecha = null) {
  const opts = { method: "PATCH" };
  if (fecha) opts.body = JSON.stringify({ Fecha_Llegada: fecha });
  const data = await apiFetch(`/compras/${id}/completar`, opts);
  return adaptCompra(data);
}

export async function anularCompra(id) {
  const data = await apiFetch(`/compras/${id}/anular`, { method: "PATCH" });
  return adaptCompra(data);
}
