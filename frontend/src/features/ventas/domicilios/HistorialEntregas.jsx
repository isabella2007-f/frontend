import { useState, useEffect, useCallback } from "react";
import { getUser } from "../../../services/authService";
import { getTodosLosDomicilios } from "../../../services/domiciliosService";
import { ESTADO_DOM_CONFIG } from "./estadosDomicilio";
import "./DomiciliarioUI.css";
import "./HistorialEntregas.css";
import {
  CheckCircle2, XCircle, Banknote, ClipboardList, MapPin,
  History, RefreshCw, AlertCircle, Clock,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const fmtHora = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
};

const FILTROS = [
  { id: "hoy",   label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes" },
  { id: "todo",   label: "Todo" },
];

function getRango(filtro) {
  const ahora = new Date();
  if (filtro === "hoy") {
    const inicio = new Date(ahora); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(ahora); fin.setHours(23, 59, 59, 999);
    return { fechaInicio: inicio.toISOString(), fechaFin: fin.toISOString() };
  }
  if (filtro === "semana") {
    const dia = ahora.getDay();
    const lunesDelta = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(ahora); lunes.setDate(ahora.getDate() + lunesDelta); lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
    return { fechaInicio: lunes.toISOString(), fechaFin: domingo.toISOString() };
  }
  if (filtro === "mes") {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
    return { fechaInicio: inicio.toISOString(), fechaFin: fin.toISOString() };
  }
  return { fechaInicio: null, fechaFin: null };
}

/* Las variables de color viajan al CSS: la hoja no repite ningún hex de
   estado, así sigue mandando estadosDomicilio.js como fuente única. */
const varsEstado = (estadoId) => {
  const cfg = ESTADO_DOM_CONFIG[estadoId] ||
    { dot: "#757575", bg: "#f5f5f5", border: "#e0e0e0", label: "—" };
  return { cfg, vars: { "--e-dot": cfg.dot, "--e-bg": cfg.bg, "--e-border": cfg.border } };
};

/* La fecha que manda en el historial es la de la entrega; si el domicilio se
   canceló nunca hubo entrega y queda la del pedido. Es el mismo criterio con
   el que se ordena la lista. */
const fechaDelRegistro = (d) => d.fecha_entrega_real || d.fecha_pedido;

const MS_DIA = 86400000;
const soloDia = (iso) => {
  const f = new Date(iso);
  f.setHours(0, 0, 0, 0);
  return f;
};

/** Encabezado de cada bloque: "Hoy", "Ayer" o el día escrito completo. */
const etiquetaDia = (iso) => {
  const dia = soloDia(iso);
  const hoy = soloDia(new Date());
  const diff = Math.round((hoy - dia) / MS_DIA);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return dia.toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
    ...(dia.getFullYear() !== hoy.getFullYear() ? { year: "numeric" } : {}),
  });
};

/* Agrupa la lista —ya ordenada de más reciente a más antigua— en bloques por
   día, para que el historial se lea como una línea de tiempo. */
function agruparPorDia(lista) {
  const grupos = [];
  for (const dom of lista) {
    const clave = soloDia(fechaDelRegistro(dom)).getTime();
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.items.push(dom);
    else grupos.push({ clave, etiqueta: etiquetaDia(fechaDelRegistro(dom)), items: [dom] });
  }
  return grupos;
}

