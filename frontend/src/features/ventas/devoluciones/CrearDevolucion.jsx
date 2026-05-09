import { useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./Devoluciones.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const MOTIVOS = [
  "Producto en mal estado",
  "Producto incorrecto",
  "Producto vencido",
  "No cumple con lo solicitado",
  "Error en el pedido",
  "Otro",
];

function SelectArrow() {
  return (
    <div className="select-arrow">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ─── BARRA DE PASOS ─────────────────────────────────────── */
const STEPS = ["Pedido", "Detalles devolución"];

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

export default function CrearDevolucion({ onClose, onSave }) {
  const { pedidos, clientes, getCliente } = useApp();

  /* Solo pedidos entregados */
  const pedidosEntregados = pedidos.filter(p => p.estado === "Entregado");

  const [idPedido,   setIdPedido]   = useState("");
  const [motivo,     setMotivo]     = useState("");
  const [comentario, setComentario] = useState("");
  const [evidencia,  setEvidencia]  = useState(null);  /* { nombre, base64, tipo } */
  const [items,      setItems]      = useState([]);
  const [errors,     setErrors]     = useState({});
  const [saved,      setSaved]      = useState(false);
  const [step,       setStep]       = useState(1);

  const pedidoSel = pedidosEntregados.find(p => String(p.id) === String(idPedido));

  /* Al seleccionar pedido → cargar productos con cantidad 0 */
  const handleSelectPedido = (val) => {
    setIdPedido(val);
    setErrors(e => ({ ...e, idPedido: "" }));
    const ped = pedidosEntregados.find(p => String(p.id) === String(val));
    if (ped) {
      setItems((ped.productosItems || []).map(p => ({
        idProducto: p.idProducto,
        nombre:     p.nombre,
        precio:     p.precio,
        cantMax:    p.cantidad,
        cantidad:   0,
      })));
    } else {
      setItems([]);
    }
  };

  const setCantidad = (idx, val) => {
    const n = Math.max(0, Math.min(items[idx].cantMax, Number(val) || 0));
    setItems(prev => { const arr = [...prev]; arr[idx] = { ...arr[idx], cantidad: n }; return arr; });
    setErrors(e => ({ ...e, items: "" }));
  };

  /* Cálculos */
  const itemsSeleccionados = items.filter(i => i.cantidad > 0);
  const totalDevolucion    = itemsSeleccionados.reduce((a, i) => a + i.precio * i.cantidad, 0);

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!idPedido) e.idPedido = "Selecciona un pedido";
    }
    if (s === 2) {
      if (!motivo) e.motivo = "Selecciona un motivo";
      if (itemsSeleccionados.length === 0) e.items = "Agrega productos";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSave = () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaved(true);

    const cliente = pedidoSel?.cliente;

    const payload = {
      idPedido:       pedidoSel.id,
      numeroPedido:   pedidoSel.numero,
      idCliente:      pedidoSel.idCliente,
      cliente,
      motivo,
      comentario,
      productos:      itemsSeleccionados.map(i => ({
        idProducto:     i.idProducto,
        nombre:         i.nombre,
        cantidad:       i.cantidad,
        precioUnitario: i.precio,
        subtotal:       i.precio * i.cantidad,
      })),
      totalDevuelto:  totalDevolucion,
      evidencia:      evidencia || null,
    };

    setTimeout(() => onSave(payload), 900);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Devoluciones</p>
            <h2 className="modal-header__title" style={{ color: "#c62828" }}>Registrar devolución</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        <div className="modal-body" style={{ overflowY: "auto", minHeight: 280 }}>

          {/* ── Paso 1: Pedido ── */}
          {step === 1 && (
            <>
              <p className="section-label" style={{textTransform: "none", marginTop: 0}} >Seleccionar Pedido</p>
              <div className="field-wrap">
                <label className="field-label">Pedido entregado <span className="required">*</span></label>
                <div className="select-wrap">
                  <select
                    className={`field-select${errors.idPedido ? " error" : ""}`}
                    value={idPedido}
                    onChange={e => handleSelectPedido(e.target.value)}
                  >
                    <option value="">Seleccione un pedido…</option>
                    {pedidosEntregados.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.numero} — {p.cliente?.nombre}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
                {errors.idPedido && <span className="field-error">{errors.idPedido}</span>}
              </div>

              {pedidoSel && (
                <div className="info-box info-box--info" style={{ marginTop: 16 }}>
                  <span className="info-box__icon">📦</span>
                  <div className="info-box__text">
                    <span className="info-box__label">{pedidoSel.numero} · {pedidoSel.cliente?.nombre}</span>
                    Total pagado: {fmt(pedidoSel.total)} · {pedidoSel.metodo_pago}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Paso 2: Detalles ── */}
          {step === 2 && (
            <>
              <p className="section-label" style={{textTransform: "none", marginTop: 0}}>Productos a devolver</p>
              <div className="productos-devolucion" style={{ maxHeight: 180, overflowY: "auto", border: "1.5px solid #eee", borderRadius: 10, padding: 8 }}>
                {items.map((item, idx) => (
                  <div key={idx} className="prod-dev-item" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: idx < items.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9e9e9e" }}>{fmt(item.precio)} c/u</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button className="qty-btn" onClick={() => setCantidad(idx, item.cantidad - 1)}>−</button>
                      <input className="qty-input" type="number" value={item.cantidad} onChange={e => setCantidad(idx, e.target.value)} style={{ width: 36, textAlign: "center" }} />
                      <button className="qty-btn" onClick={() => setCantidad(idx, item.cantidad + 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.items && <p className="field-error">{errors.items}</p>}

              <div className="form-grid-2" style={{ marginTop: 12 }}>
                <div className="field-wrap">
                  <label className="field-label">Motivo <span className="required">*</span></label>
                  <div className="select-wrap">
                    <select className={`field-select${errors.motivo ? " error" : ""}`} value={motivo} onChange={e => setMotivo(e.target.value)}>
                      <option value="">Seleccione…</option>
                      {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <SelectArrow />
                  </div>
                </div>
                <div className="field-wrap">
                  <label className="field-label">Total a devolver</label>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#c62828", paddingTop: 8 }}>{fmt(totalDevolucion)}</div>
                </div>
              </div>

              <div className="field-wrap" style={{ marginTop: 12 }}>
                <label className="field-label">Evidencia (opcional)</label>
                <input type="file" style={{ fontSize: 12 }} onChange={e => {
                  const file = e.target.files[0]; if (!file) return;
                  const r = new FileReader(); r.onload = ev => setEvidencia({ nombre: file.name, base64: ev.target.result }); r.readAsDataURL(file);
                }} />
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={handleBack}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" style={{ background: "#c62828" }} onClick={handleSave} disabled={saved || totalDevolucion === 0}>
                  {saved ? "Guardando…" : "Registrar"}
                </button>
            }
          </div>
        </div>

        {saved && (
          <div className="modal-success-toast">
            <span>✓</span><span>Devolución exitosa</span>
          </div>
        )}
      </div>
    </div>
  );
}