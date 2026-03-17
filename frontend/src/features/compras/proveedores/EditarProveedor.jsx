import { useState, useEffect } from "react";
import "./proveedores.css";

const fmtTel = raw => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

const fmtCOP = v =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

/*
  Props:
  - proveedor   : objeto del proveedor seleccionado
  - mode        : "view" | "edit"
  - compras     : array de objetos Compra  { ID_Compra, ID_Proveedor, Fecha_Compra, Estado, Total_Pagar, detalles: [...] }
                  donde detalles = array de Detalle_Compra { ID_Detalle_Compra, ID_Insumo, Cantidad, Notas, Precio_Und, nombreInsumo }
  - onClose     : fn
  - onSave      : fn(proveedorActualizado)
*/
export default function EditarProveedor({ proveedor, mode = "edit", compras = [], onClose, onSave }) {
  const [form, setForm]     = useState({ ...proveedor });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isView = mode === "view";

  useEffect(() => { if (proveedor) setForm({ ...proveedor }); }, [proveedor]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  /* ── Últimos insumos: filtra compras de este proveedor y aplana detalles ── */
  const ultimosInsumos = (() => {
    const misCompras = compras
      .filter(c => String(c.ID_Proveedor) === String(proveedor.id))
      .sort((a, b) => new Date(b.Fecha_Compra) - new Date(a.Fecha_Compra));

    const items = [];
    for (const compra of misCompras) {
      for (const det of (compra.detalles || [])) {
        items.push({ ...det, Fecha_Compra: compra.Fecha_Compra, ID_Compra: compra.ID_Compra });
        if (items.length >= 3) return items;
      }
    }
    return items;
  })();

  const validate = () => {
    const e = {};
    if (!form.responsable?.trim()) e.responsable = "Requerido";
    if (!form.celular?.trim())     e.celular      = "Requerido";
    if (!form.correo?.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(form);
    setSaving(false);
  };

  const Field = ({ k, label, type = "text", ph = "", full = false }) => (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <>
            <input
              className={"field-input" + (errors[k] ? " field-input--error" : "")}
              type={type}
              value={form[k] || ""}
              onChange={e => set(k, k === "celular" ? fmtTel(e.target.value) : e.target.value)}
              placeholder={ph}
              maxLength={k === "celular" ? 12 : undefined}
              onFocus={e => e.target.style.borderColor = "#4caf50"}
              onBlur={e  => e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0"}
            />
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </>
      }
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--prov" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">
              {isView ? (form.responsable || "Proveedor") : "Editar Proveedor"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ maxHeight: "66vh", overflowY: "auto" }}>

          {/* Datos */}
          <p className="section-label">Datos del proveedor</p>
          <div className="form-grid-2">
            <Field k="responsable" label="Responsable" ph="Nombre del contacto" full />
            <Field k="direccion"   label="Dirección"   ph="Ej. Cra 10 # 5-30"  full />
            <Field k="celular"     label="Celular"     ph="300 000 0000" />
            <Field k="correo"      label="Correo"      type="email" ph="proveedor@correo.com" />
          </div>

          {/* Últimos insumos comprados */}
          <p className="section-label" style={{ marginTop: 18 }}>Últimos Insumos Comprados</p>
          <div className="insumos-list">
            {ultimosInsumos.length === 0 ? (
              <div className="insumo-item insumo-item--empty">
                <span className="insumo-empty-txt">Sin compras registradas</span>
              </div>
            ) : (
              ultimosInsumos.map((det, i) => (
                <div key={i} className="insumo-item">
                  <div className="insumo-left">
                    <span className="insumo-icon">📦</span>
                    <div>
                      <div className="insumo-name">{det.nombreInsumo || `Insumo #${det.ID_Insumo}`}</div>
                      {det.Notas && <div className="insumo-notes">{det.Notas}</div>}
                    </div>
                  </div>
                  <div className="insumo-right">
                    <span className="insumo-price">{fmtCOP(det.Precio_Und)} × {det.Cantidad}</span>
                    <span className="compra-badge">📅 {det.Fecha_Compra}</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Cancelar"}</button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner">◌</span>}
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}