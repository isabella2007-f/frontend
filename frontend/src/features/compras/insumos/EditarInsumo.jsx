import { useState } from "react";
import "./GestionInsumos.css";

export default function EditarInsumo({ ins, onClose, onSave, categorias, unidades }) {
  const [form, setForm] = useState({
    ...ins,
    lote: ins.lote ? { ...ins.lote } : { id: "", fechaVenc: "", cantInicial: "" },
  });
  const [errors, setSErrors] = useState({});
  const [saving, setSaving]  = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSErrors(p => ({ ...p, [k]: "" })); };
  const setLote = (k, v) => setForm(p => ({ ...p, lote: { ...p.lote, [k]: v } }));

  const stockPct = () => {
    const a = Number(form.stockActual), m = Number(form.stockMinimo);
    if (!m) return 0;
    return Math.min(100, Math.round((a / (m * 2)) * 100));
  };
  const stockColor = () => {
    const a = Number(form.stockActual), m = Number(form.stockMinimo);
    if (a === 0) return "#ef5350";
    if (a < m)   return "#ffa726";
    return "#43a047";
  };
  const stockLabel = () => {
    const a = Number(form.stockActual), m = Number(form.stockMinimo);
    if (a === 0) return "Agotado";
    if (a < m)   return `Stock bajo (faltan ${m - a})`;
    return "Disponible ✓";
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim())     e.nombre      = "Campo requerido";
    if (!form.idCategoria)       e.idCategoria = "Selecciona una categoría";
    if (!form.idUnidad)          e.idUnidad    = "Selecciona una unidad";
    if (form.stockActual === "") e.stockActual = "Campo requerido";
    if (form.stockMinimo === "") e.stockMinimo = "Campo requerido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setSErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave({
      ...form,
      idCategoria: Number(form.idCategoria),
      idUnidad:    Number(form.idUnidad),
      stockActual: Number(form.stockActual),
      stockMinimo: Number(form.stockMinimo),
      lote: form.lote.id ? { ...form.lote, cantInicial: Number(form.lote.cantInicial) } : null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Gestión de Insumos</p>
            <h2 className="modal-header__title">Editar insumo</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre <span>*</span></label>
            <input className={`field-input${errors.nombre ? " field-input--error" : ""}`}
              value={form.nombre} onChange={e => set("nombre", e.target.value)}
              placeholder="Ej. Plátano verde"
              onFocus={e => e.target.style.borderColor = "#4caf50"}
              onBlur={e => e.target.style.borderColor = errors.nombre ? "#e53935" : "#e0e0e0"}
            />
            {errors.nombre && <p className="field-error">{errors.nombre}</p>}
          </div>

          {/* Categoría + Unidad */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoría <span>*</span></label>
              <select className={`field-input${errors.idCategoria ? " field-input--error" : ""}`}
                value={form.idCategoria} onChange={e => set("idCategoria", e.target.value)}>
                <option value="">— Seleccionar —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>)}
              </select>
              {errors.idCategoria && <p className="field-error">{errors.idCategoria}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Unidad de medida <span>*</span></label>
              <select className={`field-input${errors.idUnidad ? " field-input--error" : ""}`}
                value={form.idUnidad} onChange={e => set("idUnidad", e.target.value)}>
                <option value="">— Seleccionar —</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.simbolo} — {u.nombre}</option>)}
              </select>
              {errors.idUnidad && <p className="field-error">{errors.idUnidad}</p>}
            </div>
          </div>

          {/* Stock */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stock actual <span>*</span></label>
              <input type="number" min="0" className={`field-input${errors.stockActual ? " field-input--error" : ""}`}
                value={form.stockActual} onChange={e => set("stockActual", e.target.value)}
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.stockActual ? "#e53935" : "#e0e0e0"}
              />
              {errors.stockActual && <p className="field-error">{errors.stockActual}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Stock mínimo <span>*</span></label>
              <input type="number" min="0" className={`field-input${errors.stockMinimo ? " field-input--error" : ""}`}
                value={form.stockMinimo} onChange={e => set("stockMinimo", e.target.value)}
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.stockMinimo ? "#e53935" : "#e0e0e0"}
              />
              {errors.stockMinimo && <p className="field-error">{errors.stockMinimo}</p>}
            </div>
          </div>

          {/* Stock preview */}
          <div className="stock-helper">
            <p className="stock-helper__label">Vista previa de stock</p>
            <div className="stock-helper__bar">
              <div className="stock-helper__fill" style={{ width: stockPct() + "%", background: stockColor() }} />
            </div>
            <p className="stock-helper__text" style={{ color: stockColor() }}>{stockLabel()}</p>
          </div>

          {/* Lote de compra */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Lote de compra <span style={{ color: "#9e9e9e", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(opcional)</span></label>
            <div className="lote-section">
              <div className="lote-section__header">
                <span>📦</span>
                <p className="lote-section__title">Información del lote</p>
              </div>
              <div className="lote-section__body">
                <div style={{ gridColumn: "1 / -1" }}>
                  <p className="lote-field__label">ID del lote</p>
                  <input className="field-input" value={form.lote.id}
                    onChange={e => setLote("id", e.target.value)} placeholder="Ej. L-001"
                    onFocus={e => e.target.style.borderColor = "#4caf50"}
                    onBlur={e => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>
                <div>
                  <p className="lote-field__label">Fecha de vencimiento</p>
                  <input type="date" className="field-input" value={form.lote.fechaVenc || ""}
                    onChange={e => setLote("fechaVenc", e.target.value)} />
                </div>
                <div>
                  <p className="lote-field__label">Cantidad inicial</p>
                  <input type="number" min="0" className="field-input" value={form.lote.cantInicial}
                    onChange={e => setLote("cantInicial", e.target.value)} placeholder="0"
                    onFocus={e => e.target.style.borderColor = "#4caf50"}
                    onBlur={e => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}