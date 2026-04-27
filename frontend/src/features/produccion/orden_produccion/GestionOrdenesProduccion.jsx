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
  const [activeTab, setActiveTab] = useState("general");
  if (!orden) return null;
  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));
  const cfg = ESTADO_CONFIG[orden.estado] || {};

  const totalUnidades = (orden.productos || []).reduce((acc, x) => acc + (x.cantidad || 0), 0);
  const totalProductos = (orden.productos || []).length;

  const tabs = [
    { id: "general", label: "General", icon: "📋" },
    { id: "productos", label: "Productos", icon: "📦" },
    { id: "insumos", label: "Insumos", icon: "🧺" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>

        {/* Cabecera mejorada */}
        <div className="modal-header" style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: cfg.bg || "#f5f5f5",
              border: `3px solid ${cfg.border || "#e0e0e0"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: cfg.color || "#424242"
            }}>
              📋
            </div>
            <div>
              <p className="modal-header__eyebrow" style={{ margin: 0, color: "#666", fontSize: 14 }}>Orden de Producción</p>
              <h2 className="modal-header__title" style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{orden.id}</h2>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <EstadoBadge estado={orden.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Pestañas */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0", background: "#fafafa" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "12px 16px",
                border: "none",
                background: activeTab === tab.id ? "#fff" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #2e7d32" : "none",
                color: activeTab === tab.id ? "#2e7d32" : "#757575",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s"
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ padding: "24px 0", minHeight: 400 }}>

          {/* ── Pestaña General ── */}
          {activeTab === "general" && (
            <>
              {/* Resumen principal */}
              <div style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "20px 24px",
                borderRadius: 12,
                marginBottom: 24,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 20
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{totalUnidades}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Unidades totales</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{totalProductos}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Productos</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{fmt(orden.costo)}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Costo estimado</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                    {orden.fechaEntrega ? fmtFecha(orden.fechaEntrega) : "—"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Fecha entrega</div>
                </div>
              </div>

              {/* Información detallada */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Información General */}
            <div style={{
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 20
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>📋</span>
                Información General
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>Responsable:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
                    {empleado ? `${empleado.nombre} ${empleado.apellidos || ""}` : "Sin asignar"}
                  </span>
                </div>

                {orden.numeroPedido && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>Pedido vinculado:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1976d2" }}>
                      #{orden.numeroPedido}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>Fecha creación:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
                    {orden.fechaInicio ? fmtFecha(orden.fechaInicio) : "—"}
                  </span>
                </div>

                {orden.fechaCierre && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>Fecha cierre:</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
                      {fmtFecha(orden.fechaCierre)}
                    </span>
                  </div>
                )}
              </div>

              {orden.notas && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, color: "#666", fontWeight: 500, margin: "0 0 8px 0" }}>Notas:</p>
                  <div style={{
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#555",
                    lineHeight: 1.5
                  }}>
                    {orden.notas}
                  </div>
                </div>
              )}
            </div>

            {/* Productos a Fabricar */}
            <div style={{
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 20
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>🏭</span>
                Productos a Fabricar
              </h3>

              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {(orden.productos || []).length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                    fontSize: 14
                  }}>
                    <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>📦</span>
                    Sin productos asignados
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(orden.productos || []).map((p, i) => (
                      <div key={i} style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                        padding: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 2 }}>
                            {p.nombre}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {fmt(p.precio)} por unidad
                          </div>
                        </div>
                        <div style={{
                          background: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 14,
                          minWidth: 50,
                          textAlign: "center"
                        }}>
                          ×{p.cantidad}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Insumos Requeridos */}
            <div style={{
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 20
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>📦</span>
                Insumos Requeridos
              </h3>

              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {(orden.insumos || []).length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                    fontSize: 14
                  }}>
                    <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>🔍</span>
                    Sin insumos calculados
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(orden.insumos || []).map((ins, i) => (
                      <div key={ins.idInsumo} style={{
                        background: ins.stockOk ? "white" : "#fff3e0",
                        border: `1px solid ${ins.stockOk ? "#e0e0e0" : "#ffcc02"}`,
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: ins.stockOk ? "#333" : "#e65100",
                            marginBottom: 2
                          }}>
                            {ins.nombre}
                          </div>
                          <div style={{ fontSize: 11, color: "#666" }}>
                            {ins.cantidad} {ins.unidad}
                          </div>
                        </div>
                        {!ins.stockOk && (
                          <div style={{
                            color: "#e65100",
                            fontSize: 16,
                            fontWeight: 700,
                            marginLeft: 8
                          }}>
                            ⚠️
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(orden.insumos || []).some(ins => !ins.stockOk) && (
                <div style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: "#ffebee",
                  border: "1px solid #ffcdd2",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#c62828",
                  textAlign: "center"
                }}>
                  ⚠️ Algunos insumos tienen stock insuficiente
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* ── Pestaña Productos ── */}
          {activeTab === "productos" && (
            <div style={{
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 20,
              margin: "0 24px"
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>📦</span>
                Productos a Fabricar
              </h3>

              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {(orden.productos || []).length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                    fontSize: 14
                  }}>
                    <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>📦</span>
                    Sin productos asignados
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(orden.productos || []).map((p, i) => (
                      <div key={i} style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                        padding: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 2 }}>
                            {p.nombre}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {fmt(p.precio)} por unidad
                          </div>
                        </div>
                        <div style={{
                          background: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: 20,
                          padding: "4px 12px",
                          fontWeight: 700,
                          fontSize: 14,
                          minWidth: 50,
                          textAlign: "center"
                        }}>
                          ×{p.cantidad}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(orden.productos || []).length > 0 && (
                <div style={{
                  marginTop: 20,
                  padding: "16px",
                  background: "#e8f5e9",
                  borderRadius: 10,
                  border: "1px solid #a5d6a7"
                }}>
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
              )}
            </div>
          )}

          {/* ── Pestaña Insumos ── */}
          {activeTab === "insumos" && (
            <div style={{
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 20,
              margin: "0 24px"
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: 16,
                fontWeight: 700,
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>🧺</span>
                Insumos Requeridos
              </h3>

              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {(orden.insumos || []).length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                    fontSize: 14
                  }}>
                    <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>🔍</span>
                    Sin insumos calculados
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(orden.insumos || []).map((ins, i) => (
                      <div key={ins.idInsumo} style={{
                        background: ins.stockOk ? "white" : "#fff3e0",
                        border: `1px solid ${ins.stockOk ? "#e0e0e0" : "#ffcc02"}`,
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: ins.stockOk ? "#333" : "#e65100",
                            marginBottom: 2
                          }}>
                            {ins.nombre}
                          </div>
                          <div style={{ fontSize: 11, color: "#666" }}>
                            {ins.cantidad} {ins.unidad}
                          </div>
                        </div>
                        {!ins.stockOk && (
                          <div style={{
                            color: "#e65100",
                            fontSize: 16,
                            fontWeight: 700,
                            marginLeft: 8
                          }}>
                            ⚠️
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(orden.insumos || []).some(ins => !ins.stockOk) && (
                <div style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  background: "#ffebee",
                  border: "1px solid #ffcdd2",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#c62828",
                  textAlign: "center"
                }}>
                  ⚠️ Algunos insumos tienen stock insuficiente
                </div>
              )}
            </div>
          )}
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
  }, [form.productos, productos, allInsumos, UNIDADES_MEDIDA, calcularCostoProduccion]);

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