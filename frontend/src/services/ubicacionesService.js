import { apiFetch } from "../utils/api";

/**
 * Módulo Ubicaciones: jerarquía Departamento → Ciudad → Barrio y ofertas de
 * domicilio. Única capa que habla con /api/ubicaciones (ninguna vista llama a
 * apiFetch directamente).
 *
 * El precio del domicilio SALE del barrio (Barrios.Precio + ofertas del día) y
 * se congela como snapshot en el pedido. La constante COSTO_DOMICILIO = 5000
 * fue eliminada del backend.
 */

const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── Checkout / cliente: solo lo disponible para domicilio ──────────────────
//
// Depto/Ciudad/Barrio del checkout casi no cambian dentro de una sesión, y el
// backend gratis (Render) arranca en frío: cada ida y vuelta de más se siente.
// Se cachean en memoria las LISTAS (no la cobertura, que decide el precio y el
// backend siempre revalida al confirmar). El caché muere al recargar la página.
let _cacheDeptosCheckout = null;
const _cacheCiudadesCheckout = new Map();
const _cacheBarriosCheckout = new Map();

/** Vacía los cachés del checkout (tras un cambio en el panel de Ubicaciones). */
export const invalidarCacheCheckout = () => {
  _cacheDeptosCheckout = null;
  _cacheCiudadesCheckout.clear();
  _cacheBarriosCheckout.clear();
};

export const getDepartamentosCheckout = () => {
  if (_cacheDeptosCheckout) return Promise.resolve(_cacheDeptosCheckout);
  return apiFetch("/ubicaciones/checkout/departamentos").then((d) => {
    _cacheDeptosCheckout = d;
    return d;
  });
};

export const getCiudadesCheckout = (idDepartamento) => {
  const key = String(idDepartamento);
  if (_cacheCiudadesCheckout.has(key)) return Promise.resolve(_cacheCiudadesCheckout.get(key));
  return apiFetch(`/ubicaciones/checkout/ciudades${qs({ id_departamento: idDepartamento })}`)
    .then((d) => { _cacheCiudadesCheckout.set(key, d); return d; });
};

export const getBarriosCheckout = ({ idCiudad, texto = null, pagina = 1, porPagina = 50 } = {}) => {
  const key = `${idCiudad}|${texto || ""}|${pagina}|${porPagina}`;
  if (_cacheBarriosCheckout.has(key)) return Promise.resolve(_cacheBarriosCheckout.get(key));
  return apiFetch(`/ubicaciones/checkout/barrios${qs({
    id_ciudad: idCiudad, texto, pagina, por_pagina: porPagina,
  })}`).then((d) => { _cacheBarriosCheckout.set(key, d); return d; });
};

/** Cobertura + precio del día (con ofertas) de un barrio. Nunca se cachea. */
export const getCobertura = (idBarrio) =>
  apiFetch(`/ubicaciones/checkout/cobertura/${idBarrio}`);

// ── Panel: jerarquía ──────────────────────────────────────────────────────

export const getResumen = () => apiFetch("/ubicaciones/resumen");

export const getDepartamentos = () => apiFetch("/ubicaciones/departamentos");

export const getCiudades = (idDepartamento = null) =>
  apiFetch(`/ubicaciones/ciudades${qs({ id_departamento: idDepartamento })}`);

export const getBarrios = ({
  pagina = 1, porPagina = 20, idCiudad = null, idDepartamento = null,
  texto = null, estadoEfectivo = null, esBase = null,
} = {}) =>
  apiFetch(`/ubicaciones/barrios${qs({
    pagina, por_pagina: porPagina, id_ciudad: idCiudad, id_departamento: idDepartamento,
    texto, estado_efectivo: estadoEfectivo,
    es_base: esBase === null ? null : (esBase ? "true" : "false"),
  })}`);

export const getBarrio = (idBarrio) => apiFetch(`/ubicaciones/barrios/${idBarrio}`);

// Toda mutación del panel puede cambiar lo que ve el checkout → limpia su caché.
const conInvalidacion = (promesa) =>
  promesa.then((r) => { invalidarCacheCheckout(); return r; });

export const crearBarrio = ({ ID_Ciudad, Nombre, Precio }) =>
  conInvalidacion(apiFetch("/ubicaciones/barrios", {
    method: "POST",
    body: JSON.stringify({ ID_Ciudad, Nombre, Precio }),
  }));

