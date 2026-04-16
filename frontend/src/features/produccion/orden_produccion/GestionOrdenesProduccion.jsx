import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./OrdenesProduccion.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

const PER_PAGE = 5;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_CONFIG = {
  "Pendiente":  { bg: "#fff8e1", color: "#f9a825", border: "#ffe082", dot: "#f9a825",  desc: "Esperando inicio de fabricación" },
  "En proceso": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9", dot: "#1976d2",  desc: "Actualmente en fabricación" },
  "Pausada":    { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8", dot: "#8e24aa",  desc: "Temporalmente detenida" },
  "Completada": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", dot: "#43a047",  desc: "Fabricación finalizada — stock actualizado" },
  "Cancelada":  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", dot: "#e53935",  desc: "Orden cancelada" },
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const urgenciaFecha = (fechaISO) => {
  if (!fechaISO) return "normal";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(fechaISO + "T00:00:00") - hoy) / 86_400_000);
  if (dias < 0)  return "vencida";
  if (dias <= 1) return "urgente";
  if (dias <= 3) return "pronto";
  return "normal";
};

/* ─── Componentes ────────────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════
   MODAL VER DETALLES
   ═══════════════════════════════════════════════════════════ */
function ModalDetallesOrden({ orden, empleados, onClose, onEdit }) {
  if (!orden) return null;
  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));
  const cfg = ESTADO_CONFIG[orden.estado] || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Detalle de orden</p>
            <h2 className="modal-header__title">{orden.id}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

          {/* Columna izquierda */}
          <div>
            <p className="section-label" style={{ marginTop: 0 }}>Información general</p>

            <div className="detail-row">
              <span className="detail-label">Estado</span>
              <EstadoBadge estado={orden.estado} />
            </div>
            <div className="detail-row">
              <span className="detail-label">Responsable</span>
              <span className="detail-value">
                {empleado ? `${empleado.nombre} ${empleado.apellidos || ""}` : <em style={{ color: "#9e9e9e" }}>Sin asignar</em>}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Fecha de entrega</span>
              <span className={`date-badge ${urgenciaFecha(orden.fechaEntrega)}`}>
                {fmtFecha(orden.fechaEntrega)}
              </span>
            </div>
            {orden.numeroPedido && (
              <div className="detail-row">
                <span className="detail-label">Pedido vinculado</span>
                <span className="detail-value" style={{ color: "#1565c0", fontWeight: 700 }}>{orden.numeroPedido}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Costo estimado</span>
              <span className="detail-value" style={{ fontWeight: 800, color: "#2e7d32", fontSize: 15 }}>{fmt(orden.costo)}</span>
            </div>

            {orden.notas && (
              <>
                <p className="section-label">Notas / Instrucciones</p>
                <div style={{
                  background: "#f9f9f9",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#424242",
                  lineHeight: 1.6,
                }}>
                  {orden.notas}
                </div>
              </>
            )}

            {/* Descripción de estado */}
            {cfg.desc && (
              <div className="info-box info-box--info" style={{ marginTop: 16 }}>
                <span className="info-box__icon">ℹ️</span>
                <span className="info-box__text">{cfg.desc}</span>
              </div>
            )}
          </div>

          {/* Columna derecha */}
          <div>
            <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
            <div className="selected-prods-list" style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
              {(orden.productos || []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#bdbdbd", textAlign: "center", padding: "18px 0" }}>Sin productos.</p>
              ) : (orden.productos || []).map((p, i) => (
                <div key={i} className="prod-edit-item" style={{ cursor: "default" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "#9e9e9e" }}>{fmt(p.precio)} c/u</div>
                  </div>
                  <span style={{
                    background: "#e3f2fd",
                    color: "#1565c0",
                    borderRadius: 6,
                    padding: "2px 10px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}>×{p.cantidad}</span>
                </div>
              ))}
            </div>

            <div className="order-summary-box">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#757575" }}>
                <span>Total unidades:</span>
                <strong style={{ color: "#1a1a1a" }}>
                  {(orden.productos || []).reduce((acc, x) => acc + (x.cantidad || 0), 0)} uds
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>
                <span>Costo estimado:</span>
                <span>{fmt(orden.costo)}</span>
              </div>
            </div>

            {/* Insumos */}
            {(orden.insumos || []).length > 0 && (
              <>
                <p className="section-label">Insumos requeridos</p>
                <div className="insumos-preview-list">
                  {orden.insumos.map(ins => (
                    <div key={ins.idInsumo} className={`insumo-mini-card${!ins.stockOk ? " no-stock" : ""}`}>
                      <span style={{ fontWeight: 600 }}>{ins.nombre}</span>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <strong style={{ fontSize: 12 }}>{ins.cantidad} {ins.unidad}</strong>
                        {!ins.stockOk && <span title="Stock insuficiente" style={{ fontSize: 12 }}>⚠️</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          <button className="btn-save" onClick={() => { onClose(); onEdit(orden); }}>
            ✎ Editar Orden
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CAMBIAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function ModalCambiarEstado({ orden, onClose, onConfirm }) {
  const [estadoSel, setEstadoSel] = useState(orden?.estado || "Pendiente");
  if (!orden) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Cambiar estado</p>
            <h2 className="modal-header__title">{orden.id}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="section-label" style={{ marginTop: 0 }}>Selecciona el nuevo estado</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ESTADOS_ORDEN.map(est => {
              const cfg = ESTADO_CONFIG[est] || {};
              const sel = estadoSel === est;
              return (
                <button
                  key={est}
                  onClick={() => setEstadoSel(est)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `2px solid ${sel ? cfg.border || "#bdbdbd" : "#eeeeee"}`,
                    background: sel ? (cfg.bg || "#f5f5f5") : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .15s",
                  }}
                >
                  <span style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: cfg.dot || "#bdbdbd",
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: cfg.color || "#424242" }}>{est}</div>
                    {cfg.desc && <div style={{ fontSize: 12, color: "#9e9e9e", marginTop: 2 }}>{cfg.desc}</div>}
                  </div>
                  {sel && (
                    <span style={{ marginLeft: "auto", color: cfg.color || "#424242", fontSize: 16, fontWeight: 800 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-save"
            disabled={estadoSel === orden.estado}
            onClick={() => onConfirm(orden.id, estadoSel)}
          >
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CONFIRMAR ELIMINACIÓN
   ═══════════════════════════════════════════════════════════ */
function ModalEliminarOrden({ orden, onClose, onConfirm }) {
  if (!orden) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Confirmar eliminación</p>
            <h2 className="modal-header__title" style={{ color: "#c62828" }}>Eliminar orden</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{
            background: "#ffebee",
            border: "1px solid #ef9a9a",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}>
            <p style={{ fontWeight: 700, color: "#c62828", marginBottom: 6, fontSize: 14 }}>
              ¿Eliminar la orden <strong>{orden.id}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#e57373", margin: 0, lineHeight: 1.5 }}>
              Esta acción es irreversible. Se perderán todos los datos de esta orden de producción.
            </p>
          </div>

          {/* Resumen rápido */}
          <div style={{ fontSize: 13, color: "#616161", lineHeight: 2 }}>
            <div><strong>Productos:</strong> {(orden.productos || []).map(p => `${p.nombre} ×${p.cantidad}`).join(", ") || "—"}</div>
            <div><strong>Estado actual:</strong> <EstadoBadge estado={orden.estado} /></div>
            <div><strong>Costo estimado:</strong> {fmt(orden.costo)}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-save"
            style={{ background: "#c62828" }}
            onClick={() => onConfirm(orden.id)}
          >
            Sí, eliminar orden
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL FORMULARIO — CREAR / EDITAR ORDEN
   ═══════════════════════════════════════════════════════════ */
/* ─── BARRA DE PASOS ─────────────────────────────────────── */
const STEPS_WIZ = ["Datos Generales", "Productos e Insumos"];

function StepsBarWiz({ current }) {
  return (
    <div className="wizard-steps-bar">
      {STEPS_WIZ.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="wizard-step-item">
            <div className={`wizard-step-circle${done ? " done" : active ? " active" : ""}`}>
              {done ? "✓" : idx}
            </div>
            <span className={`wizard-step-label${active ? " active" : done ? " done" : ""}`}>
              {label}
            </span>
            {i < STEPS_WIZ.length - 1 && (
              <div className={`wizard-step-line${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModalFormOrden({ orden, onClose, onSave }) {
  const {
    productos   = [],
    usuarios    = [],
    insumos: allInsumos = [],
    UNIDADES_MEDIDA = [],
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [form, setForm] = useState(() => ({
    idEmpleado:   orden?.idEmpleado   ?? "",
    fechaEntrega: orden?.fechaEntrega ?? "",
    notas:        orden?.notas        ?? "",
    estado:       orden?.estado       ?? "Pendiente",
    productos:    orden?.productos    ?? [],
    insumos:      orden?.insumos      ?? [],
    costo:        orden?.costo        ?? 0,
  }));

  const [errors, setErrors] = useState({});
  const [step,   setStep]   = useState(1);

  useEffect(() => {
    if (!form.productos.length) {
      setForm(p => ({ ...p, insumos: [], costo: 0 }));
      return;
    }

    const insumosMap = {};
    let totalCosto   = 0;

    form.productos.forEach(item => {
      const prod = productos.find(p => p.id === item.idProducto);
      if (!prod) return;

      totalCosto += (prod.precio || 0) * item.cantidad;

      (prod.ficha?.insumos || []).forEach(fi => {
        const ins = allInsumos.find(i => i.id === fi.idInsumo || i.nombre === fi.nombre);
        if (!ins) return;

        const cantNecesaria = (Number(fi.cantidad) || 0) * item.cantidad;

        if (insumosMap[ins.id]) {
          insumosMap[ins.id].cantidad += cantNecesaria;
        } else {
          const unidad = UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und";
          insumosMap[ins.id] = {
            idInsumo: ins.id,
            nombre:   ins.nombre,
            cantidad: cantNecesaria,
            unidad,
            stockOk:  false,
          };
        }
      });
    });

    const insumosArray = Object.values(insumosMap).map(ins => {
      const real = allInsumos.find(i => i.id === ins.idInsumo);
      return { ...ins, stockOk: (real?.stockActual || 0) >= ins.cantidad };
    });

    setForm(p => ({ ...p, insumos: insumosArray, costo: totalCosto }));
  }, [form.productos, productos, allInsumos, UNIDADES_MEDIDA]);

  const addProducto = (idStr) => {
    const id = Number(idStr); if (!id) return;
    const prod = productos.find(x => x.id === id); if (!prod) return;
    if (form.productos.some(x => x.idProducto === id)) return;
    setForm(f => ({
      ...f,
      productos: [...f.productos, { idProducto: prod.id, nombre: prod.nombre, cantidad: 1, precio: prod.precio || 0 }],
    }));
  };

  const updateCant = (idProducto, cant) => {
    const val = Math.max(1, Number(cant) || 1);
    setForm(f => ({ ...f, productos: f.productos.map(x => x.idProducto === idProducto ? { ...x, cantidad: val } : x) }));
  };

  const removeProd = (idProducto) => {
    setForm(f => ({ ...f, productos: f.productos.filter(x => x.idProducto !== idProducto) }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.fechaEntrega) e.fecha = "Requerido";
    }
    if (s === 2) {
      if (form.productos.length === 0) e.productos = "Agrega productos";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleSave = () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: orden?.id });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">{orden ? `Editar Orden ${orden.id}` : "Nueva Orden"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "16px 24px 0" }}>
          <StepsBarWiz current={step} />
        </div>

        <div className="modal-body" style={{ minHeight: 280 }}>
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Datos Generales</p>
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <select className="field-input" value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: Number(e.target.value) }))}>
                  <option value="">— Sin asignar —</option>
                  {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Entrega <span className="required">*</span></label>
                  <input type="date" className={`field-input${errors.fecha ? " error" : ""}`} value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="field-input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    {ESTADOS_ORDEN.map(est => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="field-input" rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Instrucciones..." />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
              <select className="field-input" onChange={e => { addProducto(e.target.value); e.target.value = ""; }}>
                <option value="">+ Agregar producto...</option>
                {productos.filter(p => p.activo !== false).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <div className="prod-list-mini" style={{ maxHeight: 120, overflowY: "auto", marginTop: 10 }}>
                {form.productos.map(p => (
                  <div key={p.idProducto} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.nombre}</span>
                    <input type="number" className="qty-input" value={p.cantidad} onChange={e => updateCant(p.idProducto, e.target.value)} style={{ width: 50 }} />
                    <button onClick={() => removeProd(p.idProducto)} className="btn-ghost" style={{ padding: "2px 6px" }}>✕</button>
                  </div>
                ))}
              </div>
              <p className="section-label">Insumos necesarios</p>
              <div className="insumos-grid-mini" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 100, overflowY: "auto" }}>
                {form.insumos.map(ins => (
                  <div key={ins.idInsumo} style={{ fontSize: 11, padding: 4, background: ins.stockOk ? "#f1f8f1" : "#fff5f5", borderRadius: 6 }}>
                    {ins.nombre}: <strong>{ins.cantidad} {ins.unidad}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1 ? <button className="btn-ghost" onClick={() => setStep(1)}>← Atrás</button> : <button className="btn-ghost" onClick={onClose}>Cancelar</button>}
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2 ? <button className="btn-save" onClick={handleNext}>Siguiente →</button> : <button className="btn-save" onClick={handleSave}>{orden ? "Guardar cambios" : "Crear orden"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionOrdenesProduccion() {
  const {
    ordenes            = [],
    cambiarEstadoOrden,
    crearOrdenProduccion,
    editarOrdenProduccion,
    eliminarOrdenProduccion,   // ← nueva función esperada en AppContext
    usuarios           = [],
    pedidos            = [],
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  // modal.type: "form" | "detalles" | "estado" | "eliminar"
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase();
    const matchQ = [
      String(o.id ?? ""),
      String(o.numeroPedido ?? ""),
      ...(o.productos || []).map(p => p.nombre || ""),
      empleados.find(e => e.id === o.idEmpleado)?.nombre || "",
    ].some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || o.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  /* ── Handlers ── */
  const handleSaveOrder = (data) => {
    if (data.id) {
      editarOrdenProduccion(data);
      showToast("Orden actualizada correctamente");
    } else {
      crearOrdenProduccion(data);
      showToast("Nueva orden creada");
    }
    setModal(null);
  };

  const handleCambiarEstado = (idOrden, nuevoEstado) => {
    cambiarEstadoOrden(idOrden, nuevoEstado);
    showToast(`Estado cambiado a "${nuevoEstado}"`);
    setModal(null);
  };

  const handleEliminar = (idOrden) => {
    if (eliminarOrdenProduccion) {
      eliminarOrdenProduccion(idOrden);
    }
    showToast("Orden eliminada", "warn");
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Órdenes de Producción</h1>
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
              placeholder="Buscar orden, producto, empleado..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${filterEstado !== "todos" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 180 }}>
                <p className="filter-section-title">Estado</p>
                {["todos", ...ESTADOS_ORDEN].map(f => (
                  <button
                    key={f}
                    className={`filter-option${filterEstado === f ? " active" : ""}`}
                    onClick={() => { setFilterEstado(f); setPage(1); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: ESTADO_CONFIG[f]?.dot || "#bdbdbd" }} />
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "form" })}>
            Agregar Orden <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Orden</th>
                  <th>Productos</th>
                  <th>Responsable</th>
                  <th>Fecha entrega</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <p className="empty-state__text">No se encontraron órdenes.</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((orden, idx) => {
                  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));
                  return (
                    <tr key={orden.id} className="tbl-row">
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="orden-num">{orden.id}</div>
                        {orden.numeroPedido && (
                          <div style={{ fontSize: 10, color: "#1565c0", fontWeight: 700 }}>
                            {orden.numeroPedido}
                          </div>
                        )}
                      </td>
                      <td>
                        {(orden.productos || []).map((p, i) => (
                          <div key={i} className="prod-name">
                            {p.nombre} <span className="prod-qty">×{p.cantidad}</span>
                          </div>
                        ))}
                      </td>
                      <td>
                        {empleado
                          ? <span className="emp-cell">{empleado.nombre}</span>
                          : <span className="emp-cell--none">Sin asignar</span>
                        }
                      </td>
                      <td>
                        <span className={`date-badge ${urgenciaFecha(orden.fechaEntrega)}`}>
                          {fmtFecha(orden.fechaEntrega)}
                        </span>
                      </td>
                      <td>{fmt(orden.costo)}</td>
                      <td><EstadoBadge estado={orden.estado} /></td>
                      <td>
                        <div className="actions-cell">
                          {/* Ver detalles */}
                          <button
                            className="act-btn act-btn--view"
                            title="Ver detalles"
                            onClick={() => setModal({ type: "detalles", orden })}
                          >👁</button>

                          {/* Editar */}
                          <button
                            className="act-btn act-btn--edit"
                            title="Editar orden"
                            onClick={() => setModal({ type: "form", orden })}
                          >✎</button>

                          {/* Cambiar estado */}
                          <button
                            className="act-btn act-btn--status"
                            title="Cambiar estado"
                            onClick={() => setModal({ type: "estado", orden })}
                          >🔄</button>

                          {/* Eliminar */}
                          <button
                            className="act-btn act-btn--delete"
                            title="Eliminar orden"
                            onClick={() => setModal({ type: "eliminar", orden })}
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-count">
                {filtered.length} órdenes · página {safePage} de {totalPages}
              </span>
              <div className="pagination-btns">
                <button
                  className="pg-btn-arrow"
                  disabled={safePage === 1}
                  onClick={() => setPage(p => p - 1)}
                >‹</button>
                <span className="pg-pill">{safePage}</span>
                <button
                  className="pg-btn-arrow"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      {modal?.type === "form" && (
        <ModalFormOrden
          orden={modal.orden}
          onClose={() => setModal(null)}
          onSave={handleSaveOrder}
        />
      )}

      {modal?.type === "detalles" && (
        <ModalDetallesOrden
          orden={modal.orden}
          empleados={empleados}
          onClose={() => setModal(null)}
          onEdit={(orden) => setModal({ type: "form", orden })}
        />
      )}

      {modal?.type === "estado" && (
        <ModalCambiarEstado
          orden={modal.orden}
          onClose={() => setModal(null)}
          onConfirm={handleCambiarEstado}
        />
      )}

      {modal?.type === "eliminar" && (
        <ModalEliminarOrden
          orden={modal.orden}
          onClose={() => setModal(null)}
          onConfirm={handleEliminar}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}