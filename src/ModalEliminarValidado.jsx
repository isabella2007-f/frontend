import { useState } from "react";

/**
 * ModalEliminarValidado — reutilizable en todos los módulos
 *
 * Props:
 *   titulo      — "Eliminar categoría"
 *   descripcion — "¿Eliminar "Vegetales"?"
 *   validacion  — { ok: bool, razon?: string, advertencia?: string }
 *   onClose / onConfirm
 */
export default function ModalEliminarValidado({ titulo, descripcion, validacion = { ok: true }, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const { ok, razon, advertencia } = validacion;

  const run = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm();
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>

          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
            background: ok ? "#ffebee" : "#fff8e1",
            border: `1px solid ${ok ? "#ef9a9a" : "#ffe082"}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
            {ok ? "🗑️" : "⚠️"}
          </div>

          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#1a1a1a", fontFamily: "'Nunito', sans-serif" }}>
            {titulo}
          </h3>

          <p style={{ margin: "0 0 4px", fontSize: 14, color: "#616161" }}>{descripcion}</p>

          {!ok && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 10,
              background: "#fff8e1", border: "1px solid #ffe082",
              textAlign: "left", fontSize: 12, color: "#e65100", lineHeight: 1.6,
            }}>
              <strong>No se puede eliminar</strong><br />{razon}
            </div>
          )}

          {ok && advertencia && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 10,
              background: "#fff3e0", border: "1px solid #ffcc80",
              textAlign: "left", fontSize: 12, color: "#e65100", lineHeight: 1.6,
            }}>
              ⚠️ {advertencia}
            </div>
          )}

          {ok && !advertencia && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9e9e9e" }}>Esta acción no se puede deshacer.</p>
          )}
        </div>

        <div style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          {ok && (
            <button className="btn-danger" onClick={run} disabled={busy} style={{ flex: 1 }}>
              {busy ? "Eliminando…" : "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}