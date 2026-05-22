import { apiFetch } from "../utils/api";

function adaptarRol(r) {
  const isUrl = typeof r.Icono === "string" && r.Icono.startsWith("http");
  return {
    id:            r.ID_Rol,
    nombre:        r.Rol,
    icono:         isUrl ? "👤" : (r.Icono || "👤"),
    iconoPreview:  isUrl ? r.Icono : null,
    estado:        r.Estado === 1,
    totalUsuarios: r.total_usuarios ?? 0,
    esAdmin:       r.protegido ?? false,
    permisos:      r.permisos || [],
    fecha:         null,
  };
}

export async function getRoles({ busqueda = "" } = {}) {
  const params = new URLSearchParams({ por_pagina: 100 });
  if (busqueda) params.append("busqueda", busqueda);
  const data = await apiFetch(`/roles/?${params}`);
  return (data.roles || []).map(adaptarRol);
}

export async function crearRol(data) {
  return apiFetch("/roles/", { method: "POST", body: JSON.stringify(data) });
}

export async function editarRol(id, data) {
  return apiFetch(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function eliminarRol(id) {
  return apiFetch(`/roles/${id}`, { method: "DELETE" });
}

export async function toggleEstadoRol(id, estadoActual) {
  return apiFetch(`/roles/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estadoActual ? 2 : 1 }),
  });
}

export async function gestionarPermisos(id, permisosIds) {
  return apiFetch(`/roles/${id}/permisos`, {
    method: "PUT",
    body: JSON.stringify({ permisos_ids: permisosIds }),
  });
}
