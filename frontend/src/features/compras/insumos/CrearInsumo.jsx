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

export default function CrearInsumo({ onClose, onSave, categorias, unidades }) {
  const [form, setForm] = useState({
    nombre: "", idCategoria: "", idUnidad: "",
    stockMinimo: "",
    vencimientoTipo: "dias", // "fecha" o "dias"
    vencimientoValor: "30",
    estado: true,
  });
  const [errors, setSErrors] = useState({});
  const [saving, setSaving]  = useState(false);
  const [step, setStep]      = useState(1);

  const set = (k, v) => { 
    setForm(p => ({ ...p, [k]: v })); 
    setSErrors(p => ({ ...p, [k]: "" })); 
  };

  // Validación por paso
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nombre.trim()) e.nombre      = "Campo requerido";
      if (!form.idCategoria)   e.idCategoria = "Selecciona una categoría";
      if (!form.idUnidad)      e.idUnidad    = "Selecciona una unidad";
    }
    if (s === 2) {
      if (form.stockMinimo === "") e.stockMinimo = "Campo requerido";
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
      stockActual: 0,
      stockMinimo: Number(form.stockMinimo),
      vencimientoValor: form.vencimientoTipo === "dias" ? Number(form.vencimientoValor) : null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Gestión de Insumos</p>
            <h2 className="modal-header__title">Nuevo insumo</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        {/* Body */}
        <div className="modal-body" style={{ minHeight: 240 }}>

          {/* ── Paso 1: Identificación ── */}
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre <span className="required">*</span></label>
                <input
                  className={`field-input${errors.nombre ? " error" : ""}`}
                  value={form.nombre} onChange={e => set("nombre", e.target.value)}
                  placeholder="Ej. Plátano verde"
                />
                {errors.nombre && <p className="field-error">{errors.nombre}</p>}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Categoría <span className="required">*</span></label>
                  <select
                    className={`field-input${errors.idCategoria ? " error" : ""}`}
                    value={form.idCategoria} onChange={e => set("idCategoria", e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad de medida <span className="required">*</span></label>
                  <select
                    className={`field-input${errors.idUnidad ? " error" : ""}`}
                    value={form.idUnidad} onChange={e => set("idUnidad", e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {unidades.map(u => <option key={u.id} value={u.id}>{u.simbolo} — {u.nombre}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Paso 2: Stock y Vencimiento ── */}
          {step === 2 && (
            <>
              <div className="form-group">
                <label className="form-label">Stock mínimo <span className="required">*</span></label>
                <input
                  type="number" min="0"
                  className={`field-input${errors.stockMinimo ? " error" : ""}`}
                  value={form.stockMinimo} onChange={e => set("stockMinimo", e.target.value)}
                  placeholder="0"
                />
                {errors.stockMinimo && <p className="field-error">{errors.stockMinimo}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Preferencia de Vencimiento</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className={`btn-ghost ${form.vencimientoTipo === "dias" ? "active" : ""}`}
                    onClick={() => set("vencimientoTipo", "dias")}
                    style={{ flex: 1, borderColor: form.vencimientoTipo === "dias" ? "#2e7d32" : "#e0e0e0", background: form.vencimientoTipo === "dias" ? "#e8f5e9" : "#fff", color: form.vencimientoTipo === "dias" ? "#2e7d32" : "#757575" }}
                  >📅 Por Días</button>
                  <button
                    type="button"
                    className={`btn-ghost ${form.vencimientoTipo === "fecha" ? "active" : ""}`}
                    onClick={() => set("vencimientoTipo", "fecha")}
                    style={{ flex: 1, borderColor: form.vencimientoTipo === "fecha" ? "#2e7d32" : "#e0e0e0", background: form.vencimientoTipo === "fecha" ? "#e8f5e9" : "#fff", color: form.vencimientoTipo === "fecha" ? "#2e7d32" : "#757575" }}
                  >🗓️ Por Fecha</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
