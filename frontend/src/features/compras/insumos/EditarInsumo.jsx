import { useState } from "react";
import "./GestionInsumos.css";

// ─── Barra de pasos ───────────────────────────────────────
const STEPS = ["Identificación", "Stock y Vencimiento"];

function StepsBar({ current }) {
  return (
    <div className="wizard-steps-bar">
      {STEPS.map((label, i) => {
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
            {i < STEPS.length - 1 && (
              <div className={`wizard-step-line${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EditarInsumo({ ins, onClose, onSave, categorias, unidades }) {
  const [form, setForm] = useState({
    ...ins,
    vencimientoTipo: ins.vencimientoTipo || "dias",
    vencimientoValor: ins.vencimientoValor || "30",
  });
  const [errors, setSErrors] = useState({});
  const [saving, setSaving]  = useState(false);
  const [step, setStep]      = useState(1);

  const set = (k, v) => { 
    setForm(p => ({ ...p, [k]: v })); 
    setSErrors(p => ({ ...p, [k]: "" })); 
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nombre.trim()) e.nombre      = "Campo requerido";
      if (!form.idCategoria)   e.idCategoria = "Selecciona una categoría";
      if (!form.idUnidad)      e.idUnidad    = "Selecciona una unidad";
    }
    if (s === 2) {
      if (form.stockMinimo === "") e.stockMinimo = "Campo requerido";
      if (form.vencimientoTipo === "dias" && (!form.vencimientoValor || Number(form.vencimientoValor) <= 0)) {
        e.vencimientoValor = "Ingresa un número de días válido";
      }
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setSErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSave = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setSErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave({
      ...form,
      idCategoria: Number(form.idCategoria),
      idUnidad:    Number(form.idUnidad),
      stockMinimo: Number(form.stockMinimo),
      vencimientoValor: form.vencimientoTipo === "dias" ? Number(form.vencimientoValor) : null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Gestión de Insumos</p>
            <h2 className="modal-header__title">Editar insumo</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        {/* Body — sin overflow */}
        <div className="modal-body" style={{ overflow: "visible" }}>

          {/* ── Paso 1: Identificación ── */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre <span>*</span></label>
                <input
                  className={`field-input${errors.nombre ? " field-input--error" : ""}`}
                  value={form.nombre} onChange={e => set("nombre", e.target.value)}
                  placeholder="Ej. Plátano verde"
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e => e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0"}
                />
                {errors.nombre && <p className="field-error">{errors.nombre}</p>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Categoría <span>*</span></label>
                  <select
                    className={`field-input${errors.idCategoria ? " field-input--error" : ""}`}
                    value={form.idCategoria} onChange={e => set("idCategoria", e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>)}
                  </select>
                  {errors.idCategoria && <p className="field-error">{errors.idCategoria}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad de medida <span>*</span></label>
                  <select
                    className={`field-input${errors.idUnidad ? " field-input--error" : ""}`}
                    value={form.idUnidad} onChange={e => set("idUnidad", e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.simbolo} — {u.nombre}</option>)}
                  </select>
                  {errors.idUnidad && <p className="field-error">{errors.idUnidad}</p>}
                </div>
              </div>
            </>
          )}

          {/* ── Paso 2: Stock y Vencimiento ── */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">Stock mínimo <span>*</span></label>
                <input
                  type="number" min="0"
                  className={`field-input${errors.stockMinimo ? " field-input--error" : ""}`}
                  value={form.stockMinimo} onChange={e => set("stockMinimo", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e => e.target.style.borderColor = errors.stockMinimo ? "#e53935" : "#e0e0e0"}
                />
                {errors.stockMinimo && <p className="field-error">{errors.stockMinimo}</p>}
              </div>

              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label">Preferencia de Vencimiento</label>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`venc-pref-btn ${form.vencimientoTipo === "dias" ? "active" : ""}`}
                    onClick={() => set("vencimientoTipo", "dias")}
                  >
                    📅 Por Días
                  </button>
                  <button
                    type="button"
                    className={`venc-pref-btn ${form.vencimientoTipo === "fecha" ? "active" : ""}`}
                    onClick={() => set("vencimientoTipo", "fecha")}
                  >
                    🗓️ Por Fecha
                  </button>
                </div>

                {form.vencimientoTipo === "dias" && (
                  <div className="form-group">
                    <label className="form-label">Días de vida útil (estimados)</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number" min="1"
                        className={`field-input ${errors.vencimientoValor ? "field-input--error" : ""}`}
                        value={form.vencimientoValor}
                        onChange={e => set("vencimientoValor", e.target.value)}
                        placeholder="Ej: 30"
                      />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9e9e9e", pointerEvents: "none" }}>días</span>
                    </div>
                    {errors.vencimientoValor && <p className="field-error">{errors.vencimientoValor}</p>}
                  </div>
                )}
                
                <p style={{ fontSize: 11, color: "#9e9e9e", margin: "8px 0 0", fontStyle: "italic" }}>
                  * Esta preferencia se usará como valor por defecto al registrar compras de este insumo.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer — navegación wizard */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          {step < 2
            ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
            : <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
