import { useState, useEffect } from "react";
import { getDomicilios, cambiarEstadoDomicilio } from "../../../services/domiciliosService.js";
import { getUser } from "../../../services/authService.js";
import "./Domicilios.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const ESTADO_INFO = {
  "Pendiente":  { color: "#f9a825", bg: "#fff8e1", border: "#ffe082", icon: "⏳" },
  "Asignado":   { color: "#1565c0", bg: "#e3f2fd", border: "#90caf9", icon: "📦" },
  "En camino":  { color: "#8e24aa", bg: "#f3e5f5", border: "#ce93d8", icon: "🛵" },
  "Entregado":  { color: "#009688", bg: "#e0f2f1", border: "#80cbc4", icon: "✅" },
  "Cancelado":  { color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "❌" },
};

// Estados que un repartidor puede asignar, según el estado actual
// Valores usan IDs de la tabla Estados: 9=En camino, 8=Entregado, 5=Cancelado
const PROXIMOS_ESTADOS = {
  "Pendiente":  [{ valor: 9, label: "En camino", icon: "🛵" }],
  "Asignado":   [{ valor: 9, label: "En camino", icon: "🛵" }],
  "En camino":  [{ valor: 8, label: "Entregado", icon: "✅" }, { valor: 5, label: "Cancelado", icon: "❌" }],
};

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
      <span className="toast-icon">{toast.type === "error" ? "✕" : "✓"}</span>
      {toast.message}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const cfg = ESTADO_INFO[estado] || { color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "•" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span>{cfg.icon}</span> {estado}
    </span>
  );
}

function CambiarEstadoModal({ domicilio, onClose, onSave }) {
  const posibles = PROXIMOS_ESTADOS[domicilio.estado] || [];
  const [nuevoEstado, setNuevoEstado] = useState(posibles[0]?.valor || "");
  const [obs, setObs] = useState(domicilio.obs_domicilio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nuevoEstado) return;
    setSaving(true);
    try {
      await onSave(domicilio.id, nuevoEstado, obs.trim() || null);
      onClose();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 28px",
        width: "min(420px, 95vw)", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#212121" }}>Actualizar entrega</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9e9e9e" }}>✕</button>
        </div>

        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "#212121", marginBottom: 4 }}>{domicilio.numero}</div>
          <div style={{ color: "#616161" }}>{domicilio.cliente?.nombre || "—"}</div>
          <div style={{ color: "#757575", marginTop: 2 }}>{domicilio.direccion_entrega}</div>
        </div>

        {posibles.length === 0 ? (
          <p style={{ color: "#757575", fontSize: 14, textAlign: "center" }}>
            No hay cambios de estado disponibles para este domicilio.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#616161", display: "block", marginBottom: 8 }}>
                Nuevo estado
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {posibles.map(op => (
                  <button
                    key={op.valor}
                    onClick={() => setNuevoEstado(op.valor)}
                    style={{
                      flex: 1, minWidth: 120, padding: "10px 14px",
                      borderRadius: 10, border: nuevoEstado === op.valor ? "2px solid #4caf50" : "1.5px solid #e0e0e0",
                      background: nuevoEstado === op.valor ? "#e8f5e9" : "#fafafa",
                      color: nuevoEstado === op.valor ? "#2e7d32" : "#616161",
                      fontWeight: 700, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <span>{op.icon}</span> {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#616161", display: "block", marginBottom: 8 }}>
                Observaciones (opcional)
              </label>
              <textarea
                rows={3}
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Comentario o novedad del domicilio..."
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1.5px solid #e0e0e0", fontSize: 13, resize: "vertical",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !nuevoEstado}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: saving ? "#a5d6a7" : "#4caf50", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DetallesModal({ domicilio, onClose, onCambiarEstado }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 28px",
        width: "min(480px, 95vw)", maxHeight: "85vh", overflow: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "#9e9e9e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Domicilio</p>
            <h2 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 700 }}>{domicilio.numero}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9e9e9e" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <EstadoBadge estado={domicilio.estado} />
          <span style={{ fontSize: 12, color: "#9e9e9e", alignSelf: "center" }}>
            {fmtFecha(domicilio.fecha_pedido)}
          </span>
        </div>

        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 4 }}>CLIENTE</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{domicilio.cliente?.nombre || "—"}</div>
          </div>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 4 }}>DIRECCIÓN</div>
            <div style={{ fontSize: 14 }}>{domicilio.direccion_entrega || "—"}</div>
          </div>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#2e7d32" }}>{fmt(domicilio.total || 0)}</div>
          </div>
        </div>

        {domicilio.obs_domicilio && (
          <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#f57f17", fontWeight: 700, marginBottom: 4 }}>OBSERVACIONES</div>
            <div style={{ fontSize: 13, color: "#424242" }}>{domicilio.obs_domicilio}</div>
          </div>
        )}

        {PROXIMOS_ESTADOS[domicilio.estado]?.length > 0 && (
          <button
            onClick={() => { onClose(); onCambiarEstado(domicilio); }}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "#4caf50", color: "#fff", border: "none",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            🛵 Actualizar estado de entrega
          </button>
        )}
      </div>
    </div>
  );
}

