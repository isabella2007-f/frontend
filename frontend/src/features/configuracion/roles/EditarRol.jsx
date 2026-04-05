import { useState, useRef, useEffect } from "react";
import "./Roles.css";
import PrivilegiosModal, { buildPrivilegios } from "./PrivilegiosModal.jsx";

const ICON_OPTIONS = ["👤","👑","🛡️","🔧","📦","💼","🧑‍💻","📊","🔑","⚙️","👷","🧑‍🍳"];

export default function EditarRol({ rol, mode = "edit", onClose, onSave }) {
  const normalize = (p) => (p?.length > 0 && p[0].modulo ? p : buildPrivilegios(p || []));

  const [form, setForm]                       = useState({ ...rol, privilegios: normalize(rol.privilegios) });
  const [errors, setErrors]                   = useState({});
  const [saving, setSaving]                   = useState(false);
  const [pickingIcon, setPickingIcon]         = useState(false);
  const [showPrivilegios, setShowPrivilegios] = useState(false);
  const fileRef = useRef();
  const isView  = mode === "view";

  useEffect(() => {
    if (rol) setForm({ ...rol, privilegios: normalize(rol.privilegios) });
  }, [rol]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const handleIconFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { set("iconoPreview", ev.target.result); set("icono", null); };
    reader.readAsDataURL(file);
  };

  const activosCount = form.privilegios?.filter(p => p.estado).length || 0;
  const totalCount   = form.privilegios?.length || 0;

  const handleSave = async () => {
    const newErrors = {};
    if (!form.nombre.trim()) newErrors.nombre = "Campo requerido";
    if (activosCount === 0)  newErrors.privilegios = "El rol debe tener al menos un privilegio activo.";
    if (form.esAdmin) {
      const tieneRolesVer    = form.privilegios?.some(p => p.id === "Roles_ver"    && p.estado);
      const tieneUsuariosVer = form.privilegios?.some(p => p.id === "Usuarios_ver" && p.estado);
      if (!tieneRolesVer || !tieneUsuariosVer) {
        newErrors.privilegios = "El rol administrador debe conservar al menos los privilegios de ver Roles y ver Usuarios.";
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(form);
    setSaving(false);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <p className="modal-header__eyebrow">Roles</p>
              <h2 className="modal-header__title">{isView ? "Ver rol" : "Editar rol"}</h2>
            </div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {/* Ícono */}
            <div className="form-group">
              <label className="form-label">Ícono</label>
              <div className="icon-row">
                <div className="rol-icon-wrap"
                  style={{ cursor: isView ? "default" : "pointer" }}
                  onClick={() => !isView && fileRef.current.click()}>
                  {form.iconoPreview
                    ? <img src={form.iconoPreview} alt="icon" />
                    : <span style={{ fontSize: 22 }}>{form.icono}</span>}
                </div>
                {!isView && (
                  <>
                    <button className="icon-change-btn" onClick={() => fileRef.current.click()}>Cambiar imagen</button>
                    <span style={{ color: "#9e9e9e", fontSize: 12 }}>o</span>
                    <button className="icon-change-btn" onClick={() => setPickingIcon(v => !v)}>Elegir emoji</button>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIconFile} />
              </div>
              {!isView && pickingIcon && (
                <div className="icon-picker-grid">
                  {ICON_OPTIONS.map(ic => (
                    <button key={ic}
                      className={`icon-option${form.icono === ic ? " selected" : ""}`}
                      onClick={() => { set("icono", ic); set("iconoPreview", null); setPickingIcon(false); }}>
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label className="form-label">Nombre del rol</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.nombre}</div>
                : <>
                    <input
                      className={`field-input${errors.nombre ? " field-input--error" : ""}`}
                      value={form.nombre}
                      onChange={e => set("nombre", e.target.value)}
                      placeholder="Ej. Administrador"
                      onFocus={e => (e.target.style.borderColor = "#4caf50")}
                      onBlur={e  => (e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0")}
                    />
                    {errors.nombre && <p className="field-error">{errors.nombre}</p>}
                  </>
              }
            </div>

            {/* Fecha */}
            {rol?.fecha && (
              <div className="date-info" style={{ marginBottom: 16 }}>
                <span>📅</span>
                <span>Creado el <strong>{rol.fecha}</strong></span>
              </div>
            )}

            {/* Privilegios */}
            <div className="form-group">
              <label className="form-label">Privilegios</label>
              <button
                className="privilegios-open-btn"
                style={errors.privilegios ? { borderColor: "#e53935" } : {}}
                onClick={() => { setShowPrivilegios(true); setErrors(p => ({ ...p, privilegios: "" })); }}
              >
                <span>🔐</span>
                <span>Ver y gestionar privilegios</span>
                <span className="permiso-grupo-badge" style={{ marginLeft: "auto" }}>
                  {activosCount}/{totalCount} activos
                </span>
                <span style={{ color: "#9e9e9e", fontSize: 13 }}>›</span>
              </button>
              {errors.privilegios && <p className="field-error">{errors.privilegios}</p>}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Salir sin guardar"}</button>
            {!isView && (
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving && <span className="spinner">◌</span>}
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPrivilegios && (
        <PrivilegiosModal
          privilegios={form.privilegios}
          esAdmin={form.esAdmin}
          isView={isView}
          onChange={privilegios => set("privilegios", privilegios)}
          onClose={() => setShowPrivilegios(false)}
        />
      )}
    </>
  );
}