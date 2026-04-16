import { useState } from "react";
import { useApp, calcularTotal, sumarDias } from "../../../AppContext.jsx";
import "./compras.css";

const METODOS_PAGO = [
  { value: "efectivo",      label: "Efectivo",      icon: "💵" },
  { value: "transferencia", label: "Transferencia", icon: "🏦" },
  { value: "crédito",       label: "Crédito",       icon: "💳" },
];

const COP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const emptyDetalle = () => ({
  _key:             Date.now() + Math.random(),
  idInsumo:         "",
  cantidad:         "",
  precioUnd:        "",
  notas:            "",
  vencimientoTipo:  "dias", 
  vencimientoValor: "30",   
  fechaVencimiento: "",     
  isExpanded:       true,
});

const STEPS = [
  { idx: 1, label: "Información general" },
  { idx: 2, label: "Insumos comprados"   },
];

function StepsBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "16px 24px 0", flexShrink: 0 }}>
      {STEPS.map((s, i) => {
        const done   = current > s.idx;
        const active = current === s.idx;
        return (
          <div key={s.idx} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${active || done ? "#2e7d32" : "#d0d0d0"}`, background: done ? "#2e7d32" : "#fff", color: active ? "#2e7d32" : done ? "#fff" : "#bdbdbd", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
              {done ? "✓" : s.idx}
            </div>
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#2e7d32" : done ? "#9e9e9e" : "#bdbdbd", whiteSpace: "nowrap", transition: "color 0.2s" }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: done ? "#2e7d32" : "#e0e0e0", margin: "0 12px", transition: "background 0.2s" }} />}
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
  
  const toggleExpand = (key) =>
    setDetalles(ds => ds.map(d => d._key === key ? { ...d, isExpanded: !d.isExpanded } : d));

  const addDetalle = () => {
    setDetalles(ds => [
      ...ds.map(d => ({ ...d, isExpanded: false })), 
      emptyDetalle()
    ]);
  };

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
      if (d.vencimientoTipo === "fecha" && !d.fechaVencimiento) e[`venc_${i}`] = "Ingresa la fecha";
      else if (d.vencimientoTipo === "dias" && (!d.vencimientoValor || Number(d.vencimientoValor) <= 0)) e[`venc_${i}`] = "Ingresa los días";
    });
    return e;
  };

  const handleNextStep = () => {
    const e = {};
    if (!form.idProveedor) e.idProveedor = "Selecciona un proveedor";
    if (!form.fecha)       e.fecha       = "Ingresa la fecha";
    if (!form.metodoPago)  e.metodoPago  = "Selecciona el método de pago";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep(2);
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
      fechaVencimiento: d.vencimientoTipo === "dias" ? sumarDias(d.vencimientoValor) : d.fechaVencimiento,
    }));
    onSave({ ...form, detalles: detallesLimpios });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <p className="modal-header__eyebrow">Compras</p>
            <h2 className="modal-header__title">Nueva Compra</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <StepsBar current={step} />
        <div style={{ height: 1, background: "#f0f0f0", margin: "14px 0 0", flexShrink: 0 }} />

        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {step === 1 && (
            <>
              <div className="field-wrap">
                <label className="field-label">Proveedor <span className="required">*</span></label>
                <div className="select-wrap">
                  <select className={`field-select ${errors.idProveedor ? "error" : ""}`} value={form.idProveedor} onChange={e => set("idProveedor", e.target.value)}>
                    <option value="">— Seleccionar proveedor —</option>
                    {proveedores.filter(p => p.estado).map(p => <option key={p.id} value={p.id}>{p.responsable} · {p.ciudad}</option>)}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
                {errors.idProveedor && <span className="field-error">{errors.idProveedor}</span>}
              </div>

              <div className="field-grid-2">
                <div className="field-wrap">
                  <label className="field-label">Fecha de compra <span className="required">*</span></label>
                  <input type="date" className={`field-input ${errors.fecha ? "error" : ""}`} value={form.fecha} onChange={e => set("fecha", e.target.value)} />
                  {errors.fecha && <span className="field-error">{errors.fecha}</span>}
                </div>
                <div className="field-wrap">
                  <label className="field-label">Estado</label>
                  <div className="estado-toggle-wrap">
                    {["pendiente", "completada"].map(est => (
                      <button key={est} type="button" className={`estado-toggle-btn ${form.estado === est ? `estado-toggle-btn--${est}` : ""}`} onClick={() => set("estado", est)}>
                        {est === "pendiente" ? "⏳" : "✅"} {est.charAt(0).toUpperCase() + est.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field-wrap">
                <label className="field-label">Método de pago <span className="required">*</span></label>
                <div className="select-wrap">
                  <select className={`field-select ${errors.metodoPago ? "error" : ""}`} value={form.metodoPago} onChange={e => set("metodoPago", e.target.value)}>
                    <option value="">— Seleccionar método —</option>
                    {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
                {errors.metodoPago && <span className="field-error">{errors.metodoPago}</span>}
              </div>

              <div className="field-wrap">
                <label className="field-label">Notas</label>
                <textarea className="field-input field-textarea" placeholder="Observaciones generales…" rows={2} value={form.notas} onChange={e => set("notas", e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#616161" }}>Insumos comprados</p>
                {errors.detalles && <span className="field-error">{errors.detalles}</span>}
              </div>

              {detalles.map((d, i) => {
                const insumoSel  = insumosActivos.find(ins => ins.id === Number(d.idInsumo));
                const cat        = insumoSel ? getCatInsumo(insumoSel.idCategoria) : null;
                const unidad     = insumoSel ? getUnidad(insumoSel.idUnidad)       : null;

                if (!d.isExpanded) {
                  return (
                    <div key={d._key} className="detalle-row detalle-row--collapsed" onClick={() => toggleExpand(d._key)}>
                      <div className="detalle-summary">
                        <div className="detalle-summary__info">
                          <span className="detalle-num">{String(i + 1).padStart(2, "0")}</span>
                          <span className="insumo-icon">{cat?.icon || "📦"}</span>
                          <div>
                            <span className="detalle-summary__name">{insumoSel?.nombre || "Nuevo insumo"}</span>
                            <div className="detalle-summary__meta">
                              {d.cantidad ? `${d.cantidad} ${unidad?.simbolo || ""}` : "Sin cantidad"} · 
                              {d.precioUnd ? COP(d.precioUnd) : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="detalle-summary__price">
                          {d.cantidad && d.precioUnd ? COP(Number(d.cantidad) * Number(d.precioUnd)) : "$0"}
                        </div>
                        <button className="detalle-remove-btn" type="button" onClick={(e) => { e.stopPropagation(); removeDetalle(d._key); }}>✕</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={d._key} className="detalle-row">
                    <span className="detalle-num" onClick={() => toggleExpand(d._key)} style={{ cursor: "pointer" }}>{String(i + 1).padStart(2, "0")}</span>
                    <div className="detalle-fields">
                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <div className="select-wrap">
                          <select className={`field-select ${errors[`ins_${i}`] ? "error" : ""}`} value={d.idInsumo}
                            onChange={e => {
                              const selectedId = e.target.value;
                              const ins = insumosActivos.find(x => x.id === Number(selectedId));
                              setDetalles(ds => ds.map(det => det._key === d._key ? { 
                                ...det, 
                                idInsumo: selectedId,
                                vencimientoTipo: ins?.vencimientoTipo || "dias",
                                vencimientoValor: ins?.vencimientoValor || (ins?.vencimientoTipo === "fecha" ? "" : "30"),
                                isExpanded: false // Se contrae al seleccionar
                              } : det));
                            }}
                          >
                            <option value="">— Seleccionar insumo —</option>
                            {insumosActivos.map(ins => (
                              <option key={ins.id} value={ins.id} disabled={idsSeleccionados.includes(String(ins.id)) && String(ins.id) !== String(d.idInsumo)}>
                                {getCatInsumo(ins.idCategoria).icon} {ins.nombre} · Stock: {ins.stockActual}
                              </option>
                            ))}
                          </select>
                          <span className="select-arrow">▾</span>
                        </div>
                        {insumoSel && (
                          <div className="insumo-sel-chips">
                            <span className="chip chip--cat">{cat?.icon} {cat?.nombre}</span>
                            <span className="chip chip--uni">📏 {unidad?.simbolo}</span>
                          </div>
                        )}
                      </div>

                      <div className="field-wrap">
                        <label className="field-label">Cantidad</label>
                        <input type="number" className={`field-input ${errors[`cant_${i}`] ? "error" : ""}`} value={d.cantidad} onChange={e => setDetalle(d._key, "cantidad", e.target.value)} />
                      </div>
                      <div className="field-wrap">
                        <label className="field-label">Precio Unit.</label>
                        <input type="number" className={`field-input ${errors[`precio_${i}`] ? "error" : ""}`} value={d.precioUnd} onChange={e => setDetalle(d._key, "precioUnd", e.target.value)} />
                      </div>

                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <label className="field-label">Vencimiento</label>
                          <div className="venc-toggle">
                            {["dias", "fecha"].map(t => (
                              <button key={t} type="button" className={`venc-toggle-btn ${d.vencimientoTipo === t ? "active" : ""}`} onClick={() => setDetalle(d._key, "vencimientoTipo", t)}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                        {d.vencimientoTipo === "dias" ? (
                          <input type="number" className="field-input" value={d.vencimientoValor} onChange={e => setDetalle(d._key, "vencimientoValor", e.target.value)} />
                        ) : (
                          <input type="date" className="field-input" value={d.fechaVencimiento} onChange={e => setDetalle(d._key, "fechaVencimiento", e.target.value)} />
                        )}
                      </div>
                    </div>
                    <button className="detalle-remove-btn" type="button" onClick={() => removeDetalle(d._key)}>✕</button>
                  </div>
                );
              })}

              <button className="btn-add-detalle" type="button" onClick={addDetalle}>+ Agregar insumo</button>
              <div className="total-bar">
                <span className="total-bar__label">Total</span>
                <span className="total-bar__value">{COP(totalActual || 0)}</span>
              </div>
            </>
          )}
        </div>

        <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", padding: "14px 24px 20px", borderTop: "1px solid #f5f5f5" }}>
          {step === 2 ? <button className="btn-ghost" onClick={() => setStep(1)}>← Volver</button> : <button className="btn-ghost" onClick={onClose}>Cancelar</button>}
          <button className="btn-save" onClick={step === 1 ? handleNextStep : handleSave} disabled={saving}>
            {saving ? "Guardando…" : step === 1 ? "Siguiente →" : "Guardar compra"}
          </button>
        </div>
      </div>
    </div>
  );
}