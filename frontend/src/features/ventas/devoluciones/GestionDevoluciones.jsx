import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import CrearDevolucion from "./CrearDevolucion.jsx";
import "./Devoluciones.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const PER_PAGE = 5;

const ESTADO_CONFIG = {
  "Pendiente":   { bg: "#fff8e1", color: "#f9a825", border: "#ffe082", dot: "#f9a825"  },
  "Aprobada":    { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", dot: "#43a047"  },
  "Rechazada":   { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", dot: "#e53935"  },
  "Reembolsada": { bg: "#e0f2f1", color: "#00695c", border: "#80cbc4", dot: "#009688"  },
};

function EstadoBadge({ estado }) {
  const cls = `estado-badge estado--${estado}`;
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
      <span style={{ fontSize: 15 }}>{toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓"}</span>
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
function ModalVerDevolucion({ dev, creditoCliente, onClose }) {
  const [tab, setTab] = useState("informacion");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header modal-header--red">
          <div>
            <p className="modal-header__eyebrow">DEVOLUCIÓN</p>
            <h2 className="modal-header__title modal-header__title--red">{dev.numero}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={dev.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: "16px 24px 0", borderBottom: "1px solid #e0e0e0" }}>
          <div className="modal-tabs">
            <button
              className={`modal-tab-btn ${tab === "informacion" ? "active" : ""}`}
              onClick={() => setTab("informacion")}
            >
              Información
            </button>
            <button
              className={`modal-tab-btn ${tab === "productos" ? "active" : ""}`}
              onClick={() => setTab("productos")}
            >
              Productos y evidencia
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ flexShrink: 0 }}>

          {tab === "informacion" && (
            <>
              {/* Cliente y pedido */}
              <p className="section-label">Información general</p>
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Cliente</label>
                  <div className="field-input--disabled">{dev.cliente?.nombre || "—"}</div>
                </div>
                <div>
                  <label className="form-label">Pedido original</label>
                  <div className="field-input--disabled" style={{ color: "#2e7d32", fontWeight: 700 }}>
                    {dev.numeroPedido}
                  </div>
                </div>
                <div>
                  <label className="form-label">Fecha solicitud</label>
                  <div className="field-input--disabled">{dev.fechaSolicitud}</div>
                </div>
                <div>
                  <label className="form-label">Fecha aprobación</label>
                  <div className="field-input--disabled">{dev.fechaAprobacion || "—"}</div>
                </div>
              </div>

              {/* Motivo */}
              <p className="section-label">Motivo</p>
              <div className="info-box info-box--warn">
                <span className="info-box__icon">📋</span>
                <div className="info-box__text">
                  <span className="info-box__label">{dev.motivo}</span>
                  {dev.comentario && dev.comentario}
                </div>
              </div>

              {/* Crédito generado */}
              {dev.estado === "Reembolsada" && (
                <div className="credito-box">
                  <span className="credito-box__icon">💳</span>
                  <div>
                    <div className="credito-box__label">Crédito aplicado</div>
                    <div className="credito-box__val">{fmt(dev.totalDevuelto)}</div>
                    <div className="credito-box__saldo">
                      Saldo actual del cliente: {fmt(creditoCliente || 0)}
                    </div>
                  </div>
                </div>
              )}

              {/* Rechazo */}
              {dev.estado === "Rechazada" && dev.motivoRechazo && (
                <div className="info-box info-box--danger">
                  <span className="info-box__icon">🚫</span>
                  <div className="info-box__text">
                    <span className="info-box__label">Motivo de rechazo</span>
                    {dev.motivoRechazo}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "productos" && (
            <>
              {/* Productos devueltos */}
              <p className="section-label">Productos devueltos</p>
              <div style={{ borderRadius: 10, border: "1px solid #e8f5e9", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f1f8f1" }}>
                      <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2e7d32", textAlign: "left" }}>Producto</th>
                      <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2e7d32", textAlign: "center" }}>Cant.</th>
                      <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2e7d32", textAlign: "right" }}>Precio unit.</th>
                      <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#2e7d32", textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dev.productos || []).map((p, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f1f8f1" }}>
                        <td style={{ padding: "9px 12px", fontWeight: 600 }}>{p.nombre}</td>
                        <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, color: "#1565c0" }}>{p.cantidad}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontSize: 12, color: "#757575" }}>{fmt(p.precioUnitario)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#c62828" }}>{fmt(p.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f9fdf9", borderTop: "1.5px solid #c8e6c9" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total a devolver</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#c62828" }}>{fmt(dev.totalDevuelto)}</span>
                </div>
              </div>

              {/* Evidencia */}
              {dev.evidencia && (
                <>
                  <p className="section-label">Evidencia</p>
                  {dev.evidencia.tipo?.startsWith("image/") ? (
                    <div style={{ borderRadius: 10, overflow: "hidden", border: "1.5px solid #c8e6c9" }}>
                      <img
                        src={dev.evidencia.base64}
                        alt="evidencia"
                        style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
                      />
                      <div style={{ padding: "8px 12px", background: "#f9fdf9", fontSize: 12, color: "#9e9e9e" }}>
                        📎 {dev.evidencia.nombre}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 10,
                      border: "1.5px solid #c8e6c9", background: "#f9fdf9",
                    }}>
                      <span style={{ fontSize: 28 }}>
                        {dev.evidencia.tipo?.startsWith("video/") ? "🎥" : "📄"}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{dev.evidencia.nombre}</div>
                        <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2 }}>Archivo adjunto</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL APROBAR
   ═══════════════════════════════════════════════════════════ */
function ModalAprobar({ dev, onClose, onConfirm }) {
  const [done, setDone] = useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">APROBAR</p>
            <h2 className="modal-header__title">Aprobar devolución</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 13, color: "#616161" }}>
            ¿Aprobar la devolución <strong>{dev.numero}</strong> de <strong>{dev.cliente?.nombre}</strong>?
          </p>
          <div className="info-box info-box--success">
            <span className="info-box__icon">✅</span>
            <div className="info-box__text">
              <span className="info-box__label">Al aprobar</span>
              La devolución quedará lista para ser reembolsada como crédito al cliente.
            </div>
          </div>
          <div className="credito-box">
            <span className="credito-box__icon">💳</span>
            <div>
              <div className="credito-box__label">Monto a aprobar</div>
              <div className="credito-box__val">{fmt(dev.totalDevuelto)}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-approve" disabled={done} onClick={() => { setDone(true); setTimeout(() => onConfirm(dev.id), 700); }}>
            {done ? "Aprobando…" : "✅ Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL RECHAZAR
   ═══════════════════════════════════════════════════════════ */
function ModalRechazar({ dev, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  const [error,  setError]  = useState("");
  const [done,   setDone]   = useState(false);

  const handleConfirm = () => {
    if (!motivo.trim()) { setError("Ingresa el motivo del rechazo"); return; }
    setDone(true);
    setTimeout(() => onConfirm(dev.id, motivo), 700);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>
        <div className="modal-header modal-header--red">
          <div>
            <p className="modal-header__eyebrow">RECHAZAR</p>
            <h2 className="modal-header__title modal-header__title--red">Rechazar devolución</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 13, color: "#616161" }}>
            ¿Rechazar la devolución <strong>{dev.numero}</strong>?
          </p>
          <div className="info-box info-box--danger">
            <span className="info-box__icon">⚠️</span>
            <span className="info-box__text">Esta acción notificará al cliente que su devolución fue rechazada.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="form-label">Motivo del rechazo <span className="required">*</span></label>
            <textarea
              className={`field-textarea${error ? " error" : ""}`}
              rows={3}
              placeholder="Explica por qué se rechaza la devolución…"
              value={motivo}
              onChange={e => { setMotivo(e.target.value); setError(""); }}
              style={{ borderColor: error ? "#e53935" : undefined }}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-reject" disabled={done} onClick={handleConfirm}>
            {done ? "Rechazando…" : "🚫 Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL REEMBOLSAR (crédito)
   ═══════════════════════════════════════════════════════════ */
function ModalReembolsar({ dev, creditoActual, onClose, onConfirm }) {
  const [done, setDone] = useState(false);
  const nuevoSaldo = (creditoActual || 0) + dev.totalDevuelto;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">REEMBOLSO</p>
            <h2 className="modal-header__title">Aplicar crédito al cliente</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 13, color: "#616161" }}>
            Reembolso para <strong>{dev.cliente?.nombre}</strong> · {dev.numero}
          </p>
          <div className="form-grid-2" style={{ gap: 10 }}>
            <div>
              <label className="form-label">Saldo actual</label>
              <div className="field-input--disabled" style={{ color: "#757575" }}>{fmt(creditoActual || 0)}</div>
            </div>
            <div>
              <label className="form-label">A agregar</label>
              <div className="field-input--disabled" style={{ color: "#c62828", fontWeight: 700 }}>+ {fmt(dev.totalDevuelto)}</div>
            </div>
          </div>
          <div className="credito-box">
            <span className="credito-box__icon">💳</span>
            <div>
              <div className="credito-box__label">Nuevo saldo del cliente</div>
              <div className="credito-box__val">{fmt(nuevoSaldo)}</div>
              <div className="credito-box__saldo">{dev.cliente?.nombre}</div>
            </div>
          </div>
          <div className="info-box info-box--info">
            <span className="info-box__icon">ℹ️</span>
            <span className="info-box__text">El crédito podrá ser usado en futuras compras del cliente.</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-credit" disabled={done} onClick={() => { setDone(true); setTimeout(() => onConfirm(dev.id), 700); }}>
            {done ? "Aplicando…" : "💳 Aplicar crédito"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL ELIMINAR
   ═══════════════════════════════════════════════════════════ */
function ModalEliminar({ dev, onClose, onConfirm }) {
  const [done, setDone] = useState(false);

  if (dev.estado === "Reembolsada") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div className="delete-icon-wrap">🚫</div>
            <h3 className="delete-title">No se puede eliminar</h3>
            <p className="delete-body">Las devoluciones ya reembolsadas no se pueden eliminar porque afectarían el crédito del cliente.</p>
          </div>
          <div className="modal-footer" style={{ justifyContent: "center" }}>
            <button className="btn-ghost" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar devolución</h3>
          <p className="delete-body">¿Eliminar <strong>"{dev.numero}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center" style={{ padding: "0 24px 20px" }}>
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" disabled={done}
            onClick={() => { setDone(true); setTimeout(() => onConfirm(dev.id), 700); }}>
            {done ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionDevoluciones() {
  const {
    devoluciones, creditosClientes,
    crearDevolucion, aprobarDevolucion, rechazarDevolucion,
    reembolsarDevolucion, eliminarDevolucion,
  } = useApp();

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
  const filtered = devoluciones.filter(d => {
    const q = search.toLowerCase();
    const matchQ = [d.numero, d.numeroPedido, d.cliente?.nombre, d.motivo]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || d.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => setPage(1), [search, filterEstado]);

  const hasFilter = filterEstado !== "todos";

  /* Handlers */
  const handleCrear = (payload) => {
    const numero = crearDevolucion(payload);
    showToast(`Devolución ${numero} registrada`);
    setModal(null);
  };

  const handleAprobar = (id) => {
    aprobarDevolucion(id);
    showToast("Devolución aprobada");
    setModal(null);
  };

  const handleRechazar = (id, motivo) => {
    rechazarDevolucion(id, motivo);
    showToast("Devolución rechazada", "error");
    setModal(null);
  };

  const handleReembolsar = (id) => {
    reembolsarDevolucion(id);
    showToast("Crédito aplicado al cliente ✓");
    setModal(null);
  };

  const handleEliminar = (id) => {
    eliminarDevolucion(id);
    showToast("Devolución eliminada", "error");
    setModal(null);
  };

  /* Validaciones al abrir modales */
  const abrirAprobar = (dev) => {
    if (dev.estado !== "Pendiente") { showToast("Solo se pueden aprobar devoluciones pendientes", "warn"); return; }
    setModal({ type: "aprobar", dev });
  };

  const abrirRechazar = (dev) => {
    if (dev.estado !== "Pendiente") { showToast("Solo se pueden rechazar devoluciones pendientes", "warn"); return; }
    setModal({ type: "rechazar", dev });
  };

  const abrirReembolsar = (dev) => {
    if (dev.estado !== "Aprobada") { showToast("Solo se pueden reembolsar devoluciones aprobadas", "warn"); return; }
    setModal({ type: "reembolsar", dev });
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Devoluciones</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text" className="search-input"
              placeholder="Buscar por número, cliente, pedido o motivo…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 175 }}>
                <p className="filter-section-title">Estado</p>
                {[
                  { val: "todos",       label: "Todos",       dot: "#bdbdbd" },
                  { val: "Pendiente",   label: "Pendiente",   dot: "#f9a825" },
                  { val: "Aprobada",    label: "Aprobada",    dot: "#43a047" },
                  { val: "Rechazada",   label: "Rechazada",   dot: "#e53935" },
                  { val: "Reembolsada", label: "Reembolsada", dot: "#009688" },
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

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Nueva devolución <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* Tabla */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Devolución</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">↩️</div>
                      <p className="empty-state__text">
                        {hasFilter || search ? "Sin devoluciones que coincidan." : "No hay devoluciones registradas."}
                      </p>
                    </div>
                  </td></tr>
                ) : paged.map((dev, idx) => (
                  <tr key={dev.id} className="tbl-row">
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>

                    {/* Devolución */}
                    <td>
                      <div className="dev-num">{dev.numero}</div>
                      <div className="dev-pedido">📦 {dev.numeroPedido}</div>
                    </td>

                    {/* Cliente */}
                    <td>
                      <div className="client-name">{dev.cliente?.nombre || "—"}</div>
                      <div className="client-email">{dev.cliente?.correo || ""}</div>
                    </td>

                    {/* Motivo */}
                    <td>
                      <div style={{ fontSize: 13, color: "#424242", fontWeight: 500 }}>{dev.motivo}</div>
                      {dev.comentario && (
                        <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {dev.comentario}
                        </div>
                      )}
                    </td>

                    {/* Fecha */}
                    <td><span className="date-badge">{dev.fechaSolicitud}</span></td>

                    {/* Total */}
                    <td>
                      <div className="monto-val">{fmt(dev.totalDevuelto)}</div>
                      <div className="monto-met">Crédito</div>
                    </td>

                    {/* Estado */}
                    <td><EstadoBadge estado={dev.estado} /></td>

                    {/* Acciones */}
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"
                          title="Ver detalle"
                          onClick={() => setModal({ type: "ver", dev })}>👁</button>

                        <button className="act-btn act-btn--approve"
                          title="Aprobar"
                          onClick={() => abrirAprobar(dev)}
                          style={{ opacity: dev.estado === "Pendiente" ? 1 : 0.35, cursor: dev.estado === "Pendiente" ? "pointer" : "default" }}>
                          ✅
                        </button>

                        <button className="act-btn act-btn--reject"
                          title="Rechazar"
                          onClick={() => abrirRechazar(dev)}
                          style={{ opacity: dev.estado === "Pendiente" ? 1 : 0.35, cursor: dev.estado === "Pendiente" ? "pointer" : "default" }}>
                          🚫
                        </button>

                        <button className="act-btn act-btn--credit"
                          title="Aplicar crédito"
                          onClick={() => abrirReembolsar(dev)}
                          style={{ opacity: dev.estado === "Aprobada" ? 1 : 0.35, cursor: dev.estado === "Aprobada" ? "pointer" : "default" }}>
                          💳
                        </button>

                        <button className="act-btn act-btn--delete"
                          title="Eliminar"
                          onClick={() => setModal({ type: "eliminar", dev })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "devolución" : "devoluciones"} en total
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
      </div>

      {/* Modales */}
      {modal?.type === "crear"      && <CrearDevolucion onClose={() => setModal(null)} onSave={handleCrear} />}
      {modal?.type === "ver"        && (
        <ModalVerDevolucion
          dev={modal.dev}
          creditoCliente={creditosClientes[modal.dev.idCliente] || 0}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "aprobar"    && <ModalAprobar    dev={modal.dev} onClose={() => setModal(null)} onConfirm={handleAprobar} />}
      {modal?.type === "rechazar"   && <ModalRechazar   dev={modal.dev} onClose={() => setModal(null)} onConfirm={handleRechazar} />}
      {modal?.type === "reembolsar" && (
        <ModalReembolsar
          dev={modal.dev}
          creditoActual={creditosClientes[modal.dev.idCliente] || 0}
          onClose={() => setModal(null)}
          onConfirm={handleReembolsar}
        />
      )}
      {modal?.type === "eliminar"   && <ModalEliminar   dev={modal.dev} onClose={() => setModal(null)} onConfirm={handleEliminar} />}

      <Toast toast={toast} />
    </div>
  );
}