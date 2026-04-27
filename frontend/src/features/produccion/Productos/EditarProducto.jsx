import { useState, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { ModalOverlay } from "./ui.jsx";
import "./Productos.css";

// ─── Helpers ──────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

// ─── Barra de pasos ───────────────────────────────────────
const STEPS = ["Información", "Precio, stock e imágenes"];

function StepsBar({ current }) {
  return (
    <div className="wizard-steps-bar">
      {STEPS.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
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

// Toggle idéntico al de GestionInsumos
function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#bdbdbd", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.4)" : "none" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label">{value ? "ON" : ""}</span>
      </span>
    </button>
  );
}

export default function EditarProducto({ product, onClose, onSave }) {
  const { categoriasProductosActivas, calcularCostoProduccion, sugerirPrecioConGanancia } = useApp();

  const [form, setForm] = useState({
    ...product,
    precio:          String(product.precio ?? ""),
    stock:           String(product.stock ?? "0"),
    stockMinimo:     String(product.stockMinimo ?? "10"),
    imagenesPreview: product.imagenesPreview ?? (product.imagenPreview ? [product.imagenPreview] : []),
    imagenes:        product.imagenes ?? (product.imagen ? [product.imagen] : []),
    activo:          product.activo !== false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [step, setStep]     = useState(1);
  const fileRef = useRef();

  const costoProduccion = calcularCostoProduccion(product);
  const precioSugerido = sugerirPrecioConGanancia(costoProduccion);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const handleImgs = e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setForm(p => ({
          ...p,
          imagenesPreview: [...p.imagenesPreview, ev.target.result],
          imagenes: [...p.imagenes, file.name]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImg = (idx) => {
    setForm(p => ({
      ...p,
      imagenesPreview: p.imagenesPreview.filter((_, i) => i !== idx),
      imagenes: p.imagenes.filter((_, i) => i !== idx)
    }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nombre?.trim()) e.nombre      = "Campo requerido";
      if (!form.idCategoria)    e.idCategoria = "Selecciona una categoría";
    }
    if (s === 2) {
      if (!form.precio || isNaN(form.precio) || Number(form.precio) <= 0)
        e.precio = "Precio válido requerido";
      if (form.stockMinimo === "" || isNaN(form.stockMinimo) || Number(form.stockMinimo) < 0)
        e.stockMinimo = "Valor válido requerido";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSave = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const stock  = Number(form.stock);
    const minimo = Number(form.stockMinimo);
    onSave({
      ...form,
      idCategoria: Number(form.idCategoria),
      precio:      Number(form.precio),
      stock, stockMinimo: minimo,
      estado: stock > 0 && stock >= minimo ? "Disponible" : "No disponible",
    });
    setSaving(false);
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Productos</p>
          <h2 className="modal-header__title">Editar producto</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: "16px 24px 0" }}>
        <StepsBar current={step} />
      </div>

      <div className="modal-body" style={{ overflow: "visible" }}>

        {/* ── Paso 1: Información ── */}
        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className={`field-input${errors.nombre ? " field-input--error" : ""}`}
                value={form.nombre}
                onChange={e => set("nombre", e.target.value)}
                placeholder="Ej. Tostones de plátano verde"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0"}
              />
              {errors.nombre && <p className="field-error">{errors.nombre}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className={`field-input${errors.idCategoria ? " field-input--error" : ""}`}
                value={form.idCategoria}
                onChange={e => set("idCategoria", e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="">— Seleccionar —</option>
                {categoriasProductosActivas.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>
                ))}
              </select>
              {errors.idCategoria && <p className="field-error">{errors.idCategoria}</p>}
            </div>

            {/* Toggle activo */}
            <div className="form-group">
              <label className="form-label">Activo</label>
              <div className="estado-row">
                <Toggle value={form.activo} onChange={v => set("activo", v)} />
                <span className="estado-label" style={{ color: form.activo ? "#2e7d32" : "#9e9e9e" }}>
                  {form.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Paso 2: Precio, stock e imágenes ── */}
        {step === 2 && (
          <>
            {/* Costo de producción y sugerencia */}
            {costoProduccion > 0 && (
              <div style={{ background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#424242", margin: 0, fontWeight: 600 }}>💰 Información de costos</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#757575" }}>Costo de producción:</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#2e7d32" }}>${fmt(costoProduccion)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "#757575" }}>Precio sugerido (50% ganancia):</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1565c0" }}>${fmt(precioSugerido)}</span>
                </div>
                {Number(form.precio) < costoProduccion && (
                  <p style={{ fontSize: 11, color: "#e65100", marginTop: 8, marginBottom: 0 }}>
                    ⚠️ El precio actual es menor al costo de producción. Considera aumentar el precio para generar ganancia.
                  </p>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Precio de venta</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9e9e9e", fontSize: 13 }}>$</span>
                  <input
                    className={`field-input${errors.precio ? " field-input--error" : ""}`}
                    style={{ paddingLeft: 24 }}
                    type="number" min="0" value={form.precio}
                    onChange={e => set("precio", e.target.value)} placeholder="0"
                    onFocus={e => e.target.style.borderColor = "#4caf50"}
                    onBlur={e => e.target.style.borderColor = errors.precio ? "#e53935" : "#e0e0e0"}
                  />
                </div>
                {errors.precio && <p className="field-error">{errors.precio}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Stock actual</label>
                <input
                  className="field-input"
                  type="number" disabled value={form.stock}
                  style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                />
                <p style={{ fontSize: 10, color: "#9e9e9e", marginTop: 4 }}>Actualizado por producción</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Stock mínimo{" "}
                <span style={{ color: "#9e9e9e", fontWeight: 400, marginLeft: 4, fontSize: 11 }}>
                  (el estado se ajusta automáticamente)
                </span>
              </label>
              <input
                className={`field-input${errors.stockMinimo ? " field-input--error" : ""}`}
                type="number" min="0" value={form.stockMinimo}
                onChange={e => set("stockMinimo", e.target.value)} placeholder="Ej. 10"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.stockMinimo ? "#e53935" : "#e0e0e0"}
              />
              {errors.stockMinimo && <p className="field-error">{errors.stockMinimo}</p>}
            </div>

            {/* Imágenes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Imágenes del producto</label>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                {form.imagenesPreview.map((url, idx) => (
                  <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid #c8e6c9" }}>
                    <img src={url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button 
                      onClick={() => removeImg(idx)}
                      style={{ position: "absolute", top: 2, right: 2, background: "rgba(255,255,255,0.8)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer", color: "#c62828" }}
                    >✕</button>
                  </div>
                ))}
                
                <div
                  onClick={() => fileRef.current.click()}
                  className="img-upload-zone"
                  style={{ width: 80, height: 80, margin: 0, padding: 0 }}
                >
                  <div style={{ textAlign: "center", color: "#9e9e9e" }}>
                    <div style={{ fontSize: 20 }}>➕</div>
                    <span style={{ fontSize: 9 }}>Subir</span>
                  </div>
                </div>
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImgs} />
            </div>
          </>
        )}
      </div>

      <div className="modal-footer" style={{ justifyContent: "space-between" }}>
        {step > 1
          ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
          : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        }
        {step < 2
          ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
          : <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
        }
      </div>
    </ModalOverlay>
  );
}
