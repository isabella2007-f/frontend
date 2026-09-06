import { apiFetch } from "../utils/api";

const COLORS = ["#43a047", "#ef5350", "#fb8c00", "#5c6bc0", "#26c6da", "#ec407a", "#7e57c2"];

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

const fmtDelta = (pct, subiendo) => {
  if (pct === null || pct === undefined) return null;
  const sign = subiendo ? "+" : "-";
  const abs = Math.abs(pct);
  // Por encima de 999% el número deja de aportar y desborda la tarjeta.
  if (abs > 999) return `${sign}999%`;
  return `${sign}${Math.round(abs * 100) / 100}%`;
};

const kpi = (t, { moneda = false } = {}) => {
  const raw = Number(t?.valor ?? 0);
  const pct = t?.variacion_pct;
  return {
    raw,
    valor: moneda ? money(raw) : String(Math.round(raw)),
    delta: fmtDelta(pct, t?.subiendo),
    positive: t?.subiendo ?? null,
    // Valor real del cambio (sin cap) para la tarjeta de Resumen general.
    deltaPct: pct === null || pct === undefined ? null : Number(pct),
    deltaSinBase: !!t?.sin_base,
  };
};

const adaptDetalle = (d) => {
  if (!d) return null;
  return {
    ventas: (d.ventas || []).map(v => ({
      idVenta:         v.ID_Venta,
      fecha:           v.fecha_venta || v.fecha_pedido || null,
      fechaPedido:     v.fecha_pedido || null,
      cliente:         v.cliente || "—",
      metodoPago:      v.metodo_pago || "—",
      estado:          v.estado,
      estadoId:        v.estado_id,
      total:           Number(v.total || 0),
      tieneDevolucion: !!v.tiene_devolucion,
      productos: (v.productos || []).map(p => ({
        nombre:         p.nombre,
        cantidad:       Number(p.cantidad || 0),
        precioUnitario: Number(p.precio_unitario || 0),
      })),
    })),
    clientesNuevos: (d.clientes_nuevos || []).map(c => ({
      nombre: c.nombre || "—",
      fecha:  c.fecha || null,
    })),
    productos: (d.productos || []).map(p => ({
      id:         p.ID_Producto,
      nombre:     p.nombre,
      cantidad:   Number(p.cantidad || 0),
      ingresos:   Number(p.ingresos || 0),
      porcentaje: Number(p.porcentaje || 0),
    })),
  };
};

const adaptDashboard = (data) => {
  const r = data?.resumen ?? {};
  return {
    periodo:       data?.periodo,
    granularidad:  data?.granularidad,
    rango:         data?.rango ?? null,
    periodoActual: data?.periodo_actual ?? { disponible: true, parcial: false, mensaje: null },
    comparacion:   data?.comparacion ?? { disponible: false, parcial: false, mensaje: null },
    kpis: {
      ventas:   kpi(r.total_ventas,    { moneda: true }),
      pedidos:  kpi(r.total_pedidos),
      clientes: kpi(r.total_clientes),
      ticket:   kpi(r.ticket_promedio, { moneda: true }),
    },
    flujo: (data?.flujo_ventas || []).map(p => ({ ...p })),
    ventasTiempo: (data?.ventas_tiempo || []).map(p => ({
      etiqueta: p.etiqueta,
      actual:   Number(p.actual ?? 0),
      anterior: p.anterior === null || p.anterior === undefined ? null : Number(p.anterior),
    })),
    productosTop: (data?.productos_top || []).map((p, i) => ({
      id:         p.ID_Producto,
      name:       p.nombre,
      value:      Number(p.cantidad || 0),
      porcentaje: Number(p.porcentaje || 0),
      color:      COLORS[i % COLORS.length],
    })),
    detalle: adaptDetalle(data?.detalle),
  };
};

const buildParams = (periodo, desde, hasta) => {
  const params = new URLSearchParams({ periodo });
  if (periodo === "custom" && desde && hasta) {
    params.set("fecha_inicio", desde);
    params.set("fecha_fin", hasta);
  }
  return params.toString();
};

export const getDashboard = async (periodo = "hoy", desde = "", hasta = "") => {
  const data = await apiFetch(`/dashboard/?${buildParams(periodo, desde, hasta)}`);
  return adaptDashboard(data);
};

export const getDashboardDetalle = async (periodo = "hoy", desde = "", hasta = "") => {
  const data = await apiFetch(`/dashboard/detalle?${buildParams(periodo, desde, hasta)}`);
  return adaptDetalle(data);
};
