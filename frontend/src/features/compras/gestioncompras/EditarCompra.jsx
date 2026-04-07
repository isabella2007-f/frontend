import { useState } from "react";
import { useApp, calcularTotal, diasHasta, estadoLote, convertirUnidad, getVencimientoMasAntiguo, sumarDias } from "../../../AppContext.jsx";
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

export function LotesInsumoPanel({ idInsumo }) {
  const { getLotesDeInsumo, getProveedor, compras, getUnidad, getInsumo } = useApp();
  const ins = getInsumo(idInsumo);
  const unidad = ins ? getUnidad(ins.idUnidad) : null;
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
    "activo":     { label: "Activo", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "✅" },
    "por-vencer": { label: "Próximo a vencer", color: "#e65100", bg: "#fff3e0", border: "#ffcc80", icon: "⚠️" },
    "vencido":    { label: "Vencido", color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "🚨" },
    "agotado":    { label: "Agotado", color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "📭" },
  };

  return (
    <div className="lotes-panel">
      <div className="lotes-resumen">
        <div className="lotes-resumen__item">
          <span className="lotes-resumen__num">{lotesOrd.length}</span>
          <span className="lotes-resumen__label">Lotes totales</span>
        </div>
        <div className="lotes-resumen__item">
          <span className="lotes-resumen__num">{lotesOrd.filter(l => ["activo", "por-vencer"].includes(estadoLote(l))).length}</span>
          <span className="lotes-resumen__label">Con stock</span>
        </div>
      </div>
      <div className="lotes-lista">
        {lotesOrd.map((lote, idx) => {
          const estado = estadoLote(lote);
          const cfg = ESTADO_CONFIG[estado];
          return (
            <div key={lote.id} className="lote-item" style={{ borderColor: cfg.border }}>
              <div className="lote-item__head">
                <span className="lote-item__id">{lote.id}</span>
                <span className="lote-estado-chip" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>{cfg.icon} {cfg.label}</span>
              </div>
              <div className="lote-item__body">
                <div className="lote-dato"><span className="lote-dato__label">Cantidad</span><span className="lote-dato__val">{lote.cantidadActual} {unidad?.simbolo}</span></div>
                <div className="lote-dato"><span className="lote-dato__label">Vencimiento</span><span className="lote-dato__val">📅 {lote.fechaVencimiento}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
            <div className="stock-aviso stock-aviso--block" style={{ marginTop: 12 }}>🔒 {check.razon}</div>
          ) : (
            <div className="stock-aviso stock-aviso--warn" style={{ marginTop: 12, textAlign: "left" }}>
              ⚠️ Esta acción generará una <strong>salida automática de stock</strong> para reversar el ingreso de los insumos.
            </div>
          )}
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={!check.ok || deleting}>{deleting ? "Anulando…" : "Confirmar Anulación"}</button>
        </div>
      </div>
    </div>
  );
}

export default function EditarCompra({ compra, mode, onClose, onSave }) {
  const { proveedores, insumosActivos, getProveedor, getInsumo, getCatInsumo, getUnidad, convertirUnidad } = useApp();
  const isView = mode === "view";
  const isCompleted = compra.stockAplicado;

  const [form, setForm] = useState({
    idProveedor: compra.idProveedor,
    fecha:       compra.fecha,
    estado:      compra.estado,
    metodoPago:  compra.metodoPago,
    notas:       compra.notas || "",
  });

  const [detalles, setDetalles] = useState(compra.detalles.map(d => ({ ...d, _key: d.id || Date.now() + Math.random(), isExpanded: false })));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const proveedor = getProveedor(compra.idProveedor);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setDetalle = (key, field, value) => setDetalles(ds => ds.map(d => d._key === key ? { ...d, [field]: value } : d));
  const toggleExpand = (key) => setDetalles(ds => ds.map(d => d._key === key ? { ...d, isExpanded: !d.isExpanded } : d));
  const addDetalle = () => setDetalles(ds => [...ds.map(d => ({...d, isExpanded: false})), emptyDetalle()]);
  const removeDetalle = (key) => setDetalles(ds => ds.filter(d => d._key !== key));

  const totalActual = calcularTotal(detalles.map(d => ({ cantidad: Number(d.cantidad) || 0, precioUnd: Number(d.precioUnd) || 0 })));

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const detallesLimpios = detalles.map(d => ({
      id: d.id, idInsumo: Number(d.idInsumo), cantidad: Number(d.cantidad), precioUnd: Number(d.precioUnd), notas: d.notas?.trim() || "",
      fechaVencimiento: d.vencimientoTipo === "dias" ? sumarDias(d.vencimientoValor) : d.fechaVencimiento || d.fechaVencimiento,
    }));
    onSave({ ...compra, ...form, detalles: detallesLimpios });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--compra" onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden", maxWidth: isView ? 800 : 600 }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <p className="modal-header__eyebrow">Compras · {compra.id}</p>
            <h2 className="modal-header__title">{isView ? "Detalle de Compra" : "Editar Compra"}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`estado-chip estado-chip--${compra.estado}`}>{compra.estado.toUpperCase()}</span>
            <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isView ? (
            <>
              <div className="ver-compra-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="ver-field"><span className="ver-field__label">Proveedor</span><span className="ver-field__value">🏭 {proveedor?.responsable}</span></div>
                <div className="ver-field"><span className="ver-field__label">Fecha</span><span className="ver-field__value">📅 {compra.fecha}</span></div>
                <div className="ver-field"><span className="ver-field__label">Método</span><span className="ver-field__value">{METODOS_PAGO.find(m => m.value === compra.metodoPago)?.icon} {compra.metodoPago}</span></div>
              </div>

              <p className="section-label">Insumos Comprados</p>
              <div className="insumos-cards-grid">
                {compra.detalles.map(d => {
                  const ins = getInsumo(d.idInsumo);
                  const cat = ins ? getCatInsumo(ins.idCategoria) : null;
                  const uni = ins ? getUnidad(ins.idUnidad) : null;
                  const dias = diasHasta(d.fechaVencimiento);
                  return (
                    <div key={d.id || d._key} className="insumo-card">
                      <div className="insumo-card__head">
                        <span className="insumo-card__icon">{cat?.icon || "📦"}</span>
                        <span className="insumo-card__name">{ins?.nombre}</span>
                      </div>
                      <div className="insumo-card__body">
                        <div className="insumo-card__data"><span className="insumo-card__label">Cantidad</span><span className="insumo-card__val">{d.cantidad} {uni?.simbolo}</span></div>
                        <div className="insumo-card__data"><span className="insumo-card__label">Subtotal</span><span className="insumo-card__val insumo-card__val--price">{COP(d.cantidad * d.precioUnd)}</span></div>
                      </div>
                      <div className="insumo-card__footer">
                        <div className="insumo-card__venc">
                          📅 Vence: {d.fechaVencimiento}
                          {dias <= 7 && <span className={dias < 0 ? "venc-danger" : "venc-warn"}>{dias < 0 ? " (Vencido)" : ` (${dias}d)`}</span>}
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
            </>
          ) : (
            /* Modo editar simplificado */
            <div className="field-wrap">
              <label className="field-label">Notas</label>
              <textarea className="field-input field-textarea" value={form.notas} onChange={e => set("notas", e.target.value)} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {!isView && <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar Cambios"}</button>}
        </div>
      </div>
    </div>
  );
}