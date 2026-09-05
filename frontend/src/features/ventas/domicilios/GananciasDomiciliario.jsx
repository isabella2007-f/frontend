import { useState, useEffect, useCallback } from "react";
import { getUser } from "../../../services/authService";
import { getTodosLosDomicilios } from "../../../services/domiciliosService";
import { esPagoEfectivo, esPagoMixto } from "../../../utils/metodosPago";
import { fmtFecha } from "../../../utils/dateUtils.js";
import "./DomiciliarioUI.css";
import "./GananciasDomiciliario.css";
import {
  Banknote, CheckCircle2, BarChart2, Wallet, Info, Clock,
  RefreshCw, AlertCircle,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

/**
 * Cuánta plata de esta entrega pasó por las manos del repartidor.
 *
 * En un pedido mixto solo la parte en efectivo: el resto se transfirió antes
 * de que saliera. Y si quedó registrado que no se pudo cobrar, no cuenta.
 * Espeja `_cobrado_en_mano` del servidor.
 */
const efectivoRecibido = (d) => {
  if (d.estado_pago === "no_recibido") return 0;
  if (!esPagoEfectivo(d.metodo_pago)) return 0;
  if (esPagoMixto(d.metodo_pago)) return d.monto_efectivo || 0;
  return d.total || 0;
};

const PERIODOS = [
  { id: "hoy",   label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes" },
  { id: "todo",   label: "Total histórico" },
];

function calcularRango(periodo) {
  const ahora = new Date();
  const hoyInicio = new Date(ahora); hoyInicio.setHours(0, 0, 0, 0);

  if (periodo === "hoy") {
    const fin = new Date(ahora); fin.setHours(23, 59, 59, 999);
    return { desde: hoyInicio, hasta: fin };
  }
  if (periodo === "semana") {
    const delta = hoyInicio.getDay() === 0 ? -6 : 1 - hoyInicio.getDay();
    const lunes  = new Date(hoyInicio); lunes.setDate(hoyInicio.getDate() + delta);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
    return { desde: lunes, hasta: domingo };
  }
  if (periodo === "mes") {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999);
    return { desde: inicio, hasta: fin };
  }
  return { desde: null, hasta: null };
}

const fechaDeEntrega = (d) => d.fecha_entrega_real || d.fecha_pedido;

function filtrarPorPeriodo(domicilios, periodo) {
  const entregados = domicilios.filter(d => d.estado === "Entregado");
  if (periodo === "todo") return entregados;

  const { desde, hasta } = calcularRango(periodo);
  return entregados.filter(d => {
    const fecha = new Date(fechaDeEntrega(d));
    return fecha >= desde && fecha <= hasta;
  });
}

export default function GananciasDomiciliario() {
  const user = getUser();
  const [periodo,    setPeriodo]    = useState("hoy");
  const [todos,      setTodos]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Todas las páginas, no solo la primera: "Total histórico" se cortaba
      // en 100 entregas y dejaba de contar sin decirlo.
      setTodos(await getTodosLosDomicilios({ idEmpleado: user.id }));
    } catch (err) {
      setError(err?.message || "No se pudieron cargar tus entregas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  // OJO con lo que significan estos números: son el valor de los PEDIDOS que
  // el repartidor entregó, o sea plata de los clientes que pasó por sus manos.
  // No es su sueldo ni su comisión. La pantalla decía "Mis Ganancias" y
  // "Total del periodo" sobre esta misma suma, así que a un repartidor que
  // movió dos millones en pedidos le decía que había ganado dos millones.
  const entregados    = filtrarPorPeriodo(todos, periodo);
  const valorEntregado = entregados.reduce((s, d) => s + (d.total || 0), 0);
  const enEfectivo     = entregados.reduce((s, d) => s + efectivoRecibido(d), 0);
  const totalEntregas  = entregados.length;
  const promedio       = totalEntregas > 0 ? valorEntregado / totalEntregas : 0;

  // Resumen rápido de todos los periodos (para las tarjetas de resumen)
  const resumen = PERIODOS.slice(0, 3).map(p => {
    const ents = filtrarPorPeriodo(todos, p.id);
    return { id: p.id, label: p.label, total: ents.reduce((s, d) => s + (d.total || 0), 0), count: ents.length };
  });
  // Referencia de la barra: el período más alto de los tres marca el 100%.
  const topResumen = Math.max(...resumen.map(r => r.total), 0);

  const STATS = [
    { label: "Valor entregado",      valor: fmt(valorEntregado), money: true, Icono: Banknote },
    { label: "Recibido en efectivo", valor: fmt(enEfectivo),     money: true, Icono: Wallet, oro: true },
    { label: "Entregas",             valor: totalEntregas,                    Icono: CheckCircle2 },
    { label: "Promedio por entrega", valor: fmt(promedio),       money: true, Icono: BarChart2 },
  ];

  const etiquetaPeriodo = PERIODOS.find(p => p.id === periodo)?.label.toLowerCase() || "";
  const subtitulo = loading
    ? "Sumando tus entregas…"
    : totalEntregas === 0
      ? `No cerraste ninguna entrega en el período de ${etiquetaPeriodo}.`
      : `${totalEntregas} ${totalEntregas === 1 ? "entrega cerrada" : "entregas cerradas"} en el período de ${etiquetaPeriodo}.`;

  const ordenadas = entregados
    .slice()
    .sort((a, b) => new Date(fechaDeEntrega(b)) - new Date(fechaDeEntrega(a)));

  return (
    <div className="dom-ui ganancias">
      <header className="du-hero">
        <div className="du-hero__top">
          <div>
            <span className="du-hero__eyebrow"><Banknote size={14} /> Plata que moviste</span>
            <h1 className="du-hero__title">Lo que entregué</h1>
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
        <div className="ga-col">
          <div className="ga-aviso">
            <span className="ga-aviso__icon"><Info size={18} /></span>
            <p className="ga-aviso__txt">
              Estas cifras son el <strong>valor de los pedidos que entregaste</strong> —plata de los
              clientes que pasó por tus manos—, <strong>no tu pago</strong>.
            </p>
          </div>

          {error && (
            <div className="du-error"><AlertCircle size={15} /> {error}</div>
          )}

          {/* ── Comparativa rápida de los 3 períodos ── */}
          {!loading && (
            <div className="ga-periodos">
              {resumen.map(r => (
                <div key={r.id} className={`ga-periodo${periodo === r.id ? " ga-periodo--on" : ""}`}>
                  <div className="ga-periodo__label">{r.label}</div>
                  <div className="ga-periodo__monto">{fmt(r.total)}</div>
                  <div className="ga-periodo__count">{r.count} entrega{r.count !== 1 ? "s" : ""}</div>
                  <div className="ga-periodo__barra">
                    <div
                      className="ga-periodo__relleno"
                      style={{ "--pct": `${topResumen > 0 ? (r.total / topResumen) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Filtro de período ── */}
          <div className="du-filtros">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`du-filtro${periodo === p.id ? " du-filtro--on" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* ── Detalle de entregas del período ── */}
          {loading ? (
            <div className="ga-filas">
              {[1, 2, 3].map(i => (
                <div key={i} className="du-skel-card">
                  {[60, 40, 80].map((w, j) => (
                    <div key={j} className="du-skel" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
            </div>
          ) : ordenadas.length === 0 ? (
            <div className="du-vacio">
              <span className="du-vacio__icon"><Banknote size={38} strokeWidth={1.4} /></span>
              <p className="du-vacio__titulo">Sin entregas en este período</p>
              <p className="du-vacio__texto">
                Aquí aparece el detalle de cada pedido que cerraste. Prueba con un período más amplio.
              </p>
            </div>
          ) : (
            <section>
              <h2 className="ga-detalle__titulo">
                Detalle
                <span className="ga-detalle__n">
                  {ordenadas.length} entrega{ordenadas.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div className="ga-filas">
                {ordenadas.map(dom => {
                  const enMano = efectivoRecibido(dom);
                  return (
                    <div key={dom.id} className="ga-fila">
                      <span className="ga-fila__icono"><CheckCircle2 size={19} /></span>
                      <div className="ga-fila__txt">
                        <div className="ga-fila__num">{dom.numero}</div>
                        <div className="ga-fila__cliente">{dom.cliente?.nombre || "Cliente"}</div>
                        <div className="ga-fila__fecha">
                          <Clock size={11} /> {fmtFecha(fechaDeEntrega(dom))}
                        </div>
                      </div>
                      <div className="ga-fila__lado">
                        <div className="ga-fila__monto">{fmt(dom.total || 0)}</div>
                        {enMano > 0 && (
                          <span className="ga-fila__efectivo">
                            <Banknote size={11} /> {fmt(enMano)} en efectivo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
