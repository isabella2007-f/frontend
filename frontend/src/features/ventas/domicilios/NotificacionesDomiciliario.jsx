import { useState, useEffect, useRef, useCallback } from "react";
import { getUser } from "../../../services/authService";
import { getDomicilios } from "../../../services/domiciliosService";
import "./DomiciliarioUI.css";
import "./NotificacionesDomiciliario.css";
import {
  Package, CheckCircle2, XCircle, Bell, X, Clock, BellRing,
  CheckCheck, Bike,
} from "lucide-react";

const POLL_INTERVAL = 30_000; // 30 segundos
const STORAGE_KEY   = "domiciliario_notifs_visto";

const fmtFecha = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const ahora = new Date();
  const diffMs = ahora - d;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `Hace ${diffH}h`;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
};

/* Icono, color y etiqueta de cada tipo, en un solo sitio. Antes el color
   viajaba dentro de cada notificación generada, repetido en tres ramas. */
const TIPO_UI = {
  nuevo:     { Icono: Package,      color: "#2e7d32", bg: "#e8f5e9", label: "Asignadas" },
  entregado: { Icono: CheckCircle2, color: "#558b2f", bg: "#eef6e4", label: "Completadas" },
  cancelado: { Icono: XCircle,      color: "#c62828", bg: "#ffebee", label: "Canceladas" },
};

function generarNotifs(domicilios) {
  const notifs = [];
  const ahora  = new Date();
  const hace7d = new Date(ahora - 7 * 24 * 60 * 60 * 1_000);

  domicilios.forEach(dom => {
    const fechaAsig = new Date(dom.fecha_pedido);
    if (fechaAsig < hace7d) return;

    if (dom.estado === "Cancelado") {
      notifs.push({
        id:      `cancelado-${dom.id}`,
        tipo:    "cancelado",
        titulo:  "Entrega cancelada",
        mensaje: `${dom.numero} · ${dom.cliente?.nombre || "Cliente"}`,
        fecha:   dom.fecha_pedido,
      });
      return;
    }

    // Órdenes asignadas recientemente (últimas 24h) que no están entregadas ni canceladas
    const hace24h = new Date(ahora - 24 * 60 * 60 * 1_000);
    if (fechaAsig >= hace24h && dom.estado !== "Entregado" && dom.estado !== "Cancelado") {
      notifs.push({
        id:      `asignado-${dom.id}`,
        tipo:    "nuevo",
        titulo:  "Nueva entrega asignada",
        mensaje: `${dom.numero} · ${dom.cliente?.nombre || "Cliente"} · ${dom.direccion_entrega || "Sin dirección"}`,
        fecha:   dom.fecha_pedido,
      });
    }

    // Entregadas en las últimas 24h → notif de logro
    if (dom.estado === "Entregado" && dom.fecha_entrega_real) {
      const fechaEnt = new Date(dom.fecha_entrega_real);
      if (fechaEnt >= hace24h) {
        notifs.push({
          id:      `entregado-${dom.id}`,
          tipo:    "entregado",
          titulo:  "Entrega completada",
          mensaje: `${dom.numero} · ${dom.cliente?.nombre || "Cliente"}`,
          fecha:   dom.fecha_entrega_real,
        });
      }
    }
  });

  notifs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return notifs;
}

