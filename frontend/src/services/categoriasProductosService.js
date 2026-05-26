import { apiFetch } from "../utils/api";

export async function getCategorias({ pagina = 1, porPagina = 100 } = {}) {
  return apiFetch(`/categoria-productos/?pagina=${pagina}&por_pagina=${porPagina}`);
}

export async function crearCategoria(data) {
  return apiFetch("/categoria-productos/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function editarCategoria(id, data) {
  return apiFetch(`/categoria-productos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarCategoria(id) {
  return apiFetch(`/categoria-productos/${id}`, { method: "DELETE" });
}

export async function toggleEstadoCategoria(id, estadoActual) {
  return apiFetch(`/categoria-productos/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estadoActual ? 2 : 1 }),
  });
}
