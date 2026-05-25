import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
  CartesianGrid, Legend,
} from "recharts";
import "./dashboard.css";
import { getPedidos } from "../../services/pedidosService";

const PERIODOS      = ["hoy", "semana", "mes"];
const PERIODO_LABEL = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" };

const HORAS_LABELS = ["8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm"];
const HORAS_NUM    = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const DIAS_LABELS  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

/* ── Helpers de tiempo ────────────────────────────────── */
const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const startOfMonday = (ref = startOfToday()) => {
  const d = new Date(ref);
  const day = d.getDay(); // 0=Dom
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
};

const filtrarHoy = (lista) => {
  const hoy = startOfToday();
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= hoy);
};
const filtrarAyer = (lista) => {
  const hoy = startOfToday();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= ayer && new Date(p.fecha_pedido) < hoy);
};
const filtrarSemana = (lista) => {
  const ini = startOfMonday();
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= ini);
};
const filtrarSemanaAnterior = (lista) => {
  const ini = startOfMonday();
  const iniAnt = new Date(ini); iniAnt.setDate(ini.getDate() - 7);
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= iniAnt && new Date(p.fecha_pedido) < ini);
};
const filtrarMes = (lista) => {
  const hoy = startOfToday();
  const ini = new Date(hoy); ini.setDate(hoy.getDate() - 30);
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= ini);
};
const filtrarMesAnterior = (lista) => {
  const hoy = startOfToday();
  const ini = new Date(hoy); ini.setDate(hoy.getDate() - 30);
  const iniAnt = new Date(hoy); iniAnt.setDate(hoy.getDate() - 60);
  return lista.filter(p => p.fecha_pedido && new Date(p.fecha_pedido) >= iniAnt && new Date(p.fecha_pedido) < ini);
};

const filtrarPorPeriodo = (lista, periodo) => {
  if (periodo === "hoy")   return filtrarHoy(lista);
  if (periodo === "semana") return filtrarSemana(lista);
  if (periodo === "mes")    return filtrarMes(lista);
  return lista;
};
const filtrarPeriodoAnterior = (lista, periodo) => {
  if (periodo === "hoy")   return filtrarAyer(lista);
  if (periodo === "semana") return filtrarSemanaAnterior(lista);
  if (periodo === "mes")    return filtrarMesAnterior(lista);
  return [];
};

