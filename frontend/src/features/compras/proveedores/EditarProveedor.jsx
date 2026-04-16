import { useState, useRef, useEffect } from "react";
import "./proveedores.css";

const TIPO_DOCS = [
  { val: "CC",  label: "Cédula de Ciudadanía" },
  { val: "CE",  label: "Cédula de Extranjería" },
  { val: "NIT", label: "NIT" },
  { val: "PP",  label: "Pasaporte" },
];

const fmtTel = raw => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

const fmtCOP = v =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

const NAV_ITEMS = [
  { id: "datos",    label: "Datos",   icon: "🏭" },
  { id: "insumos",  label: "Insumos", icon: "📦" },
];

export default function EditarProveedor({ proveedor, mode = "edit", compras = [], onClose, onSave }) {
  const [form, setForm] = useState({ 
    tipo: "natural", 
    tipoDoc: "CC",
    documento: "", 
    estado: true,
    ...proveedor 
  });
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [step, setStep]           = useState(1);
  const isView = mode === "view";

  useEffect(() => { if (proveedor) setForm({ ...proveedor }); }, [proveedor]);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  /* ── Últimos insumos comprados ── */
  const ultimosInsumos = (() => {
    const misCompras = compras
      .filter(c => String(c.idProveedor) === String(proveedor.id))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const items = [];
    for (const compra of misCompras) {
      for (const det of (compra.detalles || [])) {
        items.push({ ...det, fecha: compra.fecha, id: compra.id });
        if (items.length >= 5) return items;
      }
    }
    return items;
  })();

  const validate = () => {
    const e = {};
    if (!form.responsable?.trim()) e.responsable = "Requerido";
    if (!form.documento?.trim())   e.documento   = "Requerido";
    if (!form.celular?.trim())     e.celular     = "Requerido";
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

  const Field = ({ k, label, type = "text", ph = "" }) => (
    <div className="form-group">
      <label className="form-label">{label}{!isView && <span className="required"> *</span>}</label>
      {isView 
        ? <div className="field-input--disabled">{form[k] || "—"}</div>
        : <input className={"field-input" + (errors[k] ? " error" : "")} type={type} value={form[k] || ""} onChange={e => set(k, k === "celular" ? fmtTel(e.target.value) : e.target.value)} placeholder={ph} />
      }
    </div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">{isView ? "Detalles Proveedor" : "Editar Proveedor"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ minHeight: 280 }}>
          {/* Navegación simple por tabs en lugar de pasos si es edición/vista */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button className={`btn-ghost ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)} style={{ flex: 1, borderColor: step === 1 ? "#2e7d32" : "#e0e0e0", background: step === 1 ? "#e8f5e9" : "#fff", color: step === 1 ? "#2e7d32" : "#757575" }}>Información</button>
            <button className={`btn-ghost ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)} style={{ flex: 1, borderColor: step === 2 ? "#2e7d32" : "#e0e0e0", background: step === 2 ? "#e8f5e9" : "#fff", color: step === 2 ? "#2e7d32" : "#757575" }}>Historial</button>
          </div>

          {step === 1 && (
            <div className="form-grid-2">
              <Field k="responsable" label="Nombre / Razón Social" />
              <Field k="documento" label="Nº Documento" />
              <Field k="celular" label="Teléfono" />
              <Field k="correo" label="Correo" />
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <Field k="direccion" label="Dirección" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="insumos-list" style={{ maxHeight: 240, overflowY: "auto" }}>
              <p className="section-label" style={{ marginTop: 0 }}>Últimos insumos comprados</p>
              {ultimosInsumos.length === 0 ? <p style={{ textAlign: "center", color: "#9e9e9e", fontSize: 13, padding: "20px 0" }}>Sin historial disponible</p> : ultimosInsumos.map((det, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{det.nombreInsumo}</div>
                    <div style={{ fontSize: 11, color: "#9e9e9e" }}>{det.fecha}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>{fmtCOP(det.precioUnd)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
