import { apiFetch } from "../utils/api";

export async function getProveedores({ pagina = 1, porPagina = 100 } = {}) {
  return apiFetch(`/proveedores/?pagina=${pagina}&por_pagina=${porPagina}`);
}

export async function crearProveedor(data) {
  return apiFetch("/proveedores/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function editarProveedor(id, data) {
  return apiFetch(`/proveedores/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarProveedor(id) {
  return apiFetch(`/proveedores/${id}`, { method: "DELETE" });
}
