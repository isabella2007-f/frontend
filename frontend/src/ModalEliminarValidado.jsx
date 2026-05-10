import { useState } from "react";

/**
 * ModalEliminarValidado
 *
 * Props:
 *  - titulo:      string   — título del modal
 *  - descripcion: string   — descripción de lo que se va a eliminar
 *  - validacion:  { ok: boolean, razon?: string }
 *                   ok=true  → permite eliminar (muestra confirmación normal)
 *                   ok=false → bloquea (muestra solo la razón, sin botón de confirmar)
 *  - onClose:     () => void
 *  - onConfirm:   () => void
 */
export default function ModalEliminarValidado({
  titulo,
  descripcion,
  validacion,
  onClose,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm();
    setLoading(false);
  };

  const bloqueado = !validacion?.ok;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>

          {/* Ícono diferente según el caso */}
          <div className="delete-icon-wrap">
            {bloqueado ? "⚠️" : "🗑️"}
          </div>

          <h3 className="delete-title">{titulo}</h3>

          {/* ── FIX: cuando está bloqueado NO mostrar ¿Está seguro? ──
              Solo se muestra la descripción cuando la acción SÍ está permitida */}
          {!bloqueado && (
            <p className="delete-body">{descripcion}</p>
          )}

          {/* Razón del bloqueo o advertencia de confirmación */}
          {bloqueado ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#ffebee",
                border: "1px solid #ef9a9a",
                color: "#c62828",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.5,
                textAlign: "left",
              }}
            >
              🔒 {validacion.razon}
            </div>
          ) : (
            <p className="delete-warn">Esta acción no se puede deshacer.</p>
          )}
        </div>

        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>
            {bloqueado ? "Entendido" : "Cancelar"}
          </button>

          {/* Solo mostrar el botón de confirmar cuando la acción está permitida */}
          {!bloqueado && (
            <button
              className="btn-danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Eliminando…" : "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}