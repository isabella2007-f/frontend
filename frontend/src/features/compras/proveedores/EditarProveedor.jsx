import { useState, useEffect, useRef } from "react";
import "./Proveedores.css";

const TIPO_DOCS_NATURAL  = ["CC", "CE", "PP"];
const TIPO_DOCS_JURIDICA = ["NIT"];
const TIPO_DOCS_TODOS    = ["CC", "CE", "NIT", "PP"];

const fmtTel = raw => {
  const d = (raw || "").replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

/* ─── Selector Departamento / Ciudad (API Colombia) ─────── */
function LocationSelects({ departamento, ciudad, onDepto, onCiudad, errDepto, errCiudad, disabled }) {
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

  // Cargar ciudades del departamento inicial al editar
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

  const selectStyle = (err) => ({
    width: "100%", border: `1.5px solid ${err ? "#e53935" : "#e0e0e0"}`,
    borderRadius: 9, padding: "9px 32px 9px 11px",
    fontSize: 13, outline: "none", background: disabled ? "#fafafa" : "white",
    appearance: "none", fontFamily: "inherit", color: "#1a1a1a",
    transition: "border-color 0.18s", boxSizing: "border-box",
    pointerEvents: disabled ? "none" : "auto",
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {/* Departamento */}
      <div className="form-group">
        <label className="form-label">Departamento</label>
        <div style={{ position: "relative" }}>
          <select
            value={departamento || ""}
            onChange={e => handleDepto(e.target.value)}
            style={selectStyle(errDepto)}
            disabled={loadingD || disabled}
          >
            <option value="">{loadingD ? "Cargando…" : "Seleccione…"}</option>
            {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        {errDepto && <span style={{ fontSize: 11, color: "#e53935" }}>{errDepto}</span>}
      </div>

      {/* Ciudad */}
      <div className="form-group">
        <label className="form-label">Ciudad</label>
        <div style={{ position: "relative" }}>
          <select
            value={ciudad || ""}
            onChange={e => onCiudad(e.target.value)}
            style={selectStyle(errCiudad)}
            disabled={!departamento || loadingC || disabled}
          >
            <option value="">{!departamento ? "Seleccione depto…" : loadingC ? "Cargando…" : "Seleccione…"}</option>
            {ciudades.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        {errCiudad && <span style={{ fontSize: 11, color: "#e53935" }}>{errCiudad}</span>}
      </div>
    </div>
  );
}

/* ─── Toggle (copiado del sistema para no depender del import) */
function Toggle({ on, onToggle, disabled }) {
  return (
    <button
      onClick={!disabled ? onToggle : undefined}
      style={{
        position: "relative", width: 52, height: 28, borderRadius: 14,
        border: "none", cursor: disabled ? "default" : "pointer",
        background: on ? "#43a047" : "#c62828",
        boxShadow: on ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)",
        opacity: disabled ? 0.6 : 1, transition: "background 0.25s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 27 : 3,
        width: 22, height: 22, borderRadius: "50%", background: "#fff",
        transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "black" }}>{on ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

/* ─── Componente principal ───────────────────────────────── */
export default function EditarProveedor({ proveedor, mode = "edit", onClose, onSave }) {
  const isView = mode === "view";

  const [form,   setForm]   = useState({ tipo: "natural", tipoDoc: "CC", responsable: "", documento: "", celular: "", correo: "", direccion: "", departamento: "", ciudad: "", estado: true, ...proveedor });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Cuando cambia el tipo de persona, ajustar tipoDoc automáticamente
  useEffect(() => {
    if (form.tipo === "juridica" && form.tipoDoc !== "NIT") {
      setForm(f => ({ ...f, tipoDoc: "NIT" }));
    } else if (form.tipo === "natural" && form.tipoDoc === "NIT") {
      setForm(f => ({ ...f, tipoDoc: "CC" }));
    }
  }, [form.tipo]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const tiposDoc = form.tipo === "juridica" ? TIPO_DOCS_JURIDICA : TIPO_DOCS_NATURAL;

  const labelDoc = form.tipo === "juridica"
    ? "NIT"
    : form.tipoDoc === "CC" ? "Cédula de Ciudadanía"
    : form.tipoDoc === "CE" ? "Cédula de Extranjería"
    : "Pasaporte";

  const validate = () => {
    const e = {};
    if (!form.responsable?.trim()) e.responsable = "Campo obligatorio";
    if (!form.documento?.trim())   e.documento   = "Campo obligatorio";
    if (!form.celular?.trim())     e.celular     = "Campo obligatorio";
    if (!form.correo?.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onSave(form);
    setSaving(false);
  };

  /* ── Render campo (sin definir dentro del render para evitar pérdida de foco) */
  const renderField = (k, label, type = "text", placeholder = "") => (
    <div className="form-group" key={k}>
      <label className="form-label">{label}{!isView && <span className="required"> *</span>}</label>
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

  const renderSelect = (k, label, options, required = false) => (
    <div className="form-group" key={k}>
      <label className="form-label">{label}{required && !isView && <span className="required"> *</span>}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <div style={{ position: "relative" }}>
            <select
              className={`field-input${errors[k] ? " error" : ""}`}
              style={{ appearance: "none", paddingRight: 32 }}
              value={form[k] || ""}
              onChange={e => set(k, e.target.value)}
            >
              {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
      }
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">{isView ? "Detalles del Proveedor" : "Editar Proveedor"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ minHeight: 260 }}>

          {/* ── Identificación ── */}
          <p className="section-label" style={{ marginTop: 0 }}>Identificación</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Tipo de persona */}
            {renderSelect("tipo", "Tipo de persona", [
              { val: "natural",  label: "Persona Natural"  },
              { val: "juridica", label: "Persona Jurídica" },
            ])}

            {/* Tipo de documento — se adapta al tipo de persona */}
            {renderSelect("tipoDoc", "Tipo de documento", tiposDoc.map(t => ({ val: t, label: t })))}
          </div>

          {renderField("responsable", form.tipo === "juridica" ? "Razón Social" : "Nombre del responsable", "text", "Ej: Juan García")}
          {renderField("documento", labelDoc, "text", "Número de documento")}

          {/* ── Contacto ── */}
          <p className="section-label">Contacto</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {renderField("celular", "Celular", "text", "300 000 0000")}
            {renderField("correo", "Correo electrónico", "email", "correo@empresa.com")}
          </div>

          {/* ── Ubicación ── */}
          <p className="section-label">Ubicación</p>
          {renderField("direccion", "Dirección", "text", "Ej: Cra 5 #12-34")}
          <LocationSelects
            departamento={form.departamento}
            ciudad={form.ciudad}
            onDepto={v => set("departamento", v)}
            onCiudad={v => set("ciudad", v)}
            errDepto={errors.departamento}
            errCiudad={errors.ciudad}
            disabled={isView}
          />

          {/* ── Estado ── */}
          <p className="section-label">Estado</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
            <Toggle
              on={form.estado}
              onToggle={() => !isView && set("estado", !form.estado)}
              disabled={isView}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>
              {form.estado ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
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