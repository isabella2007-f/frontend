import { TIPO_ICONS, TIPO_LABELS, TIPO_COLORS } from "../context/NotificacionesContext";
import "./notificaciones.css";

const fmtFechaCompleta = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/* ══════════════════════════════════════════════════════════
   HU_02 — Ver detalles de la notificación
   CA_02_01 listado de notificaciones al administrador
   CA_02_02 info básica del evento
   CA_02_03 ordenadas por fecha
   CA_02_04 acceder al detalle
   CA_02_05 marcar como leída
══════════════════════════════════════════════════════════ */
export default function NotificacionDetalle({ notif, onClose, onMarcarLeida }) {
  if (!notif) return null;
  const color = TIPO_COLORS[notif.tipo] || "#2e7d32";

  return (
    <div className="modal-overlay" onClick={onClose}>
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

        {/* Body — CA_02_02 información básica del evento */}
        <div className="modal-body notif-detalle__body">
          <div className="notif-detalle__pill-row">
            <span className="notif-detalle__pill" style={{ background: `${color}18`, color }}>
              {TIPO_ICONS[notif.tipo]} {TIPO_LABELS[notif.tipo]}
            </span>
            {/* CA_02_03 — fecha */}
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

          {/* Estado leída / no leída — CA_02_05 */}
          <div className={`notif-detalle__estado ${notif.leida ? "notif-detalle__estado--leida" : "notif-detalle__estado--nueva"}`}>
            {notif.leida ? "✓ Marcada como leída" : "● No leída"}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {!notif.leida && (
            <button
              className="btn-save"
              onClick={() => { onMarcarLeida(notif.id); onClose(); }}
            >
              ✓ Marcar como leída
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}