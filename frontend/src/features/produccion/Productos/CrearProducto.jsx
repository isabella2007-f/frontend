import { useState, useRef } from "react";
import { ModalOverlay } from "./ui.jsx";
import CrearFicha from "./ficha_tecnica/CrearFicha.jsx";
import "./Productos.css";

const CATEGORIAS = ["Congelados","Postres","Snacks","Bebidas","Harinas","Orgánicos"];

export default function CrearProducto({ onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: "", categoria: "", precio: "", stock: "",
    stockMinimo: "10", imagen: null, imagenPreview: null, ficha: null,
  });
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())   e.nombre    = "Campo requerido";
    if (!form.categoria)       e.categoria = "Selecciona una categoría";
    if (!form.precio || isNaN(form.precio) || Number(form.precio) <= 0) e.precio = "Precio válido requerido";
    if (form.stock === "" || isNaN(form.stock) || Number(form.stock) < 0) e.stock = "Stock válido requerido";
    if (form.stockMinimo === "" || isNaN(form.stockMinimo) || Number(form.stockMinimo) < 0) e.stockMinimo = "Valor válido requerido";
    return e;
  };

  const handleImg = e => {
    const file = e.target.files[0]; 
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => set("imagenPreview", ev.target.result);
    reader.readAsDataURL(file);

    set("imagen", file.name);
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { 
      setErrors(e); 
      return; 
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 500));

    const stock  = Number(form.stock);
    const minimo = Number(form.stockMinimo);

    onSave({
      ...form,
      id: Date.now(),
      precio: Number(form.precio),
      stock,
      stockMinimo: minimo,
      estado: stock > 0 && stock >= minimo ? "Disponible" : "No disponible",
      fecha: new Date().toLocaleDateString("es-CO"),
    });

    setSaving(false);
  };

  if (showFicha) {
    return (
      <CrearFicha
        productoNombre={form.nombre}
        productoCategoria={form.categoria}
        onClose={() => setShowFicha(false)}
        onSave={ficha => { 
          set("ficha", ficha); 
          setShowFicha(false); 
        }}
      />
    );
  }

  return (
    <ModalOverlay onClose={onClose}>

      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Productos</p>
          <h2 className="modal-header__title">Nuevo producto</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto" }}>

        {/* Nombre */}
        <div className="form-group">
          <label className="form-label">Nombre</label>

          <input
            required
            className={`field-input${errors.nombre ? " field-input--error" : ""}`}
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Ej. Tostones de plátano verde"
            onFocus={e => e.target.style.borderColor = "#4caf50"}
            onBlur={e => e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0"}
          />

          {errors.nombre && <p className="field-error">{errors.nombre}</p>}
        </div>

        {/* Categoría */}
        <div className="form-group">
          <label className="form-label">Categoría</label>

          <select
            required
            className={`field-input${errors.categoria ? " field-input--error" : ""}`}
            value={form.categoria}
            onChange={e => set("categoria", e.target.value)}
            style={{ cursor: "pointer" }}
          >
            <option value="">— Seleccionar —</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {errors.categoria && <p className="field-error">{errors.categoria}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          {/* Precio */}
          <div className="form-group">
            <label className="form-label">Precio de venta</label>

            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9e9e9e",
                fontSize: 13
              }}>
                $
              </span>

              <input
                required
                className={`field-input${errors.precio ? " field-input--error" : ""}`}
                style={{ paddingLeft: 24 }}
                type="number"
                min="0"
                value={form.precio}
                onChange={e => set("precio", e.target.value)}
                placeholder="0"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.precio ? "#e53935" : "#e0e0e0"}
              />
            </div>

            {errors.precio && <p className="field-error">{errors.precio}</p>}
          </div>

          {/* Stock */}
          <div className="form-group">
            <label className="form-label">Stock</label>

            <input
              required
              className={`field-input${errors.stock ? " field-input--error" : ""}`}
              type="number"
              min="0"
              value={form.stock}
              onChange={e => set("stock", e.target.value)}
              placeholder="0"
              onFocus={e => e.target.style.borderColor = "#4caf50"}
              onBlur={e => e.target.style.borderColor = errors.stock ? "#e53935" : "#e0e0e0"}
            />

            {errors.stock && <p className="field-error">{errors.stock}</p>}
          </div>
        </div>

        {/* Stock mínimo */}
        <div className="form-group">
          <label className="form-label">
            Stock mínimo
            <span style={{
              color: "#9e9e9e",
              fontWeight: 400,
              textTransform: "none",
              marginLeft: 4,
              fontSize: 11
            }}>
              (el estado se ajusta automáticamente)
            </span>
          </label>

          <input
            required
            className={`field-input${errors.stockMinimo ? " field-input--error" : ""}`}
            type="number"
            min="0"
            value={form.stockMinimo}
            onChange={e => set("stockMinimo", e.target.value)}
            placeholder="Ej. 10"
            onFocus={e => e.target.style.borderColor = "#4caf50"}
            onBlur={e => e.target.style.borderColor = errors.stockMinimo ? "#e53935" : "#e0e0e0"}
          />

          {errors.stockMinimo && <p className="field-error">{errors.stockMinimo}</p>}
        </div>

        {/* Ficha técnica */}
        <div className="form-group">
          <button
            className={`btn-ficha-tecnica${form.ficha ? " btn-ficha-tecnica--done" : ""}`}
            onClick={() => setShowFicha(true)}
          >
            <span>📋</span>
            {form.ficha ? "Ficha técnica agregada ✓" : "Agregar ficha técnica"}
          </button>
        </div>

        {/* Imagen */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Imagen del producto</label>

          <div
            onClick={() => fileRef.current.click()}
            className="img-upload-zone"
            onMouseEnter={e => e.currentTarget.style.borderColor = "#4caf50"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#c8e6c9"}
          >
            {form.imagenPreview ? (
              <img src={form.imagenPreview} alt="preview" />
            ) : (
              <div style={{ textAlign: "center", color: "#9e9e9e" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🖼️</div>
                <span style={{ fontSize: 12 }}>Clic para subir imagen</span>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImg}
          />
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