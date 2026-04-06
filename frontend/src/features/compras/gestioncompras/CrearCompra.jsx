import { useState } from "react";
import { useApp, calcularTotal, sumarDias } from "../../../AppContext.jsx";
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
  vencimientoTipo:  "dias", // "fecha" o "dias"
  vencimientoValor: "30",   // Valor por defecto razonable
  fechaVencimiento: "",     // Se calculará al guardar
});

const STEPS = [
  { idx: 1, label: "Información general" },
  { idx: 2, label: "Insumos comprados"   },
];

/* ── Barra de pasos — igual que "Nuevo Insumo" ── */
function StepsBar({ current }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "16px 24px 0",
      flexShrink: 0,
    }}>
      {STEPS.map((s, i) => {
        const done   = current > s.idx;
        const active = current === s.idx;
        return (
          <div
            key={s.idx}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < STEPS.length - 1 ? 1 : "none",
            }}
          >
            {/* Círculo numerado */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${active || done ? "#2e7d32" : "#d0d0d0"}`,
              background: done ? "#2e7d32" : "#fff",
              color: active ? "#2e7d32" : done ? "#fff" : "#bdbdbd",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}>
              {done ? "✓" : s.idx}
            </div>

            {/* Etiqueta */}
            <span style={{
              marginLeft: 8,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "#2e7d32" : done ? "#9e9e9e" : "#bdbdbd",
              whiteSpace: "nowrap",
              transition: "color 0.2s",
            }}>
              {s.label}
            </span>

            {/* Línea entre pasos */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 1.5,
                background: done ? "#2e7d32" : "#e0e0e0",
                margin: "0 12px",
                transition: "background 0.2s",
              }} />
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
      
      if (d.vencimientoTipo === "fecha" && !d.fechaVencimiento) {
        e[`venc_${i}`] = "Ingresa la fecha de vencimiento";
      } else if (d.vencimientoTipo === "dias" && (!d.vencimientoValor || Number(d.vencimientoValor) <= 0)) {
        e[`venc_${i}`] = "Ingresa los días";
      }
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
      fechaVencimiento: d.vencimientoTipo === "dias" 
        ? sumarDias(d.vencimientoValor) 
        : d.fechaVencimiento,
    }));
    onSave({ ...form, detalles: detallesLimpios });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--compra"
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}
      >
        {/* ── Header ── */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <p className="modal-header__eyebrow">Compras</p>
            <h2 className="modal-header__title">Nueva Compra</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── Barra de pasos ── */}
        <StepsBar current={step} />

        {/* Divisor */}
        <div style={{ height: 1, background: "#f0f0f0", margin: "14px 0 0", flexShrink: 0 }} />

        {/* ── Body scrolleable ── */}
        <div
          className="modal-body"
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px" }}
        >

          {/* ══ PASO 1 ══ */}
          {step === 1 && (
            <>
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

          {/* ══ PASO 2 ══ */}
          {step === 2 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#616161" }}>
                  Insumos comprados
                </p>
                {errors.detalles && <span className="field-error">{errors.detalles}</span>}
              </div>

              {detalles.map((d, i) => {
                const insumoSel  = insumosActivos.find(ins => ins.id === Number(d.idInsumo));
                const cat        = insumoSel ? getCatInsumo(insumoSel.idCategoria) : null;
                const unidad     = insumoSel ? getUnidad(insumoSel.idUnidad)       : null;
                const conversion = unidad && d.cantidad ? convertirUnidad(Number(d.cantidad), unidad.simbolo) : null;

                return (
                  <div key={d._key} className="detalle-row">
                    <span className="detalle-num">{String(i + 1).padStart(2, "0")}</span>

                    <div className="detalle-fields">
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

                      <div className="field-wrap">
                        <label className="field-label">
                          Cantidad{unidad ? ` (${unidad.simbolo})` : ""} <span className="required">*</span>
                        </label>
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

                      {/* ── Campo de vencimiento dinámico ── */}
                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <label className="field-label" style={{ margin: 0 }}>Vencimiento <span className="required">*</span></label>
                          <div className="venc-toggle">
                            <button 
                              type="button"
                              className={`venc-toggle-btn ${d.vencimientoTipo === "dias" ? "active" : ""}`}
                              onClick={() => setDetalle(d._key, "vencimientoTipo", "dias")}
                            >Días</button>
                            <button 
                              type="button"
                              className={`venc-toggle-btn ${d.vencimientoTipo === "fecha" ? "active" : ""}`}
                              onClick={() => setDetalle(d._key, "vencimientoTipo", "fecha")}
                            >Fecha</button>
                          </div>
                        </div>

                        {d.vencimientoTipo === "dias" ? (
                          <div style={{ position: "relative" }}>
                            <input
                              type="number" min="1"
                              className={`field-input ${errors[`venc_${i}`] ? "error" : ""}`}
                              placeholder="Ej: 30"
                              value={d.vencimientoValor}
                              onChange={e => setDetalle(d._key, "vencimientoValor", e.target.value)}
                            />
                            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9e9e9e", pointerEvents: "none" }}>días útiles</span>
                          </div>
                        ) : (
                          <input
                            type="date"
                            className={`field-input ${errors[`venc_${i}`] ? "error" : ""}`}
                            value={d.fechaVencimiento}
                            onChange={e => setDetalle(d._key, "fechaVencimiento", e.target.value)}
                          />
                        )}
                        {errors[`venc_${i}`] && <span className="field-error">{errors[`venc_${i}`]}</span>}
                        {d.vencimientoTipo === "dias" && d.vencimientoValor > 0 && (
                          <span className="field-help" style={{ marginTop: 4, color: "#2e7d32" }}>
                            Vencerá el: <strong>{new Date(sumarDias(d.vencimientoValor) + "T00:00:00").toLocaleDateString("es-CO")}</strong>
                          </span>
                        )}
                      </div>

                      <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                        <label className="field-label">Notas del ítem</label>
                        <input
                          type="text" className="field-input"
                          placeholder="Ej: Bultos x 50kg, refrigerado…"
                          value={d.notas}
                          onChange={e => setDetalle(d._key, "notas", e.target.value)}
                        />
                      </div>

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
                <div className="stock-aviso stock-aviso--warn" style={{ marginTop: 10 }}>
                  ⚠️ Al guardar como <strong>Completada</strong>, se crearán los lotes de cada insumo y el stock se actualizará automáticamente.
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px 20px",
          borderTop: "1px solid #f5f5f5",
        }}>
          {step === 2
            ? <button type="button" className="btn-ghost" onClick={() => setStep(1)}>← Volver</button>
            : <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          {step === 1
            ? <button type="button" className="btn-save" onClick={handleNextStep}>Siguiente →</button>
            : (
              <button type="button" className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner">◌</span> Guardando…</> : "Guardar compra"}
              </button>
            )
          }
        </div>
      </div>
    </div>
  );
}