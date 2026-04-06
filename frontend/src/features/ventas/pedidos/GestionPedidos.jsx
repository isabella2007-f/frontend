import { useState, useEffect, useRef } from "react";
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
   MODAL — CAMBIAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function ModalCambiarEstado({ pedido, onClose, onConfirm }) {
  const [nuevo, setNuevo] = useState(pedido.estado);
  const actualIdx = ESTADOS_FLUJO.indexOf(pedido.estado);

  const validos = ESTADOS_FLUJO.filter((e, i) => {
    if (e === "Cancelado") return !["Entregado", "Cancelado"].includes(pedido.estado);
    return i >= actualIdx;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">ACTUALIZAR</p>
            <h2 className="modal-header__title">Cambiar estado</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong> · Estado actual: <EstadoBadge estado={pedido.estado} />
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {validos.map(e => {
              const c = ESTADO_CONFIG[e];
              const sel = nuevo === e;
              return (
                <button
                  key={e}
                  className={`estado-option-btn${sel ? " selected" : ""}`}
                  onClick={() => setNuevo(e)}
                  style={sel ? { borderColor: c.border, background: c.bg } : {}}
                >
                  <span className="estado-option-btn__dot" style={{ background: c.dot }} />
                  <span className="estado-option-btn__label" style={{ color: sel ? c.color : "#424242", fontWeight: sel ? 700 : 500 }}>
                    {e}
                  </span>
                  {e === pedido.estado && (
                    <span className="estado-option-btn__actual">actual</span>
                  )}
                </button>
              );
            })}
          </div>

          {nuevo === "Cancelado" && pedido.estado !== "Cancelado" && (
            <div className="info-box info-box--danger" style={{ marginTop: 4 }}>
              <span className="info-box__icon">⚠️</span>
              <span className="info-box__text">Esta acción no se puede deshacer fácilmente.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="btn-save"
            disabled={nuevo === pedido.estado}
            onClick={() => onConfirm(pedido.id, nuevo)}
          >
            Guardar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — ASIGNAR DOMICILIARIO
   ═══════════════════════════════════════════════════════════ */
function ModalAsignarDomicilio({ pedido, empleados, onClose, onConfirm }) {
  const [empId, setEmpId] = useState(pedido.idEmpleado || "");
  const [error, setError] = useState("");

  /* Bloqueo si no tiene domicilio */
  if (!pedido.domicilio) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fff8e1", border: "1px solid #ffe082", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, fontFamily: "var(--font-head)" }}>Sin domicilio</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#616161" }}>Este pedido no requiere domicilio.</p>
            <button className="btn-ghost" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  const empActual = empleados.find(e => e.id === pedido.idEmpleado);

  const handleConfirm = () => {
    if (!empId) { setError("Selecciona un domiciliario"); return; }
    onConfirm(pedido.id, parseInt(empId));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">LOGÍSTICA</p>
            <h2 className="modal-header__title">Asignar domiciliario</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong>
          </p>

          <div className="info-box info-box--success">
            <span className="info-box__icon">📍</span>
            <span className="info-box__text">{pedido.direccion_entrega}</span>
          </div>

          {empActual && (
            <div className="info-box info-box--warn">
              <span className="info-box__icon">👷</span>
              <span className="info-box__text">
                Domiciliario actual: <strong>{empActual.nombre} {empActual.apellidos}</strong>
              </span>
            </div>
          )}

          <div className="field-wrap">
            <label className="field-label">Seleccionar empleado <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${error ? " error" : ""}`}
                value={empId}
                onChange={e => { setEmpId(e.target.value); setError(""); }}
              >
                <option value="">Seleccione un empleado…</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellidos}
                  </option>
                ))}
              </select>
              <div className="select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {error && <span className="field-error">{error}</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleConfirm}>Asignar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — ORDEN DE PRODUCCIÓN
   ═══════════════════════════════════════════════════════════ */
function ModalOrdenProduccion({ pedido, onClose, onConfirm }) {
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [notas, setNotas]               = useState("");
  const [errors, setErrors]             = useState({});
  const [done, setDone]                 = useState(false);

  const sinStock = (pedido.productosItems || []).filter(
    p => !p.stockOk || p.cantidad > p.stockActual
  );
  const todoOk = sinStock.length === 0;

  const handleConfirm = () => {
    if (todoOk) { onClose(); return; }
    if (!fechaEntrega) { setErrors({ fechaEntrega: "Requerido" }); return; }
    setDone(true);
    setTimeout(() => onConfirm(pedido.id, { fechaEntrega, notas }), 900);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>

        <div className="modal-header modal-header--blue">
          <div>
            <p className="modal-header__eyebrow">PRODUCCIÓN</p>
            <h2 className="modal-header__title modal-header__title--blue">Orden de producción</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12, color: "#616161" }}>
            Pedido: <strong>{pedido.numero}</strong> · {pedido.cliente?.nombre}
          </p>

          {todoOk ? (
            <div className="sinstock-empty">
              <div className="sinstock-empty__icon">✅</div>
              <p className="sinstock-empty__title">Todos los productos tienen stock</p>
              <p className="sinstock-empty__sub">No es necesario generar una orden de producción</p>
            </div>
          ) : (
            <>
              <div>
                <label className="form-label" style={{ marginBottom: 6 }}>Productos sin stock suficiente</label>
                <div className="sinstock-list">
                  {sinStock.map((p, i) => (
                    <div key={i} className="sinstock-item">
                      <span className="sinstock-item__name">{p.nombre}</span>
                      <span className="sinstock-item__badge">
                        ✕ {p.stockActual === 0 ? "Sin stock" : `Solo ${p.stockActual} disp.`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="field-wrap">
                <label className="field-label">Fecha de entrega estimada <span className="required">*</span></label>
                <input
                  type="date"
                  className={`field-input${errors.fechaEntrega ? " error" : ""}`}
                  value={fechaEntrega}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => { setFechaEntrega(e.target.value); setErrors({}); }}
                />
                {errors.fechaEntrega && <span className="field-error">{errors.fechaEntrega}</span>}
              </div>

              <div className="field-wrap">
                <label className="field-label">Notas de producción</label>
                <textarea
                  className="field-textarea"
                  rows={2}
                  placeholder="Instrucciones especiales, observaciones…"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {todoOk ? "Cerrar" : "Cancelar"}
          </button>
          {!todoOk && (
            <button className="btn-blue" onClick={handleConfirm} disabled={done}>
              {done ? "Generando…" : "🏭 Generar orden"}
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

  const handleCambiarEstado = (id, nuevoEstado) => {
    cambiarEstadoPedido(id, nuevoEstado);
    showToast(`Estado actualizado a "${nuevoEstado}"`);
    setModal(null);
  };

  const handleAsignarDomicilio = (id, empId) => {
    asignarDomiciliario(id, empId);
    const emp = empleados.find(e => e.id === empId);
    showToast(`Domiciliario asignado: ${emp?.nombre} ${emp?.apellidos}`);
    setModal(null);
  };

  const handleOrdenProduccion = (id, datos) => {
    generarOrdenProduccion(id, datos);
    showToast("Orden de producción generada");
    setModal(null);
  };

  const handleEliminar = (id) => {
    eliminarPedido(id);
    showToast("Pedido eliminado", "error");
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

  const abrirProduccion = (ped) => {
    if (ped.estado === "Cancelado") {
      showToast("No se puede generar orden para un pedido cancelado", "warn");
      return;
    }
    if (ped.orden_produccion) {
      showToast("Este pedido ya tiene una orden de producción activa", "warn");
      return;
    }
    setModal({ type: "produccion", pedido: ped });
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
              <div className="filter-dropdown" style={{ minWidth: 185 }}>
                <p className="filter-section-title">Estado</p>
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

                <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
                <p className="filter-section-title">Tipo</p>
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
                  const sinStock = (ped.productosItems || []).some(p => !p.stockOk);
                  return (
                    <tr key={ped.id} className="tbl-row">
                      {/* Nº */}
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* Pedido */}
                      <td>
                        <div className="pedido-num">{ped.numero}</div>
                      </td>

                      {/* Cliente */}
                      <td>
                        <div className="client-name">{ped.cliente?.nombre || "—"}</div>
                        <div className="client-email">{ped.cliente?.correo || ""}</div>
                      </td>

                      {/* Fecha */}
                      <td><span className="date-badge">{ped.fecha_pedido}</span></td>

                      {/* Total */}
                      <td>
                        <div className="total-amount">{fmt(ped.total)}</div>
                        <div className="total-method">{ped.metodo_pago}</div>
                      </td>

                      {/* Entrega */}
                      <td>
                        {ped.domicilio ? (
                          <>
                            <div className="tipo-domicilio">🛵 Domicilio</div>
                            <div className="tipo-sub">
                              {emp ? `${emp.nombre} ${emp.apellidos}` : "Sin asignar"}
                            </div>
                          </>
                        ) : (
                          <div className="tipo-tienda">🏪 Tienda</div>
                        )}
                      </td>

                      {/* Estado */}
                      <td><EstadoBadge estado={ped.estado} /></td>

                      {/* Acciones */}
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"
                            title="Ver detalle"
                            onClick={() => setModal({ type: "ver", pedido: ped })}>👁</button>

                          <button className="act-btn act-btn--edit"
                            title="Editar pedido"
                            onClick={() => setModal({ type: "editar", pedido: ped })}>✎</button>

                          <button className="act-btn act-btn--domicilio"
                            title="Asignar domiciliario"
                            onClick={() => abrirDomicilio(ped)}>🛵</button>

                          {/* Solo mostrar 🏭 si tiene orden de producción activa */}
                          {ped.orden_produccion && (
                            <button className="act-btn act-btn--produccion"
                              title="Ver orden de producción"
                              onClick={() => {
                                const orden = ordenes.find(o => o.idPedido === ped.id);
                                if (orden) setModal({ type: "verOrden", orden });
                              }}>🏭</button>
                          )}

                          <button className="act-btn act-btn--delete"
                            title="Eliminar pedido"
                            onClick={() => setModal({ type: "eliminar", pedido: ped })}>🗑️</button>
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
              {filtered.length} {filtered.length === 1 ? "pedido" : "pedidos"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {modal?.type === "crear" && (
        <CrearPedido onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.type === "editar" && (
        <EditarPedido pedido={modal.pedido} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.type === "ver" && (
        <ModalVerPedido
          pedido={modal.pedido}
          empleados={empleados}
          onClose={() => setModal(null)}
          onEdit={ped => setModal({ type: "editar", pedido: ped })}
        />
      )}
      {modal?.type === "estado" && (
        <ModalCambiarEstado
          pedido={modal.pedido}
          onClose={() => setModal(null)}
          onConfirm={handleCambiarEstado}
        />
      )}
      {modal?.type === "domicilio" && (
        <ModalAsignarDomicilio
          pedido={modal.pedido}
          empleados={empleados}
          onClose={() => setModal(null)}
          onConfirm={handleAsignarDomicilio}
        />
      )}
      {/* Modal ver orden de producción desde pedido */}
      {modal?.type === "verOrden" && modal.orden && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440,
            overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,#e3f2fd,#fff)" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#9e9e9e" }}>ORDEN DE PRODUCCIÓN</p>
                <h2 style={{ margin: 0, fontFamily: "var(--font-head,Nunito)", fontSize: 17, fontWeight: 800, color: "#1565c0" }}>{modal.orden.id}</h2>
              </div>
              <button onClick={() => setModal(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e0e0e0", background: "transparent", cursor: "pointer", color: "#757575", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Estado */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.8px" }}>Estado</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 20, padding: "3px 10px",
                  fontSize: 11, fontWeight: 700, border: "1px solid #90caf9", background: "#e3f2fd", color: "#1565c0",
                }}>{modal.orden.estado}</span>
              </div>
              {/* Productos */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>Productos</div>
                {(modal.orden.productos || []).map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#f9fdf9", borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                    <span style={{ fontWeight: 700, color: "#1565c0" }}>× {p.cantidad}</span>
                  </div>
                ))}
              </div>
              {/* Fechas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Inicio</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#424242" }}>{modal.orden.fechaInicio || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Entrega estimada</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: modal.orden.fechaEntrega ? "#c62828" : "#424242" }}>{modal.orden.fechaEntrega || "—"}</div>
                </div>
              </div>
              {modal.orden.notas && (
                <div style={{ padding: "8px 12px", background: "#fff8e1", borderRadius: 8, border: "1px solid #ffe082", fontSize: 12, color: "#f9a825", fontWeight: 600 }}>
                  📝 {modal.orden.notas}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f5f5f5" }}>
              <button onClick={() => setModal(null)} style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e0e0e0", background: "transparent", color: "#616161", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "produccion" && (
        <ModalOrdenProduccion
          pedido={modal.pedido}
          onClose={() => setModal(null)}
          onConfirm={handleOrdenProduccion}
        />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarPedido
          pedido={modal.pedido}
          onClose={() => setModal(null)}
          onConfirm={handleEliminar}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}