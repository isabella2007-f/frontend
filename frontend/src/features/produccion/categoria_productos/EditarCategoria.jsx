import { useState, useEffect } from "react";
import { ICON_OPTIONS } from "./theme.js";
import { ModalOverlay } from "./ui.jsx";
import "./Categoriaproductos.css";

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="toggle-btn"
      style={{
        background: value ? "#43a047" : "#c62828",
        boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)",
      }}
    >
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>
          {value ? "ON" : "OFF"}
        </span>
      </span>
    </button>
  );
}

export default function EditarCategoria({ category, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: category?.nombre ?? "",
    descripcion: category?.descripcion ?? "",
    icon: category?.icon ?? "📦",
    estado: category?.estado ?? true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);

  useEffect(() => {
    if (category) setForm({ nombre: category.nombre, descripcion: category.descripcion, icon: category.icon, estado: category.estado });
  }, [category]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())      e.nombre      = "Campo requerido";
    if (!form.descripcion.trim()) e.descripcion = "Campo requerido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave(
        { Nombre_Categoria: form.nombre.trim(), Descripcion: form.descripcion.trim(), Icono: form.icon },
        form.estado !== category.estado,
      );
    } catch {
      // el padre ya mostró el toast de error; el modal se mantiene abierto
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categorías</p>
          <h2 className="modal-header__title">Editar categoría</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Ícono</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={`icon-picker-trigger${pickingIcon ? " open" : ""}`}
              onClick={() => setPickingIcon(v => !v)}
            >
              {form.icon}
            </button>
            <span style={{ fontSize: 12, color: "#9e9e9e" }}>
              {pickingIcon ? "Selecciona un emoji de la lista" : "Haz clic para cambiar el ícono"}
            </span>
          </div>
          {pickingIcon && (
            <div className="icon-picker-grid">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-option${form.icon === ic ? " selected" : ""}`}
                  onClick={() => { set("icon", ic); setPickingIcon(false); }}
                >
                  {ic}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            Nombre <span style={{ color: "#e53935", fontWeight: 800 }}>*</span>
          </label>
          <input
            className={`field-input${errors.nombre ? " field-input--error" : ""}`}
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Ej. Snacks Premium"
            onFocus={e => (e.target.style.borderColor = "#4caf50")}
            onBlur={e  => (e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0")}
          />
          {errors.nombre && <p className="field-error">{errors.nombre}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "inherit" }}>Descripción <span style={{ color: "#e53935", fontWeight: 800 }}>*</span></span>
            <span style={{ fontSize: 11, color: form.descripcion.length >= 180 ? "#e65100" : "#9e9e9e", fontWeight: 400, letterSpacing: 0 }}>
              {form.descripcion.length}/200
            </span>
          </label>
          <textarea
            className={`field-input${errors.descripcion ? " field-input--error" : ""}`}
            rows={2}
            style={{ resize: "none" }}
            maxLength={200}
            value={form.descripcion}
            onChange={e => set("descripcion", e.target.value)}
            placeholder="Describe los productos de esta categoría"
            onFocus={e => (e.target.style.borderColor = "#4caf50")}
            onBlur={e  => (e.target.style.borderColor = errors.descripcion ? "#e53935" : "#e0e0e0")}
          />
          {errors.descripcion && <p className="field-error">{errors.descripcion}</p>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Toggle value={form.estado} onChange={v => setForm(p => ({ ...p, estado: v }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>
                {form.estado ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
          {category?.fecha && (
            <div style={{ textAlign: "right", fontSize: 11, color: "#9e9e9e" }}>
              <p style={{ margin: 0 }}>Fecha de creación</p>
              <strong style={{ color: "#616161" }}>{category.fecha}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </ModalOverlay>
  );
}
