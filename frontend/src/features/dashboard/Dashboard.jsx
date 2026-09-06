import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import "./dashboard.css";
import { getDashboard, getDashboardDetalle } from "../../services/dashboardService";
import { AlertTriangle, Banknote, Package, User, Tag, Info } from "lucide-react";
import { fmtFecha } from "../../utils/dateUtils";
import { ESTADOS_FLUJO } from "./estados";
import { datasetsGlobales, exportarDatasets } from "./dashboardExport";
import DetalleModal from "./DetalleModal";
import ExportMenu from "./ExportMenu";

const PRESETS = [
  { key: "hoy",    label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "mes",    label: "Este mes" },
  { key: "custom", label: "Rango" },
];
const PRESET_LABEL = Object.fromEntries(PRESETS.map(p => [p.key, p.label]));

const hoyISO = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  periodo: "hoy", granularidad: "hora", rango: null,
  periodoActual: { disponible: true, parcial: false, mensaje: null },
  comparacion:   { disponible: false, parcial: false, mensaje: null },
  kpis: {
    ventas:   { raw: 0, valor: "$0", delta: null, positive: null, deltaPct: null, deltaSinBase: false },
    pedidos:  { raw: 0, valor: "0",  delta: null, positive: null, deltaPct: null, deltaSinBase: false },
    clientes: { raw: 0, valor: "0",  delta: null, positive: null, deltaPct: null, deltaSinBase: false },
    ticket:   { raw: 0, valor: "$0", delta: null, positive: null, deltaPct: null, deltaSinBase: false },
  },
  flujo: [], ventasTiempo: [], productosTop: [], detalle: null,
};

