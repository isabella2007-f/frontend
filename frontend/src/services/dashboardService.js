import { apiFetch } from "../utils/api";

const COLORS = ["#43a047","#ef5350","#fb8c00","#5c6bc0","#26c6da","#ec407a","#7e57c2"];

const adaptDashboard = (data) => {
  const r = data.resumen;

  const fmtPct = (pct, subiendo) => {
    const sign = subiendo ? "+" : "";
    return `${sign}${Math.abs(pct ?? 0).toFixed(1)}%`;
  };

  return {
    periodo: data.periodo,
    kpi: {
      ventas:   { valor: `$${Math.round(Number(r.total_ventas.valor)).toLocaleString("es-CO")}`,   delta: fmtPct(r.total_ventas.variacion_pct,    r.total_ventas.subiendo),    positive: r.total_ventas.subiendo    },
      pedidos:  { valor: String(Math.round(Number(r.total_pedidos.valor))),                         delta: fmtPct(r.total_pedidos.variacion_pct,   r.total_pedidos.subiendo),   positive: r.total_pedidos.subiendo   },
      clientes: { valor: String(Math.round(Number(r.total_clientes.valor))),                        delta: fmtPct(r.total_clientes.variacion_pct,  r.total_clientes.subiendo),  positive: r.total_clientes.subiendo  },
      ticket:   { valor: `$${Math.round(Number(r.ticket_promedio.valor)).toLocaleString("es-CO")}`, delta: fmtPct(r.ticket_promedio.variacion_pct, r.ticket_promedio.subiendo), positive: r.ticket_promedio.subiendo },
    },
    graficaVentas: (data.grafica_ventas || []).map(p => ({
      etiqueta: p.etiqueta,
      actual:   Number(p.actual   ?? 0),
      anterior: Number(p.anterior ?? 0),
    })),
    productosTop: (data.productos_top || []).map((p, i) => ({
      name:       p.nombre,
      value:      p.cantidad,
      porcentaje: p.porcentaje,
      color:      COLORS[i % COLORS.length],
    })),
  };
};

export const getDashboard = async (periodo = "hoy") => {
  const data = await apiFetch(`/dashboard/?periodo=${periodo}`);
  return adaptDashboard(data);
};
