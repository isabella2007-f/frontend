import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";

/**
 * Confirmación explícita para acciones sensibles: acciones masivas de estado y
 * eliminación de barrios. Cada acción masiva pide confirmación antes de
 * ejecutarse (regla del módulo).
 */
export default function ModalConfirmar({
  titulo,
  mensaje,
  confirmarLabel = "Confirmar",
  peligro = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}) {
  return createPortal(
    <div className="ub-overlay" onClick={onCancelar}>
      <div className="ub-modal" style={{ width: "min(440px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal__head">
          <h2>{titulo}</h2>
          <button className="ub-modal__x" onClick={onCancelar}><X size={18} /></button>
        </div>
        <div className="ub-modal__body">
          <div className={peligro ? "ub-warn" : "ub-info"}>
            <AlertTriangle size={15} />
            <span>{mensaje}</span>
          </div>
        </div>
        <div className="ub-modal__foot">
          <button className="ub-btn ub-btn--ghost" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </button>
          <button
            className={`ub-btn ${peligro ? "ub-btn--danger" : "ub-btn--primary"}`}
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? "Aplicando…" : confirmarLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