export const editarBarrio = (idBarrio, { Nombre, Precio } = {}) =>
  conInvalidacion(apiFetch(`/ubicaciones/barrios/${idBarrio}`, {
    method: "PUT",
    body: JSON.stringify({ Nombre, Precio }),
  }));

export const eliminarBarrio = (idBarrio) =>
  conInvalidacion(apiFetch(`/ubicaciones/barrios/${idBarrio}`, { method: "DELETE" }));

// ── Panel: estados (individual + masivo) ──────────────────────────────────

export const cambiarEstadoDepartamento = (id, estado) =>
  conInvalidacion(apiFetch(`/ubicaciones/departamentos/${id}/estado`, {
    method: "PATCH", body: JSON.stringify({ Estado: estado }),
  }));

export const cambiarEstadoCiudad = (id, estado) =>
  conInvalidacion(apiFetch(`/ubicaciones/ciudades/${id}/estado`, {
    method: "PATCH", body: JSON.stringify({ Estado: estado }),
  }));

export const cambiarEstadoBarrio = (id, estado) =>
  conInvalidacion(apiFetch(`/ubicaciones/barrios/${id}/estado`, {
    method: "PATCH", body: JSON.stringify({ Estado: estado }),
  }));

export const accionMasivaEstado = ({ nivel, idPadre = null, estado }) =>
  conInvalidacion(apiFetch("/ubicaciones/estado-masivo", {
    method: "POST",
    body: JSON.stringify({ nivel, id_padre: idPadre, Estado: estado }),
  }));

// ── Panel: ofertas de domicilio ──────────────────────────────────────────

const adaptOferta = (o) => ({
  id:          o.ID_Oferta,
  nombre:      o.Nombre,
  tipo:        o.Tipo,                       // 'descuento' | 'recargo'
  montoPesos:  o.Monto_Pesos ?? null,
  porcentaje:  o.Porcentaje ?? null,
  diasSemana:  o.Dias_Semana || [],
  diasMes:     o.Dias_Mes || [],
  estado:      o.Estado,
  fechaCreacion: o.Fecha_Creacion || null,
  barrios:     (o.barrios || []).map((b) => ({
    id: b.ID_Barrio, nombre: b.Nombre, ciudad: b.ciudad,
  })),
  ejemploCalculo: o.ejemplo_calculo || null,
});

export const getOfertas = ({ pagina = 1, porPagina = 20, texto = null, estado = null, tipo = null } = {}) =>
  apiFetch(`/ubicaciones/ofertas${qs({ pagina, por_pagina: porPagina, texto, estado, tipo })}`)
    .then((d) => ({
      total: d.total, pagina: d.pagina, por_pagina: d.por_pagina,
      ofertas: (d.ofertas || []).map(adaptOferta),
    }));

export const getOferta = (idOferta) =>
  apiFetch(`/ubicaciones/ofertas/${idOferta}`).then(adaptOferta);

export const crearOferta = (payload) =>
  apiFetch("/ubicaciones/ofertas", {
    method: "POST", body: JSON.stringify(payload),
  }).then(adaptOferta);

export const editarOferta = (idOferta, payload) =>
  apiFetch(`/ubicaciones/ofertas/${idOferta}`, {
    method: "PUT", body: JSON.stringify(payload),
  }).then(adaptOferta);

export const cambiarEstadoOferta = (idOferta, estado) =>
  apiFetch(`/ubicaciones/ofertas/${idOferta}/estado`, {
    method: "PATCH", body: JSON.stringify({ Estado: estado }),
  });

export const eliminarOferta = (idOferta) =>
  apiFetch(`/ubicaciones/ofertas/${idOferta}`, { method: "DELETE" });

// ── Etiquetas de días (compartidas por la UI) ────────────────────────────

export const DIAS_SEMANA = [
  { valor: 1, corto: "Lun", largo: "Lunes" },
  { valor: 2, corto: "Mar", largo: "Martes" },
  { valor: 3, corto: "Mié", largo: "Miércoles" },
  { valor: 4, corto: "Jue", largo: "Jueves" },
  { valor: 5, corto: "Vie", largo: "Viernes" },
  { valor: 6, corto: "Sáb", largo: "Sábado" },
  { valor: 7, corto: "Dom", largo: "Domingo" },
];
