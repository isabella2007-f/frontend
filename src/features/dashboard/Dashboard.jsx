import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import "./dashboard.css";

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
  { t: "8am", actual: 12, anterior: 8,  meta: 20 },
  { t: "9am", actual: 28, anterior: 15, meta: 25 },
  { t: "10am",actual: 19, anterior: 22, meta: 25 },
  { t: "11am",actual: 35, anterior: 28, meta: 30 },
  { t: "12pm",actual: 47, anterior: 31, meta: 35 },
  { t: "1pm", actual: 31, anterior: 26, meta: 35 },
  { t: "2pm", actual: 22, anterior: 18, meta: 30 },
  { t: "3pm", actual: 38, anterior: 29, meta: 30 },
];
const TIEMPO_SEMANA = [
  { t: "Lun", actual: 120, anterior: 95,  meta: 150 },
  { t: "Mar", actual: 185, anterior: 140, meta: 150 },
  { t: "Mié", actual: 97,  anterior: 110, meta: 150 },
  { t: "Jue", actual: 210, anterior: 160, meta: 200 },
  { t: "Vie", actual: 260, anterior: 195, meta: 200 },
  { t: "Sáb", actual: 340, anterior: 280, meta: 300 },
  { t: "Dom", actual: 180, anterior: 150, meta: 200 },
];

/* ── KPI data by period ──────────────────────────────────── */
const KPI = {
  hoy: {
    ventas:   { valor: "$485.000", delta: "+12%", positive: true },
    pedidos:  { valor: "100",      delta: "+8%",  positive: true },
    clientes: { valor: "38",       delta: "+5%",  positive: true },
    ticket:   { valor: "$4.850",   delta: "-2%",  positive: false },
  },
  semana: {
    ventas:   { valor: "$3.210.000", delta: "+18%", positive: true },
    pedidos:  { valor: "730",        delta: "+11%", positive: true },
    clientes: { valor: "142",        delta: "+9%",  positive: true },
    ticket:   { valor: "$4.397",     delta: "+3%",  positive: true },
  },
  mes: {
    ventas:   { valor: "$12.450.000", delta: "+24%", positive: true },
    pedidos:  { valor: "2.840",       delta: "+19%", positive: true },
    clientes: { valor: "510",         delta: "+14%", positive: true },
    ticket:   { valor: "$4.384",      delta: "+2%",  positive: true },
  },
};

const PERIODOS = ["hoy", "semana", "mes"];
const PERIODO_LABEL = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes" };

/* ── Custom Tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label, prefix = "$" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10,
      padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 13,
    }}>
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

/* ── Chart Card ─────────────────────────────────────────── */
function ChartCard({ title, period, onPeriod, children }) {
  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3 className="chart-card__title">{title}</h3>
        <PeriodSelect value={period} onChange={onPeriod} />
      </div>
      {children}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const [pVentas,  setPVentas]  = useState("hoy");
  const [pPedidos, setPPedidos] = useState("hoy");
  const [pTiempo,  setPTiempo]  = useState("hoy");
  const [pKpi,     setPKpi]     = useState("hoy");
  const [animated, setAnimated] = useState(false);

  useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

  const ventasData  = pVentas  === "hoy" ? VENTAS_HOY  : pVentas  === "semana" ? VENTAS_SEMANA  : VENTAS_MES;
  const pedidosData = pPedidos === "hoy" ? PEDIDOS_HOY : PEDIDOS_SEMANA;
  const tiempoData  = pTiempo  === "hoy" ? TIEMPO_HOY  : TIEMPO_SEMANA;
  const kpi         = KPI[pKpi];

  const totalPedidos = pedidosData.reduce((s, p) => s + p.value, 0);

  return (
    <div className={"dash-wrapper" + (animated ? " dash-wrapper--in" : "")}>

      {/* Header */}
      <div className="dash-header">
        <h1 className="dash-title">DashBoard</h1>
        <div className="dash-title-line" />
      </div>

      <div className="dash-inner">

        {/* KPI strip */}
        <div className="kpi-strip">
          <div className="kpi-strip__top">
            <span className="kpi-strip__label">Resumen general</span>
            <PeriodSelect value={pKpi} onChange={setPKpi} />
          </div>
          <div className="kpi-grid">
            <KpiCard icon="💰" label="Total ventas"   valor={kpi.ventas.valor}   delta={kpi.ventas.delta}   positive={kpi.ventas.positive}   color="#2e7d32" />
            <KpiCard icon="📦" label="Pedidos"        valor={kpi.pedidos.valor}  delta={kpi.pedidos.delta}  positive={kpi.pedidos.positive}  color="#fb8c00" />
            <KpiCard icon="👤" label="Clientes"       valor={kpi.clientes.valor} delta={kpi.clientes.delta} positive={kpi.clientes.positive} color="#5c6bc0" />
            <KpiCard icon="🎫" label="Ticket promedio"valor={kpi.ticket.valor}   delta={kpi.ticket.delta}   positive={kpi.ticket.positive}   color="#26c6da" />
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="charts-row">

          {/* Total ventas — Bar */}
          <ChartCard title="Total ventas" period={pVentas} onPeriod={setPVentas}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ventasData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip prefix="" />} cursor={{ fill: "#f1f8f1" }} />
                <Bar dataKey="ventas" name="Ventas" fill="#43a047" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Pedidos vs Producto — Pie */}
          <ChartCard title="Pedidos vs Producto" period={pPedidos} onPeriod={setPPedidos}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={pedidosData} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pedidosData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} pedidos (${Math.round(v/totalPedidos*100)}%)`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {pedidosData.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#424242", flex: 1, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>
                      {Math.round(p.value / totalPedidos * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="charts-row charts-row--bottom">

          {/* Total ventas $ — single stat */}
          <div className="chart-card chart-card--stat">
            <div className="chart-card__header">
              <h3 className="chart-card__title">Total ventas</h3>
            </div>
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
          </div>

          {/* Ventas en el tiempo — Line */}
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
                <Line type="monotone" dataKey="meta"     name="Meta"     stroke="#5c6bc0" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}