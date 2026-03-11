import { useState, useRef, useEffect } from "react";
import { G, GB, ROL_STYLES, EMPTY_FORM } from "./usuariosUtils.js";
import { Ic } from "./usuariosIcons.jsx";
import "./Usuarios.css";

// ─── COMPONENTES SHARED ─────────────────────────────
export function RolBadge({ rol }) {
  const c = ROL_STYLES[rol] || ROL_STYLES.Cliente;

  const ROL_ICONS = {
    Admin:    "👑",
    Empleado: "👷",
    Cliente:  "👤",
  };

  return (
    <span className="rol-badge rol-badge--icon-only" style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      <span style={{ fontSize: 15 }}>{ROL_ICONS[rol] ?? "👤"}</span>
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
        cursor: disabled ? "default" : "pointer",
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
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`field-input${error ? " error" : ""}${readOnly ? " readonly" : ""}`}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = GB; }}
        onBlur={e  => { e.target.style.borderColor = error ? "#e03030" : "#e0e0e0"; }}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

// ─── SELECTOR DEPARTAMENTO / MUNICIPIO ──────────────
function LocationSelects({ departamento, municipio, onDepto, onMunicipio, errDepto, errMunicipio }) {
  const [deptos, setDeptos]       = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingD, setLoadingD]   = useState(false);
  const [loadingM, setLoadingM]   = useState(false);

  // Cargar departamentos al montar
  useEffect(() => {
    setLoadingD(true);
    fetch("https://api-colombia.com/api/v1/Department")
      .then(r => r.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setDeptos(sorted);
      })
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, []);

  // Cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (!departamento) { setMunicipios([]); onMunicipio(""); return; }
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    setLoadingM(true);
    onMunicipio(""); // resetear municipio
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setMunicipios(sorted);
      })
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [departamento, deptos]);

  return (
    <div className="field-grid-2">
      {/* Departamento */}
      <div className="field-wrap">
        <label className="field-label">Departamento <span className="required">*</span></label>
        <div className="select-wrap">
          <select
            value={departamento}
            onChange={e => onDepto(e.target.value)}
            className={`field-select${errDepto ? " error" : ""}`}
            disabled={loadingD}
          >
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

      {/* Municipio */}
      <div className="field-wrap">
        <label className="field-label">Municipio <span className="required">*</span></label>
        <div className="select-wrap">
          <select
            value={municipio}
            onChange={e => onMunicipio(e.target.value)}
            className={`field-select${errMunicipio ? " error" : ""}`}
            disabled={!departamento || loadingM}
          >
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
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFoto(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="photo-uploader">
      <div className="photo-uploader-wrap" style={{ width: 88, height: 88 }}>
        <Avatar foto={foto} size={88} />
        <button className="photo-camera-btn" onClick={() => fileRef.current.click()}><Ic.Camera /></button>
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

// ─── MODAL CREAR/EDITAR ─────────────────────────────
export default function CrearUsuario({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm]     = useState(isEdit ? { ...user, contrasena: "", confirmar: "" } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saved, setSaved]   = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())       e.nombre       = "Campo requerido";
    if (!form.apellidos.trim())    e.apellidos    = "Campo requerido";
    if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo))
                                   e.correo       = "Correo no válido";
    if (!form.direccion.trim())    e.direccion    = "Campo requerido";
    if (!form.departamento)        e.departamento = "Campo requerido";
    if (!form.municipio)           e.municipio    = "Campo requerido";
    if (!form.telefono.trim())     e.telefono     = "Teléfono no válido";
    if (!isEdit && !form.contrasena)                   e.contrasena = "Campo requerido";
    if (!isEdit && form.contrasena !== form.confirmar) e.confirmar  = "No coinciden";
    if (!form.rol)                 e.rol          = "Seleccione un rol";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaved(true);
    setTimeout(() => onSave(form), 1600);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? "Editar Usuario" : "Agregar Usuario"}</h2>
          <button className="modal-close-btn" onClick={onClose}><Ic.Close /></button>
        </div>

        <div className="modal-body">

          {/* Foto + Nombre + Apellidos */}
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <PhotoUploader foto={form.foto} onFoto={v => set("foto", v)} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Field required label="Nombre"    placeholder="Ej: Juan"        value={form.nombre}    onChange={e => set("nombre",    e.target.value)} error={errors.nombre} />
              <Field required label="Apellidos" placeholder="Ej: Pérez Gómez" value={form.apellidos} onChange={e => set("apellidos", e.target.value)} error={errors.apellidos} />
            </div>
          </div>

          {/* Correo */}
          <Field required label="Correo" placeholder="Ej: juan@correo.com"
            value={form.correo} onChange={e => set("correo", e.target.value)} error={errors.correo} />

          {/* Cédula + Teléfono */}
          <div className="field-grid-2">
            <Field required label="Cédula"   placeholder="Ej: 1023456789" value={form.cedula}   onChange={e => set("cedula",   e.target.value)} error={errors.cedula} />
            <Field required label="Teléfono" placeholder="Ej: 3001234567" value={form.telefono} onChange={e => set("telefono", e.target.value)} error={errors.telefono} />
          </div>

          {/* Dirección */}
          <Field required label="Dirección" placeholder="Ej: Cra 5 #12-34, Apto 201"
            value={form.direccion} onChange={e => set("direccion", e.target.value)} error={errors.direccion} />

          {/* Departamento → Municipio (API) */}
          <LocationSelects
            departamento={form.departamento}
            municipio={form.municipio}
            onDepto={v  => set("departamento", v)}
            onMunicipio={v => set("municipio", v)}
            errDepto={errors.departamento}
            errMunicipio={errors.municipio}
          />

          {/* Contraseñas */}
          <div className="field-grid-2">
            <Field required={!isEdit} label="Contraseña" type="password"
              placeholder={isEdit ? "(sin cambios)" : "Mínimo 8 caracteres"}
              value={form.contrasena} onChange={e => set("contrasena", e.target.value)} error={errors.contrasena} />
            <Field required={!isEdit} label="Confirmar contraseña" type="password"
              placeholder={isEdit ? "(sin cambios)" : "Repite la contraseña"}
              value={form.confirmar}  onChange={e => set("confirmar",  e.target.value)} error={errors.confirmar} />
          </div>

          {/* Rol */}
          <div className="field-wrap">
            <label className="field-label">Rol <span className="required">*</span></label>
            <div className="select-wrap">
              <select value={form.rol} onChange={e => set("rol", e.target.value)}
                className={`field-select${errors.rol ? " error" : ""}`}>
                <option value="">Seleccione un rol…</option>
                {Object.keys(ROL_STYLES).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {errors.rol && <span className="field-error">{errors.rol}</span>}
          </div>

          {/* Botones */}
          <div className="modal-btn-row">
            <button className="btn-save"   onClick={handleSave} disabled={saved}>
              {saved ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
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