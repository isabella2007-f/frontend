import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./OrdenesProduccion.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const PER_PAGE = 4;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_CONFIG = {
  "Pendiente":  { bg: "#fff8e1", color: "#f9a825", border: "#ffe082", dot: "#f9a825",
                  desc: "Esperando inicio de fabricación" },
  "En proceso": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9", dot: "#1976d2",
                  desc: "Actualmente en fabricación" },
  "Pausada":    { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8", dot: "#8e24aa",
                  desc: "Temporalmente detenida" },
  "Completada": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", dot: "#43a047",
                  desc: "Fabricación finalizada — stock actualizado" },
  "Cancelada":  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", dot: "#e53935",
                  desc: "Orden cancelada" },
};

/* Estados válidos desde cada estado actual */
const FLUJO_ESTADOS = {
  "Pendiente":  ["Pendiente", "En proceso", "Cancelada"],
  "En proceso": ["En proceso", "Pausada", "Completada", "Cancelada"],
  "Pausada":    ["Pausada", "En proceso", "Cancelada"],
  "Completada": ["Completada"],
  "Cancelada":  ["Cancelada"],
};

/* ─── Urgencia de fecha entrega ─────────────────────────── */
const urgenciaFecha = (fechaISO) => {
  if (!fechaISO) return "normal";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(fechaISO + "T00:00:00") - hoy) / 86_400_000);
  if (dias < 0)  return "vencida";
  if (dias <= 1) return "urgente";
  if (dias <= 3) return "pronto";
  return "normal";
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/* ─── Componentes pequeños ───────────────────────────────── */
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

