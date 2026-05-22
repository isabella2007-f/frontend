import { apiFetch } from "../utils/api";

const adaptDomicilio = (d) => {
  const cli = d.cliente || d.Cliente || {};
  return {
    id:                d.ID_Domicilio       || d.id,
    numero:            d.Numero_Pedido      || d.numero_pedido      || d.numero      || `DOM-${d.ID_Domicilio || d.id}`,
    estado:            d.Estado             || d.estado             || "Pendiente",
    idEmpleado:        d.ID_Empleado        || d.id_empleado        || null,
    direccion_entrega: d.Direccion_Entrega  || d.direccion_entrega  || "",
    obs_domicilio:     d.Observaciones      || d.obs_domicilio      || "",
    fecha_pedido:      d.Fecha_Pedido       || d.fecha_pedido       || "",
    fecha_entrega_real:d.Fecha_Entrega_Real || d.fecha_entrega_real || null,
    total:             d.Total              || d.total              || 0,
    domicilio:         true,
    cliente: {
      nombre:   cli.Nombre   || cli.nombre   || "",
      correo:   cli.Correo   || cli.correo   || "",
      telefono: cli.Telefono || cli.telefono || "",
    },
  };
};

export const getDomicilios = async ({ pagina = 1, porPagina = 100, estado = "" } = {}) => {
  const q = estado ? `&estado=${encodeURIComponent(estado)}` : "";
  const data = await apiFetch(`/domicilios/?pagina=${pagina}&por_pagina=${porPagina}${q}`);
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

export const cambiarEstadoDomicilio = async (id, estado) => {
  return apiFetch(`/domicilios/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estado }),
  });
};

export const actualizarDomicilio = async (id, data) => {
  return apiFetch(`/domicilios/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};
