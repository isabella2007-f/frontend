import { useState } from "react";
import { ModalOverlay } from "./ui.jsx";
import "./CategoriaInsumos.css";

const ICON_OPTIONS = [
  "🥬","🥩","🧀","🌾","🧂","🛢️","🥫","📦",
  "🫙","🧈","🥚","🌽","🍋","🧄","🫚","🍅",
  "🥕","🧅","🌶️","🫑",
];

export default function CrearCategoriaInsumo({ onClose, onSave }) {
  const [form, setForm]               = useState({ nombre: "", descripcion: "", icon: "🥬" });
  const [errors, setErrors]           = useState({});
  const [saving, setSaving]           = useState(false);
  const [pickingIcon, setPickingIcon] = useState(false);

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
    await new Promise(r => setTimeout(r, 500));
    onSave({
      ...form,
      id: Date.now(),
      insumos: [],
      estado: true,
      fecha: new Date().toLocaleDateString("es-CO"),
    });
    setSaving(false);
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

        {/* Ícono */}
        <div className="form-group">
          <label className="form-label">Ícono</label>
          <button
            className={`icon-picker-trigger${pickingIcon ? " open" : ""}`}
            onClick={() => setPickingIcon(v => !v)}
          >
            {form.icon}
          </button>
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

        {/* Nombre — obligatorio */}
        <div className="form-group">
          <label className="form-label">
            Nombre <span style={{ color: "#e53935", fontWeight: 800 }}>*</span>
          </label>
          <input
            className={`field-input${errors.nombre ? " field-input--error" : ""}`}
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Ej. Vegetales"
            onFocus={e  => (e.target.style.borderColor = "#4caf50")}
            onBlur={e   => (e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0")}
          />
          {errors.nombre && <p className="field-error">{errors.nombre}</p>}
        </div>

        {/* Descripción — obligatoria */}
        <div className="form-group">
          <label className="form-label">
            Descripción <span style={{ color: "#e53935", fontWeight: 800 }}>*</span>
          </label>
          <textarea
            className={`field-input${errors.descripcion ? " field-input--error" : ""}`}
            rows={2}
            style={{ resize: "none" }}
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