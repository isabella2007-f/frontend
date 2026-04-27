import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../AppContext.jsx";
import CrearPedido from "./CrearPedido.jsx";
import EditarPedido from "./EditarPedido.jsx";
import "./Pedidos.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const PER_PAGE = 5;

const ESTADOS_FLUJO = ["Pendiente", "En producción", "Listo", "En camino", "Entregado", "Cancelado"];

const ESTADO_CONFIG = {
  "Pendiente":      { bg: "#fff8e1", color: "#f9a825", border: "#ffe082", dot: "#f9a825" },
  "En producción":  { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9", dot: "#1976d2" },
  "Listo":          { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", dot: "#43a047" },
  "En camino":      { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8", dot: "#8e24aa" },
  "Entregado":      { bg: "#e0f2f1", color: "#00695c", border: "#80cbc4", dot: "#009688" },
  "Cancelado":      { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", dot: "#e53935" },
};

/* ─── EstadoBadge ────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const c   = ESTADO_CONFIG[estado] || { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0", dot: "#bdbdbd" };
  const cls = `estado-badge estado--${estado.replace(/ /g, "-")}`;
  return (
    <span className={cls}>
      <span className="estado-badge__dot" />
      {estado}
    </span>
  );
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const bg =
    toast.type === "error" ? "#c62828" :
    toast.type === "warn"  ? "#e65100" :
                             "#2e7d32";
  return (
    <div className="toast" style={{ background: bg }}>
      <span style={{ fontSize: 15 }}>
        {toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓"}
      </span>
      {toast.message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — VER DETALLE
   ═══════════════════════════════════════════════════════════ */
function ModalVerPedido({ pedido, empleados, onClose, onEdit }) {
  const emp = empleados.find(e => e.id === pedido.idEmpleado);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">PEDIDO</p>
            <h2 className="modal-header__title">{pedido.numero}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={pedido.estado} />
            <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
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
            <div>
              <label className="form-label">Correo</label>
              <div className="field-input--disabled">{pedido.cliente?.correo || "—"}</div>
            </div>
            <div>
              <label className="form-label">Método de pago</label>
              <div className="field-input--disabled">{pedido.metodo_pago}</div>
            </div>
          </div>

          {/* Productos */}
          <p className="section-label">Productos</p>
          <div style={{ borderRadius: 10, border: "1px solid #e8f5e9", overflow: "hidden" }}>
            <table className="ver-productos-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: "center" }}>Cant.</th>
                  <th style={{ textAlign: "right" }}>Precio unit.</th>
                  <th style={{ textAlign: "right" }}>Subtotal</th>
                  <th style={{ textAlign: "center" }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(pedido.productosItems || []).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td style={{ textAlign: "center" }}>{p.cantidad}</td>
                    <td style={{ textAlign: "right" }}>{fmt(p.precio)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(p.precio * p.cantidad)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="ver-stock-dot"
                        style={{ background: p.stockOk ? "#43a047" : "#e53935" }}
                        title={p.stockOk ? "Stock OK" : "Sin stock suficiente"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="totales-box">
            <div className="totales-row"><span>Subtotal</span><span>{fmt(pedido.subtotal)}</span></div>
            {pedido.descuento > 0 && (
              <div className="totales-row totales-row--descuento">
                <span>Descuento</span><span>− {fmt(pedido.descuento)}</span>
              </div>
            )}
            <div className="totales-row totales-row--total">
              <span>Total</span><span>{fmt(pedido.total)}</span>
            </div>
          </div>

          {/* Entrega */}
          {pedido.domicilio && (
            <>
              <p className="section-label">Entrega a domicilio</p>
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Dirección</label>
                  <div className="field-input--disabled">{pedido.direccion_entrega || "—"}</div>
                </div>
                <div>
                  <label className="form-label">Domiciliario</label>
                  <div className="field-input--disabled">
                    {emp ? `${emp.nombre} ${emp.apellidos}` : "Sin asignar"}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Orden producción */}
          {pedido.orden_produccion && (
            <div className="info-box info-box--info">
              <span className="info-box__icon">🏭</span>
              <div className="info-box__text">
                <span className="info-box__label">Orden de producción activa</span>
                Este pedido tiene productos en fabricación.
              </div>
            </div>
          )}

          {/* Notas */}
          {pedido.notas && (
            <div className="info-box info-box--warn">
              <span className="info-box__icon">📝</span>
              <span className="info-box__text">{pedido.notas}</span>
            </div>
          )}

          <div className="info-box info-box--warn" style={{ marginTop: 0 }}>
            <span className="info-box__icon">📅</span>
            <span className="info-box__text">
              Fecha pedido: <strong>{pedido.fecha_pedido}</strong>
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {!["Entregado","Cancelado"].includes(pedido.estado) && (
            <button className="btn-save" onClick={() => { onClose(); onEdit(pedido); }}>
              ✎ Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — ELIMINAR PEDIDO
   ═══════════════════════════════════════════════════════════ */
function ModalEliminarPedido({ pedido, onClose, onConfirm }) {
  const [done, setDone] = useState(false);

  const bloqueo = ["Entregado"].includes(pedido.estado);

  if (bloqueo) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#ffebee", border: "1px solid #ef9a9a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>🚫</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, fontFamily: "var(--font-head)" }}>No se puede eliminar</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#616161" }}>
              Los pedidos entregados no se pueden eliminar. Cancélalo primero si fue un error.
            </p>
            <button className="btn-ghost" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#ffebee", border: "1px solid #ef9a9a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>🗑️</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, fontFamily: "var(--font-head)" }}>Eliminar pedido</h3>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#616161" }}>
            ¿Eliminar <strong>"{pedido.numero}"</strong>?
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9e9e9e" }}>Esta acción no se puede deshacer.</p>
          <div className="modal-footer modal-footer--center" style={{ padding: 0 }}>
            <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
            <button className="btn-danger" disabled={done} onClick={() => { setDone(true); setTimeout(() => onConfirm(pedido.id), 800); }}>
              {done ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function ModalAsignarDomiciliario({ pedido, empleados, onClose, onConfirm }) {
  const [empId, setEmpId] = useState(pedido.idEmpleado || "");
  const [error, setError] = useState("");
  const empActual = empleados.find(e => e.id === pedido.idEmpleado);

  const handleSubmit = () => {
    if (!empId) {
      setError("Selecciona un domiciliario");
      return;
    }
    const id = parseInt(empId, 10);
    if (pedido.idEmpleado && pedido.idEmpleado === id) {
      setError("El pedido ya tiene asignado este domiciliario");
      return;
    }
    onConfirm(pedido.id, id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Domicilio</p>
            <h2 className="modal-header__title">Asignar repartidor</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflow: "visible" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong>
          </p>
          <div className="info-box info-box--info" style={{ marginTop: 12 }}>
            <span className="info-box__icon">📍</span>
            <span className="info-box__text">{pedido.direccion_entrega || "Sin dirección"}</span>
          </div>

          {empActual && (
            <div className="info-box info-box--warn" style={{ marginTop: 12 }}>
              <span className="info-box__icon">🛵</span>
              <span className="info-box__text">
                Actual: <strong>{empActual.nombre} {empActual.apellidos}</strong>
              </span>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <label className="form-label">Seleccionar repartidor <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${error ? " error" : ""}`}
                value={empId}
                onChange={e => { setEmpId(e.target.value); setError(""); }}
              >
                <option value="">Seleccione…</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellidos}{e.id === pedido.idEmpleado ? " (actual)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="field-error">{error}</p>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSubmit}>Asignar repartidor</button>
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionPedidos() {
  /* ── Contexto ── */
  const {
    pedidos, crearPedido, editarPedido, eliminarPedido,
    cambiarEstadoPedido, asignarDomiciliario, generarOrdenProduccion,
    usuarios, ordenes,
  } = useApp();

  const navigate = useNavigate();

  /* Empleados activos disponibles para domicilios */
  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  /* ── UI state ── */
  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterTipo,   setFilterTipo]   = useState("todos");
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

  /* ── Filtrado ── */
  const filtered = pedidos.filter(p => {
    const q      = search.toLowerCase();
    const matchQ = [p.numero, p.cliente?.nombre, p.cliente?.correo, p.metodo_pago, p.estado]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || p.estado === filterEstado;
    const matchT =
      filterTipo === "todos"       ? true :
      filterTipo === "domicilio"   ? p.domicilio :
      filterTipo === "tienda"      ? !p.domicilio :
      filterTipo === "produccion"  ? p.orden_produccion : true;
    return matchQ && matchE && matchT;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => setPage(1), [search, filterEstado, filterTipo]);

  const hasFilter = filterEstado !== "todos" || filterTipo !== "todos";

  /* ── Handlers ── */
  const handleSave = (payload) => {
    if (payload.id) {
      editarPedido(payload);
      showToast(`Pedido ${payload.numero} actualizado`);
    } else {
      const numero = crearPedido(payload);
      showToast(`Pedido ${numero} creado`);
    }
    setModal(null);
  };

  const handleCambiarEstadoDirecto = (ped) => {
    const actualIdx = ESTADOS_FLUJO.indexOf(ped.estado);
    if (actualIdx === -1 || actualIdx >= ESTADOS_FLUJO.length - 2) {
      showToast("No se puede avanzar más el estado desde aquí", "warn");
      return;
    }
    const nuevoEstado = ESTADOS_FLUJO[actualIdx + 1];
    cambiarEstadoPedido(ped.id, nuevoEstado);
    showToast(`Pedido ${ped.numero} avanzado a: ${nuevoEstado}`);
  };

  const handleEliminar = (id) => {
    eliminarPedido(id);
    showToast("Pedido eliminado", "error");
    setModal(null);
  };

  const handleAsignarDomiciliario = (pedidoId, empleadoId) => {
    asignarDomiciliario(pedidoId, empleadoId);
    const empleado = empleados.find(e => e.id === empleadoId);
    showToast(`Pedido asignado a ${empleado?.nombre} ${empleado?.apellidos}`);
    setModal(null);
  };

  /* ── Validaciones antes de abrir modales ── */
  const abrirDomicilio = (ped) => {
    if (["Entregado", "Cancelado"].includes(ped.estado)) {
      showToast("No se puede reasignar domiciliario a este pedido", "warn");
      return;
    }
    setModal({ type: "domicilio", pedido: ped });
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Pedidos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por número, cliente, estado…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filtros */}
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>

            {showFilter && (
              <div className="filter-dropdown filter-dropdown--wide" style={{ minWidth: 340 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p className="filter-section-title">Estado</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
                      {[{ val: "todos", label: "Todos", dot: "#bdbdbd" },
                        ...ESTADOS_FLUJO.map(e => ({ val: e, label: e, dot: ESTADO_CONFIG[e]?.dot }))
                      ].map(f => (
                        <button
                          key={f.val}
                          className={`filter-option${filterEstado === f.val ? " active" : ""}`}
                          onClick={() => { setFilterEstado(f.val); setPage(1); }}
                        >
                          <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderLeft: "1px solid #f0f0f0", paddingLeft: 12 }}>
                    <p className="filter-section-title">Tipo</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 2 }}>
                      {[
                        { val: "todos",      label: "Todos",           dot: "#bdbdbd" },
                        { val: "domicilio",  label: "Con domicilio",   dot: "#8e24aa" },
                        { val: "tienda",     label: "Retiro en tienda",dot: "#1976d2" },
                        { val: "produccion", label: "En producción",   dot: "#1565c0" },
                      ].map(f => (
                        <button
                          key={f.val}
                          className={`filter-option${filterTipo === f.val ? " active" : ""}`}
                          onClick={() => { setFilterTipo(f.val); setPage(1); setShowFilter(false); }}
                        >
                          <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {hasFilter && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
                    <button 
                      onClick={() => { setFilterEstado("todos"); setFilterTipo("todos"); setShowFilter(false); }}
                      style={{ fontSize: 11, fontWeight: 700, color: "#c62828", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >Limpiar filtros</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Nuevo pedido <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Entrega</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">📦</div>
                      <p className="empty-state__text">
                        {hasFilter || search ? "Sin pedidos que coincidan." : "No hay pedidos registrados aún."}
                      </p>
                    </div>
                  </td></tr>
                ) : paged.map((ped, idx) => {
                  const emp = empleados.find(e => e.id === ped.idEmpleado);
                  const canAdvance = ESTADOS_FLUJO.indexOf(ped.estado) < ESTADOS_FLUJO.length - 2;
                  return (
                    <tr key={ped.id} className="tbl-row">
                      <td><span className="row-num">{String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                      <td><div className="pedido-num">{ped.numero}</div></td>
                      <td>
                        <div className="client-name">{ped.cliente?.nombre || "—"}</div>
                        <div className="client-email">{ped.cliente?.correo || ""}</div>
                      </td>
                      <td><span className="date-badge">{ped.fecha_pedido}</span></td>
                      <td>
                        <div className="total-amount">{fmt(ped.total)}</div>
                        <div className="total-method">{ped.metodo_pago}</div>
                      </td>
                      <td>
                        {ped.domicilio ? (
                          <>
                            <div className="tipo-domicilio">🛵 Domicilio</div>
                            <div className="tipo-sub">{emp ? `${emp.nombre} ${emp.apellidos.split(" ")[0]}` : "Sin asignar"}</div>
                          </>
                        ) : (
                          <div className="tipo-tienda">🏪 Tienda</div>
                        )}
                      </td>
                      <td><EstadoBadge estado={ped.estado} /></td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view" title="Ver detalle" onClick={() => setModal({ type: "ver", pedido: ped })}>👁</button>
                          
                          {canAdvance && (
                            <button className="act-btn act-btn--success" title="Avanzar estado" onClick={() => handleCambiarEstadoDirecto(ped)}>🔄</button>
                          )}

                          <button className="act-btn act-btn--edit" title="Editar pedido" onClick={() => setModal({ type: "editar", pedido: ped })}>✎</button>

                          {ped.domicilio && (
                            <button className="act-btn act-btn--domicilio" title="Asignar domiciliario" onClick={() => abrirDomicilio(ped)}>🛵</button>
                          )}

                          {ped.orden_produccion && (
                            <button className="act-btn act-btn--produccion" title="Ver orden de producción" onClick={() => {
                              navigate('/ordenes-produccion');
                            }}>🏭</button>
                          )}

                          <button className="act-btn act-btn--delete" title="Eliminar pedido" onClick={() => setModal({ type: "eliminar", pedido: ped })}>🗑️</button>
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
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "pedido" : "pedidos"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {modal?.type === "crear" && <CrearPedido onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "editar" && <EditarPedido pedido={modal.pedido} onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "ver" && <ModalVerPedido pedido={modal.pedido} empleados={empleados} onClose={() => setModal(null)} onEdit={ped => setModal({ type: "editar", pedido: ped })} />}
      {modal?.type === "eliminar" && <ModalEliminarPedido pedido={modal.pedido} onClose={() => setModal(null)} onConfirm={handleEliminar} />}
      
      {modal?.type === "verOrden" && modal.orden && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-header__eyebrow">PRODUCCIÓN</p>
                <h2 className="modal-header__title">{modal.orden.id}</h2>
              </div>
              <button onClick={() => setModal(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9e9e9e" }}>Estado</span>
                <span className="estado-badge" style={{ background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9" }}>{modal.orden.estado}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", marginBottom: 6 }}>Productos</div>
              {(modal.orden.productos || []).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#f9fdf9", borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                  <span>{p.nombre}</span><strong>× {p.cantidad}</strong>
                </div>
              ))}
            </div>
            <div className="modal-footer"><button onClick={() => setModal(null)} className="btn-ghost">Cerrar</button></div>
          </div>
        </div>
      )}

      {modal?.type === "domicilio" && modal.pedido && (
        <ModalAsignarDomiciliario
          pedido={modal.pedido}
          empleados={empleados}
          onClose={() => setModal(null)}
          onConfirm={handleAsignarDomiciliario}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
