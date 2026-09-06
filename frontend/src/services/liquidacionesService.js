import { apiFetch } from "../utils/api";

const BASE = "/liquidaciones";

// ── Helpers ───────────────────────────────────────────────────────────────────

function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Empleados ─────────────────────────────────────────────────────────────────

export async function getEmpleadosParaLiquidaciones() {
  return apiFetch(`${BASE}/empleados`);
}

// ── Tarifas ───────────────────────────────────────────────────────────────────

export async function listarTarifas(idEmpleado = null) {
  return apiFetch(`${BASE}/tarifas${qs({ id_empleado: idEmpleado })}`);
}

export async function crearTarifa({ idEmpleado, tarifaHora, fechaInicio }) {
  return apiFetch(`${BASE}/tarifas`, {
    method: "POST",
    body: JSON.stringify({
      ID_Empleado:  idEmpleado,
      Tarifa_Hora:  tarifaHora,
      Fecha_Inicio: fechaInicio,
    }),
  });
}

// ── Registros de horas ────────────────────────────────────────────────────────

export async function listarRegistros({ pagina = 1, porPagina = 20, idEmpleado, estado, fechaInicio, fechaFin } = {}) {
  return apiFetch(`${BASE}/registros${qs({
    pagina, por_pagina: porPagina,
    id_empleado: idEmpleado,
    estado, fecha_inicio: fechaInicio, fecha_fin: fechaFin,
  })}`);
}

export async function crearRegistro({ idEmpleado, idOrdenProduccion, idDomicilio, fecha, horaInicio, horaFin }) {
  return apiFetch(`${BASE}/registros`, {
    method: "POST",
    body: JSON.stringify({
      ID_Empleado:         idEmpleado,
      ID_Orden_Produccion: idOrdenProduccion || null,
      ID_Domicilio:        idDomicilio || null,
      Fecha:               fecha,
      Hora_Inicio:         horaInicio,
      Hora_Fin:            horaFin,
    }),
  });
}

export async function eliminarRegistro(idRegistro) {
  return apiFetch(`${BASE}/registros/${idRegistro}`, { method: "DELETE" });
}

// ── Liquidaciones ─────────────────────────────────────────────────────────────

export async function listarLiquidaciones({ pagina = 1, porPagina = 20, idEmpleado, estado, fechaInicio, fechaFin, busqueda } = {}) {
  return apiFetch(`${BASE}/${qs({
    pagina, por_pagina: porPagina,
    id_empleado: idEmpleado,
    estado, fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    busqueda,
  })}`);
}

export async function generarLiquidacion({ idEmpleado, fechaInicio, fechaFin }) {
  return apiFetch(`${BASE}/`, {
    method: "POST",
    body: JSON.stringify({
      ID_Empleado:  idEmpleado,
      Fecha_Inicio: fechaInicio,
      Fecha_Fin:    fechaFin,
    }),
  });
}

export async function obtenerLiquidacion(idLiquidacion) {
  return apiFetch(`${BASE}/${idLiquidacion}`);
}

export async function editarLiquidacion(idLiquidacion, { registrosAgregar = [], registrosQuitar = [] }) {
  return apiFetch(`${BASE}/${idLiquidacion}`, {
    method: "PUT",
    body: JSON.stringify({
      registros_agregar: registrosAgregar,
      registros_quitar:  registrosQuitar,
    }),
  });
}

export async function pagarLiquidacion(idLiquidacion, { metodoPago, referenciaPago, fechaPago, observacionesPago }) {
  return apiFetch(`${BASE}/${idLiquidacion}/pagar`, {
    method: "POST",
    body: JSON.stringify({
      Metodo_Pago:        metodoPago,
      Referencia_Pago:    referenciaPago,
      Fecha_Pago:         fechaPago,
      Observaciones_Pago: observacionesPago || null,
    }),
  });
}

export async function anularLiquidacion(idLiquidacion, { motivoAnulacion }) {
  return apiFetch(`${BASE}/${idLiquidacion}/anular`, {
    method: "POST",
    body: JSON.stringify({ Motivo_Anulacion: motivoAnulacion }),
  });
}
