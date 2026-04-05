import { useState } from "react";
import { useApp, calcularTotal, diasHasta, estadoLote, convertirUnidad, getVencimientoMasAntiguo } from "../../../AppContext.jsx";
import "./compras.css";

const METODOS_PAGO = [
  { value: "efectivo",      label: "Efectivo",      icon: "💵" },
  { value: "transferencia", label: "Transferencia", icon: "🏦" },
];

const COP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const emptyDetalle = () => ({
  _key: Date.now() + Math.random(),
  idInsumo: "", cantidad: "", precioUnd: "", notas: "", fechaVencimiento: "",
});

/* ── Barra de pasos ──────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════
   PANEL DE LOTES — reutilizable en el modal Ver de Insumos
════════════════════════════════════════════════════════════ */
export function LotesInsumoPanel({ idInsumo }) {
  const { getLotesDeInsumo, getProveedor, compras, getUnidad, getInsumo } = useApp();

  const ins      = getInsumo(idInsumo);
  const unidad   = ins ? getUnidad(ins.idUnidad) : null;
  const lotesOrd = getLotesDeInsumo(idInsumo);

  if (!lotesOrd.length) {
    return (
      <div className="lotes-empty">
        <span>📦</span>
        <p>No hay lotes registrados para este insumo todavía.</p>
        <p className="lotes-empty__sub">Los lotes se crean automáticamente al completar una compra.</p>
      </div>
    );
  }

  const ESTADO_CONFIG = {
    "activo":     { label: "Activo",           color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "✅" },
    "por-vencer": { label: "Próximo a vencer",  color: "#e65100", bg: "#fff3e0", border: "#ffcc80", icon: "⚠️" },
    "vencido":    { label: "Vencido",           color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "🚨" },
    "agotado":    { label: "Agotado",           color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "📭" },
  };

  return (
    <div className="lotes-panel">
      <div className="lotes-resumen">
        <div className="lotes-resumen__item">
          <span className="lotes-resumen__num">{lotesOrd.length}</span>
          <span className="lotes-resumen__label">Lotes totales</span>
        </div>
        <div className="lotes-resumen__item">
          <span className="lotes-resumen__num">
            {lotesOrd.filter(l => estadoLote(l) === "activo" || estadoLote(l) === "por-vencer").length}
          </span>
          <span className="lotes-resumen__label">Con stock</span>
        </div>
        <div className="lotes-resumen__item lotes-resumen__item--warn">
          <span className="lotes-resumen__num">
            {lotesOrd.filter(l => estadoLote(l) === "por-vencer").length}
          </span>
          <span className="lotes-resumen__label">Por vencer (≤7 días)</span>
        </div>
        <div className="lotes-resumen__item lotes-resumen__item--danger">
          <span className="lotes-resumen__num">
            {lotesOrd.filter(l => estadoLote(l) === "vencido").length}
          </span>
          <span className="lotes-resumen__label">Vencidos</span>
        </div>
      </div>

      <div className="lotes-lista">
        {lotesOrd.map((lote, idx) => {
          const estado = estadoLote(lote);
          const cfg    = ESTADO_CONFIG[estado];
          const dias   = diasHasta(lote.fechaVencimiento);
          const prov   = getProveedor(compras.find(c => c.id === lote.idCompra)?.idProveedor);

          return (
            <div
              key={lote.id}
              className="lote-item"
              style={{ borderColor: cfg.border, background: idx === 0 && estado !== "vencido" && estado !== "agotado" ? cfg.bg : "#fff" }}
            >
              <div className="lote-item__head">
                <div className="lote-item__id-wrap">
                  {idx === 0 && estado !== "vencido" && estado !== "agotado" && (
                    <span className="lote-fifo-badge">FIFO</span>
                  )}
                  <span className="lote-item__id">{lote.id}</span>
                </div>
                <span className="lote-estado-chip" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>

              <div className="lote-item__body">
                <div className="lote-dato">
                  <span className="lote-dato__label">Cantidad restante</span>
                  <span className="lote-dato__val lote-dato__val--big">
                    {lote.cantidadActual} <span className="lote-dato__uni">{unidad?.simbolo}</span>
                    <span className="lote-dato__orig"> / {lote.cantidadInicial} inicial</span>
                  </span>
                </div>
                <div className="lote-dato">
                  <span className="lote-dato__label">Vence el</span>
                  <span className="lote-dato__val" style={{ color: cfg.color }}>
                    📅 {lote.fechaVencimiento}
                    {dias >= 0
                      ? <span className="lote-dias"> ({dias === 0 ? "hoy" : `en ${dias} día${dias !== 1 ? "s" : ""}`})</span>
                      : <span className="lote-dias lote-dias--vencido"> (hace {Math.abs(dias)} día{Math.abs(dias) !== 1 ? "s" : ""})</span>
                    }
                  </span>
                </div>
                <div className="lote-dato">
                  <span className="lote-dato__label">Ingresó el</span>
                  <span className="lote-dato__val">📦 {lote.fechaIngreso}</span>
                </div>
                {prov && (
                  <div className="lote-dato">
                    <span className="lote-dato__label">Proveedor</span>
                    <span className="lote-dato__val">🏭 {prov.responsable}</span>
                  </div>
                )}
                <div className="lote-dato">
                  <span className="lote-dato__label">Compra</span>
                  <span className="lote-dato__val lote-compra-ref">{lote.idCompra}</span>
                </div>
              </div>

              {lote.cantidadInicial > 0 && (
                <div className="lote-barra-wrap">
                  <div className="lote-barra-track">
                    <div
                      className="lote-barra-fill"
                      style={{ width: `${(lote.cantidadActual / lote.cantidadInicial) * 100}%`, background: cfg.color }}
                    />
                  </div>
                  <span className="lote-barra-pct">
                    {Math.round((lote.cantidadActual / lote.cantidadInicial) * 100)}% restante
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MODAL ELIMINAR COMPRA
════════════════════════════════════════════════════════════ */
export function AnularCompraModal({ compra, onClose, onConfirm }) {
  const { canAnularCompra, canDeleteCompra } = useApp();
  const check = (canAnularCompra || canDeleteCompra)(compra.id);
  const [deleting, setDeleting] = useState(false);

  const run = async () => {
    setDeleting(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm(compra.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🚫</div>
          <h3 className="delete-title">Anular compra</h3>
          <p className="delete-body">Compra <strong>{compra.id}</strong></p>
          {!check.ok ? (
            <div className="stock-aviso stock-aviso--block" style={{ marginTop: 12 }}>
              🔒 {check.razon}
            </div>
          ) : (
            <p className="delete-warn">Esta acción no se puede deshacer.</p>
          )}
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={!check.ok || deleting}>
            {deleting ? "Anulando…" : "Anular"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MODAL VER / EDITAR COMPRA
════════════════════════════════════════════════════════════ */
export default function EditarCompra({ compra, mode, onClose, onSave }) {
  const { proveedores, insumosActivos, getProveedor, getInsumo, getCatInsumo, getUnidad, convertirUnidad, getVencimientoMasAntiguo } = useApp();

  const isView      = mode === "view";
  const isCompleted = compra.stockAplicado;

  const [form, setForm] = useState({
    idProveedor: compra.idProveedor,
    fecha:       compra.fecha,
    estado:      compra.estado,
    metodoPago:  compra.metodoPago,
    notas:       compra.notas || "",
  });

  const [detalles, setDetalles] = useState(
    compra.detalles.map(d => ({ ...d, _key: d.id || Date.now() + Math.random() }))
  );
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [step,    setStep]    = useState(1);

  const proveedor = getProveedor(compra.idProveedor);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDetalle = (key, field, value) =>
    setDetalles(ds => ds.map(d => d._key === key ? { ...d, [field]: value } : d));
  const addDetalle    = () => setDetalles(ds => [...ds, emptyDetalle()]);
  const removeDetalle = (key) => setDetalles(ds => ds.filter(d => d._key !== key));

  const idsSeleccionados = detalles.map(d => String(d.idInsumo)).filter(Boolean);

  const totalActual = calcularTotal(
    detalles.map(d => ({ cantidad: Number(d.cantidad) || 0, precioUnd: Number(d.precioUnd) || 0 }))
  );

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.idProveedor) e.idProveedor = "Selecciona un proveedor";
      if (!form.fecha)       e.fecha       = "Ingresa la fecha";
      if (!form.metodoPago)  e.metodoPago  = "Selecciona el método de pago";
    }
    if (s === 2 && !isCompleted) {
      if (detalles.length === 0) e.detalles = "Agrega al menos un insumo";
      detalles.forEach((d, i) => {
        if (!d.idInsumo)                              e[`ins_${i}`]    = "Selecciona un insumo";
        if (!d.cantidad || Number(d.cantidad) <= 0)   e[`cant_${i}`]   = "Cantidad inválida";
        if (!d.precioUnd || Number(d.precioUnd) <= 0) e[`precio_${i}`] = "Precio inválido";
        if (!d.fechaVencimiento)                      e[`venc_${i}`]   = "Fecha de vencimiento requerida";
      });
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
    await new Promise(r => setTimeout(r, 400));
    const detallesLimpios = detalles.map(d => ({
      id:               d.id || undefined,
      idInsumo:         Number(d.idInsumo),
      cantidad:         Number(d.cantidad),
      precioUnd:        Number(d.precioUnd),
      notas:            d.notas?.trim() || "",
      fechaVencimiento: d.fechaVencimiento,
    }));
    onSave({ ...compra, ...form, detalles: detallesLimpios });
  };

  /* ── Render ── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-card--compra"
        onClick={e => e.stopPropagation()}
        style={isView ? { display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 40px)" } : {}}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Compras · {compra.id}</p>
            <h2 className="modal-header__title">
              {isView ? "Detalle de Compra" : "Editar Compra"}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`estado-chip estado-chip--${compra.estado}`}>
              {compra.estado === "pendiente" ? "⏳ Pendiente" : "✅ Completada"}
            </span>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Steps — solo en modo editar */}
        {!isView && (
          <div style={{ padding: "16px 24px 0" }}>
            <StepsBar current={step} />
          </div>
        )}

        {/* Body */}
        <div
          className="modal-body"
          style={isView
            ? { flex: 1, overflowY: "auto" }
            : { overflow: "visible" }
          }
        >

          {/* ════ MODO VER ════ */}
          {isView && (
            <>
              <div className="ver-compra-grid">
                <div className="ver-field">
                  <span className="ver-field__label">Proveedor</span>
                  <span className="ver-field__value">🏭 {proveedor?.responsable || "—"}</span>
                  {proveedor && <span className="ver-field__sub">{proveedor.ciudad}</span>}
                </div>
                <div className="ver-field">
                  <span className="ver-field__label">Fecha</span>
                  <span className="ver-field__value">📅 {compra.fecha}</span>
                </div>
                <div className="ver-field">
                  <span className="ver-field__label">Método de pago</span>
                  <span className="ver-field__value">
                    {METODOS_PAGO.find(m => m.value === compra.metodoPago)?.icon}{" "}
                    {METODOS_PAGO.find(m => m.value === compra.metodoPago)?.label || compra.metodoPago}
                  </span>
                </div>
                <div className="ver-field">
                  <span className="ver-field__label">Total</span>
                  <span className="ver-field__value ver-field__value--total">{COP(calcularTotal(compra.detalles))}</span>
                </div>
                <div className="ver-field">
                  <span className="ver-field__label">Vence primero</span>
                  <span className="ver-field__value">{getVencimientoMasAntiguo(compra.detalles) || "—"}</span>
                </div>
                {compra.notas && (
                  <div className="ver-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="ver-field__label">Notas</span>
                    <span className="ver-field__value">{compra.notas}</span>
                  </div>
                )}
              </div>

              <p className="section-label">Insumos comprados</p>
              <div className="insumos-list">
                {compra.detalles.map(d => {
                  const ins        = getInsumo(d.idInsumo);
                  const cat        = ins ? getCatInsumo(ins.idCategoria) : null;
                  const uni        = ins ? getUnidad(ins.idUnidad)       : null;
                  const dias       = diasHasta(d.fechaVencimiento);
                  const conversion = uni && d.cantidad ? convertirUnidad(Number(d.cantidad), uni.simbolo) : null;
                  return (
                    <div key={d.id || d._key} className="insumo-item">
                      <div className="insumo-left">
                        <span className="insumo-icon">{cat?.icon || "📦"}</span>
                        <div>
                          <div className="insumo-name">{ins?.nombre || `Insumo #${d.idInsumo}`}</div>
                          {d.notas && <div className="insumo-notes">{d.notas}</div>}
                          <div className="insumo-venc">
                            🗓 Vence: {d.fechaVencimiento}
                            {dias <= 7 && dias >= 0 && <span className="venc-warn"> ⚠️ {dias === 0 ? "hoy" : `en ${dias}d`}</span>}
                            {dias < 0  && <span className="venc-danger"> 🚨 vencido</span>}
                          </div>
                        </div>
                      </div>
                      <div className="insumo-right">
                        <span className="insumo-price">{COP(d.cantidad * d.precioUnd)}</span>
                        <span className="insumo-qty">{d.cantidad} {uni?.simbolo} × {COP(d.precioUnd)}</span>
                        {conversion && <span className="insumo-conv">Equiv. {conversion.to}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="total-bar">
                <span className="total-bar__label">Total</span>
                <span className="total-bar__value">{COP(calcularTotal(compra.detalles))}</span>
              </div>
            </>
          )}

          {/* ════ MODO EDITAR — Paso 1: Info general ════ */}
          {!isView && step === 1 && (
            <>
              {isCompleted && (
                <div className="stock-aviso stock-aviso--info" style={{ marginBottom: 12 }}>
                  🔒 Esta compra ya fue <strong>completada</strong>. Solo puedes editar las notas y el método de pago.
                </div>
              )}

              <p className="section-label" style={{ marginTop: 0, textTransform: "none" }}>Información general</p>

              <div className="field-wrap">
                <label className="field-label">Proveedor <span className="required">*</span></label>
                {isCompleted ? (
                  <div className="field-input field-input--disabled">🏭 {proveedor?.responsable} · {proveedor?.ciudad}</div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              <div className="field-grid-2">
                <div className="field-wrap">
                  <label className="field-label">Fecha <span className="required">*</span></label>
                  {isCompleted
                    ? <div className="field-input field-input--disabled">📅 {form.fecha}</div>
                    : <input type="date" className={`field-input ${errors.fecha ? "error" : ""}`}
                        value={form.fecha} onChange={e => set("fecha", e.target.value)} />
                  }
                </div>
                <div className="field-wrap">
                  <label className="field-label" style={{ textTransform: "none" }}>Estado</label>
                  {isCompleted
                    ? <div className="field-input field-input--disabled">✅ Completada</div>
                    : (
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
                    )
                  }
                </div>
              </div>

              <div className="field-wrap">
                <label className="field-label">Método de pago <span className="required">*</span></label>
                <div className="metodo-grid">
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      className={`metodo-btn ${form.metodoPago === m.value ? "metodo-btn--active" : ""}`}
                      onClick={() => set("metodoPago", m.value)}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
                {errors.metodoPago && <span className="field-error">{errors.metodoPago}</span>}
              </div>

              <div className="field-wrap">
                <label className="field-label">Notas</label>
                <textarea
                  className="field-input field-textarea"
                  placeholder="Observaciones generales…"
                  rows={2}
                  value={form.notas}
                  onChange={e => set("notas", e.target.value)}
                />
              </div>
            </>
          )}

          {/* ════ MODO EDITAR — Paso 2: Insumos ════ */}
          {!isView && step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0, textTransform: "none" }}>
                Insumos comprados
                {errors.detalles && <span className="field-error" style={{ marginLeft: 8 }}>{errors.detalles}</span>}
              </p>

              {/* Completada: solo lectura */}
              {isCompleted ? (
                <div className="insumos-list">
                  {detalles.map(d => {
                    const ins        = getInsumo(Number(d.idInsumo));
                    const cat        = ins ? getCatInsumo(ins.idCategoria) : null;
                    const uni        = ins ? getUnidad(ins.idUnidad)       : null;
                    const dias       = diasHasta(d.fechaVencimiento);
                    const conversion = uni && d.cantidad ? convertirUnidad(Number(d.cantidad), uni.simbolo) : null;
                    return (
                      <div key={d._key} className="insumo-item">
                        <div className="insumo-left">
                          <span className="insumo-icon">{cat?.icon || "📦"}</span>
                          <div>
                            <div className="insumo-name">{ins?.nombre || `Insumo #${d.idInsumo}`}</div>
                            {d.notas && <div className="insumo-notes">{d.notas}</div>}
                            <div className="insumo-venc">
                              🗓 Vence: {d.fechaVencimiento}
                              {dias <= 7 && dias >= 0 && <span className="venc-warn"> ⚠️ {dias === 0 ? "hoy" : `en ${dias}d`}</span>}
                              {dias < 0  && <span className="venc-danger"> 🚨 vencido</span>}
                            </div>
                          </div>
                        </div>
                        <div className="insumo-right">
                          <span className="insumo-price">{COP(Number(d.cantidad) * Number(d.precioUnd))}</span>
                          <span className="insumo-qty">{d.cantidad} {uni?.simbolo} × {COP(d.precioUnd)}</span>
                          {conversion && <span className="insumo-conv">Equiv. {conversion.to}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {detalles.map((d, i) => {
                    const insumoSel = insumosActivos.find(ins => ins.id === Number(d.idInsumo));
                    const cat       = insumoSel ? getCatInsumo(insumoSel.idCategoria) : null;
                    const unidad    = insumoSel ? getUnidad(insumoSel.idUnidad)       : null;
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
                                <span className="chip chip--stock">📦 Stock: {insumoSel.stockActual}</span>
                              </div>
                            )}
                          </div>

                          <div className="field-wrap">
                            <label className="field-label">Cantidad{unidad ? ` (${unidad.simbolo})` : ""} <span className="required">*</span></label>
                            <input type="number" min="1"
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
                            <input type="number" min="0"
                              className={`field-input ${errors[`precio_${i}`] ? "error" : ""}`}
                              placeholder="0" value={d.precioUnd}
                              onChange={e => setDetalle(d._key, "precioUnd", e.target.value)}
                            />
                            {errors[`precio_${i}`] && <span className="field-error">{errors[`precio_${i}`]}</span>}
                          </div>

                          <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                            <label className="field-label">Fecha de vencimiento del lote <span className="required">*</span></label>
                            <input type="date"
                              className={`field-input ${errors[`venc_${i}`] ? "error" : ""}`}
                              value={d.fechaVencimiento}
                              onChange={e => setDetalle(d._key, "fechaVencimiento", e.target.value)}
                            />
                            {errors[`venc_${i}`] && <span className="field-error">{errors[`venc_${i}`]}</span>}
                          </div>

                          <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                            <label className="field-label">Notas del ítem</label>
                            <input type="text" className="field-input"
                              placeholder="Ej: Bultos x 50kg…"
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
                </>
              )}

              <div className="total-bar">
                <span className="total-bar__label">Total</span>
                <span className="total-bar__value">{COP(totalActual)}</span>
              </div>

              {!isCompleted && form.estado === "completada" && (
                <div className="stock-aviso stock-aviso--warn">
                  ⚠️ Al guardar como <strong>Completada</strong>, se crearán los lotes y el stock se actualizará automáticamente.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={!isView ? { justifyContent: "space-between" } : {}}>
          {isView ? (
            <button className="btn-cancel" onClick={onClose}>Cerrar</button>
          ) : (
            <>
              {step > 1
                ? <button className="btn-cancel" onClick={handleBack}>← Atrás</button>
                : <button className="btn-cancel" onClick={onClose}>Cancelar</button>
              }
              {step < 2
                ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
                : <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}