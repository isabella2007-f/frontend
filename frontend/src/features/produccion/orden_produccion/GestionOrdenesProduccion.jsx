import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  getOrdenes, crearOrden, editarOrden, eliminarOrden, cambiarEstadoOrden,
} from "../../../services/ordenesProduccionService.js";
import { getProductos } from "../../../services/productosService.js";
import { getInsumos }   from "../../../services/insumosService.js";
import "./OrdenesProduccion.css";

const PER_PAGE = 5;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_TO_NUM = {
  "Pendiente": 1, "En proceso": 2, "Pausada": 3, "Completada": 4, "Cancelada": 5,
};

const ESTADO_CONFIG = {
  "Pendiente":  { dot: "#f9a825" },
  "En proceso": { dot: "#1976d2" },
  "Pausada":    { dot: "#8e24aa" },
  "Completada": { dot: "#43a047" },
  "Cancelada":  { dot: "#e53935" },
};

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

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

/* ─── Componentes base ─────────────────────────────────── */
function EstadoBadge({ estado }) {
  const COLORS = {
    "Pendiente":  { bg: "#fff8e1", color: "#f9a825", border: "#ffe082" },
    "En proceso": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
    "Pausada":    { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
    "Completada": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
    "Cancelada":  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a" },
  };
  const c = COLORS[estado] || { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
      {estado}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 3000,
      padding: "12px 20px", borderRadius: 12, color: "#fff",
      background: toast.type === "error" ? "#c62828" : toast.type === "warn" ? "#e65100" : "#2e7d32",
      fontWeight: 600, fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ fontSize: 15 }}>{toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠️" : "✓"}</span>
      {toast.message}
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={i}>
      {Array.from({ length: 7 }, (_, j) => (
        <td key={j}><div className="skeleton-cell" /></td>
      ))}
    </tr>
  ));
}

/* ═══════════════════════════════════════════════════════════
   MODAL VER DETALLES
   ═══════════════════════════════════════════════════════════ */
