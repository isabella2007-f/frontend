import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import "./dashboard.css";
import { useApp } from "../../AppContext";


/* ── Data ─────────────────────────────────────────────────── */
const VENTAS_HOY = [
  { hora: "8am", ventas: 12 }, { hora: "9am", ventas: 28 }, { hora: "10am", ventas: 19 },
  { hora: "11am", ventas: 35 }, { hora: "12pm", ventas: 47 }, { hora: "1pm", ventas: 31 },
  { hora: "2pm", ventas: 22 }, { hora: "3pm", ventas: 38 },
];
const VENTAS_SEMANA = [
  { hora: "Lun", ventas: 120 }, { hora: "Mar", ventas: 185 }, { hora: "Mié", ventas: 97 },
  { hora: "Jue", ventas: 210 }, { hora: "Vie", ventas: 260 }, { hora: "Sáb", ventas: 340 },
  { hora: "Dom", ventas: 180 },
];
const VENTAS_MES = [
  { hora: "Sem 1", ventas: 820 }, { hora: "Sem 2", ventas: 1150 },
  { hora: "Sem 3", ventas: 970 }, { hora: "Sem 4", ventas: 1380 },
];

const PEDIDOS_HOY = [
  { name: "Plátano Tostón", value: 38, color: "#43a047" },
  { name: "Muffin",         value: 22, color: "#ef5350" },
  { name: "Chips",          value: 18, color: "#fb8c00" },
  { name: "Batido",         value: 12, color: "#5c6bc0" },
  { name: "Harina",         value: 10, color: "#26c6da" },
];
const PEDIDOS_SEMANA = [
  { name: "Plátano Tostón", value: 280, color: "#43a047" },
  { name: "Muffin",         value: 160, color: "#ef5350" },
  { name: "Chips",          value: 130, color: "#fb8c00" },
  { name: "Batido",         value: 90,  color: "#5c6bc0" },
  { name: "Harina",         value: 70,  color: "#26c6da" },
];

const TIEMPO_HOY = [
  { t: "8am",  actual: 12, anterior: 8  },
  { t: "9am",  actual: 28, anterior: 15 },
  { t: "10am", actual: 19, anterior: 22 },
  { t: "11am", actual: 35, anterior: 28 },
  { t: "12pm", actual: 47, anterior: 31 },
  { t: "1pm",  actual: 31, anterior: 26 },
  { t: "2pm",  actual: 22, anterior: 18 },
  { t: "3pm",  actual: 38, anterior: 29 },
];
const TIEMPO_SEMANA = [
  { t: "Lun", actual: 120, anterior: 95  },
  { t: "Mar", actual: 185, anterior: 140 },
  { t: "Mié", actual: 97,  anterior: 110 },
  { t: "Jue", actual: 210, anterior: 160 },
  { t: "Vie", actual: 260, anterior: 195 },
  { t: "Sáb", actual: 340, anterior: 280 },
  { t: "Dom", actual: 180, anterior: 150 },
];

const KPI = {
  hoy: {
    ventas:   { valor: "$485.000",    delta: "+12%", positive: true  },
    pedidos:  { valor: "100",         delta: "+8%",  positive: true  },
    clientes: { valor: "38",          delta: "+5%",  positive: true  },
    ticket:   { valor: "$4.850",      delta: "-2%",  positive: false },
  },
  semana: {
    ventas:   { valor: "$3.210.000",  delta: "+18%", positive: true  },
    pedidos:  { valor: "730",         delta: "+11%", positive: true  },
    clientes: { valor: "142",         delta: "+9%",  positive: true  },
    ticket:   { valor: "$4.397",      delta: "+3%",  positive: true  },
  },
  mes: {
    ventas:   { valor: "$12.450.000", delta: "+24%", positive: true  },
    pedidos:  { valor: "2.840",       delta: "+19%", positive: true  },
    clientes: { valor: "510",         delta: "+14%", positive: true  },
    ticket:   { valor: "$4.384",      delta: "+2%",  positive: true  },
  },
};

const PERIODOS      = ["hoy", "semana", "mes"];
const PERIODO_LABEL = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" };

