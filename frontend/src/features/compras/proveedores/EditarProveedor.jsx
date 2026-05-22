import { useState, useEffect, useRef } from "react";
import "./Proveedores.css";

const fmtTel = raw => {
  const d = (raw || "").replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

function LocationSelects({ departamento, ciudad, onDepto, onCiudad, disabled }) {
  const [deptos,     setDeptos]     = useState([]);
  const [ciudades,   setCiudades]   = useState([]);
  const [loadingD,   setLoadingD]   = useState(false);
  const [loadingC,   setLoadingC]   = useState(false);
  const initialDone = useRef(false);

  useEffect(() => {
    setLoadingD(true);
    fetch("https://api-colombia.com/api/v1/Department")
      .then(r => r.json())
      .then(d => setDeptos(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, []);

  useEffect(() => {
    if (!deptos.length || !departamento || initialDone.current) return;
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    initialDone.current = true;
    setLoadingC(true);
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(d => setCiudades(d.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingC(false));
  }, [deptos, departamento]);

  const handleDepto = (nombre) => {
    initialDone.current = true;
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

  const selStyle = {
    width: "100%", border: "1.5px solid #e0e0e0", borderRadius: 9,
    padding: "9px 32px 9px 11px", fontSize: 13, outline: "none",
    background: disabled ? "#fafafa" : "white", appearance: "none",
    fontFamily: "inherit", color: "#1a1a1a", boxSizing: "border-box",
    pointerEvents: disabled ? "none" : "auto",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="form-group">
        <label className="form-label">Departamento</label>
        <div style={{ position: "relative" }}>
          <select value={departamento || ""} onChange={e => handleDepto(e.target.value)}
            style={selStyle} disabled={loadingD || disabled}>
            <option value="">{loadingD ? "Cargando…" : "Seleccione…"}</option>
            {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Ciudad</label>
        <div style={{ position: "relative" }}>
          <select value={ciudad || ""} onChange={e => onCiudad(e.target.value)}
            style={selStyle} disabled={!departamento || loadingC || disabled}>
            <option value="">{!departamento ? "Seleccione depto…" : loadingC ? "Cargando…" : "Seleccione…"}</option>
            {ciudades.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditarProveedor({ proveedor, mode = "edit", onClose, onSave }) {
  const isView = mode === "view";

  const [form,   setForm]   = useState({
    responsable:  "",
    celular:      "",
    correo:       "",
    direccion:    "",
    departamento: "",
    ciudad:       "",
    ...proveedor,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.responsable?.trim()) e.responsable = "Campo obligatorio";
    if (form.correo?.trim() && !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        Responsable:  form.responsable.trim(),
        Direccion:    form.direccion    || undefined,
        Municipio:    form.ciudad       || undefined,
        Departamento: form.departamento || undefined,
        Telefono:     form.celular      || undefined,
        Correo:       form.correo       || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (k, label, type = "text", placeholder = "") => (
    <div className="form-group" key={k}>
      <label className="form-label">{label}{!isView && k === "responsable" && <span className="required"> *</span>}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <input
            className={`field-input${errors[k] ? " error" : ""}`}
            type={type}
            value={form[k] || ""}
            onChange={e => set(k, k === "celular" ? fmtTel(e.target.value) : e.target.value)}
            placeholder={placeholder}
          />
      }
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">
              {isView ? "Detalles del Proveedor" : "Editar Proveedor"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ minHeight: 260 }}>

          <p className="section-label" style={{ marginTop: 0 }}>Identificación</p>
          {renderField("responsable", "Nombre / Razón Social", "text", "Ej: Juan García")}

          <p className="section-label">Contacto</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {renderField("celular", "Celular", "text", "300 000 0000")}
            {renderField("correo",  "Correo electrónico", "email", "correo@empresa.com")}
          </div>

          <p className="section-label">Ubicación</p>
          {renderField("direccion", "Dirección", "text", "Ej: Cra 5 #12-34")}
          {isView ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <div className="field-input field-input--disabled">{form.departamento || "—"}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Ciudad</label>
                <div className="field-input field-input--disabled">{form.ciudad || "—"}</div>
              </div>
            </div>
          ) : (
            <LocationSelects
              departamento={form.departamento}
              ciudad={form.ciudad}
              onDepto={v => set("departamento", v)}
              onCiudad={v => set("ciudad", v)}
              disabled={false}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>
            {isView ? "Cerrar" : "Cancelar"}
          </button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