export default function HistorialEntregas() {
  const user = getUser();
  const [filtro,     setFiltro]     = useState("hoy");
  const [domicilios, setDomicilios] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { fechaInicio, fechaFin } = getRango(filtro);
    try {
      // El rango lo aplica el servidor sobre la fecha de ENTREGA (ver
      // FECHA_DEL_DOMICILIO en el backend): antes filtraba por la fecha de
      // creación, así que la entrega que el repartidor cerró hoy de un
      // pedido de ayer no salía en "Hoy" y el historial contradecía al
      // resumen del día en su propia pantalla.
      const domicilios = await getTodosLosDomicilios({
        idEmpleado:  user.id,
        fechaInicio,
        fechaFin,
      });
      const historial = domicilios.filter(d =>
        d.estado === "Entregado" || d.estado === "Cancelado"
      );
      historial.sort((a, b) => new Date(fechaDelRegistro(b)) - new Date(fechaDelRegistro(a)));
      setDomicilios(historial);
    } catch {
      setError("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, [filtro, user?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const entregadas = domicilios.filter(d => d.estado === "Entregado");
  const totalValor = entregadas.reduce((s, d) => s + (d.total || 0), 0);
  const grupos     = agruparPorDia(domicilios);

  const STATS = [
    { label: "Entregas",        valor: entregadas.length,                     Icono: CheckCircle2 },
    { label: "Canceladas",      valor: domicilios.length - entregadas.length, Icono: XCircle },
    { label: "Valor entregado", valor: fmt(totalValor), money: true, oro: true, Icono: Banknote },
  ];

  const periodo = FILTROS.find(f => f.id === filtro)?.label.toLowerCase() || "";
  const subtitulo = loading
    ? "Cargando tu historial…"
    : domicilios.length === 0
      ? `No hay entregas cerradas en el período de ${periodo}.`
      : `${domicilios.length} ${domicilios.length === 1 ? "registro" : "registros"} en el período de ${periodo}.`;

  return (
    <div className="dom-ui historial">
      <header className="du-hero">
        <div className="du-hero__top">
          <div>
            <span className="du-hero__eyebrow"><History size={14} /> Tu registro</span>
            <h1 className="du-hero__title">Historial de Entregas</h1>
            <p className="du-hero__sub">{subtitulo}</p>
          </div>
          <button
            className={`du-hero__refresh${loading ? " du-hero__refresh--girando" : ""}`}
            onClick={cargar}
            disabled={loading}
          >
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        <div className="du-stats">
          {STATS.map(s => (
            <div key={s.label} className={`du-stat${s.oro ? " du-stat--oro" : ""}`}>
              <span className="du-stat__icon"><s.Icono size={19} /></span>
              <div>
                <div className={`du-stat__valor${s.money ? " du-stat__valor--money" : ""}`}>
                  {loading ? "—" : s.valor}
                </div>
                <div className="du-stat__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="du-inner">
        {/* ── Filtros de período ── */}
        <div className="du-filtros hi-filtros">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`du-filtro${filtro === f.id ? " du-filtro--on" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Línea de tiempo ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="du-skel-card">
                {[70, 50, 40].map((w, j) => (
                  <div key={j} className="du-skel" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="du-error"><AlertCircle size={15} /> {error}</div>
        ) : domicilios.length === 0 ? (
          <div className="du-vacio">
            <span className="du-vacio__icon"><ClipboardList size={38} strokeWidth={1.4} /></span>
            <p className="du-vacio__titulo">Sin registros en este período</p>
            <p className="du-vacio__texto">
              Aquí van quedando las entregas que cierras. Prueba con un período más amplio.
            </p>
          </div>
        ) : (
          <div className="hi-grupos">
            {grupos.map(grupo => (
              <section key={grupo.clave}>
                <div className="hi-dia">
                  <span className="hi-dia__fecha">{grupo.etiqueta}</span>
                  <span className="hi-dia__n">
                    {grupo.items.length} {grupo.items.length === 1 ? "entrega" : "entregas"}
                  </span>
                  <span className="hi-dia__linea" />
                </div>

                <div className="hi-linea">
                  {grupo.items.map(dom => {
                    const { cfg, vars } = varsEstado(dom.estadoId);
                    const anulada = dom.estado === "Cancelado";
                    const Icono = anulada ? XCircle : CheckCircle2;
                    return (
                      <article key={dom.id} className="hi-item" style={vars}>
                        <span className="hi-item__punto"><Icono size={16} /></span>
                        <div className={`hi-card${anulada ? " hi-card--anulada" : ""}`}>
                          <div className="hi-card__txt">
                            <div className="hi-card__num">{dom.numero}</div>
                            <div className="hi-card__cliente">{dom.cliente?.nombre || "Cliente"}</div>
                            <div className="hi-card__dir">
                              <MapPin size={13} />
                              <span>{dom.direccion_entrega || "Sin dirección"}</span>
                            </div>
                          </div>
                          <div className="hi-card__lado">
                            <span className="du-badge" style={vars}>
                              <Icono size={12} /> {cfg.label}
                            </span>
                            <div className="hi-card__monto">{fmt(dom.total || 0)}</div>
                            <div className="hi-card__hora">
                              <Clock size={11} /> {fmtHora(fechaDelRegistro(dom))}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
