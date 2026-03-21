import { useState, useRef, useEffect } from "react";
import { TIPOS_DOC, ROLES_EMPLEADO, fmtTel, toInputDate, fromInputDate } from "./empleadosUtils.js";
import { RolBadge, LocationSelects } from "./CrearEmpleado.jsx";
import "./empleados.css";

/* ─── Modal Ver ──────────────────────────────────────────── */
export function ModalVerEmpleado({ empleado, onClose }) {
  const rol = ROLES_EMPLEADO.find(r => r.id === Number(empleado.idRol));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Empleados</p>
            <h2 className="modal-header__title">{empleado.nombre} {empleado.apellidos}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight:"68vh", overflowY:"auto" }}>

          {/* Avatar */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div className="avatar-upload-wrap" style={{ cursor:"default" }}>
              {empleado.fotoPreview ? <img className="avatar-upload-img" src={empleado.fotoPreview} alt="avatar" /> : <div className="avatar-upload-placeholder">👤</div>}
            </div>
            <p style={{ margin:0, fontSize:11, color:"#9e9e9e" }}>Foto de perfil</p>
          </div>

          {/* Identificación */}
          <p className="section-label">Identificación</p>
          <div className="form-group">
            <label className="form-label">Tipo y Número de documento</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span className="doc-type">{empleado.tipoDoc}</span>
              <span style={{ fontSize:14, fontWeight:600, color:"#424242" }}>{empleado.numDoc || "—"}</span>
            </div>
          </div>

          {/* Rol */}
          <p className="section-label">Rol</p>
          <div className="form-group">
            <label className="form-label">Rol del empleado</label>
            <div style={{ paddingTop:4 }}><RolBadge idRol={empleado.idRol} /></div>
          </div>

          {/* Datos personales */}
          <p className="section-label">Datos personales</p>
          <div className="form-grid-2">
            {[
              ["Nombre",    empleado.nombre],
              ["Apellidos", empleado.apellidos],
              ["Correo electrónico", empleado.correo],
              ["Teléfono",  empleado.telefono],
              ["Fecha de ingreso", empleado.fechaIngreso],
            ].map(([label, val]) => (
              <div key={label} className="form-group" style={label === "Correo electrónico" ? { gridColumn:"1 / -1" } : {}}>
                <label className="form-label">{label}</label>
                <div className="field-input field-input--disabled">{val || "—"}</div>
              </div>
            ))}
            <div className="form-group" style={{ gridColumn:"1 / -1" }}>
              <label className="form-label">Estado</label>
              <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:4 }}>
                <button className="toggle-btn" style={{ background: empleado.estado ? "#43a047" : "#c62828", cursor:"default", boxShadow: empleado.estado ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
                  <span className="toggle-thumb" style={{ left: empleado.estado ? 27 : 3 }}>
                    <span className="toggle-label" style={{ color:"black" }}>{empleado.estado ? "ON" : "OFF"}</span>
                  </span>
                </button>
                <span style={{ fontSize:13, fontWeight:600, color: empleado.estado ? "#2e7d32" : "#9e9e9e" }}>{empleado.estado ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <p className="section-label">Ubicación</p>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <div className="field-input field-input--disabled">{empleado.direccion || "—"}</div>
          </div>
          <LocationSelects
            departamento={empleado.departamento} municipio={empleado.municipio}
            onDepto={() => {}} onMunicipio={() => {}}
            isView
          />
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Eliminar ─────────────────────────────────────── */
export function ModalEliminarEmpleado({ empleado, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => { setDeleting(true); await new Promise(r => setTimeout(r, 500)); onConfirm(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding:"28px 24px 18px", textAlign:"center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar empleado</h3>
          <p className="delete-body">¿Eliminar a <strong>"{empleado.nombre} {empleado.apellidos}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EditarEmpleado ─────────────────────────────────────── */
export default function EditarEmpleado({ empleado, onClose, onSave }) {
  const [form, setForm]         = useState({ ...empleado, contrasena:"", confirmar:"" });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fotoRef = useRef();

  useEffect(() => { if (empleado) setForm({ ...empleado, contrasena:"", confirmar:"" }); }, [empleado]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const handleFoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.tipoDoc)             e.tipoDoc      = "Requerido";
    if (!form.numDoc.trim())       e.numDoc       = "Requerido";
    if (!form.nombre.trim())       e.nombre       = "Requerido";
    if (!form.apellidos.trim())    e.apellidos    = "Requerido";
    if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    if (!form.telefono.trim())     e.telefono     = "Requerido";
    if (!form.fechaIngreso.trim()) e.fechaIngreso = "Requerido";
    if (!form.departamento)        e.departamento = "Requerido";
    if (!form.municipio)           e.municipio    = "Requerido";
    if (!form.idRol)               e.idRol        = "Selecciona un rol";
    if (form.contrasena && form.contrasena !== form.confirmar) e.confirmar = "No coinciden";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const { confirmar, ...data } = form;
    onSave(data);
    setSaving(false);
  };

  const Field = ({ k, label, type = "text", ph = "", full = false }) => (
    <div className="form-group" style={full ? { gridColumn:"1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      <input className={"field-input" + (errors[k] ? " field-input--error" : "")}
        type={type} value={form[k] || ""} onChange={e => set(k, e.target.value)} placeholder={ph}
        onFocus={e => e.target.style.borderColor = "#4caf50"}
        onBlur={e => e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0"} />
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Empleados</p>
            <h2 className="modal-header__title">Editar Empleado</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight:"68vh", overflowY:"auto" }}>

          {/* Avatar */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div className="avatar-upload-wrap" onClick={() => fotoRef.current.click()}>
              {form.fotoPreview ? <img className="avatar-upload-img" src={form.fotoPreview} alt="avatar" /> : <div className="avatar-upload-placeholder">👤</div>}
              <div className="avatar-upload-overlay">📷</div>
            </div>
            <p style={{ margin:0, fontSize:11, color:"#9e9e9e" }}>Foto de perfil</p>
            <input ref={fotoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFoto} />
          </div>

          {/* Identificación */}
          <p className="section-label">Identificación</p>
          <div className="form-group">
            <label className="form-label">Tipo y Número de documento</label>
            <div className="doc-combo">
              <select className={"field-input doc-sel" + (errors.tipoDoc ? " field-input--error" : "")}
                value={form.tipoDoc} onChange={e => set("tipoDoc", e.target.value)} style={{ cursor:"pointer" }}>
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={"field-input doc-input" + (errors.numDoc ? " field-input--error" : "")}
                type="text" value={form.numDoc} onChange={e => set("numDoc", e.target.value)} placeholder="Número de documento"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.numDoc ? "#e53935" : "#e0e0e0"} />
            </div>
            {(errors.tipoDoc || errors.numDoc) && <p className="field-error">{errors.tipoDoc || errors.numDoc}</p>}
          </div>

          {/* Rol */}
          <p className="section-label">Rol</p>
          <div className="form-group">
            <label className="form-label">Rol del empleado</label>
            <select className={"field-input" + (errors.idRol ? " field-input--error" : "")}
              value={form.idRol || ""} onChange={e => set("idRol", Number(e.target.value))} style={{ cursor:"pointer" }}>
              <option value="">— Seleccionar rol —</option>
              {ROLES_EMPLEADO.map(r => <option key={r.id} value={r.id}>{r.icon} {r.nombre}</option>)}
            </select>
            {errors.idRol && <p className="field-error">{errors.idRol}</p>}
          </div>

          {/* Datos personales */}
          <p className="section-label">Datos personales</p>
          <div className="form-grid-2">
            <Field k="nombre"    label="Nombre"    ph="Ej. Laura" />
            <Field k="apellidos" label="Apellidos" ph="Ej. Sánchez Ríos" />
            <Field k="correo"    label="Correo electrónico" type="email" ph="correo@empresa.com" full />

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className={"field-input" + (errors.telefono ? " field-input--error" : "")}
                type="tel" value={form.telefono} maxLength={12}
                onChange={e => set("telefono", fmtTel(e.target.value))} placeholder="300 000 0000"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.telefono ? "#e53935" : "#e0e0e0"} />
              {errors.telefono && <p className="field-error">{errors.telefono}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de ingreso</label>
              <input className={"field-input" + (errors.fechaIngreso ? " field-input--error" : "")}
                type="date" value={toInputDate(form.fechaIngreso)}
                onChange={e => set("fechaIngreso", fromInputDate(e.target.value))}
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.fechaIngreso ? "#e53935" : "#e0e0e0"} />
              {errors.fechaIngreso && <p className="field-error">{errors.fechaIngreso}</p>}
            </div>

            {/* Estado */}
            <div className="form-group" style={{ gridColumn:"1 / -1" }}>
              <label className="form-label">Estado</label>
              <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:4 }}>
                <button onClick={() => set("estado", !form.estado)} className="toggle-btn"
                  style={{ background: form.estado ? "#43a047" : "#c62828", boxShadow: form.estado ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
                  <span className="toggle-thumb" style={{ left: form.estado ? 27 : 3 }}>
                    <span className="toggle-label" style={{ color:"black" }}>{form.estado ? "ON" : "OFF"}</span>
                  </span>
                </button>
                <span style={{ fontSize:13, fontWeight:600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>{form.estado ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <p className="section-label">Ubicación</p>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="field-input" value={form.direccion || ""}
              onChange={e => set("direccion", e.target.value)} placeholder="Ej. Calle 10 # 5-20"
              onFocus={e => e.target.style.borderColor = "#4caf50"}
              onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
          </div>
          <LocationSelects
            departamento={form.departamento} municipio={form.municipio}
            onDepto={v => { set("departamento", v); set("municipio", ""); }}
            onMunicipio={v => set("municipio", v)}
            errDepto={errors.departamento} errMunicipio={errors.municipio}
          />

          {/* Contraseña */}
          <p className="section-label">Cambiar contraseña</p>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nueva contraseña <span style={{ color:"#bdbdbd", fontWeight:400, textTransform:"none" }}>(opcional)</span></label>
              <div className="pass-wrap">
                <input className="field-input" type={showPass ? "text" : "password"} style={{ paddingRight:36 }}
                  value={form.contrasena || ""} onChange={e => set("contrasena", e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
                <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>{showPass ? "🙈" : "👁"}</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña</label>
              <div className="pass-wrap">
                <input className={"field-input" + (errors.confirmar ? " field-input--error" : "")}
                  type={showPass ? "text" : "password"} style={{ paddingRight:36 }}
                  value={form.confirmar || ""} onChange={e => set("confirmar", e.target.value)}
                  placeholder="Repetir contraseña"
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e => e.target.style.borderColor = errors.confirmar ? "#e53935" : "#e0e0e0"} />
                <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>{showPass ? "🙈" : "👁"}</button>
              </div>
              {errors.confirmar && <p className="field-error">{errors.confirmar}</p>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner">◌</span>}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}