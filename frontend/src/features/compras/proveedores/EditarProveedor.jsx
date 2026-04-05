import { useState, useRef, useEffect } from "react";
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
  - proveedor : objeto del proveedor
  - mode      : "view" | "edit"
  - compras   : array de Compra
  - onClose   : fn
  - onSave    : fn(proveedorActualizado)
*/

const NAV_ITEMS = [
  { id: "datos",    label: "Datos",   icon: "🏭" },
  { id: "insumos",  label: "Insumos", icon: "📦" },
];

export default function EditarProveedor({ proveedor, mode = "edit", compras = [], onClose, onSave }) {
  const [form, setForm]           = useState({ tipo: "natural", documento: "", ...proveedor });
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [activeSection, setActiveSection] = useState("datos");
  const isView = mode === "view";
  const inputRefs = useRef({});
  const activeField = useRef(null);

  useEffect(() => { if (proveedor) setForm({ ...proveedor }); }, [proveedor]);

  const set = (k, v) => {
    activeField.current = k;
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  useEffect(() => {
    const key = activeField.current;
    if (!key) return;
    const input = inputRefs.current[key];
    if (input && document.activeElement !== input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, [form]);

  /* ── Últimos insumos comprados ── */
  const ultimosInsumos = (() => {
    const misCompras = compras
      .filter(c => String(c.ID_Proveedor) === String(proveedor.id))
      .sort((a, b) => new Date(b.Fecha_Compra) - new Date(a.Fecha_Compra));
    const items = [];
    for (const compra of misCompras) {
      for (const det of (compra.detalles || [])) {
        items.push({ ...det, Fecha_Compra: compra.Fecha_Compra, ID_Compra: compra.ID_Compra });
        if (items.length >= 5) return items;
      }
    }
    return items;
  })();

  const validate = () => {
    const e = {};
    if (!form.tipo) e.tipo = "Selecciona tipo";
    if (!form.responsable?.trim()) e.responsable = "Requerido";
    if (!form.documento?.trim())   e.documento   = "Requerido";
    if (!form.celular?.trim())     e.celular     = "Requerido";
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

  /* Campo helper */
  const Field = ({ k, label, type = "text", ph = "" }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <>
            <input
              ref={el => inputRefs.current[k] = el}
              className={"field-input" + (errors[k] ? " field-input--error" : "")}
              type={type}
              value={form[k] || ""}
              onChange={e => set(k, k === "celular" ? fmtTel(e.target.value) : e.target.value)}
              placeholder={ph}
              maxLength={k === "celular" ? 12 : undefined}
              onFocus={e => {
                activeField.current = k;
                e.target.style.borderColor = "#4caf50";
              }}
              onBlur={e => {
                if (activeField.current === k) activeField.current = null;
                e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0";
              }}
            />
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </>
      }
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-box--prov"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 580, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Proveedores</p>
            <h2 className="modal-header__title">
              {isView ? (form.responsable || "Proveedor") : "Editar Proveedor"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Side panel layout */}
        <div style={{ display: "flex", flex: 1 }}>

          {/* Nav lateral */}
          <nav style={{
            width: 140,
            borderRight: "1px solid #f0f0f0",
            background: "#fafdf9",
            display: "flex",
            flexDirection: "column",
            padding: "12px 0",
            flexShrink: 0,
          }}>
            {/* Avatar proveedor */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
              <div className="prov-avatar" style={{ width: 48, height: 48, fontSize: 22, borderRadius: "50%" }}>🏭</div>
            </div>

            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", border: "none",
                  borderLeft: activeSection === item.id ? "3px solid #2e7d32" : "3px solid transparent",
                  background: activeSection === item.id ? "#e8f5e9" : "transparent",
                  color: activeSection === item.id ? "#2e7d32" : "#757575",
                  fontWeight: activeSection === item.id ? 700 : 500,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s", textAlign: "left", width: "100%",
                }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
                {/* Badge de insumos */}
                {item.id === "insumos" && ultimosInsumos.length > 0 && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 800,
                    background: "#2e7d32", color: "#fff",
                    borderRadius: 99, padding: "1px 6px", lineHeight: 1.6,
                  }}>
                    {ultimosInsumos.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Contenido — sin overflow */}
          <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column" }}>

            {/* ── Sección: Datos ── */}
            {activeSection === "datos" && (
              <>
                <p className="section-label" style={{ marginTop: 0, textTransform: "none" }}>Datos del proveedor</p>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Tipo de proveedor</label>
                  {isView ? (
                    <div className="field-input field-input--disabled">{form.tipo === "juridica" ? "Persona Jurídica" : "Persona Natural"}</div>
                  ) : (
                    <select
                      className={"field-input" + (errors.tipo ? " field-input--error" : "")}
                      value={form.tipo}
                      onChange={e => set("tipo", e.target.value)}
                    >
                      <option value="natural">Persona Natural</option>
                      <option value="juridica">Persona Jurídica</option>
                    </select>
                  )}
                  {errors.tipo && <p className="field-error">{errors.tipo}</p>}
                </div>

                {/* Responsable y dirección: full width */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <Field k="responsable" label={form.tipo === "juridica" ? "Razón social" : "Responsable"} ph={form.tipo === "juridica" ? "Nombre empresa" : "Nombre del contacto"} />
                  <Field k="direccion" label="Dirección" ph="Ej. Cra 10 # 5-30" />
                </div>

                {/* Documento + celular + correo */}
                <div className="form-grid-2" style={{ marginTop: 0 }}>
                  <Field k="documento" label={form.tipo === "juridica" ? "NIT" : "Documento"} ph={form.tipo === "juridica" ? "900..." : "CC (sin puntos)"} />
                  <Field k="celular" label={<>Celular {!isView && <span className="required">*</span>}</>} ph="300 000 0000" />
                </div>
                <div className="form-grid-2" style={{ marginTop: 0 }}>
                  <Field k="correo" label={<>Correo {!isView && <span className="required">*</span>}</>} type="email" ph="proveedor@correo.com" />
                </div>

                {/* Ciudad (solo lectura en ambos modos) */}
                {form.ciudad && (
                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <div className="field-input field-input--disabled">{form.ciudad}</div>
                  </div>
                )}
              </>
            )}

            {/* ── Sección: Insumos ── */}
            {activeSection === "insumos" && (
              <>
                <p className="section-label" style={{ marginTop: 0, textTransform: "none" }}>Últimos insumos comprados</p>
                <div className="insumos-list">
                  {ultimosInsumos.length === 0 ? (
                    <div className="insumo-item insumo-item--empty">
                      <span className="insumo-empty-txt">Sin compras registradas</span>
                    </div>
                  ) : ultimosInsumos.map((det, i) => (
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
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
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