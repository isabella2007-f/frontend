import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../services/authService";
import { getDomicilios, getDomicilio, cambiarEstadoDomicilio, computarOTP, verificarOTP } from "../../../services/domiciliosService";
import { subirImagenCloudinary } from "../../../utils/cloudinary";
import "./Domicilios.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const ESTADO_ORDEN = ["En camino", "En proceso", "Asignado", "Pendiente"];

const ESTADO_INFO = {
  "Asignado":   { color: "#1565c0", bg: "#e3f2fd", icon: "📦" },
  "En proceso": { color: "#e65100", bg: "#fff3e0", icon: "🏠" },
  "En camino":  { color: "#8e24aa", bg: "#f3e5f5", icon: "🛵" },
  "Entregado":  { color: "#009688", bg: "#e0f2f1", icon: "✅" },
};

// "Entregado" (8) abre el modal de evidencia; el resto cambia de estado directamente
const ACCIONES = {
  "Asignado":   [{ valor: 13, label: "Llegué al local",  icon: "🏠", color: "#e65100", bg: "#fff3e0" }],
  "Pendiente":  [{ valor: 13, label: "Llegué al local",  icon: "🏠", color: "#e65100", bg: "#fff3e0" }],
  "En proceso": [{ valor: 9,  label: "Iniciar entrega",  icon: "🛵", color: "#8e24aa", bg: "#f3e5f5" }],
  "En camino":  [
    { valor: 8,  label: "Entregado",   icon: "✅", color: "#009688", bg: "#e0f2f1", evidencia: true },
    { valor: 5,  label: "Cancelar",    icon: "❌", color: "#c62828", bg: "#ffebee", secondary: true },
  ],
};

function EvidenciaModal({ pedido, onClose, onConfirm }) {
  const [tab,       setTab]       = useState("otp");    // "otp" | "foto"
  const [fotoFile,  setFotoFile]  = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);

  const otp = computarOTP(pedido.id);

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    setError(null);
    setUploading(true);
    try {
      let observacion = "Evidencia de entrega registrada.";
      if (tab === "foto" && fotoFile) {
        const url = await subirImagenCloudinary(fotoFile);
        observacion = `Evidencia fotográfica: ${url}`;
      } else if (tab === "otp") {
        observacion = `Entrega confirmada con código OTP ${otp}.`;
      }
      await onConfirm(observacion);
    } catch (e) {
      setError(e.message || "Error al registrar evidencia");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 28px",
        width: "min(440px, 95vw)", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Evidencia de entrega</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9e9e9e" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["otp", "🔢 Código OTP"], ["foto", "📷 Foto"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
              border: tab === id ? "2px solid #009688" : "1.5px solid #e0e0e0",
              background: tab === id ? "#e0f2f1" : "#fafafa",
              color: tab === id ? "#009688" : "#616161",
              fontWeight: tab === id ? 700 : 400, fontSize: 13,
            }}>{label}</button>
          ))}
        </div>

        {tab === "otp" && (
          <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
            <div style={{ fontSize: 12, color: "#9e9e9e", marginBottom: 12 }}>
              Muestra este código al cliente para confirmar la entrega
            </div>
            <div style={{
              fontSize: 52, fontWeight: 900, letterSpacing: 8,
              color: "#1565c0", background: "#e3f2fd",
              borderRadius: 16, padding: "20px 24px", display: "inline-block",
              fontFamily: "monospace",
            }}>
              {otp}
            </div>
            <div style={{ fontSize: 12, color: "#9e9e9e", marginTop: 12 }}>
              El cliente debe confirmar este código verbalmente.
            </div>
          </div>
        )}

        {tab === "foto" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 10, padding: 20, borderRadius: 12, cursor: "pointer",
              border: "2px dashed #e0e0e0", background: "#fafafa",
            }}>
              {fotoPreview ? (
                <img src={fotoPreview} alt="Evidencia" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <>
                  <span style={{ fontSize: 32 }}>📷</span>
                  <span style={{ fontSize: 13, color: "#9e9e9e" }}>Tomar o seleccionar foto</span>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: "none" }} />
            </label>
          </div>
        )}

        {error && <div style={{ color: "#c62828", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={uploading || (tab === "foto" && !fotoFile)}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: uploading || (tab === "foto" && !fotoFile) ? "#a5d6a7" : "#009688",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: uploading || (tab === "foto" && !fotoFile) ? "not-allowed" : "pointer",
            }}>
            {uploading ? "Registrando…" : "Confirmar entrega ✅"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
      <span className="toast-icon">{toast.type === "error" ? "✕" : "✓"}</span>
      {toast.message}
    </div>
  );
}

