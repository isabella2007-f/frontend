import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./Domicilios.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const PER_PAGE = 5;

/* Estados de pedido que tienen domicilio activo o completado */
const ESTADOS_CON_DOMICILIO = ["Listo", "En camino", "Entregado"];

const ESTADO_CONFIG = {
  "Listo":     { dot: "#43a047" },
  "En camino": { dot: "#8e24aa" },
  "Entregado": { dot: "#009688" },
  "Pendiente": { dot: "#f9a825" },
};

/* ─── Componentes ────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const cls = `estado-badge estado--${estado.replace(/ /g, "-")}`;
  return (
    <span className={cls}>
      <span className="estado-badge__dot" />
      {estado}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "#c62828" : toast.type === "warn" ? "#e65100" : "#2e7d32";
  return (
    <div className="toast" style={{ background: bg }}>
      <span style={{ fontSize: 15 }}>
        {toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓"}
      </span>
      {toast.message}
    </div>
  );
}

function SelectArrow() {
  return (
    <div className="select-arrow">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL VER DETALLE
   ═══════════════════════════════════════════════════════════ */
function ModalVerDomicilio({ pedido, emp, onClose, onReasignar, onObservaciones }) {
  const activo = !["Entregado", "Cancelado"].includes(pedido.estado);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">DOMICILIO</p>
            <h2 className="modal-header__title">{pedido.numero}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={pedido.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">

          {/* Cliente */}
          <p className="section-label">Cliente</p>
          <div className="form-grid-2">
            <div>
              <label className="form-label">Nombre</label>
              <div className="field-input--disabled">{pedido.cliente?.nombre || "—"}</div>
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <div className="field-input--disabled">{pedido.cliente?.telefono || "—"}</div>
            </div>
          </div>

          {/* Dirección */}
          <p className="section-label">Dirección de entrega</p>
          <div className="info-box info-box--info">
            <span className="info-box__icon">📍</span>
            <span className="info-box__text">{pedido.direccion_entrega || "—"}</span>
          </div>

          {/* Domiciliario */}
          <p className="section-label">Domiciliario asignado</p>
          {emp ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
              borderRadius: 10, border: "1.5px solid #c8e6c9", background: "#f9fdf9",
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", background: "#e8f5e9",
                border: "1.5px solid #a5d6a7", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20, flexShrink: 0,
              }}>🛵</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                  {emp.nombre} {emp.apellidos}
                </div>
                <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2 }}>{emp.correo}</div>
              </div>
            </div>
          ) : (
            <div className="info-box info-box--warn">
              <span className="info-box__icon">⚠️</span>
              <span className="info-box__text">Sin domiciliario asignado.</span>
            </div>
          )}

          {/* Fechas */}
          <p className="section-label">Fechas</p>
          <div className="form-grid-2">
            <div>
              <label className="form-label">Fecha del pedido</label>
              <div className="field-input--disabled">{fmtFecha(pedido.fecha_pedido)}</div>
            </div>
            <div>
              <label className="form-label">Fecha de entrega real</label>
              <div className="field-input--disabled" style={{ color: pedido.fecha_entrega_real ? "#00695c" : "#bdbdbd" }}>
                {pedido.fecha_entrega_real ? fmtFecha(pedido.fecha_entrega_real) : "Pendiente"}
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {pedido.obs_domicilio && (
            <>
              <p className="section-label">Observaciones</p>
              <div className="info-box info-box--warn">
                <span className="info-box__icon">📝</span>
                <span className="info-box__text">{pedido.obs_domicilio}</span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {activo && (
            <>
              <button className="btn-cancel" onClick={() => { onClose(); onObservaciones(pedido); }}>
                📝 Observaciones
              </button>
              <button className="btn-save" onClick={() => { onClose(); onReasignar(pedido); }}>
                🛵 Reasignar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL REASIGNAR DOMICILIARIO
   ═══════════════════════════════════════════════════════════ */
function ModalReasignar({ pedido, empleados, onClose, onConfirm }) {
  const [empId, setEmpId] = useState(pedido.idEmpleado || "");
  const [error, setError] = useState("");
  const empActual = empleados.find(e => e.id === pedido.idEmpleado);

  const handleConfirm = () => {
    if (!empId) { setError("Selecciona un domiciliario"); return; }
    if (parseInt(empId) === pedido.idEmpleado) { setError("Ya está asignado a este domiciliario"); return; }
    onConfirm(pedido.id, parseInt(empId));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">LOGÍSTICA</p>
            <h2 className="modal-header__title">Reasignar domiciliario</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong>
          </p>

          <div className="info-box info-box--info">
            <span className="info-box__icon">📍</span>
            <span className="info-box__text">{pedido.direccion_entrega}</span>
          </div>

          {empActual && (
            <div className="info-box info-box--warn">
              <span className="info-box__icon">🛵</span>
              <span className="info-box__text">
                Actual: <strong>{empActual.nombre} {empActual.apellidos}</strong>
              </span>
            </div>
          )}

          <div>
            <label className="form-label">Nuevo domiciliario <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${error ? " error" : ""}`}
                value={empId}
                onChange={e => { setEmpId(e.target.value); setError(""); }}
              >
                <option value="">Seleccione…</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellidos}
                    {e.id === pedido.idEmpleado ? " (actual)" : ""}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
            {error && <p className="field-error">{error}</p>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleConfirm}>Reasignar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL OBSERVACIONES
   ═══════════════════════════════════════════════════════════ */
function ModalObservaciones({ pedido, onClose, onConfirm }) {
  const [obs, setObs] = useState(pedido.obs_domicilio || "");
  const [done, setDone] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">DOMICILIO</p>
            <h2 className="modal-header__title">Observaciones</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong> · {pedido.cliente?.nombre}
          </p>
          <div className="info-box info-box--info">
            <span className="info-box__icon">📍</span>
            <span className="info-box__text">{pedido.direccion_entrega}</span>
          </div>
          <div>
            <label className="form-label">Observaciones de entrega</label>
            <textarea
              className="field-textarea"
              rows={4}
              placeholder="Instrucciones especiales, referencias del lugar, llamar al llegar…"
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="btn-save"
            disabled={done}
            onClick={() => { setDone(true); setTimeout(() => onConfirm(pedido.id, obs), 700); }}
          >
            {done ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORIAL POR DOMICILIARIO
   ═══════════════════════════════════════════════════════════ */
function HistorialDomiciliario({ domicilios, empleados }) {
  const [abiertos, setAbiertos] = useState({});

  const toggle = (id) => setAbiertos(p => ({ ...p, [id]: !p[id] }));

  /* Agrupar por empleado */
  const grupos = empleados.map(emp => {
    const pedidosEmp = domicilios.filter(p => p.idEmpleado === emp.id);
    return {
      emp,
      total:     pedidosEmp.length,
      entregados: pedidosEmp.filter(p => p.estado === "Entregado").length,
      enCamino:   pedidosEmp.filter(p => p.estado === "En camino").length,
      pedidos:    pedidosEmp,
    };
  }).filter(g => g.total > 0);

  if (grupos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🛵</div>
        <p className="empty-state__text">No hay domicilios asignados a empleados.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {grupos.map(({ emp, total, entregados, enCamino, pedidos }) => (
        <div key={emp.id} className="hist-emp-card">
          <div className="hist-emp-header" onClick={() => toggle(emp.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: "#e8f5e9",
                border: "1.5px solid #a5d6a7", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 18, flexShrink: 0,
              }}>🛵</div>
              <div>
                <div className="hist-emp-name">{emp.nombre} {emp.apellidos}</div>
                <div style={{ fontSize: 11, color: "#9e9e9e" }}>{emp.correo}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="hist-emp-stats">
                <span className="hist-stat hist-stat--total">Total: {total}</span>
                {entregados > 0 && <span className="hist-stat hist-stat--entregado">✓ {entregados}</span>}
                {enCamino   > 0 && <span className="hist-stat hist-stat--camino">🛵 {enCamino}</span>}
              </div>
              <span style={{ color: "#9e9e9e", fontSize: 16, transform: abiertos[emp.id] ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
            </div>
          </div>

          {abiertos[emp.id] && (
            <div className="hist-pedidos-list">
              {pedidos.map(p => (
                <div key={p.id} className="hist-pedido-row">
                  <span className="hist-pedido-num">{p.numero}</span>
                  <span className="hist-pedido-dir">{p.direccion_entrega}</span>
                  <EstadoBadge estado={p.estado} />
                  <span className="hist-pedido-fecha">{fmtFecha(p.fecha_pedido)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionDomicilios() {
  const { pedidos, editarPedido, asignarDomiciliario, usuarios } = useApp();

  const empleados  = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  /* Solo pedidos con domicilio */
  const domicilios = pedidos.filter(p => p.domicilio);

  const [tab,          setTab]          = useState("tabla");   /* "tabla" | "historial" */
  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* Filtrado */
  const filtered = domicilios.filter(p => {
    const q = search.toLowerCase();
    const emp = empleados.find(e => e.id === p.idEmpleado);
    const matchQ = [
      p.numero, p.cliente?.nombre, p.cliente?.correo,
      p.direccion_entrega,
      emp ? `${emp.nombre} ${emp.apellidos}` : "",
    ].filter(Boolean).some(v => v.toLowerCase().includes(q));

    const matchE =
      filterEstado === "todos"       ? true :
      filterEstado === "activos"     ? ["Listo", "En camino"].includes(p.estado) :
      filterEstado === "entregados"  ? p.estado === "Entregado" :
      filterEstado === "sin-asignar" ? !p.idEmpleado :
      p.estado === filterEstado;

    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => setPage(1), [search, filterEstado]);

  const hasFilter = filterEstado !== "todos";

  /* Handlers */
  const handleReasignar = (pedidoId, empId) => {
    asignarDomiciliario(pedidoId, empId);
    const emp = empleados.find(e => e.id === empId);
    showToast(`Reasignado a ${emp?.nombre} ${emp?.apellidos}`);
    setModal(null);
  };

  const handleObservaciones = (pedidoId, obs) => {
    editarPedido({ id: pedidoId, obs_domicilio: obs });
    showToast("Observaciones guardadas");
    setModal(null);
  };

  /* Validaciones */
  const abrirReasignar = (ped) => {
    if (["Entregado", "Cancelado"].includes(ped.estado)) {
      showToast("No se puede reasignar un domicilio ya finalizado", "warn");
      return;
    }
    setModal({ type: "reasignar", pedido: ped });
  };

  const abrirObservaciones = (ped) => {
    if (["Entregado", "Cancelado"].includes(ped.estado)) {
      showToast("No se pueden editar observaciones de un domicilio finalizado", "warn");
      return;
    }
    setModal({ type: "obs", pedido: ped });
  };

  /* ─── Stats rápidas ─── */
  const totalDom    = domicilios.length;
  const enCamino    = domicilios.filter(p => p.estado === "En camino").length;
  const entregados  = domicilios.filter(p => p.estado === "Entregado").length;
  const sinAsignar  = domicilios.filter(p => !p.idEmpleado && !["Entregado","Cancelado"].includes(p.estado)).length;

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Domicilios</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* ── Stats rápidas ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total domicilios", val: totalDom,   color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "🛵" },
            { label: "En camino",        val: enCamino,   color: "#6a1b9a", bg: "#f3e5f5", border: "#ce93d8", icon: "🚴" },
            { label: "Entregados",       val: entregados, color: "#00695c", bg: "#e0f2f1", border: "#80cbc4", icon: "✅" },
            { label: "Sin asignar",      val: sinAsignar, color: sinAsignar > 0 ? "#c62828" : "#9e9e9e", bg: sinAsignar > 0 ? "#ffebee" : "#fafafa", border: sinAsignar > 0 ? "#ef9a9a" : "#e0e0e0", icon: sinAsignar > 0 ? "⚠️" : "—" },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 12,
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-head)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: s.color, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[
            { key: "tabla",     label: "📋 Lista de domicilios" },
            { key: "historial", label: "📊 Historial por domiciliario" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "9px 18px", borderRadius: "10px 10px 0 0", border: "none",
              background: tab === t.key ? "#fff" : "transparent",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              color: tab === t.key ? "#2e7d32" : "#9e9e9e", cursor: "pointer",
              borderBottom: tab === t.key ? "3px solid #2e7d32" : "3px solid transparent",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB: Tabla ── */}
        {tab === "tabla" && (
          <>
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  type="text" className="search-input"
                  placeholder="Buscar por pedido, cliente, dirección o domiciliario…"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <div ref={filterRef} style={{ position: "relative" }}>
                <button
                  className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
                  onClick={() => setShowFilter(v => !v)}
                >▼</button>
                {showFilter && (
                  <div className="filter-dropdown" style={{ minWidth: 185 }}>
                    <p className="filter-section-title">Estado</p>
                    {[
                      { val: "todos",       label: "Todos",           dot: "#bdbdbd" },
                      { val: "activos",     label: "Activos",         dot: "#8e24aa" },
                      { val: "En camino",   label: "En camino",       dot: "#8e24aa" },
                      { val: "Listo",       label: "Listo (por salir)",dot: "#43a047" },
                      { val: "entregados",  label: "Entregados",      dot: "#009688" },
                      { val: "sin-asignar", label: "Sin asignar",     dot: "#e53935" },
                    ].map(f => (
                      <button key={f.val}
                        className={`filter-option${filterEstado === f.val ? " active" : ""}`}
                        onClick={() => { setFilterEstado(f.val); setPage(1); setShowFilter(false); }}
                      >
                        <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>Nº</th>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Dirección</th>
                      <th>Domiciliario</th>
                      <th>Fecha pedido</th>
                      <th>Entrega real</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={9}>
                        <div className="empty-state">
                          <div className="empty-state__icon">🛵</div>
                          <p className="empty-state__text">
                            {hasFilter || search ? "Sin domicilios que coincidan." : "No hay domicilios registrados."}
                          </p>
                        </div>
                      </td></tr>
                    ) : paged.map((ped, idx) => {
                      const emp = empleados.find(e => e.id === ped.idEmpleado);
                      const activo = !["Entregado", "Cancelado"].includes(ped.estado);
                      return (
                        <tr key={ped.id} className="tbl-row">
                          <td>
                            <span className="row-num">
                              {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                            </span>
                          </td>

                          {/* Pedido */}
                          <td>
                            <div className="pedido-num">{ped.numero}</div>
                            <div className="pedido-fecha">{fmt(ped.total)}</div>
                          </td>

                          {/* Cliente */}
                          <td>
                            <div className="client-name">{ped.cliente?.nombre || "—"}</div>
                            <div className="client-phone">{ped.cliente?.telefono || ""}</div>
                          </td>

                          {/* Dirección */}
                          <td>
                            <div className="dir-main" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ped.direccion_entrega || "—"}
                            </div>
                            {ped.obs_domicilio && (
                              <div className="dir-sub" title={ped.obs_domicilio}>
                                📝 {ped.obs_domicilio.length > 30 ? ped.obs_domicilio.slice(0, 30) + "…" : ped.obs_domicilio}
                              </div>
                            )}
                          </td>

                          {/* Domiciliario */}
                          <td>
                            {emp
                              ? <div className="emp-name">🛵 {emp.nombre} {emp.apellidos}</div>
                              : <div className="emp-none">Sin asignar</div>
                            }
                          </td>

                          {/* Fechas */}
                          <td><span className="date-badge">{fmtFecha(ped.fecha_pedido)}</span></td>
                          <td>
                            <span className={`date-badge${!ped.fecha_entrega_real ? " date-badge--none" : ""}`}>
                              {ped.fecha_entrega_real ? fmtFecha(ped.fecha_entrega_real) : "—"}
                            </span>
                          </td>

                          {/* Estado */}
                          <td><EstadoBadge estado={ped.estado} /></td>

                          {/* Acciones */}
                          <td>
                            <div className="actions-cell">
                              <button className="act-btn act-btn--view"
                                title="Ver detalle"
                                onClick={() => setModal({ type: "ver", pedido: ped })}>👁</button>

                              <button className="act-btn act-btn--reasignar"
                                title="Reasignar domiciliario"
                                onClick={() => abrirReasignar(ped)}
                                style={{ opacity: activo ? 1 : 0.35, cursor: activo ? "pointer" : "default" }}>
                                🛵
                              </button>

                              <button className="act-btn act-btn--obs"
                                title="Observaciones"
                                onClick={() => abrirObservaciones(ped)}
                                style={{ opacity: activo ? 1 : 0.35, cursor: activo ? "pointer" : "default" }}>
                                📝
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="pagination-bar">
                <span className="pagination-count">
                  {filtered.length} {filtered.length === 1 ? "domicilio" : "domicilios"} en total
                </span>
                <div className="pagination-btns">
                  <button className="pg-btn-arrow"
                    onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
                  <span className="pg-pill">Página {safePage} de {totalPages}</span>
                  <button className="pg-btn-arrow"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TAB: Historial ── */}
        {tab === "historial" && (
          <div className="card" style={{ padding: 20 }}>
            <HistorialDomiciliario domicilios={domicilios} empleados={empleados} />
          </div>
        )}
      </div>

      {/* Modales */}
      {modal?.type === "ver" && (
        <ModalVerDomicilio
          pedido={modal.pedido}
          emp={empleados.find(e => e.id === modal.pedido.idEmpleado)}
          onClose={() => setModal(null)}
          onReasignar={ped => setModal({ type: "reasignar", pedido: ped })}
          onObservaciones={ped => setModal({ type: "obs", pedido: ped })}
        />
      )}
      {modal?.type === "reasignar" && (
        <ModalReasignar
          pedido={modal.pedido}
          empleados={empleados}
          onClose={() => setModal(null)}
          onConfirm={handleReasignar}
        />
      )}
      {modal?.type === "obs" && (
        <ModalObservaciones
          pedido={modal.pedido}
          onClose={() => setModal(null)}
          onConfirm={handleObservaciones}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}