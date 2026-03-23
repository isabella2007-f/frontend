import { useState, useRef, useEffect } from "react";
import { G, GB, getRolStyle, EMPTY_FORM } from "./usuariosUtils.js";
import { Ic } from "./usuariosIcons.jsx";
import { useApp } from "../../../AppContext.jsx";
import "./Usuarios.css";

// ─── ICONOS POR NOMBRE DE ROL (incluye los 3 base) ────────
const ROL_ICONS_BASE = {
  Admin:    "👑",
  Empleado: "👷",
  Cliente:  "👤",
};

// ─── COMPONENTES SHARED ───────────────────────────────────

export function RolBadge({ rol }) {
  const c = getRolStyle(rol);
  const { roles } = useApp();
  const rolObj = roles.find(r => r.nombre === rol);
  const icono  = rolObj?.iconoPreview
    ? <img src={rolObj.iconoPreview} alt={rol} style={{ width: 15, height: 15, borderRadius: "50%", objectFit: "cover" }} />
    : <span style={{ fontSize: 14 }}>{rolObj?.icono ?? ROL_ICONS_BASE[rol] ?? "👤"}</span>;

  return (
    <span className="rol-badge rol-badge--icon-only"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      {icono}
      <span className="rol-badge__tooltip">{rol}</span>
    </span>
  );
}