export default function PedidoActual() {
  const user = getUser();
  const [pedido, setPedido]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [evidenciaOpen, setEvidenciaOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const doms = await getDomicilios({ porPagina: 100, idEmpleado: user.id });
      const activos = (doms.domicilios || []).filter(d =>
        ["En camino", "En proceso", "Asignado", "Pendiente"].includes(d.estado)
      );
      activos.sort((a, b) => ESTADO_ORDEN.indexOf(a.estado) - ESTADO_ORDEN.indexOf(b.estado));

      if (activos.length === 0) {
        setPedido(null);
      } else {
        // cargar detalle completo con productos
        const detalle = await getDomicilio(activos[0].id);
        setPedido(detalle);
      }
    } catch (e) {
      showToast("Error al cargar el pedido", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleAccion = async (accion) => {
    if (accion.secondary) { setConfirmando(accion); return; }
    if (accion.evidencia)  { setEvidenciaOpen(true); return; }
    await ejecutarCambio(accion.valor, accion.label);
  };

  const handleEvidenciaConfirm = async (observacion) => {
    setEvidenciaOpen(false);
    await ejecutarCambio(8, "Entregado", observacion);
  };

  const ejecutarCambio = async (valor, label, observacion = null) => {
    setSaving(true);
    setConfirmando(null);
    try {
      await cambiarEstadoDomicilio(pedido.id, valor, observacion);
      showToast(`Estado actualizado: ${label}`);
      await cargar();
    } catch (e) {
      showToast(e.message || "Error al cambiar el estado", "error");
    } finally {
      setSaving(false);
    }
  };

  const abrirMaps = (tipo) => {
    if (!pedido) return;
    const dir = encodeURIComponent(
      [pedido.direccion_entrega, pedido.municipio_entrega].filter(Boolean).join(", ")
    );
    const url = tipo === "waze"
      ? `https://waze.com/ul?q=${dir}&navigate=yes`
      : `https://www.google.com/maps/dir/?api=1&destination=${dir}`;
    window.open(url, "_blank", "noopener");
  };

  const estadoInfo = pedido ? (ESTADO_INFO[pedido.estado] || ESTADO_INFO["Asignado"]) : null;
  const acciones   = pedido ? (ACCIONES[pedido.estado] || []) : [];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Pedido Actual</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9e9e9e" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⌛</div>
            <p style={{ fontWeight: 600 }}>Cargando...</p>
          </div>
        ) : !pedido ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9e9e9e" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛵</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#424242", marginBottom: 8 }}>
              Sin pedido activo
            </p>
            <p style={{ fontSize: 14 }}>No tienes ninguna entrega en curso en este momento.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Cabecera del pedido ── */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "20px 22px",
              border: `1.5px solid ${estadoInfo.bg}`,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#9e9e9e", fontWeight: 700 }}>{pedido.numero}</span>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: estadoInfo.bg, color: estadoInfo.color,
                }}>
                  {estadoInfo.icon} {pedido.estado}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#757575" }}>
                {new Date(pedido.fecha_pedido).toLocaleString("es-CO", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                }) || "—"}
              </div>
            </div>

            {/* ── Cliente y dirección ── */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1.5px solid #f0f0f0" }}>
              <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>
                CLIENTE
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#212121", marginBottom: 10 }}>
                {pedido.cliente?.nombre || "—"}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#616161", fontSize: 14 }}>
                <span style={{ marginTop: 1 }}>📍</span>
                <span>{[pedido.direccion_entrega, pedido.municipio_entrega].filter(Boolean).join(", ") || "Sin dirección"}</span>
              </div>

              {/* Botones de mapas */}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => abrirMaps("google")}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                    border: "1.5px solid #4285f4", background: "#fff",
                    color: "#4285f4", fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  🗺️ Google Maps
                </button>
                <button
                  onClick={() => abrirMaps("waze")}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                    border: "1.5px solid #33ccff", background: "#fff",
                    color: "#0099cc", fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  🚗 Waze
                </button>
              </div>
            </div>

            {/* ── Productos ── */}
            {pedido.productos?.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1.5px solid #f0f0f0" }}>
                <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 14, letterSpacing: "0.05em" }}>
                  PRODUCTOS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pedido.productos.map((p, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", background: "#f8f8f8", borderRadius: 10,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#212121" }}>{p.nombre_producto}</div>
                        <div style={{ fontSize: 12, color: "#9e9e9e" }}>x{p.Cantidad} · {fmt(p.precio_unitario)} c/u</div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#2e7d32", fontSize: 14 }}>{fmt(p.subtotal)}</div>
                    </div>
                  ))}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderTop: "1.5px solid #f0f0f0", marginTop: 14, paddingTop: 12,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#424242" }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: "#2e7d32" }}>{fmt(pedido.total)}</span>
                </div>
                {pedido.metodo_pago && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#757575" }}>
                    💳 Pago: {pedido.metodo_pago}
                  </div>
                )}
              </div>
            )}

            {/* ── Acciones de estado ── */}
            {acciones.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1.5px solid #f0f0f0" }}>
                <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 14, letterSpacing: "0.05em" }}>
                  ACTUALIZAR ESTADO
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {acciones.map(ac => (
                    <button
                      key={ac.valor}
                      onClick={() => handleAccion(ac)}
                      disabled={saving}
                      style={{
                        width: "100%", padding: "14px", borderRadius: 12, cursor: saving ? "not-allowed" : "pointer",
                        border: `2px solid ${ac.secondary ? "#ffcdd2" : ac.bg}`,
                        background: ac.secondary ? "#fff" : ac.bg,
                        color: ac.color, fontWeight: 800, fontSize: 15,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{ac.icon}</span>
                      {saving ? "Actualizando…" : ac.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Observaciones ── */}
            {pedido.obs_domicilio && (
              <div style={{
                background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 14,
                padding: "14px 18px",
              }}>
                <div style={{ fontSize: 11, color: "#f57f17", fontWeight: 700, marginBottom: 6 }}>OBSERVACIONES</div>
                <div style={{ fontSize: 13, color: "#424242" }}>{pedido.obs_domicilio}</div>
              </div>
            )}

            {/* ── Botón Chat ── */}
            <Link to={`/admin/chat/${pedido.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 12, textDecoration: "none",
              border: "1.5px solid #e0e0e0", background: "#fff",
              color: "#424242", fontWeight: 600, fontSize: 14,
            }}>
              💬 Chat con cliente / admin
            </Link>
          </div>
        )}
      </div>

      {/* ── Modal evidencia ── */}
      {evidenciaOpen && pedido && (
        <EvidenciaModal
          pedido={pedido}
          onClose={() => setEvidenciaOpen(false)}
          onConfirm={handleEvidenciaConfirm}
        />
      )}

      {/* ── Modal confirmación cancelar ── */}
      {confirmando && (
        <div className="modal-overlay" onClick={() => setConfirmando(null)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px",
            width: "min(360px, 90vw)", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "#c62828" }}>¿Cancelar entrega?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#616161" }}>
              Esta acción cambiará el estado del pedido a <strong>Cancelado</strong>.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmando(null)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#555", fontSize: 13, cursor: "pointer" }}>
                Volver
              </button>
              <button onClick={() => ejecutarCambio(confirmando.valor, confirmando.label)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#c62828", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