function Toast({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="du-toast du-toast--ok">
      <span className="du-toast__icon"><Bike size={15} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>{msg.titulo}</div>
        <div style={{ opacity: 0.85, fontSize: 12, marginTop: 2 }}>{msg.mensaje}</div>
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar aviso"
        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function NotificacionesDomiciliario() {
  const user             = getUser();
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast,   setToast]     = useState(null);
  const [filtro,  setFiltro]    = useState("todas");
  const [leidas,  setLeidas]    = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });
  const prevIdsRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getDomicilios({ porPagina: 100, idEmpleado: user.id });
      const doms  = data.domicilios || [];
      const nuevas = generarNotifs(doms);
      setNotifs(nuevas);

      // Detectar nuevas asignaciones para el toast
      if (prevIdsRef.current !== null) {
        const prevIds = prevIdsRef.current;
        const nuevasIds = nuevas
          .filter(n => n.tipo === "nuevo" && !prevIds.includes(n.id));
        if (nuevasIds.length > 0) {
          setToast(nuevasIds[0]);
          setTimeout(() => setToast(null), 6000);
        }
      }
      prevIdsRef.current = nuevas.filter(n => n.tipo === "nuevo").map(n => n.id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carga inicial
  useEffect(() => { cargar(); }, [cargar]);

  // Polling cada 30 s
  useEffect(() => {
    const id = setInterval(cargar, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [cargar]);

  const marcarTodas = () => {
    const todos = notifs.map(n => n.id);
    setLeidas(todos);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  };

  const marcarLeida = (id) => {
    const nuevas = [...new Set([...leidas, id])];
    setLeidas(nuevas);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nuevas));
  };

  const esLeida = (n) => leidas.includes(n.id);
  const sinLeer = notifs.filter(n => !esLeida(n)).length;
  const porTipo = (tipo) => notifs.filter(n => n.tipo === tipo).length;

  const FILTROS = [
    { id: "todas",     label: "Todas",    count: notifs.length },
    { id: "sin-leer",  label: "Sin leer", count: sinLeer },
    ...Object.entries(TIPO_UI).map(([tipo, cfg]) => ({
      id: tipo, label: cfg.label, count: porTipo(tipo),
    })),
  ];

  const visibles = notifs.filter(n =>
    filtro === "todas" ? true
    : filtro === "sin-leer" ? !esLeida(n)
    : n.tipo === filtro
  );

  const STATS = [
    { label: "Sin leer",    valor: sinLeer,               Icono: BellRing, oro: sinLeer > 0 },
    { label: "Asignadas",   valor: porTipo("nuevo"),      Icono: Package },
    { label: "Completadas", valor: porTipo("entregado"),  Icono: CheckCircle2 },
    { label: "Canceladas",  valor: porTipo("cancelado"),  Icono: XCircle },
  ];

  const subtitulo = loading
    ? "Buscando novedades…"
    : sinLeer > 0
      ? `Tienes ${sinLeer} ${sinLeer === 1 ? "aviso sin leer" : "avisos sin leer"} de las últimas 24–48 horas.`
      : "Estás al día. Aquí aparecen las asignaciones y el cierre de tus entregas.";

  return (
    <div className="dom-ui notifs">
      <header className="du-hero">
        <div className="du-hero__top">
          <div>
            <span className="du-hero__eyebrow"><Bell size={14} /> Tu buzón</span>
            <h1 className="du-hero__title">Notificaciones</h1>
            <p className="du-hero__sub">{subtitulo}</p>
          </div>
          {sinLeer > 0 && (
            <button className="du-hero__refresh" onClick={marcarTodas}>
              <CheckCheck size={15} /> Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="du-stats">
          {STATS.map(s => (
            <div key={s.label} className={`du-stat${s.oro ? " du-stat--oro" : ""}`}>
              <span className="du-stat__icon"><s.Icono size={19} /></span>
              <div>
                <div className="du-stat__valor">{loading ? "—" : s.valor}</div>
                <div className="du-stat__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="du-inner">
        <div className="nt-barra">
          <div className="du-filtros">
            {FILTROS.map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`du-filtro${filtro === f.id ? " du-filtro--on" : ""}`}
              >
                {f.label}
                <span className="du-filtro__count">{f.count}</span>
              </button>
            ))}
          </div>
          <span className="nt-barra__auto">
            <span className="nt-barra__pulso" /> Se actualiza sola cada 30 s
          </span>
        </div>

        {loading ? (
          <div className="nt-lista">
            {[1, 2, 3].map(i => (
              <div key={i} className="du-skel-card">
                {[60, 40].map((w, j) => (
                  <div key={j} className="du-skel" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="du-vacio">
            <span className="du-vacio__icon"><Bell size={38} strokeWidth={1.4} /></span>
            <p className="du-vacio__titulo">
              {notifs.length === 0 ? "Sin notificaciones" : "Nada en este filtro"}
            </p>
            <p className="du-vacio__texto">
              {notifs.length === 0
                ? "Aquí aparecerán las nuevas asignaciones y las actualizaciones de tus entregas."
                : "Prueba con otro filtro para ver el resto de tus avisos."}
            </p>
          </div>
        ) : (
          <div className="nt-lista">
            {visibles.map(n => {
              const cfg = TIPO_UI[n.tipo] || TIPO_UI.nuevo;
              const leida = esLeida(n);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => marcarLeida(n.id)}
                  className={`nt-card${leida ? " nt-card--leida" : ""}`}
                  style={{ "--n-color": cfg.color, "--n-bg": cfg.bg }}
                >
                  <span className="nt-card__icono"><cfg.Icono size={20} /></span>
                  <div className="nt-card__txt">
                    <div className="nt-card__titulo">{n.titulo}</div>
                    <div className="nt-card__msg">{n.mensaje}</div>
                    <div className="nt-card__fecha"><Clock size={11} /> {fmtFecha(n.fecha)}</div>
                  </div>
                  {!leida && <span className="nt-card__punto" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Toast msg={toast} onClose={() => setToast(null)} />
    </div>
  );
}