export function Toggle({ on, onToggle, disabled }) {
  return (
    <button
      onClick={!disabled ? onToggle : undefined}
      className={`toggle-btn${disabled ? " disabled" : ""}`}
      style={{
        background: on ? "#43a047" : "#c62828",
        boxShadow: on
          ? "0 2px 8px rgba(67,160,71,0.45)"
          : "0 2px 8px rgba(198,40,40,0.3)",
        cursor:  disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span className="toggle-thumb" style={{ left: on ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>
          {on ? "ON" : "OFF"}
        </span>
      </span>
    </button>
  );
}

export function Avatar({ foto, size = 80, border = true }) {
  return foto ? (
    <img src={foto} alt="foto" className="avatar"
      style={{ width: size, height: size, border: border ? `2.5px solid ${GB}` : "none" }} />
  ) : (
    <div className="avatar-placeholder"
      style={{ width: size, height: size, border: border ? `2.5px solid ${GB}` : "none" }}>
      <Ic.UserSvg />
    </div>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder = "", error, readOnly, required }) {
  return (
    <div className="field-wrap">
      <label className="field-label">
        {label}{required && <span className="required">*</span>}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly}
        className={`field-input${error ? " error" : ""}${readOnly ? " readonly" : ""}`}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = GB; }}
        onBlur={e  => { e.target.style.borderColor = error ? "#e03030" : "#e0e0e0"; }}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

// ─── SELECTOR DEPARTAMENTO / MUNICIPIO ────────────────────
function LocationSelects({ departamento, municipio, onDepto, onMunicipio, errDepto, errMunicipio }) {
  const [deptos,     setDeptos]     = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingD,   setLoadingD]   = useState(false);
  const [loadingM,   setLoadingM]   = useState(false);

  useEffect(() => {
    setLoadingD(true);
    fetch("https://api-colombia.com/api/v1/Department")
      .then(r => r.json())
      .then(data => setDeptos(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, []);

  useEffect(() => {
    if (!departamento) { setMunicipios([]); onMunicipio(""); return; }
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    setLoadingM(true);
    onMunicipio("");
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(data => setMunicipios(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [departamento, deptos]);

  return (
    <div className="field-grid-2">
      <div className="field-wrap">
        <label className="field-label">Departamento <span className="required">*</span></label>
        <div className="select-wrap">
          <select value={departamento} onChange={e => onDepto(e.target.value)}
            className={`field-select${errDepto ? " error" : ""}`} disabled={loadingD}>
            <option value="">{loadingD ? "Cargando…" : "Seleccione…"}</option>
            {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <div className="select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {errDepto && <span className="field-error">{errDepto}</span>}
      </div>

      <div className="field-wrap">
        <label className="field-label">Municipio <span className="required">*</span></label>
        <div className="select-wrap">
          <select value={municipio} onChange={e => onMunicipio(e.target.value)}
            className={`field-select${errMunicipio ? " error" : ""}`}
            disabled={!departamento || loadingM}>
            <option value="">
              {!departamento ? "Seleccione depto…" : loadingM ? "Cargando…" : "Seleccione…"}
            </option>
            {municipios.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <div className="select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {errMunicipio && <span className="field-error">{errMunicipio}</span>}
      </div>
    </div>
  );
}

function PhotoUploader({ foto, onFoto }) {
  const fileRef = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFoto(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="photo-uploader">
      <div className="photo-uploader-wrap" style={{ width: 88, height: 88 }}>
        <Avatar foto={foto} size={88} />
        <button className="photo-camera-btn" onClick={() => fileRef.current.click()}>
          <Ic.Camera />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </div>
      <span className="photo-label">Foto</span>
      {foto && (
        <button className="photo-remove-btn" onClick={() => onFoto(null)}>
          <Ic.XCircle /> Quitar
        </button>
      )}
    </div>
  );
}

// ─── BARRA DE PASOS ───────────────────────────────────────
const STEPS = ["Personal", "Ubicación", "Acceso y Rol"];

function StepsBar({ current }) {
  return (
    <div className="wizard-steps-bar">
      {STEPS.map((label, i) => {
        const idx   = i + 1;
        const done  = idx < current;
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

// ─── MODAL CREAR / EDITAR — WIZARD ────────────────────────
export default function CrearUsuario({ user, onClose, onSave }) {
  const isEdit = !!user;

  const { roles } = useApp();
  const rolesDisponibles = roles.filter(r => r.estado);

  const [form, setForm]     = useState(isEdit ? { ...user, contrasena: "", confirmar: "" } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saved, setSaved]   = useState(false);
  const [step, setStep]     = useState(1);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  // Validación por paso
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nombre.trim())    e.nombre    = "Campo requerido";
      if (!form.apellidos.trim()) e.apellidos = "Campo requerido";
      if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo no válido";
      if (!form.cedula.trim())    e.cedula    = "Campo requerido";
      if (!form.telefono.trim())  e.telefono  = "Teléfono no válido";
    }
    if (s === 2) {
      if (!form.direccion.trim()) e.direccion    = "Campo requerido";
      if (!form.departamento)     e.departamento = "Campo requerido";
      if (!form.municipio)        e.municipio    = "Campo requerido";
    }
    if (s === 3) {
      if (!isEdit && !form.contrasena)                   e.contrasena = "Campo requerido";
      if (!isEdit && form.contrasena !== form.confirmar) e.confirmar  = "No coinciden";
      if (!form.rol) e.rol = "Seleccione un rol";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSave = () => {
    const e = validateStep(3);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaved(true);
    setTimeout(() => onSave(form), 1200);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? "Editar Usuario" : "Agregar Usuario"}</h2>
          <button className="modal-close-btn" onClick={onClose}><Ic.Close /></button>
        </div>

        {/* STEPS BAR */}
        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        {/* BODY — sin overflow, cada paso cabe en pantalla */}
        <div className="modal-body" style={{ overflow: "visible", flex: "1 1 auto" }}>

          {/* ── PASO 1: Personal ── */}
          {step === 1 && (
            <>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <PhotoUploader foto={form.foto} onFoto={v => set("foto", v)} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Field required label="Nombre"    placeholder="Ej: Juan"        value={form.nombre}    onChange={e => set("nombre",    e.target.value)} error={errors.nombre} />
                  <Field required label="Apellidos" placeholder="Ej: Pérez Gómez" value={form.apellidos} onChange={e => set("apellidos", e.target.value)} error={errors.apellidos} />
                </div>
              </div>
              <Field required label="Correo" placeholder="Ej: juan@correo.com"
                value={form.correo} onChange={e => set("correo", e.target.value)} error={errors.correo} />
              <div className="field-grid-2">
                <Field required label="Cédula"   placeholder="Ej: 1023456789" value={form.cedula}   onChange={e => set("cedula",   e.target.value)} error={errors.cedula} />
                <Field required label="Teléfono" placeholder="Ej: 3001234567" value={form.telefono} onChange={e => set("telefono", e.target.value)} error={errors.telefono} />
              </div>
            </>
          )}

          {/* ── PASO 2: Ubicación ── */}
          {step === 2 && (
            <>
              <Field required label="Dirección" placeholder="Ej: Cra 5 #12-34, Apto 201"
                value={form.direccion} onChange={e => set("direccion", e.target.value)} error={errors.direccion} />
              <LocationSelects
                departamento={form.departamento} municipio={form.municipio}
                onDepto={v => set("departamento", v)} onMunicipio={v => set("municipio", v)}
                errDepto={errors.departamento} errMunicipio={errors.municipio}
              />
            </>
          )}

          {/* ── PASO 3: Acceso y Rol ── */}
          {step === 3 && (
            <>
              <div className="field-grid-2">
                <Field required={!isEdit} label="Contraseña" type="password"
                  placeholder={isEdit ? "(sin cambios)" : "Mínimo 8 caracteres"}
                  value={form.contrasena} onChange={e => set("contrasena", e.target.value)} error={errors.contrasena} />
                <Field required={!isEdit} label="Confirmar contraseña" type="password"
                  placeholder={isEdit ? "(sin cambios)" : "Repite la contraseña"}
                  value={form.confirmar}  onChange={e => set("confirmar",  e.target.value)} error={errors.confirmar} />
              </div>

              <div className="field-wrap">
                <label className="field-label">Rol <span className="required">*</span></label>
                <div className="select-wrap">
                  <select value={form.rol} onChange={e => set("rol", e.target.value)}
                    className={`field-select${errors.rol ? " error" : ""}`}>
                    <option value="">Seleccione un rol…</option>
                    {rolesDisponibles.map(r => (
                      <option key={r.id} value={r.nombre}>
                        {r.icono && !r.iconoPreview ? `${r.icono} ` : ""}{r.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="select-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
                {errors.rol && <span className="field-error">{errors.rol}</span>}

                {/* Preview del rol seleccionado */}
                {form.rol && (() => {
                  const rolObj = rolesDisponibles.find(r => r.nombre === form.rol);
                  const style  = getRolStyle(form.rol);
                  if (!rolObj) return null;
                  return (
                    <div style={{
                      marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "5px 12px", borderRadius: 20,
                      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {rolObj.iconoPreview
                        ? <img src={rolObj.iconoPreview} alt={rolObj.nombre}
                            style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />
                        : <span>{rolObj.icono}</span>}
                      {rolObj.nombre}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* FOOTER — navegación del wizard */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 3
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave} disabled={saved}>
                  {saved ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear usuario"}
                </button>
            }
          </div>
        </div>

        {saved && (
          <div className="modal-success-toast">
            <Ic.Check /><span>Usuario {isEdit ? "actualizado" : "agregado"} con éxito</span>
          </div>
        )}
      </div>
    </div>
  );
}