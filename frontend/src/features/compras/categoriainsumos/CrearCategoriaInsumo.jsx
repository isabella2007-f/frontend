import { useState } from "react";
import { ModalOverlay } from "./ui.jsx";
import EmojiPicker from "../../../shared/components/EmojiPicker";
import "./CategoriaInsumos.css";
import { soloLetras, tieneLetras } from "../../../utils/inputFilters";

export default function CrearCategoriaInsumo({ onClose, onSave }) {
  const [form, setForm]   = useState({ nombre: "", descripcion: "", icon: "🥬" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())                                      e.nombre      = "Campo requerido";
    if (!form.descripcion.trim())                                 e.descripcion = "Campo requerido";
    else if (!tieneLetras(form.descripcion))                      e.descripcion = "La descripción debe contener letras";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave({
        Nombre_Categoria: form.nombre.trim(),
        Descripcion:      form.descripcion.trim(),
        Icono:            form.icon,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categorías de Insumos</p>
          <h2 className="modal-header__title">Nueva categoría</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body">
        <EmojiPicker value={form.icon} onChange={ic => set("icon", ic)} />

        <div className="form-group">
          <label className="form-label">
            Nombre <span style={{ color: "#e53935", fontWeight: 800 }}>*</span>
          </label>
          <input
            className={`field-input${errors.nombre ? " field-input--error" : ""}`}
            value={form.nombre}
            onChange={e => set("nombre", soloLetras(e.target.value))}
            placeholder="Ej. Vegetales"
            onFocus={e  => (e.target.style.borderColor = "#4caf50")}
            onBlur={e   => (e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0")}
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
            placeholder="Describe esta categoría de insumos"
            onFocus={e  => (e.target.style.borderColor = "#4caf50")}
            onBlur={e   => (e.target.style.borderColor = errors.descripcion ? "#e53935" : "#e0e0e0")}
          />
          {errors.descripcion && <p className="field-error">{errors.descripcion}</p>}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </ModalOverlay>
  );
}