function ModalDetallesOrden({ orden, onClose }) {
  if (!orden) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 480, width: "100%" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">Orden #{orden.id}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={orden.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Cantidad",  value: orden.cantidad, bg: "#e8f5e9", color: "#2e7d32" },
              { label: "Costo",     value: fmt(orden.costo), bg: "#fff8e1", color: "#f9a825" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Producto */}
          <div className="field-input field-input--disabled" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Producto</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                {orden.nombreProducto || "—"} <span style={{ color: "#2e7d32" }}>×{orden.cantidad}</span>
              </div>
            </div>
          </div>

          {/* Insumo */}
          {orden.nombreInsumo && (
            <div className="field-input field-input--disabled" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🗂️</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Insumo</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#424242" }}>{orden.nombreInsumo}</div>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="field-input field-input--disabled" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Inicio</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtFecha(orden.fechaInicio)}</div>
            </div>
            <div className="field-input field-input--disabled" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Entrega</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtFecha(orden.fechaEntrega)}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CAMBIAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function ModalCambiarEstado({ orden, onClose, onConfirm, saving }) {
  const [estadoSel,   setEstadoSel]   = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);
  if (!orden) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">Cambiar Estado</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!confirmStep ? (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Orden #{orden.id} — selecciona el nuevo estado</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ESTADOS_ORDEN.map(est => {
                  const COLORS = {
                    "Pendiente":  { bg: "#fff8e1", color: "#f9a825", border: "#ffe082" },
                    "En proceso": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
                    "Pausada":    { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
                    "Completada": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
                    "Cancelada":  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a" },
                  };
                  const c = COLORS[est] || {};
                  const isCurrent = est === orden.estado;
                  return (
                    <button
                      key={est}
                      disabled={isCurrent}
                      onClick={() => { setEstadoSel(est); setConfirmStep(true); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "11px 14px", borderRadius: 10,
                        border: `1.5px solid ${isCurrent ? c.border : "#e0e0e0"}`,
                        background: isCurrent ? c.bg : "#fff",
                        cursor: isCurrent ? "default" : "pointer",
                        opacity: isCurrent ? 0.7 : 1,
                        fontFamily: "inherit", width: "100%", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? c.color : "#1a1a1a", flex: 1 }}>{est}</span>
                      {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: "#2e7d32", textTransform: "uppercase" }}>Actual</span>}
                      {!isCurrent && <span style={{ color: "#bdbdbd", fontSize: 16 }}>›</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6d4c00", marginBottom: 4 }}>¿Confirmar cambio de estado?</div>
                <div style={{ fontSize: 12, color: "#9a6400" }}>Esta acción actualizará el flujo de producción.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", background: "#fafafa", borderRadius: 10, padding: "14px", border: "1px solid #e0e0e0" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", marginBottom: 6 }}>Actual</div>
                  <EstadoBadge estado={orden.estado} />
                </div>
                <span style={{ fontSize: 20, color: "#bdbdbd" }}>→</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", marginBottom: 6 }}>Nuevo</div>
                  <EstadoBadge estado={estadoSel} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: confirmStep ? "space-between" : "flex-end" }}>
          {confirmStep
            ? <>
                <button className="btn-ghost" onClick={() => setConfirmStep(false)}>← Volver</button>
                <button className="btn-save" onClick={() => onConfirm(orden.id, estadoSel)} disabled={saving}>
                  {saving ? "Guardando…" : "Confirmar cambio"}
                </button>
              </>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL ELIMINAR ORDEN
   ═══════════════════════════════════════════════════════════ */
function ModalEliminarOrden({ orden, onClose, onConfirm }) {
  const [done, setDone] = useState(false);
  if (!orden) return null;

  const handleConfirm = () => {
    setDone(true);
    onConfirm(orden.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "#ffebee", border: "1px solid #ef9a9a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 14px",
          }}>🗑️</div>
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>Eliminar orden</h3>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#616161" }}>
            ¿Estás seguro de que deseas eliminar la orden <strong>#{orden.id}</strong>?
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9e9e9e" }}>
            <strong>{orden.nombreProducto}</strong> × {orden.cantidad}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#9e9e9e" }}>Esta operación es definitiva y no podrá ser revertida.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={done}
            style={{
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: "#c62828", color: "#fff",
              fontWeight: 700, fontSize: 13, cursor: done ? "default" : "pointer",
              fontFamily: "inherit", opacity: done ? 0.7 : 1,
            }}
          >
            {done ? "Eliminando…" : "Sí, eliminar orden"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL FORMULARIO — CREAR / EDITAR ORDEN
   ═══════════════════════════════════════════════════════════ */
function ModalFormOrden({ orden, productos, insumos, onClose, onSave }) {
  const [form, setForm] = useState({
    idProducto:   orden?.idProducto   ?? "",
    idInsumo:     orden?.idInsumo     ?? "",
    cantidad:     orden?.cantidad     ?? 1,
    fechaInicio:  orden?.fechaInicio  ?? "",
    fechaEntrega: orden?.fechaEntrega ?? "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const handleSave = async () => {
    const e = {};
    if (!form.idProducto)                 e.idProducto   = "Seleccione un producto";
    if (!form.cantidad || form.cantidad < 1) e.cantidad  = "Ingrese una cantidad válida";
    if (!form.fechaEntrega)               e.fechaEntrega = "La fecha de entrega es obligatoria";
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    const payload = {
      ID_Producto:   Number(form.idProducto),
      Cantidad:      Number(form.cantidad),
      Fecha_Entrega: form.fechaEntrega,
    };
    if (form.idInsumo)    payload.ID_Insumo    = Number(form.idInsumo);
    if (form.fechaInicio) payload.Fecha_inicio = form.fechaInicio;

    try {
      if (orden?.id) {
        await editarOrden(orden.id, payload);
      } else {
        await crearOrden(payload);
      }
      onSave();
    } catch (err) {
      const msg = Array.isArray(err?.detail)
        ? err.detail.map(v => v.msg).join(", ")
        : (err?.detail || err?.message || "Error al guardar");
      setErrors({ _api: msg });
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">{orden ? `Editar Orden #${orden.id}` : "Nueva Orden"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Producto */}
          <div className="form-group">
            <label className="form-label">Producto <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-input${errors.idProducto ? " error" : ""}`}
                style={{ appearance: "none", paddingRight: 32 }}
                value={form.idProducto}
                onChange={e => set("idProducto", e.target.value)}
              >
                <option value="">Seleccione un producto…</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <div className="select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {errors.idProducto && <span className="field-error">{errors.idProducto}</span>}
          </div>

          {/* Insumo */}
          <div className="form-group">
            <label className="form-label">Insumo</label>
            <div className="select-wrap">
              <select
                className="field-input"
                style={{ appearance: "none", paddingRight: 32 }}
                value={form.idInsumo}
                onChange={e => set("idInsumo", e.target.value)}
              >
                <option value="">— Sin insumo —</option>
                {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
              <div className="select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Cantidad */}
          <div className="form-group">
            <label className="form-label">Cantidad <span className="required">*</span></label>
            <input
              type="number"
              min={1}
              className={`field-input${errors.cantidad ? " error" : ""}`}
              value={form.cantidad}
              onChange={e => set("cantidad", Number(e.target.value))}
            />
            {errors.cantidad && <span className="field-error">{errors.cantidad}</span>}
          </div>

          {/* Fechas */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Fecha de inicio</label>
              <input
                type="date"
                className="field-input"
                value={form.fechaInicio}
                onChange={e => set("fechaInicio", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de entrega <span className="required">*</span></label>
              <input
                type="date"
                className={`field-input${errors.fechaEntrega ? " error" : ""}`}
                value={form.fechaEntrega}
                onChange={e => set("fechaEntrega", e.target.value)}
              />
              {errors.fechaEntrega && <span className="field-error">{errors.fechaEntrega}</span>}
            </div>
          </div>

          {errors._api && (
            <p className="field-error" style={{ textAlign: "center" }}>{errors._api}</p>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : orden ? "Guardar cambios" : "Crear orden"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionOrdenesProduccion() {
  const location      = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("search") || "";

  const [ordenes,      setOrdenes]      = useState([]);
  const [productos,    setProductos]    = useState([]);
  const [insumos,      setInsumos]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState(initialSearch);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const filterRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ordenesData, pData, iData] = await Promise.all([
        getOrdenes(),
        getProductos(),
        getInsumos(),
      ]);
      setOrdenes(ordenesData);
      setProductos(
        (pData.productos || [])
          .filter(p => p.Estado !== 0)
          .map(p => ({ id: p.ID_Producto, nombre: p.Nombre }))
      );
      setInsumos(
        (iData.insumos || [])
          .filter(i => i.Estado !== 0)
          .map(i => ({ id: i.ID_Insumo, nombre: i.Nombre }))
      );
    } catch (e) {
      showToast(e.message || "Error al cargar órdenes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    const h = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase();
    const matchQ = [
      String(o.id ?? ""),
      o.nombreProducto ?? "",
      o.nombreInsumo   ?? "",
    ].some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || o.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => setPage(1), [search, filterEstado]);

  const handleSaveOrder = async () => {
    await cargarDatos();
    showToast(modal?.orden ? "Orden actualizada" : "Orden creada");
    setModal(null);
  };

  const handleCambiarEstado = async (idOrden, nuevoEstado) => {
    const estadoNum = ESTADO_TO_NUM[nuevoEstado];
    setActionSaving(true);
    try {
      await cambiarEstadoOrden(idOrden, estadoNum);
      showToast(`Estado cambiado a "${nuevoEstado}"`);
      setModal(null);
      await cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al cambiar estado", "error");
    } finally {
      setActionSaving(false);
    }
  };

  const handleEliminar = async (idOrden) => {
    try {
      await eliminarOrden(idOrden);
      showToast("Orden eliminada", "warn");
      await cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al eliminar", "error");
    }
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Órdenes de Producción</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar orden, producto…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative", zIndex: 200 }}>
            <button
              className={`filter-icon-btn${filterEstado !== "todos" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 180, zIndex: 200 }}>
                <p className="filter-section-title">Estado</p>
                {["todos", ...ESTADOS_ORDEN].map(f => (
                  <button
                    key={f}
                    className={`filter-option${filterEstado === f ? " active" : ""}`}
                    onClick={() => { setFilterEstado(f); setPage(1); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: ESTADO_CONFIG[f]?.dot || "#bdbdbd" }} />
                    {f === "todos" ? "Todos" : f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "form" })}>
            Agregar Orden <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Producto</th>
                  <th>Insumo</th>
                  <th>Cantidad</th>
                  <th>Entrega</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🏭</div>
                        <p className="empty-state__text">
                          {search || filterEstado !== "todos" ? "Sin órdenes que coincidan." : "No hay órdenes registradas."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((orden, idx) => (
                  <tr key={orden.id} className="tbl-row">
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="orden-num" style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                        {orden.nombreProducto || "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "#9e9e9e" }}>#{orden.id}</div>
                    </td>
                    <td style={{ fontSize: 12, color: "#616161" }}>{orden.nombreInsumo || "—"}</td>
                    <td style={{ fontSize: 14, fontWeight: 700, color: "#2e7d32" }}>{orden.cantidad}</td>
                    <td>
                      <span className={`date-badge${urgenciaFecha(orden.fechaEntrega) === "urgente" ? " date-badge--urgente" : urgenciaFecha(orden.fechaEntrega) === "pronto" ? " date-badge--pronto" : ""}`}>
                        {fmtFecha(orden.fechaEntrega)}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 700 }}>{fmt(orden.costo)}</td>
                    <td><EstadoBadge estado={orden.estado} /></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   title="Ver detalles"   onClick={() => setModal({ type: "detalles", orden })}>👁</button>
                        <button className="act-btn act-btn--edit"   title="Editar"         onClick={() => setModal({ type: "form",     orden })}>✎</button>
                        <button className="act-btn act-btn--status" title="Cambiar estado" onClick={() => setModal({ type: "estado",   orden })}>🔄</button>
                        <button className="act-btn act-btn--delete" title="Eliminar"       onClick={() => setModal({ type: "eliminar", orden })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "orden" : "órdenes"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              <button className="pg-btn-arrow" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "form" && (
        <ModalFormOrden
          orden={modal.orden}
          productos={productos}
          insumos={insumos}
          onClose={() => setModal(null)}
          onSave={handleSaveOrder}
        />
      )}
      {modal?.type === "detalles" && (
        <ModalDetallesOrden orden={modal.orden} onClose={() => setModal(null)} />
      )}
      {modal?.type === "estado" && (
        <ModalCambiarEstado
          orden={modal.orden}
          saving={actionSaving}
          onClose={() => setModal(null)}
          onConfirm={handleCambiarEstado}
        />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarOrden orden={modal.orden} onClose={() => setModal(null)} onConfirm={handleEliminar} />
      )}

      <Toast toast={toast} />
    </div>
  );
}
