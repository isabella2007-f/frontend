/*************  ✨ Windsurf Command 🌟  *************/
import { useState } from "react";
import { useApp, calcularTotal } from "../../../AppContext.jsx";
import "./compras.css";

const METODOS_PAGO = [
  { value: "efectivo",      label: "Efectivo",      icon: "💵" },
  { value: "transferencia", label: "Transferencia", icon: "🏦" },
];

const COP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const emptyDetalle = () => ({
  _key:             Date.now() + Math.random(),
  idInsumo:         "",
  cantidad:         "",
  precioUnd:        "",
  notas:            "",
  fechaVencimiento: "",
});

// ─── Barra de pasos ───────────────────────────────────────
const STEPS = ["Información general", "Insumos"];

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

export default function CrearCompra({ onClose, onSave }) {
  const { proveedores, insumosActivos, getCatInsumo, getUnidad, convertirUnidad } = useApp();

  const [form, setForm] = useState({
    idProveedor: "",
    fecha:       new Date().toISOString().split("T")[0],
    estado:      "pendiente",
    metodoPago:  "",
    notas:       "",
  });

  const [detalles, setDetalles] = useState([emptyDetalle()]);
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [step,     setStep]     = useState(1);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setDetalle = (key, field, value) =>
    setDetalles(ds => ds.map(d => d._key === key ? { ...d, [field]: value } : d));
  const addDetalle    = () => setDetalles(ds => [...ds, emptyDetalle()]);
  const removeDetalle = (key) => setDetalles(ds => ds.filter(d => d._key !== key));

  const idsSeleccionados = detalles.map(d => String(d.idInsumo)).filter(Boolean);

  const totalActual = calcularTotal(
    detalles.map(d => ({ cantidad: Number(d.cantidad) || 0, precioUnd: Number(d.precioUnd) || 0 }))
  );

  const validate = () => {
    const e = {};
    if (!form.idProveedor) e.idProveedor = "Selecciona un proveedor";
    if (!form.fecha)       e.fecha       = "Ingresa la fecha";
    if (!form.metodoPago)  e.metodoPago  = "Selecciona el método de pago";

    if (detalles.length === 0) e.detalles = "Agrega al menos un insumo";
    detalles.forEach((d, i) => {
      if (!d.idInsumo)                              e[`ins_${i}`]    = "Selecciona un insumo";
      if (!d.cantidad || Number(d.cantidad) <= 0)   e[`cant_${i}`]   = "Cantidad inválida";
      if (!d.precioUnd || Number(d.precioUnd) <= 0) e[`precio_${i}`] = "Precio inválido";
      if (!d.fechaVencimiento)                      e[`venc_${i}`]   = "Ingresa la fecha de vencimiento";
    });
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const detallesLimpios = detalles.map(d => ({
      idInsumo:         Number(d.idInsumo),
      cantidad:         Number(d.cantidad),
      precioUnd:        Number(d.precioUnd),
      notas:            d.notas.trim(),
      fechaVencimiento: d.fechaVencimiento,
    }));
    onSave({ ...form, detalles: detallesLimpios });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--compra" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Compras</p>
            <h2 className="modal-header__title">Nueva Compra</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body — sin overflow */}
        <div className="modal-body" style={{ overflow: "visible" }}>

          {/* Tabs */}
          <div className="modal-tabs">
            <button className={`modal-tab-btn ${step === 1 ? "active" : ""}`} onClick={() => setStep(1)}>
              Información general
            </button>
            <button className={`modal-tab-btn ${step === 2 ? "active" : ""}`} onClick={() => setStep(2)}>
              Insumos comprados
            </button>
          </div>

          {/* ── Información general ── */}
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 , textTransform: "none"}}>Información general</p>

              <div className="field-wrap">
                <label className="field-label">Proveedor <span className="required">*</span></label>
                <div className="select-wrap">
                  <select
                    className={`field-select ${errors.idProveedor ? "error" : ""}`}
                    value={form.idProveedor}
                    onChange={e => set("idProveedor", e.target.value)}
                  >
                    <option value="">— Seleccionar proveedor —</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.responsable} · {p.ciudad}</option>
                    ))}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
                {errors.idProveedor && <span className="field-error">{errors.idProveedor}</span>}
              </div>

              <div className="field-grid-2">
                <div className="field-wrap">
                  <label className="field-label">Fecha de compra <span className="required">*</span></label>
                  <input
                    type="date"
                    className={`field-input ${errors.fecha ? "error" : ""}`}
                    value={form.fecha}
                    onChange={e => set("fecha", e.target.value)}
                  />
                  {errors.fecha && <span className="field-error">{errors.fecha}</span>}
                </div>

                <div className="field-wrap">
                  <label className="field-label">Estado</label>
                  <div className="estado-toggle-wrap">
                    {["pendiente", "completada"].map(est => (
                      <button
                        key={est}
                        type="button"
                        className={`estado-toggle-btn ${form.estado === est ? `estado-toggle-btn--${est}` : ""}`}
                        onClick={() => set("estado", est)}
                      >
                        {est === "pendiente" ? "⏳" : "✅"} {est.charAt(0).toUpperCase() + est.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field-wrap">
                <label className="field-label">Método de pago <span className="required">*</span></label>
                <div className="select-wrap">
                  <select
                    className={`field-select ${errors.metodoPago ? "error" : ""}`}
                    value={form.metodoPago}
                    onChange={e => set("metodoPago", e.target.value)}
                  >
                    <option value="">— Seleccionar método —</option>
                    {METODOS_PAGO.map(m => (
                      <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
                {errors.metodoPago && <span className="field-error">{errors.metodoPago}</span>}
              </div>

              <div className="field-wrap">
                <label className="field-label">Notas</label>
                <textarea
                  className="field-input field-textarea"
                  placeholder="Observaciones generales de la compra…"
                  rows={2}
                  value={form.notas}
                  onChange={e => set("notas", e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Insumos comprados ── */}
          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>
                Insumos comprados
                {errors.detalles && <span className="field-error" style={{ marginLeft: 8 }}>{errors.detalles}</span>}
              </p>

              {detalles.map((d, i) => {
                const insumoSel = insumosActivos.find(ins => ins.id === Number(d.idInsumo));
                const cat       = insumoSel ? getCatInsumo(insumoSel.idCategoria) : null;
                const unidad    = insumoSel ? getUnidad(insumoSel.idUnidad)       : null;
                const conversion = unidad && d.cantidad ? convertirUnidad(Number(d.cantidad), unidad.simbolo) : null;

                return (
                  <div key={d._key} className="detalle-row">
                    <span className="detalle-num">{String(i + 1).padStart(2, "0")}</span>

                    <div className="detalle-fields">
                      {/* Selector insumo */}
                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <div className="select-wrap">
                          <select
                            className={`field-select ${errors[`ins_${i}`] ? "error" : ""}`}
                            value={d.idInsumo}
                            onChange={e => setDetalle(d._key, "idInsumo", e.target.value)}
                          >
                            <option value="">— Seleccionar insumo —</option>
                            {insumosActivos.map(ins => (
                              <option
                                key={ins.id}
                                value={ins.id}
                                disabled={idsSeleccionados.includes(String(ins.id)) && String(ins.id) !== String(d.idInsumo)}
                              >
                                {getCatInsumo(ins.idCategoria).icon} {ins.nombre} · Stock: {ins.stockActual} {getUnidad(ins.idUnidad).simbolo}
                              </option>
                            ))}
                          </select>
                          <span className="select-arrow">▾</span>
                        </div>
                        {errors[`ins_${i}`] && <span className="field-error">{errors[`ins_${i}`]}</span>}
                        {insumoSel && (
                          <div className="insumo-sel-chips">
                            <span className="chip chip--cat">{cat?.icon} {cat?.nombre}</span>
                            <span className="chip chip--uni">📏 {unidad?.nombre} ({unidad?.simbolo})</span>
                            <span className="chip chip--stock">📦 Stock actual: {insumoSel.stockActual}</span>
                          </div>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="field-wrap">
                        <label className="field-label">Cantidad{unidad ? ` (${unidad.simbolo})` : ""} <span className="required">*</span></label>
                        <input
                          type="number" min="1"
                          className={`field-input ${errors[`cant_${i}`] ? "error" : ""}`}
                          placeholder="0" value={d.cantidad}
                          onChange={e => setDetalle(d._key, "cantidad", e.target.value)}
                        />
                        {errors[`cant_${i}`] && <span className="field-error">{errors[`cant_${i}`]}</span>}
                        {conversion && (
                          <span className="field-help" style={{ marginTop: 4 }}>
                            Equivalente: {conversion.to}
                          </span>
                        )}
                      </div>

                      {/* Precio unitario */}
                      <div className="field-wrap">
                        <label className="field-label">Precio unitario (COP) <span className="required">*</span></label>
                        <input
                          type="number" min="0"
                          className={`field-input ${errors[`precio_${i}`] ? "error" : ""}`}
                          placeholder="0" value={d.precioUnd}
                          onChange={e => setDetalle(d._key, "precioUnd", e.target.value)}
                        />
                        {errors[`precio_${i}`] && <span className="field-error">{errors[`precio_${i}`]}</span>}
                      </div>

                      {/* Fecha vencimiento */}
                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <label className="field-label">Fecha de vencimiento del lote <span className="required">*</span></label>
                        <input
                          type="date"
                          className={`field-input ${errors[`venc_${i}`] ? "error" : ""}`}
                          value={d.fechaVencimiento}
                          onChange={e => setDetalle(d._key, "fechaVencimiento", e.target.value)}
                        />
                        {errors[`venc_${i}`] && <span className="field-error">{errors[`venc_${i}`]}</span>}
                      </div>

                      {/* Notas del ítem */}
                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <label className="field-label">Notas del ítem</label>
                        <input
                          type="text" className="field-input"
                          placeholder="Ej: Bultos x 50kg, refrigerado…"
                          value={d.notas}
                          onChange={e => setDetalle(d._key, "notas", e.target.value)}
                        />
                      </div>

                      {/* Subtotal línea */}
                      {d.cantidad && d.precioUnd && (
                        <div className="detalle-subtotal" style={{ gridColumn: "1 / -1" }}>
                          Subtotal: <strong>{COP(Number(d.cantidad) * Number(d.precioUnd))}</strong>
                        </div>
                      )}
                    </div>

                    {detalles.length > 1 && (
                      <button className="detalle-remove-btn" type="button" onClick={() => removeDetalle(d._key)}>✕</button>
                    )}
                  </div>
                );
              })}

              <button className="btn-add-detalle" type="button" onClick={addDetalle}>
                + Agregar insumo
              </button>

              <div className="total-bar">
                <span className="total-bar__label">Total estimado</span>
                <span className="total-bar__value">{COP(totalActual || 0)}</span>
              </div>

              {form.estado === "completada" && (
                <div className="stock-aviso stock-aviso--warn">
                  ⚠️ Al guardar como <strong>Completada</strong>, se crearán los lotes de cada insumo y el stock se actualizará automáticamente.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar compra"}
          </button>
        </div>
      </div>
    </div>
  );
}
