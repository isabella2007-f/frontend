import { apiFetch } from "../utils/api";

const adaptCompra = (c) => ({
  id:           c.ID_Compra        || c.id,
  idProveedor:  c.ID_Proveedor     || c.id_proveedor   || null,
  proveedor:    c.nombre_proveedor || c.proveedor       || "",
  metodoPago:   c.Metodo_Pago      || c.metodo_pago     || "",
  total:        c.Total            || c.total           || 0,
  estado:       (() => {
    const raw = c.Estado ?? c.estado;
    if (typeof raw === "string") return raw.toLowerCase();
    const m = { 1: "pendiente", 2: "completada", 3: "anulada" };
    return m[raw] || "pendiente";
  })(),
  fecha:        c.Fecha_Compra     || c.fecha_compra    || c.fecha || "",
  notas:        c.Notas            || c.notas           || "",
  stockAplicado:true, // el backend aplica stock al crear
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
  const body = {
    ID_Proveedor: Number(payload.idProveedor),
    Metodo_Pago:  payload.metodoPago,
    Notas:        payload.notas || null,
    items: (payload.items || []).map(i => ({
      ID_Insumo:  Number(i.idInsumo),
      Cantidad:   Number(i.cantidad),
      Precio_Und: Number(i.precioUnd),
    })),
  };
  const data = await apiFetch("/compras/", { method: "POST", body: JSON.stringify(body) });
  return adaptCompra(data);
}
