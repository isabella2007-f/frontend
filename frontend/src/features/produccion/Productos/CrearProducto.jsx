import { useState, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { ModalOverlay } from "./ui.jsx";
import CrearFicha from "./ficha_tecnica/CrearFicha.jsx";
import "./Productos.css";

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

export default function CrearProducto({ onClose, onSave }) {
  const { categoriasProductosActivas, getCatProducto } = useApp();

  const [form, setForm] = useState({
    nombre: "", idCategoria: "", precio: "", stock: 0,
    stockMinimo: "10", imagenes: [], imagenesPreview: [], ficha: null,
  });
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [step, setStep]           = useState(1);
  const fileRef = useRef();

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
      if (!form.nombre.trim()) e.nombre      = "Campo requerido";
      if (!form.idCategoria)   e.idCategoria = "Selecciona una categoría";
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
    const stock  = 0; // Inicia en 0, depende de producción
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

  const catSeleccionada = getCatProducto(Number(form.idCategoria));

  return (
    <>
      <ModalOverlay onClose={onClose}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Productos</p>
            <h2 className="modal-header__title">Nuevo producto</h2>
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
            </>
          )}

          {/* ── Paso 2: Precio, stock e imágenes ── */}
          {step === 2 && (
            <>
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
                  <label className="form-label">Stock inicial</label>
                  <input
                    className="field-input"
                    type="number" disabled value="0"
                    style={{ background: "#f5f5f5", cursor: "not-allowed" }}
                  />
                  <p style={{ fontSize: 10, color: "#9e9e9e", marginTop: 4 }}>Depende de órdenes de producción</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Stock mínimo{" "}
                  <span style={{ color: "#9e9e9e", fontWeight: 400, textTransform: "none", marginLeft: 4, fontSize: 11 }}>
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
                {saving ? "Guardando…" : "Guardar"}
              </button>
          }
        </div>
      </ModalOverlay>

      {/* ── La ficha se monta ENCIMA sin desmontar CrearProducto ── */}
      {showFicha && (
        <CrearFicha
          productoNombre={form.nombre}
          productoCategoria={catSeleccionada?.nombre || ""}
          onClose={() => setShowFicha(false)}
          onSave={ficha => { set("ficha", ficha); setShowFicha(false); }}
        />
      )}
    </>
  );
}
