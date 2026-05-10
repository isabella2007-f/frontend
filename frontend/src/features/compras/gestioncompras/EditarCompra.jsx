import { useState } from "react";
import {
  useApp,
  calcularTotal,
  diasHasta,
  estadoLote,
  sumarDias,
} from "../../../AppContext.jsx";
import { DEPARTAMENTOS, getCiudades } from "../../../utils/departamentosYCiudades.js";
import "./compras.css";

const METODOS_PAGO = [
  { value: "efectivo",      label: "Efectivo",      icon: "💵" },
  { value: "transferencia", label: "Transferencia", icon: "🏦" },
];

const COP = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

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
    <div style={{ display: "flex", alignItems: "center", padding: "14px 28px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
      {STEPS.map((s, i) => {
        const done   = current > s.idx;
        const active = current === s.idx;
        return (
          <div key={s.idx} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${active || done ? "#2e7d32" : "#d0d0d0"}`, background: done ? "#2e7d32" : "#fff", color: active ? "#2e7d32" : done ? "#fff" : "#bdbdbd", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
              {done ? "✓" : s.idx}
            </div>
            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#2e7d32" : done ? "#9e9e9e" : "#bdbdbd", whiteSpace: "nowrap", transition: "color 0.2s" }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: done ? "#2e7d32" : "#e0e0e0", margin: "0 14px", transition: "background 0.2s" }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Panel de lotes ─────────────────────────────────────── */
export function LotesInsumoPanel({ idInsumo }) {
  const { getLotesDeInsumo, getUnidad, getInsumo } = useApp();
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
    "por-vencer": { label: "Próximo a vencer", color: "#e65100", bg: "#fff3e0", border: "#ffcc80", icon: "⚠️" },
    "vencido":    { label: "Vencido",          color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "🚨" },
    "agotado":    { label: "Agotado",          color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "📭" },
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
            {lotesOrd.filter(l => ["activo", "por-vencer"].includes(estadoLote(l))).length}
          </span>
          <span className="lotes-resumen__label">Con stock</span>
        </div>
      </div>
      <div className="lotes-lista">
        {lotesOrd.map(lote => {
          const estado = estadoLote(lote);
          const cfg    = ESTADO_CONFIG[estado];
          return (
            <div key={lote.id} className="lote-item" style={{ borderColor: cfg.border }}>
              <div className="lote-item__head">
                <span className="lote-item__id">{lote.id}</span>
                <span className="lote-estado-chip" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <div className="lote-item__body">
                <div className="lote-dato">
                  <span className="lote-dato__label">Cantidad</span>
                  <span className="lote-dato__val">{lote.cantidadActual} {unidad?.simbolo}</span>
                </div>
                <div className="lote-dato">
                  <span className="lote-dato__label">Vencimiento</span>
                  <span className="lote-dato__val">📅 {lote.fechaVencimiento}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Modal anular ───────────────────────────────────────── */
export function AnularCompraModal({ compra, onClose, onConfirm }) {
  const { canAnularCompra, canDeleteCompra } = useApp();
  const check    = (canAnularCompra || canDeleteCompra)(compra.id);
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
            <div className="stock-aviso stock-aviso--warn" style={{ marginTop: 12, textAlign: "left" }}>
              ⚠️ Esta acción generará una <strong>salida automática de stock</strong> para reversar el ingreso de los insumos.
            </div>
          )}
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={!check.ok || deleting}>
            {deleting ? "Anulando…" : "Confirmar Anulación"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── EditarCompra / VerCompra ───────────────────────────── */
export default function EditarCompra({ compra, mode, onClose, onSave }) {
  const {
    proveedores, insumosActivos,
    getProveedor, getInsumo, getCatInsumo, getUnidad,
  } = useApp();

  const isView   = mode === "view";
  const isLocked = compra.stockAplicado === true;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    idProveedor:  compra.idProveedor  || "",
    fecha:        compra.fecha        || "",
    estado:       compra.estado       || "pendiente",
    metodoPago:   compra.metodoPago   || "",
    departamento: String(compra.departamento || ""),
    ciudad:       String(compra.ciudad       || ""),
    notas:        String(compra.notas        || ""),
  });

  const [comprobante, setComprobante] = useState(null);

  const [detalles, setDetalles] = useState(
    compra.detalles.map(d => ({
      ...d,
      _key:             d.id || Date.now() + Math.random(),
      vencimientoTipo:  "fecha",
      vencimientoValor: "30",
      isExpanded:       false,
    }))
  );

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const proveedor = getProveedor(compra.idProveedor);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setDetalle   = (key, field, value) =>
    setDetalles(ds => ds.map(d => d._key === key ? { ...d, [field]: value } : d));
  const toggleExpand = (key) =>
    setDetalles(ds => ds.map(d => d._key === key ? { ...d, isExpanded: !d.isExpanded } : d));
  const addDetalle   = () =>
    setDetalles(ds => [...ds.map(d => ({ ...d, isExpanded: false })), emptyDetalle()]);
  const removeDetalle = (key) =>
    setDetalles(ds => ds.filter(d => d._key !== key));

  const idsSeleccionados = detalles.map(d => String(d.idInsumo)).filter(Boolean);

  const totalActual = calcularTotal(
    detalles.map(d => ({ cantidad: Number(d.cantidad) || 0, precioUnd: Number(d.precioUnd) || 0 }))
  );

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
    if (saving) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const detallesLimpios = detalles.map(d => ({
      id:               d.id,
      idInsumo:         Number(d.idInsumo),
      cantidad:         Number(d.cantidad),
      precioUnd:        Number(d.precioUnd),
      notas:            d.notas?.trim() || "",
      fechaVencimiento: d.vencimientoTipo === "dias"
        ? sumarDias(d.vencimientoValor)
        : d.fechaVencimiento || d.fechaVencimiento,
    }));
    onSave({
      ...compra,
      ...form,
      departamento: form.departamento,
      ciudad:       form.ciudad,
      comprobante:  comprobante || compra.comprobante || null,
      detalles:     detallesLimpios,
    });
  };

  /* ── SHARED WIDTH ── */
  const modalStyle = {
    /* ── FIX 1: modal más ancho ── */
    maxWidth: 860,
    width: "95vw",
    display: "flex",
    flexDirection: "column",
    maxHeight: "92vh",
    overflow: "hidden",
  };

  /* ── Vista detalle ── */
  if (isView) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={modalStyle}>
          <div className="modal-header" style={{ flexShrink: 0, padding: "18px 28px" }}>
            <div>
              <p className="modal-header__eyebrow">Compras · {compra.id}</p>
              <h2 className="modal-header__title">Detalle de Compra</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`estado-chip estado-chip--${compra.estado}`}>
                {compra.estado.toUpperCase()}
              </span>
              <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
            <div className="ver-compra-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="ver-field">
                <span className="ver-field__label">Proveedor</span>
                <span className="ver-field__value">🏭 {proveedor?.responsable}</span>
              </div>
              <div className="ver-field">
                <span className="ver-field__label">Fecha</span>
                <span className="ver-field__value">📅 {compra.fecha}</span>
              </div>
              <div className="ver-field">
                <span className="ver-field__label">Método</span>
                <span className="ver-field__value">
                  {METODOS_PAGO.find(m => m.value === compra.metodoPago)?.icon}{" "}
                  {compra.metodoPago}
                </span>
              </div>
              {compra.departamento && (
                <div className="ver-field">
                  <span className="ver-field__label">Departamento</span>
                  <span className="ver-field__value">📍 {compra.departamento}</span>
                </div>
              )}
              {compra.ciudad && (
                <div className="ver-field">
                  <span className="ver-field__label">Ciudad</span>
                  <span className="ver-field__value">{compra.ciudad}</span>
                </div>
              )}
              {compra.notas && (
                <div className="ver-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ver-field__label">Notas</span>
                  <span className="ver-field__value">{compra.notas}</span>
                </div>
              )}
            </div>

            {compra.comprobante && (
              <div className="ver-field" style={{ marginTop: 8 }}>
                <span className="ver-field__label">Comprobante</span>
                <span className="ver-field__value">
                  📎 {compra.comprobante.name || "Comprobante adjunto"}
                </span>
              </div>
            )}

            <p className="section-label" style={{ marginTop: 16 }}>Insumos Comprados</p>
            <div className="insumos-cards-grid">
              {compra.detalles.map(d => {
                const ins  = getInsumo(d.idInsumo);
                const cat  = ins ? getCatInsumo(ins.idCategoria) : null;
                const uni  = ins ? getUnidad(ins.idUnidad)       : null;
                const dias = diasHasta(d.fechaVencimiento);
                return (
                  <div key={d.id || d._key} className="insumo-card">
                    <div className="insumo-card__head">
                      <span className="insumo-card__icon">{cat?.icon || "📦"}</span>
                      <span className="insumo-card__name">{ins?.nombre}</span>
                    </div>
                    <div className="insumo-card__body">
                      <div className="insumo-card__data">
                        <span className="insumo-card__label">Cantidad</span>
                        <span className="insumo-card__val">{d.cantidad} {uni?.simbolo}</span>
                      </div>
                      <div className="insumo-card__data">
                        <span className="insumo-card__label">Subtotal</span>
                        <span className="insumo-card__val insumo-card__val--price">
                          {COP(d.cantidad * d.precioUnd)}
                        </span>
                      </div>
                    </div>
                    <div className="insumo-card__footer">
                      <div className="insumo-card__venc">
                        📅 Vence: {d.fechaVencimiento}
                        {dias <= 7 && (
                          <span className={dias < 0 ? "venc-danger" : "venc-warn"}>
                            {dias < 0 ? " (Vencido)" : ` (${dias}d)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="total-bar" style={{ marginTop: 20 }}>
              <span className="total-bar__label">Total de la Compra</span>
              <span className="total-bar__value">{COP(calcularTotal(compra.detalles))}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Modo editar ── */
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={modalStyle}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0, padding: "18px 28px" }}>
          <div>
            <p className="modal-header__eyebrow">Compras · {compra.id}</p>
            <h2 className="modal-header__title">Editar Compra</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`estado-chip estado-chip--${compra.estado}`}>
              {compra.estado.toUpperCase()}
            </span>
            <button type="button" className="modal-close-btn" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Locked: solo notas + método */}
        {isLocked ? (
          <>
            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              <div className="stock-aviso stock-aviso--info" style={{ marginBottom: 16 }}>
                ℹ️ Esta compra ya fue <strong>completada y su stock fue aplicado</strong>. Solo puedes editar las notas y el método de pago.
              </div>
              <div className="field-grid-2">
                <div className="field-wrap">
                  <label className="field-label">Método de pago</label>
                  <div className="select-wrap">
                    <select
                      className="field-select"
                      value={form.metodoPago}
                      onChange={e => { set("metodoPago", e.target.value); setComprobante(null); }}
                    >
                      {METODOS_PAGO.map(m => (
                        <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                      ))}
                    </select>
                    <span className="select-arrow">▾</span>
                  </div>
                </div>
                <div />
              </div>

              {form.metodoPago === "transferencia" && (
                <div className="field-wrap comprobante-wrap">
                  <label className="field-label">Comprobante de transferencia</label>
                  <label className="comprobante-upload-btn">
                    <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => setComprobante(e.target.files?.[0] || null)} />
                    <span className="comprobante-upload-icon">📎</span>
                    {comprobante
                      ? <span className="comprobante-filename">{comprobante.name}</span>
                      : compra.comprobante
                        ? <span className="comprobante-filename">{compra.comprobante.name || "Comprobante existente"}</span>
                        : <span>Adjuntar comprobante (imagen o PDF)</span>
                    }
                  </label>
                  {(comprobante || compra.comprobante) && (
                    <button type="button" className="comprobante-remove-btn" onClick={() => setComprobante(null)}>✕ Quitar archivo</button>
                  )}
                </div>
              )}

              <div className="field-wrap">
                <label className="field-label">Notas</label>
                <textarea className="field-input field-textarea" rows={3} value={form.notas} onChange={e => set("notas", e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>
          </>
        ) : (
          /* Edición completa con steps */
          <>
            <StepsBar current={step} />

            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>

              {/* ── PASO 1 ── */}
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
                        {proveedores.filter(p => p.estado).map(p => (
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
                        onChange={e => { set("metodoPago", e.target.value); setComprobante(null); }}
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

                  {form.metodoPago === "transferencia" && (
                    <div className="field-wrap comprobante-wrap">
                      <label className="field-label">Comprobante de transferencia</label>
                      <label className="comprobante-upload-btn">
                        <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => setComprobante(e.target.files?.[0] || null)} />
                        <span className="comprobante-upload-icon">📎</span>
                        {comprobante
                          ? <span className="comprobante-filename">{comprobante.name}</span>
                          : compra.comprobante
                            ? <span className="comprobante-filename">{compra.comprobante.name || "Comprobante existente"}</span>
                            : <span>Adjuntar comprobante (imagen o PDF)</span>
                        }
                      </label>
                      {(comprobante || compra.comprobante) && (
                        <button type="button" className="comprobante-remove-btn" onClick={() => setComprobante(null)}>✕ Quitar archivo</button>
                      )}
                      <span className="field-hint">Opcional — puedes adjuntarlo ahora o más tarde</span>
                    </div>
                  )}

                  {/* ── FIX 3: departamento/ciudad con valores precargados y pasados explícitamente ── */}
                  <div className="field-grid-2">
                    <div className="field-wrap">
                      <label className="field-label">Departamento</label>
                      <div className="select-wrap">
                        <select
                          className="field-select"
                          value={form.departamento}
                          onChange={e => {
                            set("departamento", e.target.value);
                            set("ciudad", "");
                          }}
                        >
                          <option value="">— Seleccionar —</option>
                          {DEPARTAMENTOS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                        <span className="select-arrow">▾</span>
                      </div>
                    </div>
                    <div className="field-wrap">
                      <label className="field-label">Ciudad</label>
                      <div className="select-wrap">
                        <select
                          className="field-select"
                          value={form.ciudad}
                          onChange={e => set("ciudad", e.target.value)}
                          disabled={!form.departamento}
                        >
                          <option value="">— Seleccionar —</option>
                          {form.departamento && getCiudades(form.departamento).map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                        <span className="select-arrow">▾</span>
                      </div>
                    </div>
                  </div>

                  <div className="field-wrap">
                    <label className="field-label">Notas</label>
                    <textarea
                      className="field-input field-textarea"
                      rows={2}
                      placeholder="Observaciones…"
                      value={form.notas}
                      onChange={e => set("notas", e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* ── PASO 2 ── */}
              {step === 2 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#616161" }}>Insumos comprados</p>
                    {errors.detalles && <span className="field-error">{errors.detalles}</span>}
                  </div>

                  {detalles.map((d, i) => {
                    const insumoSel = insumosActivos.find(ins => ins.id === Number(d.idInsumo));
                    const cat       = insumoSel ? getCatInsumo(insumoSel.idCategoria) : null;
                    const unidad    = insumoSel ? getUnidad(insumoSel.idUnidad)       : null;

                    if (!d.isExpanded) {
                      return (
                        <div
                          key={d._key}
                          className="detalle-row detalle-row--collapsed"
                          onClick={() => toggleExpand(d._key)}
                        >
                          <div className="detalle-summary">
                            <div className="detalle-summary__info">
                              <span className="detalle-num">{String(i + 1).padStart(2, "0")}</span>
                              <span className="insumo-icon">{cat?.icon || "📦"}</span>
                              <div>
                                <span className="detalle-summary__name">{insumoSel?.nombre || "Insumo"}</span>
                                <div className="detalle-summary__meta">
                                  {d.cantidad ? `${d.cantidad} ${unidad?.simbolo || ""}` : "Sin cantidad"} ·{" "}
                                  {d.precioUnd ? COP(d.precioUnd) : "—"}
                                </div>
                              </div>
                            </div>
                            <div className="detalle-summary__price">
                              {d.cantidad && d.precioUnd ? COP(Number(d.cantidad) * Number(d.precioUnd)) : "$0"}
                            </div>
                            <button
                              className="detalle-remove-btn"
                              type="button"
                              onClick={e => { e.stopPropagation(); removeDetalle(d._key); }}
                            >✕</button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={d._key} className="detalle-row">
                        <span
                          className="detalle-num"
                          onClick={() => toggleExpand(d._key)}
                          style={{ cursor: "pointer", marginTop: 4, flexShrink: 0 }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>

                        <div className="detalle-fields" style={{ flex: 1, paddingRight: 32 }}>
                          <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                            <div className="select-wrap">
                              <select
                                className={`field-select ${errors[`ins_${i}`] ? "error" : ""}`}
                                value={d.idInsumo}
                                onChange={e => {
                                  const selectedId = e.target.value;
                                  const ins = insumosActivos.find(x => x.id === Number(selectedId));
                                  // ── FIX 2: NO colapsar al seleccionar ──
                                  setDetalles(ds => ds.map(det =>
                                    det._key === d._key
                                      ? {
                                          ...det,
                                          idInsumo:         selectedId,
                                          vencimientoTipo:  ins?.vencimientoTipo  || "dias",
                                          vencimientoValor: ins?.vencimientoValor || "30",
                                          // isExpanded: sin tocar — mantiene true
                                        }
                                      : det
                                  ));
                                }}
                              >
                                <option value="">— Seleccionar insumo —</option>
                                {insumosActivos.map(ins => (
                                  <option
                                    key={ins.id}
                                    value={ins.id}
                                    disabled={
                                      idsSeleccionados.includes(String(ins.id)) &&
                                      String(ins.id) !== String(d.idInsumo)
                                    }
                                  >
                                    {getCatInsumo(ins.idCategoria).icon} {ins.nombre} · Stock: {ins.stockActual}
                                  </option>
                                ))}
                              </select>
                              <span className="select-arrow">▾</span>
                            </div>
                            {errors[`ins_${i}`] && <span className="field-error">{errors[`ins_${i}`]}</span>}
                            {insumoSel && (
                              <div className="insumo-sel-chips">
                                <span className="chip chip--cat">{cat?.icon} {cat?.nombre}</span>
                                <span className="chip chip--uni">📏 {unidad?.simbolo}</span>
                              </div>
                            )}
                          </div>

                          <div className="field-wrap" style={{ gridColumn: "span 1" }}>
                            <label className="field-label">Cantidad</label>
                            <input
                              type="number"
                              className={`field-input ${errors[`cant_${i}`] ? "error" : ""}`}
                              placeholder="0"
                              value={d.cantidad}
                              onChange={e => setDetalle(d._key, "cantidad", e.target.value)}
                            />
                          </div>
                          <div className="field-wrap" style={{ gridColumn: "span 2" }}>
                            <label className="field-label">Precio unitario</label>
                            <input
                              type="number"
                              className={`field-input ${errors[`precio_${i}`] ? "error" : ""}`}
                              placeholder="$ 0"
                              value={d.precioUnd}
                              onChange={e => setDetalle(d._key, "precioUnd", e.target.value)}
                            />
                          </div>

                          <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <label className="field-label">Vencimiento</label>
                              <div className="venc-toggle">
                                {["dias", "fecha"].map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    className={`venc-toggle-btn ${d.vencimientoTipo === t ? "active" : ""}`}
                                    onClick={() => setDetalle(d._key, "vencimientoTipo", t)}
                                  >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {d.vencimientoTipo === "dias" ? (
                              <input
                                type="number"
                                className="field-input"
                                value={d.vencimientoValor}
                                onChange={e => setDetalle(d._key, "vencimientoValor", e.target.value)}
                              />
                            ) : (
                              <input
                                type="date"
                                className="field-input"
                                value={d.fechaVencimiento}
                                onChange={e => setDetalle(d._key, "fechaVencimiento", e.target.value)}
                              />
                            )}
                          </div>
                        </div>

                        <button
                          className="detalle-remove-btn"
                          type="button"
                          onClick={() => removeDetalle(d._key)}
                        >✕</button>
                      </div>
                    );
                  })}

                  <button className="btn-add-detalle" type="button" onClick={addDetalle}>
                    + Agregar insumo
                  </button>
                </>
              )}
            </div>

            {/* Footer con total */}
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px 20px", borderTop: "1px solid #f5f5f5" }}>
              <div className="total-bar" style={{ margin: 0 }}>
                <span className="total-bar__label">Total</span>
                <span className="total-bar__value">{COP(totalActual || 0)}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {step === 2
                  ? <button className="btn-ghost" onClick={() => setStep(1)}>← Volver</button>
                  : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
                }
                <button
                  className="btn-save"
                  onClick={step === 1 ? handleNextStep : handleSave}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : step === 1 ? "Siguiente →" : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}