import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../../AppContext.jsx";
import { 
  Package, ClipboardList, User, Calendar, 
  DollarSign, FileText, ChevronRight, ArrowRight,
  CheckCircle2, X, AlertCircle, Info, History
} from 'lucide-react';
import "./OrdenesProduccion.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

const PER_PAGE = 5;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_CONFIG = {
  "Pendiente":  { bg: "bg-amber-50",  color: "text-amber-700", border: "border-amber-200",  dot: "#f9a825", desc: "Esperando inicio de fabricación" },
  "En proceso": { bg: "bg-blue-50",   color: "text-blue-700",  border: "border-blue-200",   dot: "#1976d2", desc: "Actualmente en fabricación" },
  "Pausada":    { bg: "bg-purple-50", color: "text-purple-700",border: "border-purple-200", dot: "#8e24aa", desc: "Temporalmente detenida" },
  "Completada": { bg: "bg-green-50",  color: "text-green-700", border: "border-green-200",  dot: "#43a047", desc: "Fabricación finalizada — stock actualizado" },
  "Cancelada":  { bg: "bg-red-50",    color: "text-red-700",   border: "border-red-200",    dot: "#e53935", desc: "Orden cancelada" },
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
      animation: "slideInRight 0.32s cubic-bezier(0.34,1.4,0.64,1)",
    }}>
      <span style={{ fontSize: 15 }}>{toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠️" : "✓"}</span>
      {toast.message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL VER DETALLES — diseño unificado con el resto del sistema
   ═══════════════════════════════════════════════════════════ */
function ModalDetallesOrden({ orden, empleados, onClose }) {
  const [activeTab, setActiveTab] = useState("general");
  const navigate = useNavigate();
  if (!orden) return null;

  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));
  const totalUnidades = (orden.productos || []).reduce((acc, x) => acc + (x.cantidad || 0), 0);

  const TABS = [
    { id: "general",   label: "General",   icon: "📋" },
    { id: "productos", label: "Productos", icon: "📦" },
    { id: "insumos",   label: "Insumos",   icon: "🗂️" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 580, width: "100%", maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">Orden {orden.id}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={orden.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0", background: "#fafafa", padding: "0 24px" }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "12px 18px", fontSize: 12, fontWeight: 700,
                border: "none", borderBottom: activeTab === tab.id ? "2.5px solid #2e7d32" : "2.5px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "#2e7d32" : "#9e9e9e",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Unidades",  value: totalUnidades,              bg: "#e8f5e9", color: "#2e7d32" },
                  { label: "Productos", value: (orden.productos||[]).length, bg: "#e3f2fd", color: "#1565c0" },
                  { label: "Insumos",   value: (orden.insumos||[]).length,   bg: "#f3e5f5", color: "#6a1b9a" },
                  { label: "Costo",     value: fmt(orden.costo),             bg: "#fff8e1", color: "#f9a825" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Gestión */}
              <div>
                <p className="section-label">Información de gestión</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="field-input field-input--disabled" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>👤</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Responsable</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{empleado ? `${empleado.nombre} ${empleado.apellidos || ""}` : "Sin asignar"}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field-input field-input--disabled" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Entrega</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{orden.fechaEntrega ? fmtFecha(orden.fechaEntrega) : "—"}</div>
                    </div>
                    {orden.numeroPedido && (
                      <div className="field-input field-input--disabled" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Pedido vinculado</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1565c0" }}>#{orden.numeroPedido}</div>
                      </div>
                    )}
                  </div>
                  {orden.notas && (
                    <div className="field-input field-input--disabled" style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 50 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: 1 }}>Notas</div>
                      <div style={{ fontSize: 13, color: "#616161", fontStyle: "italic" }}>"{orden.notas}"</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "productos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
              {(orden.productos || []).map((p, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", background: "#fafafa", borderRadius: 10,
                  border: "1px solid #e0e0e0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📦</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9e9e9e" }}>Costo unit: {fmt(p.precio)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9e9e9e", textTransform: "uppercase" }}>Cantidad</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>×{p.cantidad}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "insumos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orden.missingFicha && orden.missingFicha.length > 0 && (
                <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#f9a825", textTransform: "uppercase", marginBottom: 4 }}>Fichas faltantes</div>
                    <div style={{ fontSize: 12, color: "#6d4c00" }}>Los productos <strong>[{orden.missingFicha.join(", ")}]</strong> no tienen ficha técnica. Los cálculos pueden estar incompletos.</div>
                  </div>
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f8f1" }}>
                    {["Insumo", "Requerido", "Estado"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#2e7d32", textAlign: h === "Estado" ? "center" : "left", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(orden.insumos || []).map((ins, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f1f8f1" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{ins.nombre}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "#424242" }}>{ins.cantidad} {ins.unidad}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {ins.stockOk
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#2e7d32", background: "#e8f5e9", padding: "2px 8px", borderRadius: 6, border: "1px solid #c8e6c9" }}>OK</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: "#c62828", background: "#ffebee", padding: "2px 8px", borderRadius: 6, border: "1px solid #ef9a9a" }}>Sin stock</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orden.insumosDescontados && (
                <div style={{ background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, color: "#2e7d32", fontWeight: 700, fontSize: 13 }}>
                  ✓ Inventario descontado correctamente
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER — botón no ocupa todo el ancho */}
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
function ModalCambiarEstado({ orden, onClose, onConfirm }) {
  const [estadoSel, setEstadoSel] = useState(null);
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
              <p className="section-label" style={{ marginTop: 0 }}>Orden {orden.id} — selecciona el nuevo estado</p>
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
                <button className="btn-save" onClick={() => onConfirm(orden.id, estadoSel)}>Confirmar cambio</button>
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
    setTimeout(() => onConfirm(orden.id), 800);
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
            ¿Estás seguro de que deseas eliminar la orden <strong>{orden.id}</strong>?
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#9e9e9e" }}>Esta operación es definitiva y no podrá ser revertida.</p>
          <div style={{ fontSize: 13, color: "#616161", textAlign: "left", background: "#fafafa", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
            <div><strong>Productos:</strong> {(orden.productos || []).map(p => `${p.nombre} ×${p.cantidad}`).join(", ") || "—"}</div>
            <div style={{ marginTop: 4 }}><strong>Estado:</strong> <EstadoBadge estado={orden.estado} /></div>
          </div>
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
   BARRA DE PASOS (wizard) — alineada con el sistema global
   ═══════════════════════════════════════════════════════════ */
const STEPS_WIZ = ["Datos Generales", "Productos e Insumos"];

function StepsBarWiz({ current }) {
  return (
    <div className="wizard-steps-bar" style={{ padding: "0 24px" }}>
      {STEPS_WIZ.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="wizard-step-item" style={{ flex: 1, justifyContent: i === 0 ? "flex-start" : "flex-end" }}>
            <div className={`wizard-step-circle${done ? " done" : active ? " active" : ""}`}>
              {done ? "✓" : idx}
            </div>
            <span className={`wizard-step-label${active ? " active" : done ? " done" : ""}`}>
              {label}
            </span>
            {i < STEPS_WIZ.length - 1 && (
              <div className={`wizard-step-line${done ? " done" : ""}`} style={{ flex: 1 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL FORMULARIO — CREAR / EDITAR ORDEN
   ═══════════════════════════════════════════════════════════ */
function ModalFormOrden({ orden, onClose, onSave }) {
  const {
    productos   = [],
    usuarios    = [],
    insumos: allInsumos = [],
    UNIDADES_MEDIDA = [],
    calcularCostoProduccion,
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
      totalCosto += calcularCostoProduccion(prod, item.cantidad);
      (prod.ficha?.insumos || []).forEach(fi => {
        const ins = allInsumos.find(i => i.id === fi.idInsumo || i.nombre === fi.nombre);
        if (!ins) return;
        const cantNecesaria = (Number(fi.cantidad) || 0) * item.cantidad;
        if (insumosMap[ins.id]) {
          insumosMap[ins.id].cantidad += cantNecesaria;
        } else {
          const unidad = UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und";
          insumosMap[ins.id] = { idInsumo: ins.id, nombre: ins.nombre, cantidad: cantNecesaria, unidad, stockOk: false };
        }
      });
    });
    const insumosArray = Object.values(insumosMap).map(ins => {
      const real = allInsumos.find(i => i.id === ins.idInsumo);
      return { ...ins, stockOk: (real?.stockActual || 0) >= ins.cantidad };
    });
    setForm(p => ({ ...p, insumos: insumosArray, costo: totalCosto }));
  }, [form.productos, productos, allInsumos, UNIDADES_MEDIDA, calcularCostoProduccion]);

  const addProducto = (idStr) => {
    const id = Number(idStr); if (!id) return;
    const prod = productos.find(x => x.id === id); if (!prod) return;
    if (form.productos.some(x => x.idProducto === id)) return;
    if (!prod.ficha) {
      alert(`⚠️ "${prod.nombre}" no tiene ficha técnica. No se podrán calcular insumos.`);
    }
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
    if (s === 1 && !form.fechaEntrega) e.fecha = "Campo obligatorio";
    if (s === 2 && form.productos.length === 0) e.productos = "Agrega al menos un producto";
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">{orden ? `Editar Orden ${orden.id}` : "Nueva Orden"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Barra de pasos — separada del header, dentro del padding correcto */}
        <div style={{ padding: "16px 0 0", borderTop: "1px solid #f0f0f0" }}>
          <StepsBarWiz current={step} />
        </div>

        <div className="modal-body" style={{ minHeight: 280 }}>
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Datos Generales</p>
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <div className="select-wrap">
                  <select
                    className="field-input"
                    style={{ appearance: "none", paddingRight: 32 }}
                    value={form.idEmpleado}
                    onChange={e => setForm(f => ({ ...f, idEmpleado: Number(e.target.value) }))}
                  >
                    <option value="">— Sin asignar —</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos}</option>
                    ))}
                  </select>
                  <div className="select-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha de entrega <span className="required">*</span></label>
                  <input
                    type="date"
                    className={`field-input${errors.fecha ? " error" : ""}`}
                    value={form.fechaEntrega}
                    onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))}
                  />
                  {errors.fecha && <span className="field-error">{errors.fecha}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <div className="select-wrap">
                    <select
                      className="field-input"
                      style={{ appearance: "none", paddingRight: 32 }}
                      value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                    >
                      {ESTADOS_ORDEN.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                    <div className="select-arrow">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea
                  className="field-input"
                  rows={2}
                  style={{ resize: "vertical" }}
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Instrucciones especiales..."
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
              <div className="select-wrap">
                <select
                  className="field-input"
                  style={{ appearance: "none", paddingRight: 32 }}
                  onChange={e => { addProducto(e.target.value); e.target.value = ""; }}
                >
                  <option value="">+ Agregar producto…</option>
                  {productos.filter(p => p.activo !== false).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <div className="select-arrow">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {errors.productos && <span className="field-error">{errors.productos}</span>}

              <div style={{ maxHeight: 130, overflowY: "auto", marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {form.productos.map(p => (
                  <div key={p.idProducto} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", background: "#fafafa",
                    border: "1px solid #e0e0e0", borderRadius: 8,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                    <input
                      type="number"
                      value={p.cantidad}
                      min={1}
                      onChange={e => updateCant(p.idProducto, e.target.value)}
                      style={{ width: 54, padding: "4px 6px", border: "1.5px solid #e0e0e0", borderRadius: 6, textAlign: "center", fontWeight: 700, fontSize: 13 }}
                    />
                    <button
                      onClick={() => removeProd(p.idProducto)}
                      style={{ background: "#ffebee", color: "#c62828", border: "none", width: 26, height: 26, borderRadius: "50%", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >✕</button>
                  </div>
                ))}
              </div>

              {form.insumos.length > 0 && (
                <>
                  <p className="section-label">Insumos calculados automáticamente</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 110, overflowY: "auto" }}>
                    {form.insumos.map(ins => (
                      <div key={ins.idInsumo} style={{
                        fontSize: 11, padding: "6px 8px", borderRadius: 6,
                        background: ins.stockOk ? "#f1f8f1" : "#fff5f5",
                        border: `1px solid ${ins.stockOk ? "#c8e6c9" : "#ef9a9a"}`,
                        color: ins.stockOk ? "#2e7d32" : "#c62828",
                      }}>
                        <strong>{ins.nombre}</strong><br />{ins.cantidad} {ins.unidad}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer — botones NO full-width */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave}>{orden ? "Guardar cambios" : "Crear orden"}</button>
            }
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
    eliminarOrdenProduccion,
    usuarios           = [],
    pedidos            = [],
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);
  const location  = useLocation();
  const initialSearch = new URLSearchParams(location.search).get("search") || "";

  const [search,       setSearch]       = useState(initialSearch);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
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
    if (nuevoEstado === "Completada") {
      const confirmComp = window.confirm(
        "Al marcar la orden como 'Completada', se sumarán los productos al stock disponible y se descontarán los insumos correspondientes. ¿Deseas continuar?"
      );
      if (!confirmComp) return;
    }

    cambiarEstadoOrden(idOrden, nuevoEstado);
    showToast(`Estado cambiado a "${nuevoEstado}"`);
    setModal(null);
  };

  const handleEliminar = (idOrden) => {
    if (eliminarOrdenProduccion) eliminarOrdenProduccion(idOrden);
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
              placeholder="Buscar orden, producto, empleado…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filtro con z-index alto para que no quede detrás de la tabla */}
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
                  <th>Entrega</th>
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
                        <div className="empty-state__icon">🏭</div>
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
                          <div style={{ fontSize: 10, color: "#1565c0", fontWeight: 700 }}>#{orden.numeroPedido}</div>
                        )}
                        {orden.missingFicha?.length > 0 && (
                          <div style={{ fontSize: 9, color: "#e65100", fontWeight: 900, background: "#fff3e0", padding: "2px 4px", borderRadius: 4, display: "inline-block", marginTop: 4, border: "1px solid #ffcc02" }}>
                            ⚠️ FICHA FALTANTE
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
                        <span className={`date-badge${urgenciaFecha(orden.fechaEntrega) === "urgente" ? " date-badge--urgente" : urgenciaFecha(orden.fechaEntrega) === "pronto" ? " date-badge--pronto" : ""}`}>
                          {fmtFecha(orden.fechaEntrega)}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 700 }}>{fmt(orden.costo)}</td>
                      <td><EstadoBadge estado={orden.estado} /></td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"   title="Ver detalles"    onClick={() => setModal({ type: "detalles", orden })}>👁</button>
                          <button className="act-btn act-btn--edit"   title="Editar"          onClick={() => setModal({ type: "form", orden })}>✎</button>
                          <button className="act-btn act-btn--status" title="Cambiar estado"  onClick={() => setModal({ type: "estado", orden })}>🔄</button>
                          {/* ícono eliminar consistente con el resto */}
                          <button className="act-btn act-btn--delete" title="Eliminar orden"  onClick={() => setModal({ type: "eliminar", orden })}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* ── Modales ── */}
      {modal?.type === "form" && (
        <ModalFormOrden orden={modal.orden} onClose={() => setModal(null)} onSave={handleSaveOrder} />
      )}
      {modal?.type === "detalles" && (
        <ModalDetallesOrden orden={modal.orden} empleados={empleados} onClose={() => setModal(null)} />
      )}
      {modal?.type === "estado" && (
        <ModalCambiarEstado orden={modal.orden} onClose={() => setModal(null)} onConfirm={handleCambiarEstado} />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarOrden orden={modal.orden} onClose={() => setModal(null)} onConfirm={handleEliminar} />
      )}

      <Toast toast={toast} />
    </div>
  );
}