/* ── Custom Tooltip ─────────────────────────────────────── */
function CustomTooltip({ active, payload, label, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontSize: 13 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#424242" }}>{label}</p>
      {payload.filter(p => p.value).map((p, i) => (
        <p key={i} style={{ margin: "2px 0", color: p.fill || p.color || p.stroke || "#43a047", fontWeight: 600 }}>
          {p.name}: {prefix === "$" ? `$${(p.value || 0).toLocaleString("es-CO")}` : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── Porcentaje de cambio de la tarjeta de Resumen general ──
   La tarjeta capa a ±999% para no desbordar; el valor real (sin cap) va en el
   tooltip. Formato: número plano, máx. 2 decimales, sin ceros forzados. */
const TOPE_PCT = 999;

const fmtPctResumen = (pct, { cap = false } = {}) => {
  const signo = pct < 0 ? "-" : "+";
  const abs = Math.abs(pct);
  if (cap && abs > TOPE_PCT) return `${signo}${TOPE_PCT}%`;
  return `${signo}${Math.round(abs * 100) / 100}%`;
};

/* ── KPI Card ───────────────────────────────────────────── */
function KpiCard({ icon, label, valor, deltaPct, deltaSinBase, positive, color, comparar }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color + "20", color }}>{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <p className="kpi-valor">{valor}</p>
      </div>
      {comparar && deltaSinBase && (
        <span
          className="kpi-delta kpi-delta--none"
          data-tooltip="Sin periodo anterior con qué comparar: el cambio porcentual no se puede calcular."
        >
          N/A
        </span>
      )}
      {comparar && !deltaSinBase && deltaPct !== null && (
        <span
          className={"kpi-delta" + (positive ? " kpi-delta--up" : " kpi-delta--down")}
          data-tooltip={`Cambio real: ${fmtPctResumen(deltaPct)}`}
        >
          {positive ? "↑" : "↓"} {fmtPctResumen(deltaPct, { cap: true })}
        </span>
      )}
    </div>
  );
}

/* ── Chart Card ─────────────────────────────────────────── */
function ChartCard({ title, onDetalle, children, className = "" }) {
  return (
    <div className={`chart-card ${className}`.trim()}>
      <div className="chart-card__header">
        <h3 className="chart-card__title">{title}</h3>
        {onDetalle && (
          <button type="button" className="dash-detalle-btn" onClick={onDetalle}>
            Ver detalles
          </button>
        )}
      </div>
      <div className="chart-card__body">{children}</div>
    </div>
  );
}

const emptyBox = (msg) => (
  <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center", color: "#bdbdbd", fontSize: 13 }}>
    {msg}
  </div>
);

/* ── Main Dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const [datos,   setDatos]   = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [animated, setAnimated] = useState(false);

  const [periodo, setPeriodo] = useState("hoy");
  const [desde,   setDesde]   = useState("");
  const [hasta,   setHasta]   = useState("");

  const [modalCard,     setModalCard]     = useState(null);
  const [detalleExtra,  setDetalleExtra]  = useState(null);
  const [detalleBusy,   setDetalleBusy]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const cargar = useCallback(async (p, d1, d2) => {
    setLoading(true);
    setError(false);
    setDetalleExtra(null);
    try {
      setDatos(await getDashboard(p, d1, d2));
    } catch (e) {
      console.error("Dashboard:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Presets cargan al instante; el rango custom carga con el botón "Aplicar".
  useEffect(() => {
    if (periodo !== "custom") cargar(periodo, "", "");
  }, [periodo, cargar]);

  const aplicarRango = () => {
    if (!desde || !hasta) return;
    // Rango invertido: no se bloquea, se ordenan las fechas y se consulta igual.
    const [d1, d2] = desde <= hasta ? [desde, hasta] : [hasta, desde];
    cargar("custom", d1, d2);
  };

  const detalle = datos.detalle || detalleExtra;

  const asegurarDetalle = useCallback(async () => {
    if (detalle) return detalle;
    setDetalleBusy(true);
    try {
      const d = await getDashboardDetalle(periodo, desde, hasta);
      setDetalleExtra(d);
      return d;
    } catch (e) {
      console.error("Dashboard detalle:", e);
      return null;
    } finally {
      setDetalleBusy(false);
    }
  }, [detalle, periodo, desde, hasta]);

  const abrirDetalle = async (card) => {
    const d = await asegurarDetalle();
    if (d) setModalCard(card);
  };

  const rangoLabel = useMemo(() => {
    if (datos.rango?.inicio && datos.rango?.fin) {
      return `${fmtFecha(datos.rango.inicio)} → ${fmtFecha(datos.rango.fin)}`;
    }
    if (periodo === "custom" && desde && hasta) return `${fmtFecha(desde)} → ${fmtFecha(hasta)}`;
    return PRESET_LABEL[periodo];
  }, [datos.rango, periodo, desde, hasta]);

  const filenameBase = `dashboard-${rangoLabel.replace(/[^0-9a-zA-Z]+/g, "-").replace(/^-|-$/g, "")}`;

  const exportarGlobal = async (formato) => {
    const d = await asegurarDetalle();
    if (!d) return;
    try {
      await exportarDatasets(
        formato,
        filenameBase,
        `Dashboard de ventas · ${rangoLabel}`,
        datasetsGlobales(formato, { kpis: datos.kpis, detalle: d }),
      );
    } catch (e) {
      console.error("Export dashboard:", e);
    }
  };

  const { kpis, productosTop, flujo, ventasTiempo, comparacion, periodoActual } = datos;
  const comparar = comparacion.disponible;
  const sinDatos = !periodoActual.disponible;

  const totalUds   = useMemo(() => productosTop.reduce((s, p) => s + p.value, 0) || 1, [productosTop]);
  const flujoVacio = useMemo(() => flujo.every(b => ESTADOS_FLUJO.every(e => !b[e.key])), [flujo]);
  const estadosPresentes = useMemo(
    () => ESTADOS_FLUJO.filter(e => flujo.some(b => b[e.key])),
    [flujo],
  );
  const tiempoVacio = useMemo(
    () => ventasTiempo.every(d => !d.actual && !d.anterior),
    [ventasTiempo],
  );

  if (loading) {
    return (
      <div className="dash-wrapper dash-wrapper--in">
        <div className="dash-inner" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <span style={{ color: "#9e9e9e", fontSize: 14 }}>Cargando datos…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-wrapper dash-wrapper--in">
        <div className="dash-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <AlertTriangle size={32} style={{ color: "#e65100" }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#424242" }}>No se pudieron cargar los datos del dashboard</p>
          <p style={{ margin: 0, fontSize: 13, color: "#9e9e9e" }}>Verifica tu conexión o que el servidor esté activo.</p>
          <button
            onClick={() => (periodo === "custom" ? aplicarRango() : cargar(periodo, "", ""))}
            style={{ marginTop: 8, padding: "8px 20px", borderRadius: 10, border: "1.5px solid #c8e6c9", background: "#fff", color: "#2e7d32", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`dash-wrapper${animated ? " dash-wrapper--in" : ""}`}>
      <div className="dash-inner">

        {/* ── Filtro de periodo centralizado ── */}
        <div className="dash-toolbar">
          <div className="dash-presets">
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                className={`dash-preset${periodo === p.key ? " dash-preset--on" : ""}`}
                onClick={() => setPeriodo(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodo === "custom" && (
            <div className="dash-custom-range">
              <label className="dashboard-report-field">
                <span>Desde</span>
                <input type="date" max={hoyISO()} value={desde} onChange={e => setDesde(e.target.value)} />
              </label>
              <label className="dashboard-report-field">
                <span>Hasta</span>
                <input type="date" max={hoyISO()} value={hasta} onChange={e => setHasta(e.target.value)} />
              </label>
              <button className="report-btn" type="button" disabled={!desde || !hasta} onClick={aplicarRango}>
                Aplicar rango
              </button>
            </div>
          )}

          <span className="dash-rango-actual">{rangoLabel}</span>
        </div>

        {/* ── Avisos de disponibilidad de historial ── */}
        {sinDatos && (
          <div className="dash-banner dash-banner--warn">
            <AlertTriangle size={16} />
            <span>{periodoActual.mensaje || "No hay datos en el rango seleccionado."}</span>
          </div>
        )}
        {!sinDatos && periodoActual.parcial && periodoActual.mensaje && (
          <div className="dash-banner dash-banner--info">
            <Info size={16} /><span>{periodoActual.mensaje}</span>
          </div>
        )}
        {!sinDatos && !comparar && (
          <div className="dash-banner dash-banner--info">
            <Info size={16} />
            <span>{comparacion.mensaje || "No hay periodo anterior disponible para comparar."}</span>
          </div>
        )}
        {!sinDatos && comparar && comparacion.parcial && comparacion.mensaje && (
          <div className="dash-banner dash-banner--info">
            <Info size={16} /><span>{comparacion.mensaje}</span>
          </div>
        )}

        {/* ── Resumen general (vista general — sin "ver detalles") ── */}
        <div className="chart-card kpi-strip" style={{ marginBottom: 18 }}>
          <div className="chart-card__header">
            <h3 className="chart-card__title">Resumen general</h3>
          </div>
          <div className="chart-card__body">
            <div className="kpi-grid">
              <KpiCard icon={<Banknote size={20} />} label="Total ventas"    valor={kpis.ventas.valor}   deltaPct={kpis.ventas.deltaPct}   deltaSinBase={kpis.ventas.deltaSinBase}   positive={kpis.ventas.positive}   comparar={comparar} color="#2e7d32" />
              <KpiCard icon={<Package size={20} />}  label="Pedidos"         valor={kpis.pedidos.valor}  deltaPct={kpis.pedidos.deltaPct}  deltaSinBase={kpis.pedidos.deltaSinBase}  positive={kpis.pedidos.positive}  comparar={comparar} color="#fb8c00" />
              <KpiCard icon={<User size={20} />}     label="Clientes nuevos" valor={kpis.clientes.valor} deltaPct={kpis.clientes.deltaPct} deltaSinBase={kpis.clientes.deltaSinBase} positive={kpis.clientes.positive} comparar={comparar} color="#5c6bc0" />
              <KpiCard icon={<Tag size={20} />}      label="Ticket promedio" valor={kpis.ticket.valor}   deltaPct={kpis.ticket.deltaPct}   deltaSinBase={kpis.ticket.deltaSinBase}   positive={kpis.ticket.positive}   comparar={comparar} color="#26c6da" />
            </div>
          </div>
        </div>

        <div className="charts-row">
          {/* Flujo de Ventas — barras apiladas por estado */}
          <ChartCard title="Flujo de Ventas" onDetalle={sinDatos ? undefined : () => abrirDetalle("flujo")}>
            {flujoVacio ? emptyBox("Sin pedidos en este período") : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={flujo} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f8f1" }} />
                    {ESTADOS_FLUJO.map(e => (
                      <Bar key={e.key} dataKey={e.key} name={e.label} stackId="flujo" fill={e.color} maxBarSize={40} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="dash-legend">
                  {estadosPresentes.map(e => (
                    <span key={e.key} className="dash-legend__item">
                      <span className="dash-dot" style={{ background: e.color }} />{e.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          {/* Top Productos — Pie */}
          <ChartCard title="Top Productos" onDetalle={sinDatos ? undefined : () => abrirDetalle("top")}>
            {productosTop.length === 0 ? emptyBox("Sin ventas en este período") : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width="55%" height={210}>
                  <PieChart>
                    <Pie data={productosTop} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {productosTop.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} uds (${Math.round(v / totalUds * 100)}%)`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {productosTop.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#424242", flex: 1, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{p.porcentaje}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        <div className="charts-row charts-row--bottom">
          {/* Ingresos Reales */}
          <ChartCard title="Ingresos Reales" className="chart-card--stat" onDetalle={sinDatos ? undefined : () => abrirDetalle("ingresos")}>
            <div className="stat-big">
              <div className="stat-amount">{kpis.ventas.valor}</div>
              {comparar && kpis.ventas.delta && (
                <div className={"stat-change" + (kpis.ventas.positive ? " stat-change--up" : " stat-change--down")}>
                  <span>{kpis.ventas.positive ? "↑" : "↓"}</span> {kpis.ventas.delta} vs período anterior
                </div>
              )}
            </div>
            {productosTop.length > 0 && (
              <div className="stat-badges">
                {productosTop.slice(0, 3).map((p, i) => (
                  <div key={i} className="stat-badge">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span>{p.name}</span>
                    <strong>{p.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* Ventas en el Tiempo — Area */}
          <ChartCard title="Ventas en el Tiempo" onDetalle={sinDatos ? undefined : () => abrirDetalle("tiempo")}>
            {tiempoVacio ? emptyBox("Sin datos en este período") : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={ventasTiempo} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43a047" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#43a047" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb8c00" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#fb8c00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9e9e9e" }} axisLine={false} tickLine={false} allowDecimals={false}
                    tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip content={<CustomTooltip prefix="$" />} />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="#43a047" strokeWidth={2.5} fill="url(#colorActual)" />
                  {comparar && (
                    <Area type="monotone" dataKey="anterior" name="Anterior" stroke="#fb8c00" strokeWidth={2} fill="url(#colorAnterior)" strokeDasharray="5 5" connectNulls={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Exportar dashboard completo ── */}
        <div className="dash-footer-export">
          <ExportMenu
            label={detalleBusy ? "Preparando…" : "Exportar dashboard"}
            disabled={sinDatos || detalleBusy}
            onExport={exportarGlobal}
          />
        </div>
      </div>

      {modalCard && detalle && (
        <DetalleModal
          card={modalCard}
          detalle={detalle}
          rangoLabel={rangoLabel}
          filenameBase={filenameBase}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
}
