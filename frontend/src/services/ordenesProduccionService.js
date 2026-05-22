import { apiFetch } from "../utils/api";

function adaptarOrden(o) {
  return {
    id:             o.ID_Orden_Produccion,
    idProducto:     o.ID_Producto,
    nombreProducto: o.nombre_producto,
    idInsumo:       o.ID_Insumo,
    nombreInsumo:   o.nombre_insumo,
    idFicha:        o.ID_Ficha,
    versionFicha:   o.version_ficha,
    cantidad:       o.Cantidad,
    fechaInicio:    o.Fecha_inicio,
    fechaEntrega:   o.Fecha_Entrega,
    estado:         o.estado_label,
    costo:          parseFloat(o.Costo ?? 0),
  };
}

export async function getOrdenes({ pagina = 1, porPagina = 100, busqueda = "" } = {}) {
  const params = new URLSearchParams({ pagina, por_pagina: porPagina });
  if (busqueda) params.append("busqueda", busqueda);
  const data = await apiFetch(`/ordenes-produccion/?${params}`);
  return (data.ordenes || []).map(adaptarOrden);
}

export async function crearOrden(data) {
  return apiFetch("/ordenes-produccion/", { method: "POST", body: JSON.stringify(data) });
}

export async function editarOrden(id, data) {
  return apiFetch(`/ordenes-produccion/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function eliminarOrden(id) {
  return apiFetch(`/ordenes-produccion/${id}`, { method: "DELETE" });
}

export async function cambiarEstadoOrden(id, estadoNum) {
  return apiFetch(`/ordenes-produccion/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estadoNum }),
  });
}
