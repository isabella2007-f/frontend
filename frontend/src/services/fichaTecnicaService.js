import { apiFetch } from "../utils/api";

const adaptFicha = (f) => ({
  id:            f.ID_Ficha          || f.id,
  producto:      f.Nombre_Producto   || f.nombre_producto   || f.producto    || "",
  productoId:    String(f.ID_Producto|| f.id_producto       || ""),
  categoria:     f.Categoria         || f.categoria         || "",
  version:       f.Version           || f.version           || "v1.0",
  estado:        f.Estado === 1      || f.estado === true,
  fecha:         f.Fecha             || f.fecha             || "",
  fotoPreview:   f.Foto              || f.foto              || null,
  procedimiento: f.Procedimiento     || f.procedimiento     || "",
  observaciones: f.Observaciones     || f.observaciones     || "",
  insumos: (f.insumos || f.Insumos || []).map(i => ({
    id:          i.ID_Insumo         || i.id                || Date.now() + Math.random(),
    idInsumo:    i.ID_Insumo         || i.id,
    idCategoria: String(i.ID_Categoria || i.id_categoria    || ""),
    nombre:      i.Nombre            || i.nombre            || "",
    cantidad:    String(i.Cantidad   || i.cantidad          || ""),
    unidad:      i.Unidad            || i.unidad            || "",
  })),
});

export const getFichas = async () => {
  const data = await apiFetch("/fichas_tecnicas/?por_pagina=100");
  return (data.fichas || data.items || []).map(adaptFicha);
};

export const getFicha = async (id) => {
  const data = await apiFetch(`/fichas_tecnicas/${id}`);
  return adaptFicha(data);
};

const buildBody = (payload) => ({
  Nombre_Producto: payload.producto,
  Fecha:           payload.fecha,
  Procedimiento:   payload.procedimiento,
  Observaciones:   payload.observaciones || "",
  insumos: (payload.insumos || [])
    .filter(i => i.idInsumo && i.cantidad)
    .map(i => ({
      ID_Insumo: Number(i.idInsumo),
      Cantidad:  Number(i.cantidad),
      Unidad:    i.unidad,
    })),
});

export const crearFicha = async (payload) => {
  const data = await apiFetch("/fichas_tecnicas/", {
    method: "POST",
    body: JSON.stringify(buildBody(payload)),
  });
  return adaptFicha(data);
};

export const editarFicha = async (id, payload) => {
  return apiFetch(`/fichas_tecnicas/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildBody(payload)),
  });
};

export const eliminarFicha = async (id) => {
  return apiFetch(`/fichas_tecnicas/${id}`, { method: "DELETE" });
};

export const toggleEstadoFicha = async (id, estadoActual) => {
  return apiFetch(`/fichas_tecnicas/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ Estado: estadoActual ? 0 : 1 }),
  });
};
