import { useState, useRef } from "react";
import "./proveedores.css";

const TIPO_DOCS = [
  { val: "CC",  label: "Cédula de Ciudadanía" },
  { val: "CE",  label: "Cédula de Extranjería" },
  { val: "NIT", label: "NIT" },
  { val: "PP",  label: "Pasaporte" },
];

const fmtTel = raw => {
  if (!raw || typeof raw !== 'string') return '';
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

const STEPS = ["Identificación", "Contacto y Ubicación"];

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

// ✅ Field ahora es un componente EXTERNO al padre
function Field({ k, label, form, errors, onChange, celularRef }) {
  const isRequired = ["responsable", "celular", "correo", "documento"].includes(k);

  if (k === "celular") {
    return (
      <div className="form-group">
        <label className="form-label">
          {label}{isRequired && <span className="required"> *</span>}
        </label>
        <input
          ref={celularRef}
          className={"field-input" + (errors[k] ? " field-input--error" : "")}
          type="text"
          defaultValue={form[k] || ""}
          onBlur={(e) => {
            const formatted = fmtTel(e.target.value);
            onChange(k, formatted);
            if (celularRef?.current) celularRef.current.value = formatted;
          }}
          placeholder="300 000 0000"
          maxLength={12}
        />
        {errors[k] && <p className="field-error">{errors[k]}</p>}
      </div>
    );
  }

  return (
    <div className="form-group">
      <label className="form-label">
        {label}{isRequired && <span className="required"> *</span>}
      </label>
      <input
        className={"field-input" + (errors[k] ? " field-input--error" : "")}
        type={k === "correo" ? "email" : "text"}
        value={form[k] || ""}
        onChange={e => onChange(k, e.target.value)}
        placeholder=""
      />
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  );
}

export default function CrearProveedor({ onClose, onSave }) {
  const [form, setForm] = useState({ 
    tipo: "natural", 
    tipoDoc: "CC",
    responsable: "", 
    documento: "", 
    direccion: "", 
    celular: "", 
    correo: "",
    estado: true 
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [step, setStep]     = useState(1);
  const celularRef = useRef(null); // ✅ declarado aquí y pasado como prop

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.responsable.trim()) e.responsable = "Requerido";
      if (!form.documento.trim())   e.documento   = "Requerido";
    }
    if (s === 2) {
      if (!form.celular.trim())     e.celular     = "Requerido";
      if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSave = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave({ ...form, id: `PROV${Date.now().toString().slice(-4)}` });
    setSaving(false);
  };

  const fieldProps = { form, errors, onChange: set, celularRef };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">Nuevo Proveedor</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        <div className="modal-body" style={{ minHeight: 260 }}>
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Datos de Identificación</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de persona</label>
                  <select className="field-input" value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                    <option value="natural">Persona Natural</option>
                    <option value="juridica">Persona Jurídica</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo de documento</label>
                  <select className="field-input" value={form.tipoDoc} onChange={e => set("tipoDoc", e.target.value)}>
                    {TIPO_DOCS.map(td => <option key={td.val} value={td.val}>{td.label}</option>)}
                  </select>
                </div>
              </div>
              <Field k="responsable" label={form.tipo === "juridica" ? "Razón social" : "Responsable"} {...fieldProps} />
              <Field k="documento" label="Número de Documento" {...fieldProps} />
            </>
          )}

          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Contacto y Localización</p>
              <div className="form-grid-2">
                <Field k="celular" label="Celular" {...fieldProps} />
                <Field k="correo" label="Correo electrónico" {...fieldProps} />
              </div>
              <Field k="direccion" label="Dirección (Opcional)" {...fieldProps} />
              <div className="form-group">
                <label className="form-label">Estado Inicial</label>
                <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:4 }}>
                  <button onClick={() => set("estado", !form.estado)} className="toggle-btn"
                    style={{ background: form.estado ? "#43a047" : "#c62828" }}>
                    <span className="toggle-thumb" style={{ left: form.estado ? 27 : 3 }} />
                  </button>
                  <span style={{ fontSize:13, fontWeight:600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>
                    {form.estado ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Crear proveedor"}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}