/* ─── Barra de progreso por estado ──────────────────────── */
function ProgresoEstado({ estado }) {
  const pasos   = ["Pendiente", "En proceso", "Completada"];
  const idx     = pasos.indexOf(estado);
  const pct     = estado === "Completada" ? 100 : estado === "En proceso" ? 55 : 10;
  const color   = estado === "Completada" ? "#43a047" : estado === "Cancelada" ? "#e53935" : estado === "Pausada" ? "#8e24aa" : "#1976d2";
  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL SECUNDARIO — PRODUCTOS E INSUMOS (estilo PermisosModal)
   ═══════════════════════════════════════════════════════════ */
function ModalProductosInsumos({ orden, onClose }) {
  const [tab, setTab] = useState("productos");

  const totalProds   = (orden.productos || []).length;
  const totalInsumos = (orden.insumos   || []).length;
  const sinStock     = (orden.insumos   || []).filter(i => !i.stockOk).length;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 18, width: "100%", maxWidth: 660,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        animation: "slideUp 0.26s cubic-bezier(0.34,1.4,0.64,1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg,#f1f8f1,#fff)", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#9e9e9e" }}>
              ORDEN {orden.id}
            </p>
            <h2 style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 800, color: "#2e7d32" }}>
              Productos e insumos
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {sinStock > 0 && (
              <span style={{ background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                ⚠️ {sinStock} sin stock
              </span>
            )}
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "2px solid #f0f0f0", flexShrink: 0, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 2, padding: "10px 16px 0", minWidth: "max-content" }}>
            {[
              { key: "productos", label: "Productos a fabricar", icon: "🏭", count: totalProds },
              { key: "insumos",   label: "Insumos requeridos",   icon: "🧪", count: totalInsumos },
            ].map(t => {
              const activo = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px 10px", border: "none",
                  borderBottom: `3px solid ${activo ? "#2e7d32" : "transparent"}`,
                  background: activo ? "#f9fdf9" : "transparent",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                  fontWeight: 600, color: activo ? "#2e7d32" : "#9e9e9e",
                  borderRadius: "8px 8px 0 0", transition: "all 0.15s", whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 15 }}>{t.icon}</span>
                  {t.label}
                  <span style={{
                    background: activo ? "#2e7d32" : "#e0e0e0",
                    color: activo ? "#fff" : "#757575",
                    borderRadius: 10, padding: "1px 7px",
                    fontSize: 10, fontWeight: 800,
                  }}>{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body — sin scroll */}
        <div style={{ padding: 24, flexShrink: 0 }}>

          {tab === "productos" && (
            <>
              <div style={{ padding: "12px 16px", background: "#f9fdf9", borderRadius: 12, border: "1.5px solid #e8f5e9", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>🏭</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>
                      Productos a fabricar
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9e9e9e" }}>
                      {totalProds} producto{totalProds !== 1 ? "s" : ""} en esta orden
                    </p>
                  </div>
                </div>
                {orden.costo > 0 && (
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>{fmt(orden.costo)}</span>
                )}
              </div>

              {totalProds === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#9e9e9e" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🏭</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Sin productos registrados en esta orden</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(orden.productos || []).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: 12,
                      border: "1.5px solid #e8f5e9", background: "#fff",
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: "#e8f5e9", border: "1px solid #a5d6a7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, flexShrink: 0,
                      }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{p.nombre}</div>
                        {p.precio && (
                          <div style={{ fontSize: 12, color: "#9e9e9e", marginTop: 2 }}>
                            {fmt(p.precio)} c/u
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1565c0" }}>× {p.cantidad}</div>
                        {p.precio && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#2e7d32" }}>
                            {fmt(p.precio * p.cantidad)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "insumos" && (
            <>
              <div style={{ padding: "12px 16px", background: sinStock > 0 ? "#ffebee" : "#f9fdf9", borderRadius: 12, border: `1.5px solid ${sinStock > 0 ? "#ef9a9a" : "#e8f5e9"}`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>🧪</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>
                      Insumos requeridos
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: sinStock > 0 ? "#c62828" : "#9e9e9e", fontWeight: sinStock > 0 ? 700 : 400 }}>
                      {sinStock > 0 ? `⚠️ ${sinStock} con stock insuficiente` : `${totalInsumos} insumos · stock OK`}
                    </p>
                  </div>
                </div>
              </div>

              {totalInsumos === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#9e9e9e" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🧪</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Sin insumos registrados — agrega una ficha técnica al producto</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(orden.insumos || []).map((ins, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 12,
                      border: `1.5px solid ${ins.stockOk ? "#e8f5e9" : "#ef9a9a"}`,
                      background: ins.stockOk ? "#fff" : "#fff5f5",
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: ins.stockOk ? "#e3f2fd" : "#ffebee",
                        border: `1px solid ${ins.stockOk ? "#90caf9" : "#ef9a9a"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>🧪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>{ins.nombre}</div>
                        {!ins.stockOk && (
                          <div style={{ fontSize: 11, color: "#c62828", fontWeight: 700, marginTop: 2 }}>
                            Stock insuficiente
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ins.stockOk ? "#1565c0" : "#c62828" }}>
                          {ins.cantidad} <span style={{ fontSize: 11, fontWeight: 500, color: "#9e9e9e" }}>{ins.unidad}</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                            background: ins.stockOk ? "#43a047" : "#e53935",
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f5f5f5", flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL VER DETALLE — limpio, sin scroll
   ═══════════════════════════════════════════════════════════ */
function ModalVerOrden({ orden, empleados, pedidos, onClose, onCambiarEstado, onAsignarEmpleado }) {
  const [tab, setTab] = useState("informacion");
  const [showInsumosModal, setShowInsumosModal] = useState(false);
  const emp    = empleados.find(e => e.id === orden.idEmpleado);
  const pedido = pedidos.find(p => p.id === orden.idPedido);
  const urg    = urgenciaFecha(orden.fechaEntrega);
  const activa = !["Completada", "Cancelada"].includes(orden.estado);
  const totalItems = (orden.productos || []).length + (orden.insumos || []).length;
  const sinStock   = (orden.insumos || []).filter(i => !i.stockOk).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Orden de producción</p>
            <h2 className="modal-header__title">{orden.id}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EstadoBadge estado={orden.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Pestañas */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", marginBottom: 20 }}>
          <button
            onClick={() => setTab("informacion")}
            style={{
              padding: "12px 20px",
              border: "none",
              background: tab === "informacion" ? "#f5f5f5" : "transparent",
              borderBottom: tab === "informacion" ? "2px solid #1565c0" : "none",
              color: tab === "informacion" ? "#1565c0" : "#666",
              fontWeight: tab === "informacion" ? 600 : 400,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            📋 Información del pedido
          </button>
          <button
            onClick={() => setTab("productos")}
            style={{
              padding: "12px 20px",
              border: "none",
              background: tab === "productos" ? "#f5f5f5" : "transparent",
              borderBottom: tab === "productos" ? "2px solid #1565c0" : "none",
              color: tab === "productos" ? "#1565c0" : "#666",
              fontWeight: tab === "productos" ? 600 : 400,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🏭 Productos
          </button>
        </div>

        <div className="modal-body" style={{ flexShrink: 0 }}>
          {tab === "informacion" && (
            <>
              {/* Progreso */}
              <ProgresoEstado estado={orden.estado} />

              {/* Pedido relacionado */}
              <p className="section-label">Pedido relacionado</p>
              {pedido ? (
                <div className="info-box info-box--info">
                  <span className="info-box__icon">📦</span>
                  <div className="info-box__text">
                    <span className="info-box__label">{pedido.numero}</span>
                    Cliente: {pedido.cliente?.nombre} · Total: {fmt(pedido.total)}
                  </div>
                </div>
              ) : (
                <div className="info-box info-box--warn">
                  <span className="info-box__icon">ℹ️</span>
                  <span className="info-box__text">Orden creada manualmente, sin pedido asociado.</span>
                </div>
              )}

              {/* Responsable y fechas */}
              <p className="section-label">Responsable y fechas</p>
              <div className="form-grid-2">
                <div>
                  <label className="form-label">Empleado responsable</label>
                  <div className="field-input--disabled">
                    {emp ? `👷 ${emp.nombre} ${emp.apellidos}` : "Sin asignar"}
                  </div>
                </div>
                <div>
                  <label className="form-label">Costo estimado</label>
                  <div className="field-input--disabled">
                    {orden.costo > 0 ? fmt(orden.costo) : "No calculado"}
                  </div>
                </div>
                <div>
                  <label className="form-label">Fecha de inicio</label>
                  <div className="field-input--disabled">{fmtFecha(orden.fechaInicio)}</div>
                </div>
                <div>
                  <label className="form-label">Fecha de entrega estimada</label>
                  <div className="field-input--disabled" style={{
                    color: urg !== "normal" ? (urg === "pronto" ? "#f9a825" : "#c62828") : "#424242",
                    fontWeight: urg !== "normal" ? 700 : 400,
                  }}>
                    {fmtFecha(orden.fechaEntrega)}
                    {urg === "vencida" && " ⚠️ Vencida"}
                    {urg === "urgente" && " 🔴 Hoy/Mañana"}
                    {urg === "pronto"  && " 🟡 Próxima"}
                  </div>
                </div>
                {orden.fechaCierre && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Fecha de cierre real</label>
                    <div className="field-input--disabled">{fmtFecha(orden.fechaCierre)}</div>
                  </div>
                )}
              </div>

              {/* Notas */}
              {orden.notas && (
                <div className="info-box info-box--warn">
                  <span className="info-box__icon">📝</span>
                  <span className="info-box__text">{orden.notas}</span>
                </div>
              )}
            </>
          )}

          {tab === "productos" && (
            <>
              {/* Productos */}
              <div style={{ padding: "12px 16px", background: "#f9fdf9", borderRadius: 12, border: "1.5px solid #e8f5e9", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>🏭</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>
                      Productos a fabricar
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9e9e9e" }}>
                      {(orden.productos || []).length} producto{(orden.productos || []).length !== 1 ? "s" : ""} en esta orden
                    </p>
                  </div>
                </div>
                {orden.costo > 0 && (
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>{fmt(orden.costo)}</span>
                )}
              </div>

              {(orden.productos || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#9e9e9e" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🏭</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Sin productos registrados en esta orden</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(orden.productos || []).map((p, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: 12,
                      border: "1.5px solid #e8f5e9", background: "#fff",
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: "#e8f5e9", border: "1px solid #a5d6a7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, flexShrink: 0,
                      }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{p.nombre}</div>
                        {p.precio && (
                          <div style={{ fontSize: 12, color: "#9e9e9e", marginTop: 2 }}>
                            {fmt(p.precio)} c/u
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#1565c0" }}>× {p.cantidad}</div>
                        {p.precio && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#2e7d32" }}>
                            {fmt(p.precio * p.cantidad)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowInsumosModal(true)}
                        style={{
                          padding: "8px 12px",
                          background: "#e3f2fd",
                          border: "1px solid #90caf9",
                          borderRadius: 8,
                          color: "#1565c0",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        Ver insumos
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {activa && (
            <>
              <button className="btn-cancel" onClick={() => { onClose(); onAsignarEmpleado(orden); }}>
                👷 Asignar empleado
              </button>
              <button className="btn-save" onClick={() => { onClose(); onCambiarEstado(orden); }}>
                ✎ Cambiar estado
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal de insumos */}
      {showInsumosModal && (
        <div className="modal-overlay" onClick={() => setShowInsumosModal(false)}>
          <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-header__eyebrow">Insumos requeridos</p>
                <h2 className="modal-header__title">Orden {orden.id}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowInsumosModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ flexShrink: 0 }}>
              <div style={{ padding: "12px 16px", background: sinStock > 0 ? "#ffebee" : "#f9fdf9", borderRadius: 12, border: `1.5px solid ${sinStock > 0 ? "#ef9a9a" : "#e8f5e9"}`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>🧪</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>
                      Insumos requeridos
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: sinStock > 0 ? "#c62828" : "#9e9e9e", fontWeight: sinStock > 0 ? 700 : 400 }}>
                      {sinStock > 0 ? `⚠️ ${sinStock} con stock insuficiente` : `${(orden.insumos || []).length} insumos · stock OK`}
                    </p>
                  </div>
                </div>
              </div>

              {(orden.insumos || []).length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "#9e9e9e" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🧪</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Sin insumos registrados — agrega una ficha técnica al producto</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(orden.insumos || []).map((ins, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 12,
                      border: `1.5px solid ${ins.stockOk ? "#e8f5e9" : "#ef9a9a"}`,
                      background: ins.stockOk ? "#fff" : "#fff5f5",
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: ins.stockOk ? "#e3f2fd" : "#ffebee",
                        border: `1px solid ${ins.stockOk ? "#90caf9" : "#ef9a9a"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>🧪</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>{ins.nombre}</div>
                        {!ins.stockOk && (
                          <div style={{ fontSize: 11, color: "#c62828", fontWeight: 700, marginTop: 2 }}>
                            Stock insuficiente
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ins.stockOk ? "#1565c0" : "#c62828" }}>
                          {ins.cantidad} <span style={{ fontSize: 11, fontWeight: 500, color: "#9e9e9e" }}>{ins.unidad}</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                            background: ins.stockOk ? "#43a047" : "#e53935",
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowInsumosModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CAMBIAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function ModalCambiarEstado({ orden, onClose, onConfirm }) {
  const [nuevo, setNuevo] = useState(orden.estado);
  const validos = FLUJO_ESTADOS[orden.estado] || [orden.estado];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Actualizar</p>
            <h2 className="modal-header__title">Cambiar estado</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#616161" }}>
            Orden: <strong>{orden.id}</strong> · Estado actual: <EstadoBadge estado={orden.estado} />
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {validos.map(e => {
              const c   = ESTADO_CONFIG[e];
              const sel = nuevo === e;
              return (
                <button
                  key={e}
                  className={`estado-option-btn${sel ? " selected" : ""}`}
                  onClick={() => setNuevo(e)}
                  style={sel ? { borderColor: c.border, background: c.bg } : {}}
                >
                  <span className="estado-option-btn__dot" style={{ background: c.dot }} />
                  <span className="estado-option-btn__label"
                    style={{ color: sel ? c.color : "#424242", fontWeight: sel ? 700 : 500 }}>
                    {e}
                  </span>
                  <span className="estado-option-btn__desc">{c.desc}</span>
                  {e === orden.estado && (
                    <span style={{ marginLeft: 4, fontSize: 10, color: "#9e9e9e", fontWeight: 600 }}>actual</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Advertencia al completar */}
          {nuevo === "Completada" && orden.estado !== "Completada" && (
            <div className="info-box info-box--success" style={{ marginTop: 4 }}>
              <span className="info-box__icon">✅</span>
              <div className="info-box__text">
                <span className="info-box__label">Al completar esta orden</span>
                El stock de los productos fabricados se actualizará automáticamente y el pedido pasará a "Listo".
              </div>
            </div>
          )}

          {nuevo === "Cancelada" && orden.estado !== "Cancelada" && (
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
            disabled={nuevo === orden.estado}
            onClick={() => onConfirm(orden.id, nuevo)}
          >
            Guardar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL ASIGNAR EMPLEADO
   ═══════════════════════════════════════════════════════════ */
function ModalAsignarEmpleado({ orden, empleados, onClose, onConfirm }) {
  const [empId, setEmpId] = useState(orden.idEmpleado || "");
  const [error, setError] = useState("");
  const empActual = empleados.find(e => e.id === orden.idEmpleado);

  const handleConfirm = () => {
    if (!empId) { setError("Selecciona un empleado"); return; }
    onConfirm(orden.id, parseInt(empId));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--md" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">Asignar responsable</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 12, color: "#616161" }}>
            Orden: <strong>{orden.id}</strong>
          </p>

          {empActual && (
            <div className="info-box info-box--warn">
              <span className="info-box__icon">👷</span>
              <span className="info-box__text">
                Responsable actual: <strong>{empActual.nombre} {empActual.apellidos}</strong>
              </span>
            </div>
          )}

          <div>
            <label className="form-label">Empleado responsable <span style={{ color: "#e53935" }}>*</span></label>
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
            {error && <p className="field-error">{error}</p>}
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
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionOrdenesProduccion() {
  const {
    ordenes,
    cambiarEstadoOrden,
    asignarEmpleadoOrden,
    usuarios,
    pedidos,
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

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

  /* ── Filtrado ── */
  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase();
    const matchQ = [
      o.id,
      o.numeroPedido,
      ...(o.productos || []).map(p => p.nombre),
      empleados.find(e => e.id === o.idEmpleado)?.nombre,
    ].filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || o.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  useEffect(() => setPage(1), [search, filterEstado]);

  const hasFilter = filterEstado !== "todos";

  /* ── Handlers ── */
  const handleCambiarEstado = (ordenId, nuevoEstado) => {
    cambiarEstadoOrden(ordenId, nuevoEstado);
    if (filterEstado !== "todos" && nuevoEstado !== filterEstado) {
      setFilterEstado("todos");
    }
    showToast(`Estado actualizado a "${nuevoEstado}"`);
    setModal(null);
  };

  const handleAsignarEmpleado = (ordenId, empleadoId) => {
    asignarEmpleadoOrden(ordenId, empleadoId);
    const emp = empleados.find(e => e.id === empleadoId);
    showToast(`Responsable asignado: ${emp?.nombre} ${emp?.apellidos}`);
    setModal(null);
  };

  /* ── Validaciones ── */
  const abrirCambiarEstado = (orden) => {
    if (["Completada", "Cancelada"].includes(orden.estado)) {
      showToast("Esta orden ya está en un estado final", "warn");
      return;
    }
    setModal({ type: "estado", orden });
  };

  const abrirAsignarEmpleado = (orden) => {
    if (["Completada", "Cancelada"].includes(orden.estado)) {
      showToast("No se puede reasignar en una orden finalizada", "warn");
      return;
    }
    setModal({ type: "empleado", orden });
  };

  /* ═════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════ */
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
              placeholder="Buscar por orden, pedido, producto o empleado…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>

            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 180 }}>
                <p className="filter-section-title">Estado</p>
                {[{ val: "todos", label: "Todos", dot: "#bdbdbd" },
                  ...ESTADOS_ORDEN.map(e => ({ val: e, label: e, dot: ESTADO_CONFIG[e]?.dot }))
                ].map(f => (
                  <button
                    key={f.val}
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

        {/* ── Tabla ── */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Orden</th>
                  <th>Producto(s)</th>
                  <th>Responsable</th>
                  <th>Fecha entrega</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">🏭</div>
                      <p className="empty-state__text">
                        {hasFilter || search ? "Sin órdenes que coincidan." : "No hay órdenes de producción registradas."}
                      </p>
                    </div>
                  </td></tr>
                ) : paged.map((orden, idx) => {
                  const emp    = empleados.find(e => e.id === orden.idEmpleado);
                  const urg    = urgenciaFecha(orden.fechaEntrega);
                  const activa = !["Completada", "Cancelada"].includes(orden.estado);

                  return (
                    <tr key={orden.id} className="tbl-row">
                      {/* Nº */}
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* Orden */}
                      <td>
                        <div className="orden-num">{orden.id}</div>
                      </td>

                      {/* Productos */}
                      <td>
                        {(orden.productos || []).length === 0 ? (
                          <span style={{ fontSize: 12, color: "#bdbdbd" }}>—</span>
                        ) : (orden.productos || []).map((p, i) => (
                          <div key={i} style={{ marginBottom: i < (orden.productos.length - 1) ? 4 : 0 }}>
                            <div className="prod-name">{p.nombre}</div>
                            <div className="prod-qty">× {p.cantidad}</div>
                          </div>
                        ))}
                      </td>

                      {/* Responsable */}
                      <td>
                        {emp
                          ? <div className="emp-cell">👷 {emp.nombre} {emp.apellidos}</div>
                          : <div className="emp-cell--none">Sin asignar</div>
                        }
                      </td>

                      {/* Fecha entrega */}
                      <td>
                        {orden.fechaEntrega ? (
                          <span className={`date-badge${urg === "urgente" || urg === "vencida" ? " date-badge--urgente" : urg === "pronto" ? " date-badge--pronto" : ""}`}>
                            {urg === "vencida"  && "⚠️ "}
                            {urg === "urgente"  && "🔴 "}
                            {urg === "pronto"   && "🟡 "}
                            {fmtFecha(orden.fechaEntrega)}
                          </span>
                        ) : (
                          <span className="date-badge">—</span>
                        )}
                      </td>

                      {/* Costo */}
                      <td>
                        <div className="costo-val">{orden.costo > 0 ? fmt(orden.costo) : "—"}</div>
                        {orden.costo === 0 && <div className="costo-auto">No calculado</div>}
                      </td>

                      {/* Estado */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <EstadoBadge estado={orden.estado} />
                          <ProgresoEstado estado={orden.estado} />
                        </div>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="actions-cell">
                          <button
                            className="act-btn act-btn--view"
                            title="Ver detalle"
                            onClick={() => setModal({ type: "ver", orden })}
                          >👁</button>

                          <button
                            className="act-btn act-btn--estado"
                            title="Cambiar estado"
                            onClick={() => abrirCambiarEstado(orden)}
                            style={{ opacity: activa ? 1 : 0.4, cursor: activa ? "pointer" : "default" }}
                          >✎</button>

                          <button
                            className="act-btn act-btn--empleado"
                            title="Asignar empleado"
                            onClick={() => abrirAsignarEmpleado(orden)}
                            style={{ opacity: activa ? 1 : 0.4, cursor: activa ? "pointer" : "default" }}
                          >👷</button>
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
              {filtered.length} {filtered.length === 1 ? "orden" : "órdenes"} en total
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
      {modal?.type === "ver" && (
        <ModalVerOrden
          orden={modal.orden}
          empleados={empleados}
          pedidos={pedidos}
          onClose={() => setModal(null)}
          onCambiarEstado={(o) => setModal({ type: "estado",   orden: o })}
          onAsignarEmpleado={(o) => setModal({ type: "empleado", orden: o })}
        />
      )}
      {modal?.type === "estado" && (
        <ModalCambiarEstado
          orden={modal.orden}
          onClose={() => setModal(null)}
          onConfirm={handleCambiarEstado}
        />
      )}
      {modal?.type === "empleado" && (
        <ModalAsignarEmpleado
          orden={modal.orden}
          empleados={empleados}
          onClose={() => setModal(null)}
          onConfirm={handleAsignarEmpleado}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}