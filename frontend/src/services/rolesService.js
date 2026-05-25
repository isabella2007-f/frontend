import { apiFetch } from "../utils/api";

// Cache populated by adaptarRol — avoids calling GET /permisos/ which returns 405
const _permisosMap = {};

function adaptarRol(r) {
  const isUrl = typeof r.Icono === "string" && r.Icono.startsWith("http");
  (r.permisos || []).forEach(p => {
    const clave = p.Clave || p.clave;
    const intId = p.ID_Permiso || p.id_permiso || p.ID;
    if (clave && intId != null) _permisosMap[clave] = Number(intId);
  });
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

export async function gestionarPermisos(id, clavas) {
  const permisos_ids = clavas
    .map(c => _permisosMap[c])
    .filter(n => n != null && !isNaN(n));
  return apiFetch(`/roles/${id}/permisos`, {
    method: "PUT",
    body: JSON.stringify({ permisos_ids }),
  });
}
