import { useNavigate } from "react-router-dom";
import { useNotificaciones, TIPO_ICONS, TIPO_LABELS, TIPO_COLORS, TIPOS } from "../context/NotificacionesContext";
import "./notificaciones.css";

const fmtFechaCompleta = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/* Mapeo de rutas para navegación rápida */
const RUTA_MAP = {
  [TIPOS.STOCK_MINIMO]:    "/admin/gestion-insumos",
  [TIPOS.STOCK_AGOTADO]:   "/admin/gestion-insumos",
  [TIPOS.LOTE_POR_VENCER]: "/admin/gestion-insumos",
  [TIPOS.LOTE_VENCIDO]:    "/admin/gestion-insumos",
  [TIPOS.PEDIDO_NUEVO]:    "/admin/pedidos",
  [TIPOS.COMPRA_PENDIENTE]:"/admin/compras",
  [TIPOS.DEVOLUCION]:      "/admin/devoluciones",
  [TIPOS.SISTEMA]:         "/admin",
};

export default function NotificacionDetalle({ notif, onClose }) {
  const { eliminarNotificacion } = useNotificaciones();
  const navigate = useNavigate();
  if (!notif) return null;

  const color = TIPO_COLORS[notif.tipo] || "#2e7d32";
  const ruta  = RUTA_MAP[notif.tipo] || "/dashboard";

  const handleIrAlRecurso = () => {
    navigate(ruta);
    onClose();
  };

  const handleListo = () => {
    eliminarNotificacion(notif.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 30000 }}>
      <div className="modal-box modal-box--sm notif-detalle" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ background: `linear-gradient(135deg, ${color}18, #fff)` }}>
          <div>
            <p className="modal-header__eyebrow">DETALLE DE NOTIFICACIÓN</p>
            <h2 className="modal-header__title" style={{ color }}>
              {TIPO_ICONS[notif.tipo]} {TIPO_LABELS[notif.tipo]}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body notif-detalle__body">
          <div className="notif-detalle__pill-row">
            <span className="notif-detalle__pill" style={{ background: `${color}18`, color }}>
              {TIPO_ICONS[notif.tipo]} {TIPO_LABELS[notif.tipo]}
            </span>
            <span className="notif-detalle__fecha">{fmtFechaCompleta(notif.fecha)}</span>
          </div>

          <h3 className="notif-detalle__titulo">{notif.titulo}</h3>
          <p  className="notif-detalle__mensaje">{notif.mensaje}</p>

          {notif.refNombre && (
            <div className="notif-detalle__ref">
              <span className="notif-detalle__ref-label">Referencia</span>
              <span className="notif-detalle__ref-value">{notif.refNombre}</span>
            </div>
          )}

          <div className="info-box info-box--info" style={{ marginTop: 20 }}>
            <span className="info-box__icon">💡</span>
            <span className="info-box__text">
              Accede directamente al módulo relacionado para gestionar este evento.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ gap: 10 }}>
          <button 
            className="btn-save" 
            style={{ background: color, border: "none", color: "#fff" }} 
            onClick={handleIrAlRecurso}
          >
            🚀 Ir al módulo
          </button>
          
          <button 
            className="btn-save" 
            onClick={handleListo}
            title="Marcar como completado y eliminar de la lista"
          >
            ✓ Listo
          </button>
          
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}