export default function GestionDomiciliosRepartidor() {
  const user = getUser();
  const idEmpleado = user?.id;

  const [domicilios, setDomicilios] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtro,  setFiltro]        = useState("activos");
  const [modal,   setModal]         = useState(null);
  const [toast,   setToast]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargar = async () => {
    if (!idEmpleado) return;
    setLoading(true);
    try {
      const data = await getDomicilios({ porPagina: 100, idEmpleado });
      setDomicilios(data.domicilios || []);
    } catch (e) {
      showToast(e.message || "Error al cargar entregas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const esActivo = (d) => d.estado !== "Entregado" && d.estado !== "Cancelado";

  const filtrados = domicilios.filter(d => {
    if (filtro === "activos")    return esActivo(d);
    if (filtro === "entregados") return d.estado === "Entregado";
    return true;
  });

  const handleCambiarEstado = async (id, nuevoEstado, observaciones) => {
    try {
      await cambiarEstadoDomicilio(id, nuevoEstado, observaciones);
      showToast("Estado actualizado");
      await cargar();
    } catch (e) {
      showToast(e.message || "Error al cambiar el estado", "error");
    }
  };

  const FILTROS = [
    { val: "activos",    label: "Activos",    count: domicilios.filter(esActivo).length },
    { val: "entregados", label: "Entregados", count: domicilios.filter(d => d.estado === "Entregado").length },
    { val: "todos",      label: "Todos",      count: domicilios.length },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Mis Entregas</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTROS.map(f => (
            <button
              key={f.val}
              onClick={() => setFiltro(f.val)}
              style={{
                padding: "8px 16px", borderRadius: 20,
                border: filtro === f.val ? "1.5px solid #4caf50" : "1.5px solid #e0e0e0",
                background: filtro === f.val ? "#e8f5e9" : "#fafafa",
                color: filtro === f.val ? "#2e7d32" : "#616161",
                fontWeight: filtro === f.val ? 700 : 400,
                fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {f.label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: filtro === f.val ? "#c8e6c9" : "#eeeeee",
                color: filtro === f.val ? "#2e7d32" : "#9e9e9e",
                borderRadius: 10, padding: "1px 7px",
              }}>{f.count}</span>
            </button>
          ))}
          <button
            onClick={cargar}
            style={{
              marginLeft: "auto", padding: "8px 14px", borderRadius: 20,
              border: "1.5px solid #e0e0e0", background: "#fff",
              color: "#616161", fontSize: 13, cursor: "pointer",
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1.5px solid #f0f0f0" }}>
                {[70, 50, 90, 40].map((w, j) => (
                  <div key={j} className="skeleton-cell" style={{ width: `${w}%`, height: 14, marginBottom: 10, borderRadius: 7 }} />
                ))}
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9e9e9e" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛵</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>
              {filtro === "activos" ? "No tienes entregas pendientes" : "Sin resultados"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtrados.map(dom => {
              const info = ESTADO_INFO[dom.estado] || ESTADO_INFO["Pendiente"];
              const puedeCambiar = !!PROXIMOS_ESTADOS[dom.estado]?.length;
              return (
                <div
                  key={dom.id}
                  style={{
                    background: "#fff", borderRadius: 14, padding: 20,
                    border: `1.5px solid ${info.border}`,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                  onClick={() => setModal({ type: "detalles", dom })}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#9e9e9e", fontWeight: 600 }}>{dom.numero}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#212121", marginTop: 2 }}>
                        {dom.cliente?.nombre || "Cliente"}
                      </div>
                    </div>
                    <EstadoBadge estado={dom.estado} />
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10, color: "#616161", fontSize: 13 }}>
                    <span style={{ marginTop: 1 }}>📍</span>
                    <span style={{ lineHeight: 1.4 }}>{dom.direccion_entrega || "Sin dirección"}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#2e7d32" }}>{fmt(dom.total || 0)}</span>
                    {puedeCambiar && (
                      <button
                        onClick={e => { e.stopPropagation(); setModal({ type: "cambiarEstado", dom }); }}
                        style={{
                          padding: "7px 14px", borderRadius: 8,
                          background: "#4caf50", color: "#fff",
                          border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        Actualizar →
                      </button>
                    )}
                  </div>

                  {dom.obs_domicilio && (
                    <div style={{ marginTop: 10, padding: "7px 10px", background: "#fff8e1", borderRadius: 7, fontSize: 12, color: "#616161", borderLeft: "3px solid #f9a825" }}>
                      💬 {dom.obs_domicilio}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal?.type === "detalles" && (
        <DetallesModal
          domicilio={modal.dom}
          onClose={() => setModal(null)}
          onCambiarEstado={(dom) => setModal({ type: "cambiarEstado", dom })}
        />
      )}

      {modal?.type === "cambiarEstado" && (
        <CambiarEstadoModal
          domicilio={modal.dom}
          onClose={() => setModal(null)}
          onSave={handleCambiarEstado}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
