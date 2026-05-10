import { useState, useEffect, useRef } from "react";
import "./Proveedores.css";

const TIPO_DOCS_NATURAL  = ["CC", "CE", "PP"];
const TIPO_DOCS_JURIDICA = ["NIT"];

const fmtTel = raw => {
  if (!raw || typeof raw !== "string") return "";
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

const STEPS = ["Identificación", "Contacto y Ubicación"];

function StepsBar({ current }) {
  return (
    <div className="wizard-steps-bar" style={{ padding: "0 24px" }}>
      {STEPS.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="wizard-step-item" style={{ flex: 1 }}>
            <div className={`wizard-step-circle${done ? " done" : active ? " active" : ""}`}>
              {done ? "✓" : idx}
            </div>
            <span className={`wizard-step-label${active ? " active" : done ? " done" : ""}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`wizard-step-line${done ? " done" : ""}`} style={{ flex: 1 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Selector Departamento / Ciudad ─────────────────────── */
function LocationSelects({ departamento, ciudad, onDepto, onCiudad, errDepto, errCiudad }) {
  const [deptos,   setDeptos]   = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingC, setLoadingC] = useState(false);

  useEffect(() => {
    setLoadingD(true);
    fetch("https://api-colombia.com/api/v1/Department")
      .then(r => r.json())
      .then(d => setDeptos(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, []);

  const handleDepto = (nombre) => {
    onDepto(nombre);
    onCiudad("");
    if (!nombre) { setCiudades([]); return; }
    const found = deptos.find(d => d.name === nombre);
    if (!found) return;
    setLoadingC(true);
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(d => setCiudades(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingC(false));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="form-group">
        <label className="form-label">Departamento</label>
        <div style={{ position: "relative" }}>
          <select
            className={`field-input${errDepto ? " error" : ""}`}
            style={{ appearance: "none", paddingRight: 32 }}
            value={departamento || ""}
            onChange={e => handleDepto(e.target.value)}
            disabled={loadingD}
          >
            <option value="">{loadingD ? "Cargando…" : "Seleccione…"}</option>
            {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        {errDepto && <span className="field-error">{errDepto}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Ciudad</label>
        <div style={{ position: "relative" }}>
          <select
            className={`field-input${errCiudad ? " error" : ""}`}
            style={{ appearance: "none", paddingRight: 32 }}
            value={ciudad || ""}
            onChange={e => onCiudad(e.target.value)}
            disabled={!departamento || loadingC}
          >
            <option value="">{!departamento ? "Seleccione depto…" : loadingC ? "Cargando…" : "Seleccione…"}</option>
            {ciudades.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        {errCiudad && <span className="field-error">{errCiudad}</span>}
      </div>
    </div>
  );
}

/* ─── Campos individuales definidos FUERA del componente padre
       para evitar pérdida de foco al re-renderizar ─────────── */
function FieldText({ label, value, onChange, error, type = "text", placeholder = "", required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
      <input
        className={`field-input${error ? " error" : ""}`}
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, required }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required"> *</span>}</label>
      <div style={{ position: "relative" }}>
        <select
          className="field-input"
          style={{ appearance: "none", paddingRight: 32 }}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────── */
export default function CrearProveedor({ onClose, onSave }) {
  const [form, setForm] = useState({
    tipo:          "natural",
    tipoDoc:       "CC",
    responsable:   "",
    documento:     "",
    celular:       "",
    correo:        "",
    direccion:     "",
    departamento:  "",
    ciudad:        "",
    estado:        true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [step,   setStep]   = useState(1);

  // Al cambiar tipo de persona, ajustar tipoDoc automáticamente
  useEffect(() => {
    if (form.tipo === "juridica") {
      setForm(f => ({ ...f, tipoDoc: "NIT" }));
    } else if (form.tipoDoc === "NIT") {
      setForm(f => ({ ...f, tipoDoc: "CC" }));
    }
  }, [form.tipo]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const tiposDoc = form.tipo === "juridica" ? TIPO_DOCS_JURIDICA : TIPO_DOCS_NATURAL;

  const labelResponsable = form.tipo === "juridica" ? "Razón Social" : "Nombre del responsable";
  const labelDocumento   = form.tipo === "juridica" ? "NIT"
    : form.tipoDoc === "CC" ? "Cédula de Ciudadanía"
    : form.tipoDoc === "CE" ? "Cédula de Extranjería"
    : "Pasaporte";

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.responsable.trim()) e.responsable = "Campo obligatorio";
      if (!form.documento.trim())   e.documento   = "Campo obligatorio";
    }
    if (s === 2) {
      if (!form.celular.trim())     e.celular     = "Campo obligatorio";
      if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleSave = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onSave({ ...form, id: `PROV${Date.now().toString().slice(-4)}` });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>

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

          {/* ── Step 1: Identificación ── */}
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Datos de identificación</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FieldSelect
                  label="Tipo de persona"
                  value={form.tipo}
                  onChange={v => set("tipo", v)}
                  options={[
                    { val: "natural",  label: "Persona Natural" },
                    { val: "juridica", label: "Persona Jurídica" },
                  ]}
                />
                <FieldSelect
                  label="Tipo de documento"
                  value={form.tipoDoc}
                  onChange={v => set("tipoDoc", v)}
                  options={tiposDoc.map(t => ({ val: t, label: t }))}
                />
              </div>

              <FieldText
                label={labelResponsable}
                value={form.responsable}
                onChange={v => set("responsable", v)}
                error={errors.responsable}
                placeholder={form.tipo === "juridica" ? "Ej: Distribuidora XYZ S.A.S." : "Ej: Juan García"}
                required
              />
              <FieldText
                label={labelDocumento}
                value={form.documento}
                onChange={v => set("documento", v)}
                error={errors.documento}
                placeholder={form.tipo === "juridica" ? "Ej: 900123456-7" : "Ej: 1023456789"}
                required
              />
            </>
          )}

          {/* ── Step 2: Contacto y Ubicación ── */}
          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Contacto</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FieldText
                  label="Celular"
                  value={form.celular}
                  onChange={v => set("celular", fmtTel(v))}
                  error={errors.celular}
                  placeholder="300 000 0000"
                  required
                />
                <FieldText
                  label="Correo electrónico"
                  value={form.correo}
                  onChange={v => set("correo", v)}
                  error={errors.correo}
                  type="email"
                  placeholder="correo@empresa.com"
                  required
                />
              </div>

              <p className="section-label">Ubicación</p>
              <FieldText
                label="Dirección (opcional)"
                value={form.direccion}
                onChange={v => set("direccion", v)}
                placeholder="Ej: Cra 5 #12-34"
              />
              <LocationSelects
                departamento={form.departamento}
                ciudad={form.ciudad}
                onDepto={v => set("departamento", v)}
                onCiudad={v => set("ciudad", v)}
                errDepto={errors.departamento}
                errCiudad={errors.ciudad}
              />

              <p className="section-label">Estado inicial</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => set("estado", !form.estado)}
                  style={{
                    position: "relative", width: 52, height: 28, borderRadius: 14,
                    border: "none", cursor: "pointer",
                    background: form.estado ? "#43a047" : "#c62828",
                    boxShadow: form.estado ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)",
                    transition: "background 0.25s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: form.estado ? 27 : 3,
                    width: 22, height: 22, borderRadius: "50%", background: "#fff",
                    transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, color: "black",
                  }}>
                    {form.estado ? "ON" : "OFF"}
                  </span>
                </button>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>
                  {form.estado ? "Activo" : "Inactivo"}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando…" : "Crear proveedor"}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}