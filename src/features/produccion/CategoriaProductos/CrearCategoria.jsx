import { useState } from "react";
import { C, ICON_OPTIONS } from "./theme.js";
import { FieldInput, ModalOverlay } from "./ui.jsx";
import "./Categoriaproductos.css";

export default function CrearCategoria({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: "", descripcion: "", estado: true, icon: "🍌" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);

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
    await new Promise(r => setTimeout(r, 500));
    onSave({ ...form, id: Date.now(), fecha: new Date().toLocaleDateString("es-CO") });
    setSaving(false);
  };

  return (
    <ModalOverlay onClose={onClose}>
      
      {/* Header */}
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categorías</p>
          <h2 className="modal-header__title">Nueva categoría</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Body */}
      <div className="modal-body">

        {/* Ícono */}
        <div className="form-group">
          <label className="form-label">Ícono</label>
          <button
            className={`icon-picker-trigger${pickingIcon ? " open" : ""}`}
            onClick={() => setPickingIcon(!pickingIcon)}
          >
            {form.icon}
          </button>

          {pickingIcon && (
            <div className="icon-picker-grid">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-option${form.icon === ic ? " selected" : ""}`}
                  onClick={() => { setForm({ ...form, icon: ic }); setPickingIcon(false); }}
                >
                  {ic}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nombre */}
        <div className="form-group">
          <label className="form-label">
            Nombre <span style={{color:"red"}}>*</span>
          </label>

          <FieldInput
            required
            value={form.nombre}
            onChange={e => { 
              setForm({ ...form, nombre: e.target.value }); 
              setErrors({ ...errors, nombre: "" }); 
            }}
            placeholder="Ej. Snacks Premium"
            error={errors.nombre}
          />

          {errors.nombre && <p className="field-error">{errors.nombre}</p>}
        </div>

        {/* Descripción */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Descripción <span style={{color:"red"}}>*</span>
          </label>

          <FieldInput
            required
            multiline
            value={form.descripcion}
            onChange={e => { 
              setForm({ ...form, descripcion: e.target.value }); 
              setErrors({ ...errors, descripcion: "" }); 
            }}
            placeholder="Describe los productos de esta categoría"
            error={errors.descripcion}
          />

          {errors.descripcion && <p className="field-error">{errors.descripcion}</p>}
        </div>

      </div>

      {/* Footer */}
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

    </ModalOverlay>
  );
}