import { apiFetch } from "../utils/api";

const ESTADO_DOM_MAP = {
  3:  "Pendiente",
  5:  "Cancelado",
  8:  "Entregado",
  9:  "En camino",
  10: "Asignado",
};

const adaptDomicilio = (d) => {
  const estadoRaw = d.estado_label || d.Estado || d.estado;
  const estado = typeof estadoRaw === "number"
    ? (ESTADO_DOM_MAP[estadoRaw] || "Pendiente")
    : (estadoRaw || "Pendiente");
  return {
    id:                d.ID_Domicilio,
    numero:            `DOM-${d.ID_Domicilio}`,
    estado,
    idEmpleado:        d.ID_Empleado        || null,
    nombre_repartidor: d.nombre_repartidor  || "",
    direccion_entrega: d.Direccion_entrega  || "",
    obs_domicilio:     d.Observaciones      || "",
    fecha_pedido:      d.Fecha_asignacion   || "",
    fecha_entrega_real:d.Fecha_entrega      || null,
    total:             d.total              || 0,
    domicilio:         true,
    cliente: {
      nombre:   d.nombre_cliente  || "",
      correo:   "",
      telefono: "",
    },
  };
};

export const getDomicilios = async ({ pagina = 1, porPagina = 100, estado = "", idEmpleado = null } = {}) => {
  const params = new URLSearchParams({ pagina, por_pagina: porPagina });
  if (estado)     params.append("estado",      encodeURIComponent(estado));
  if (idEmpleado) params.append("id_empleado", idEmpleado);
  const data = await apiFetch(`/domicilios/?${params}`);
  return {
    total:      data.total,
    pagina:     data.pagina,
    por_pagina: data.por_pagina,
    domicilios: (data.domicilios || []).map(adaptDomicilio),
  };
};

export const asignarRepartidor = async (id, idEmpleado) => {
  return apiFetch(`/domicilios/${id}/repartidor`, {
    method: "PATCH",
    body: JSON.stringify({ ID_Empleado: idEmpleado }),
  });
};

export const cambiarEstadoDomicilio = async (id, estado, observaciones = null) => {
  const body = { Estado: estado };
  if (observaciones !== null) body.Observaciones = observaciones;
  return apiFetch(`/domicilios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
};

export const actualizarDomicilio = async (id, data) => {
  return apiFetch(`/domicilios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};