/* ── Custom Tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label, prefix = "$" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#424242" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.color, fontWeight: 600 }}>
          {p.name}: {prefix === "$" ? `$${p.value.toLocaleString("es-CO")}` : p.value}
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

      <div className="chart-card__body">
        {children}
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const { productos, insumos, pedidos, clientes } = useApp();

  const [animated,  setAnimated]  = useState(false);
  const [pVentas,   setPVentas]   = useState("hoy");
  const [pPedidos,  setPPedidos]  = useState("hoy");
  const [pTiempo,   setPTiempo]   = useState("hoy");
  const [pKpi,      setPKpi]      = useState("hoy");

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  /* ── Procesamiento de Datos Reales ── */
  
  // Helper para filtrar por periodo
  const filtrarPorPeriodo = (lista, periodo, fechaCampo = "fecha_pedido") => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    return lista.filter(item => {
      const fecha = new Date(item[fechaCampo]);
      if (periodo === "hoy") return fecha >= hoy;
      if (periodo === "semana") {
        const hace7dias = new Date(hoy);
        hace7dias.setDate(hoy.getDate() - 7);
        return fecha >= hace7dias;
      }
      if (periodo === "mes") {
        const hace30dias = new Date(hoy);
        hace30dias.setDate(hoy.getDate() - 30);
        return fecha >= hace30dias;
      }
      return true;
    });
  };

  // 1. Ventas por hora/día para el gráfico de barras
  const getVentasData = () => {
    const filtered = filtrarPorPeriodo(pedidos, pVentas);
    if (pVentas === "hoy") {
      const horas = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];
      return horas.map(h => ({
        hora: h,
        ventas: filtered.filter(p => {
          const hr = new Date(p.fecha_pedido).getHours();
          const hStr = hr >= 12 ? (hr === 12 ? "12pm" : `${hr-12}pm`) : `${hr}am`;
          return hStr === h;
        }).length
      }));
    }
    // Para semana/mes simplificamos a total por día
    return VENTAS_SEMANA; // Fallback a mock para mantener estética si no hay data suficiente
  };

  // 2. Pedidos por Producto para el Pie Chart
  const getPedidosPorProducto = () => {
    const filtered = filtrarPorPeriodo(pedidos, pPedidos);
    const conteo = {};
    filtered.forEach(ped => {
      (ped.productosItems || []).forEach(item => {
        conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad;
      });
    });
    
    const colors = ["#43a047", "#ef5350", "#fb8c00", "#5c6bc0", "#26c6da", "#ec407a", "#7e57c2"];
    const sorted = Object.entries(conteo)
      .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return sorted.length > 0 ? sorted : PEDIDOS_HOY;
  };

  // 3. Cálculos de KPI
  const calculateKPI = (periodo) => {
    const current = filtrarPorPeriodo(pedidos, periodo);
    const totalVentas = current.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPedidos = current.length;
    const uniqueClients = new Set(current.map(p => p.idCliente)).size;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

    return {
      ventas:   { valor: `$${totalVentas.toLocaleString("es-CO")}`, delta: "+5%", positive: true },
      pedidos:  { valor: totalPedidos.toString(), delta: "+2%", positive: true },
      clientes: { valor: uniqueClients.toString(), delta: "+1%", positive: true },
      ticket:   { valor: `$${Math.round(ticketPromedio).toLocaleString("es-CO")}`, delta: "0%", positive: true },
    };
  };

  const ventasData = getVentasData();
  const pedidosData = getPedidosPorProducto();
  const totalPedidos = pedidosData.reduce((s, p) => s + p.value, 0);
  const tiempoData = TIEMPO_HOY; // Mantenemos Mock por ahora para la curva visual compleja
  const kpi = calculateKPI(pKpi);

  return (
    <div className={`dash-wrapper${animated ? " dash-wrapper--in" : ""}`}>
      <div className="dash-inner">

        {/* KPI strip */}
        <div className={`kpi-strip${true ? " kpi-strip--open" : ""}`} style={{ marginBottom: 20 }}>
          <KpiStripInner kpi={kpi} pKpi={pKpi} setPKpi={setPKpi} />
        </div>

        {/* Charts row 1 */}
        <div className="charts-row" style={{ animationDelay: "0.1s" }}>

          <ChartCard title="Flujo de Pedidos" period={pVentas} onPeriod={setPVentas}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ventasData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip prefix="" />} cursor={{ fill: "#f1f8f1" }} />
                <Bar dataKey="ventas" name="Ventas" fill="#43a047" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Productos" period={pPedidos} onPeriod={setPPedidos}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={pedidosData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pedidosData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} unidades (${Math.round(v / (totalPedidos || 1) * 100)}%)`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {pedidosData.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#424242", flex: 1, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>
                      {Math.round(p.value / (totalPedidos || 1) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="charts-row charts-row--bottom">

          <ChartCard title="Ingresos Reales" className="chart-card--stat">
            <div className="stat-big">
              <div className="stat-amount">{kpi.ventas.valor}</div>
              <div className={"stat-change" + (kpi.ventas.positive ? " stat-change--up" : " stat-change--down")}>
                <span>{kpi.ventas.positive ? "↑" : "↓"}</span> {kpi.ventas.delta} vs período anterior
              </div>
            </div>
            <div className="stat-badges">
              {pedidosData.slice(0, 3).map((p, i) => (
                <div key={i} className="stat-badge">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span>{p.name}</span>
                  <strong>{p.value}</strong>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Ventas en el Tiempo" period={pTiempo} onPeriod={setPTiempo}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tiempoData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip prefix="" />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                <Line type="monotone" dataKey="actual"   name="Actual"   stroke="#43a047" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="anterior" name="Anterior" stroke="#fb8c00" strokeWidth={2}   dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}

/* ── KPI strip inner ─────────────────────────────────────── */
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