import { useState, useRef, useEffect } from "react";
import "./proveedores.css";

const TIPO_DOCS = [
  { val: "CC",  label: "Cédula de Ciudadanía" },
  { val: "CE",  label: "Cédula de Extranjería" },
  { val: "NIT", label: "NIT" },
  { val: "PP",  label: "Pasaporte" },
];

const fmtTel = raw => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

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
  const inputRefs = useRef({});
  const activeField = useRef(null);

  const set = (k, v) => {
    activeField.current = k;
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  useEffect(() => {
    const key = activeField.current;
    if (!key) return;
    const input = inputRefs.current[key];
    // Evitar setSelectionRange en email/number para prevenir crash
    if (input && document.activeElement !== input) {
      input.focus();
      if (input.type === "text" || input.type === "search" || input.type === "tel" || input.type === "url") {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  }, [form]);

  const validate = () => {
    const e = {};
    if (!form.tipo) e.tipo = "Selecciona tipo";
    if (!form.responsable.trim()) e.responsable = "Requerido";
    if (!form.documento.trim())   e.documento   = "Requerido";
    if (!form.celular.trim())     e.celular     = "Requerido";
    if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave({ ...form, id: `PROV${Date.now().toString().slice(-4)}` });
    setSaving(false);
  };

  const Field = ({ k, label, type = "text", ph = "", full = false }) => (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">
        {label}{["responsable", "celular", "correo"].includes(k) && <span className="required"> *</span>}
      </label>
      <input
        ref={el => inputRefs.current[k] = el}
        className={"field-input" + (errors[k] ? " field-input--error" : "")}
        type={type}
        value={form[k] || ""}
        onChange={e => set(k, k === "celular" ? fmtTel(e.target.value) : e.target.value)}
        placeholder={ph}
        maxLength={k === "celular" ? 12 : undefined}
        onFocus={e => {
          activeField.current = k;
          e.target.style.borderColor = "#4caf50";
        }}
        onBlur={e => {
          if (activeField.current === k) activeField.current = null;
          e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0";
        }}
      />
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--prov" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">Nuevo Proveedor</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: "auto", maxHeight: "70vh" }}>
          <p className="section-label" style={{ marginTop: 0, textTransform: "none" }}>Datos básicos</p>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tipo de persona</label>
              <select
                className="field-input"
                value={form.tipo}
                onChange={e => set("tipo", e.target.value)}
              >
                <option value="natural">Persona Natural</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="field-input"
                value={form.estado ? "true" : "false"}
                onChange={e => set("estado", e.target.value === "true")}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            <Field k="responsable" label={form.tipo === "juridica" ? "Razón social" : "Responsable"} ph={form.tipo === "juridica" ? "Nombre empresa" : "Nombre del contacto"} full />
            
            <div className="form-group">
              <label className="form-label">Tipo de documento</label>
              <select
                className="field-input"
                value={form.tipoDoc}
                onChange={e => set("tipoDoc", e.target.value)}
              >
                {TIPO_DOCS.map(td => (
                  <option key={td.val} value={td.val}>{td.label}</option>
                ))}
              </select>
            </div>

            <Field k="documento" label="Documento / NIT" ph="Sin puntos ni guiones" />
            
            <Field k="direccion" label="Dirección" ph="Ej. Cra 10 # 5-30" full />
            
            <Field k="celular" label="Celular" ph="300 000 0000" />
            <Field k="correo" label="Correo" type="email" ph="proveedor@correo.com" />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ paddingBottom: "24px" }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner">◌</span>}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
