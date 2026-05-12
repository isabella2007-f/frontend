import { useState, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { ModalOverlay } from "./ui.jsx";
import CrearFicha from "./ficha_tecnica/CrearFicha.jsx";
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

export default function CrearProducto({ onClose, onSave }) {
  const { categoriasProductosActivas, getCatProducto, calcularCostoProduccion, sugerirPrecioConGanancia } = useApp();

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
    const existing = productos || [];

    if (s === 1) {
      if (!form.nombre.trim()) e.nombre      = "El nombre es obligatorio";
      else if (existing.some(p => p.nombre.toLowerCase() === form.nombre.toLowerCase())) {
        e.nombre = "Este nombre ya existe en el catálogo";
      }
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

  const costoProduccion = form.ficha ? calcularCostoProduccion({ ficha: form.ficha }) : 0;
  const precioSugerido = sugerirPrecioConGanancia(costoProduccion);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
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

          <div className="modal-body" style={{ minHeight: 260 }}>

            {/* ── Paso 1: Información ── */}
            {step === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">Nombre <span className="required">*</span></label>
                  <input
                    className={`field-input${errors.nombre ? " error" : ""}`}
                    value={form.nombre}
                    onChange={e => set("nombre", e.target.value)}
                    placeholder="Ej. Tostones de plátano verde"
                  />
                  {errors.nombre && <p className="field-error">{errors.nombre}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría <span className="required">*</span></label>
                  <select
                    className={`field-input${errors.idCategoria ? " error" : ""}`}
                    value={form.idCategoria}
                    onChange={e => set("idCategoria", e.target.value)}
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

            {/* ── Paso 2: Precio y stock ── */}
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
                    {form.precio && Number(form.precio) < costoProduccion && (
                      <p style={{ fontSize: 11, color: "#e65100", marginTop: 8, marginBottom: 0 }}>
                        ⚠️ El precio es menor al costo de producción. Considera aumentar el precio para generar ganancia.
                      </p>
                    )}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Precio venta <span className="required">*</span></label>
                    <input className={`field-input${errors.precio ? " error" : ""}`} type="number" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock mín. <span className="required">*</span></label>
                    <input className={`field-input${errors.stockMinimo ? " error" : ""}`} type="number" value={form.stockMinimo} onChange={e => set("stockMinimo", e.target.value)} placeholder="10" />
                  </div>
                </div>

                <div className="form-group">
                  <button className={`btn-ghost ${form.ficha ? "active" : ""}`} onClick={() => setShowFicha(true)} style={{ width: "100%", justifyContent: "center" }}>
                    {form.ficha ? "📋 Ficha técnica configurada ✓" : "📋 Configurar ficha técnica"}
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Imágenes</label>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {form.imagenesPreview.map((img, i) => (
                      <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={img} style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover" }} />
                        <button onClick={() => removeImg(i)} style={{ position: "absolute", top: -4, right: -4, background: "#c62828", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => fileRef.current.click()} style={{ width: 50, height: 50, borderRadius: 8, border: "1.5px dashed #ccc", background: "#f9f9f9", color: "#999", fontSize: 20 }}>+</button>
                  </div>
                  <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={handleImgs} />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: "space-between" }}>
            {step > 1 ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button> : <button className="btn-ghost" onClick={onClose}>Cancelar</button>}
            <div style={{ display: "flex", gap: 10 }}>
              {step < 2 ? <button className="btn-save" onClick={handleNext}>Siguiente →</button> : <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>}
            </div>
          </div>
        </div>
      </div>

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