const pctDelta = (cur, prev) => {
  if (prev === 0 && cur === 0) return { delta: "0%", positive: true };
  if (prev === 0) return { delta: "+100%", positive: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { delta: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
};

const clienteKey = (p) => p.cliente?.correo || p.cliente?.nombre || p.cliente?.telefono || "?";

/* ── Custom Tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#424242" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.fill || p.color || p.stroke || "#43a047", fontWeight: 600 }}>
          {p.name}: {prefix === "$"
            ? `$${(p.value || 0).toLocaleString("es-CO")}`
            : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── Period Selector ────────────────────────────────────── */
function PeriodSelect({ value, onChange }) {
  return (
    <div className="period-select-wrap">
      <select className="period-select" value={value} onChange={e => onChange(e.target.value)}>
        {PERIODOS.map(p => <option key={p} value={p}>{PERIODO_LABEL[p]}</option>)}
      </select>
      <span className="period-arrow">▼</span>
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────── */
function KpiCard({ icon, label, valor, delta, positive, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color + "20", color }}>{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <p className="kpi-valor">{valor}</p>
      </div>
      <span className={"kpi-delta" + (positive ? " kpi-delta--up" : " kpi-delta--down")}>
        {positive ? "↑" : "↓"} {delta}
      </span>
    </div>
  );
}

/* ── Chart Card desplegable ─────────────────────────────── */
function ChartCard({ title, period, onPeriod, children, defaultOpen = true, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`chart-card${open ? " chart-card--open" : ""} ${className}`.trim()}>
      <div className="chart-card__header" onClick={() => setOpen(v => !v)}>
        <h3 className="chart-card__title">{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onPeriod && (
            <div onClick={e => e.stopPropagation()}>
              <PeriodSelect value={period} onChange={onPeriod} />
            </div>
          )}
          <div className="chart-card__chevron">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const [allPedidos, setAllPedidos] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [animated,   setAnimated]   = useState(false);
  const [pVentas,    setPVentas]    = useState("hoy");
  const [pPedidos,   setPPedidos]   = useState("hoy");
  const [pTiempo,    setPTiempo]    = useState("hoy");
  const [pKpi,       setPKpi]       = useState("hoy");

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    getPedidos({ porPagina: 100 })
      .then(res => setAllPedidos(res.pedidos || []))
      .catch(() => setAllPedidos([]))
      .finally(() => setLoading(false));
  }, []);

  /* ── Flujo de Pedidos (Bar Chart) ── */
  const getVentasData = () => {
    const filtered = filtrarPorPeriodo(allPedidos, pVentas);
    if (pVentas === "hoy") {
      return HORAS_NUM.map((h, i) => ({
        hora: HORAS_LABELS[i],
        ventas: filtered.filter(p => new Date(p.fecha_pedido).getHours() === h).length,
      }));
    }
    if (pVentas === "semana") {
      return DIAS_LABELS.map((d, i) => ({
        hora: d,
        ventas: filtered.filter(p => {
          const day = new Date(p.fecha_pedido).getDay();
          return (day === 0 ? 6 : day - 1) === i;
        }).length,
      }));
    }
    // mes → semanas del mes
    return ["Sem 1","Sem 2","Sem 3","Sem 4"].map((label, i) => ({
      hora: label,
      ventas: filtered.filter(p => Math.floor((new Date(p.fecha_pedido).getDate() - 1) / 7) === i).length,
    }));
  };

  /* ── Top Productos (Pie Chart) ── */
  const getPedidosPorProducto = () => {
    const filtered = filtrarPorPeriodo(allPedidos, pPedidos);
    const conteo = {};
    filtered.forEach(ped => {
      (ped.productosItems || []).forEach(item => {
        conteo[item.nombre] = (conteo[item.nombre] || 0) + (item.cantidad || 1);
      });
    });
    const colors = ["#43a047","#ef5350","#fb8c00","#5c6bc0","#26c6da","#ec407a","#7e57c2"];
    return Object.entries(conteo)
      .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  /* ── Ventas en el Tiempo (Area Chart) ── */
  const getTiempoData = () => {
    if (pTiempo === "hoy") {
      const hoy   = filtrarHoy(allPedidos);
      const ayer  = filtrarAyer(allPedidos);
      return HORAS_NUM.map((h, i) => ({
        t:        HORAS_LABELS[i],
        actual:   hoy.filter(p  => new Date(p.fecha_pedido).getHours() === h).length,
        anterior: ayer.filter(p => new Date(p.fecha_pedido).getHours() === h).length,
      }));
    }
    // semana
    const estaSemana  = filtrarSemana(allPedidos);
    const semanaAnt   = filtrarSemanaAnterior(allPedidos);
    return DIAS_LABELS.map((d, i) => {
      const dayFilter = (lista) => lista.filter(p => {
        const day = new Date(p.fecha_pedido).getDay();
        return (day === 0 ? 6 : day - 1) === i;
      }).length;
      return { t: d, actual: dayFilter(estaSemana), anterior: dayFilter(semanaAnt) };
    });
  };

  /* ── KPIs ── */
  const calculateKPI = (periodo) => {
    const current  = filtrarPorPeriodo(allPedidos, periodo);
    const previous = filtrarPeriodoAnterior(allPedidos, periodo);

    const totalVentas   = current.reduce((s, p) => s + (p.total || 0), 0);
    const totalPedidos  = current.length;
    const uniqueClients = new Set(current.map(clienteKey)).size;
    const ticket        = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    const prevVentas    = previous.reduce((s, p) => s + (p.total || 0), 0);
    const prevPedidos   = previous.length;
    const prevClients   = new Set(previous.map(clienteKey)).size;
    const prevTicket    = prevPedidos > 0 ? prevVentas / prevPedidos : 0;

    return {
      ventas:   { valor: `$${totalVentas.toLocaleString("es-CO")}`,        ...pctDelta(totalVentas,  prevVentas)  },
      pedidos:  { valor: totalPedidos.toString(),                           ...pctDelta(totalPedidos, prevPedidos) },
      clientes: { valor: uniqueClients.toString(),                          ...pctDelta(uniqueClients,prevClients) },
      ticket:   { valor: `$${Math.round(ticket).toLocaleString("es-CO")}`, ...pctDelta(ticket,       prevTicket)  },
    };
  };

  const ventasData   = getVentasData();
  const pedidosData  = getPedidosPorProducto();
  const totalUds     = pedidosData.reduce((s, p) => s + p.value, 0);
  const tiempoData   = getTiempoData();
  const kpi          = calculateKPI(pKpi);

  if (loading) {
    return (
      <div className="dash-wrapper dash-wrapper--in">
        <div className="dash-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <span style={{ color: "#9e9e9e", fontSize: 14 }}>Cargando datos…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`dash-wrapper${animated ? " dash-wrapper--in" : ""}`}>
      <div className="dash-inner">

        <div className="kpi-strip" style={{ marginBottom: 20 }}>
          <KpiStripInner kpi={kpi} pKpi={pKpi} setPKpi={setPKpi} />
        </div>

        <div className="charts-row" style={{ animationDelay: "0.1s" }}>

          <ChartCard title="Flujo de Pedidos" period={pVentas} onPeriod={setPVentas}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ventasData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43a047" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f8f1" }} />
                <Bar dataKey="ventas" name="Pedidos" fill="url(#barGradient)" radius={[6,6,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Productos" period={pPedidos} onPeriod={setPPedidos}>
            {pedidosData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#bdbdbd", fontSize: 13 }}>
                Sin pedidos en este período
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={pedidosData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                      dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {pedidosData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} uds (${Math.round(v / (totalUds || 1) * 100)}%)`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {pedidosData.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#424242", flex: 1, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>
                        {Math.round(p.value / (totalUds || 1) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="charts-row charts-row--bottom">

          <ChartCard title="Ingresos Reales" className="chart-card--stat">
            <div className="stat-big">
              <div className="stat-amount">{kpi.ventas.valor}</div>
              <div className={"stat-change" + (kpi.ventas.positive ? " stat-change--up" : " stat-change--down")}>
                <span>{kpi.ventas.positive ? "↑" : "↓"}</span> {kpi.ventas.delta} vs período anterior
              </div>
            </div>
            {pedidosData.length > 0 && (
              <div className="stat-badges">
                {pedidosData.slice(0, 3).map((p, i) => (
                  <div key={i} className="stat-badge">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span>{p.name}</span>
                    <strong>{p.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Pedidos en el Tiempo" period={pTiempo} onPeriod={setPTiempo}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={tiempoData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#43a047" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#43a047" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#fb8c00" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#fb8c00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Area type="monotone" dataKey="actual"   name="Actual"   stroke="#43a047" strokeWidth={2.5} fill="url(#colorActual)"   />
                <Area type="monotone" dataKey="anterior" name="Anterior" stroke="#fb8c00" strokeWidth={2}   fill="url(#colorAnterior)" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}

function KpiStripInner({ kpi, pKpi, setPKpi }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`kpi-strip-inner${open ? " kpi-strip-inner--open" : ""}`}>
      <div className="kpi-strip__top" onClick={() => setOpen(v => !v)} style={{ cursor: "pointer" }}>
        <span className="kpi-strip__label">Resumen general</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={e => e.stopPropagation()}>
            <PeriodSelect value={pKpi} onChange={setPKpi} />
          </div>
          <div className="chart-card__chevron" style={{ width: 28, height: 28 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <div className="kpi-strip__body">
        <div className="kpi-grid">
          <KpiCard icon="💰" label="Total ventas"    valor={kpi.ventas.valor}   delta={kpi.ventas.delta}   positive={kpi.ventas.positive}   color="#2e7d32" />
          <KpiCard icon="📦" label="Pedidos"         valor={kpi.pedidos.valor}  delta={kpi.pedidos.delta}  positive={kpi.pedidos.positive}  color="#fb8c00" />
          <KpiCard icon="👤" label="Clientes"        valor={kpi.clientes.valor} delta={kpi.clientes.delta} positive={kpi.clientes.positive} color="#5c6bc0" />
          <KpiCard icon="🎫" label="Ticket promedio" valor={kpi.ticket.valor}   delta={kpi.ticket.delta}   positive={kpi.ticket.positive}   color="#26c6da" />
        </div>
      </div>
    </div>
  );
}
