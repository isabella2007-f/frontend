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

  const pedidoSel = pedidosEntregados.find(p => p.id === Number(idPedido) || p.id === idPedido);

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

  const validate = () => {
    const e = {};
    if (!idPedido)                  e.idPedido = "Selecciona un pedido";
    if (!motivo)                    e.motivo   = "Selecciona un motivo";
    if (itemsSeleccionados.length === 0) e.items = "Selecciona al menos un producto a devolver";
    return e;
  };

  const handleSave = () => {
    const e = validate();
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
      <div className="modal-box modal-box--wide" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header modal-header--red">
          <div>
            <p className="modal-header__eyebrow">DEVOLUCIONES</p>
            <h2 className="modal-header__title modal-header__title--red">Registrar devolución</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Pedido */}
          <p className="section-label">Pedido</p>
          <div className="field-wrap" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="form-label">Pedido entregado <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${errors.idPedido ? " error" : ""}`}
                value={idPedido}
                onChange={e => handleSelectPedido(e.target.value)}
              >
                <option value="">Seleccione un pedido…</option>
                {pedidosEntregados.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.numero} — {p.cliente?.nombre} · {fmt(p.total)}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
            {errors.idPedido && <span className="field-error">{errors.idPedido}</span>}
            {pedidosEntregados.length === 0 && (
              <div className="info-box info-box--warn" style={{ marginTop: 4 }}>
                <span className="info-box__icon">ℹ️</span>
                <span className="info-box__text">No hay pedidos entregados disponibles para devolución.</span>
              </div>
            )}
          </div>

          {/* Info pedido seleccionado */}
          {pedidoSel && (
            <div className="info-box info-box--info">
              <span className="info-box__icon">📦</span>
              <div className="info-box__text">
                <span className="info-box__label">{pedidoSel.numero} · {pedidoSel.cliente?.nombre}</span>
                Total pagado: {fmt(pedidoSel.total)} · {pedidoSel.metodo_pago}
              </div>
            </div>
          )}

          {/* Productos a devolver */}
          {items.length > 0 && (
            <>
              <p className="section-label">Productos a devolver</p>
              {errors.items && <span className="field-error" style={{ marginTop: -4 }}>{errors.items}</span>}
              <div className="productos-devolucion">
                {items.map((item, idx) => (
                  <div key={idx} className="prod-dev-item">
                    <div style={{ flex: 1 }}>
                      <div className="prod-dev-name">{item.nombre}</div>
                      <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2 }}>
                        {fmt(item.precio)} c/u · máx. {item.cantMax}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => setCantidad(idx, item.cantidad - 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #c8e6c9", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >−</button>
                      <input
                        type="number" min={0} max={item.cantMax}
                        value={item.cantidad}
                        onChange={e => setCantidad(idx, e.target.value)}
                        style={{ width: 44, padding: "4px 6px", borderRadius: 6, border: "1.5px solid #e0e0e0", fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none", fontFamily: "inherit" }}
                      />
                      <button
                        onClick={() => setCantidad(idx, item.cantidad + 1)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #c8e6c9", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >+</button>
                    </div>
                    <div className="prod-dev-sub" style={{ minWidth: 80, textAlign: "right" }}>
                      {item.cantidad > 0 ? fmt(item.precio * item.cantidad) : "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total devolución */}
              {totalDevolucion > 0 && (
                <div className="credito-box">
                  <span className="credito-box__icon">💳</span>
                  <div>
                    <div className="credito-box__label">Crédito a generar</div>
                    <div className="credito-box__val">{fmt(totalDevolucion)}</div>
                    <div className="credito-box__saldo">Se sumará al saldo del cliente</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Motivo */}
          <p className="section-label">Motivo</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="form-label">Motivo de la devolución <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${errors.motivo ? " error" : ""}`}
                value={motivo}
                onChange={e => { setMotivo(e.target.value); setErrors(v => ({ ...v, motivo: "" })); }}
              >
                <option value="">Seleccione…</option>
                {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <SelectArrow />
            </div>
            {errors.motivo && <span className="field-error">{errors.motivo}</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="form-label">Comentario adicional</label>
            <textarea
              className="field-textarea"
              rows={2}
              placeholder="Descripción detallada del problema…"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
            />
          </div>

          {/* Evidencia */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="form-label">Evidencia <span style={{ color: "#9e9e9e", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span></label>

            {!evidencia ? (
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "20px 16px", borderRadius: 10, cursor: "pointer",
                border: "2px dashed #c8e6c9", background: "#f9fdf9",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 28 }}>📎</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>Adjuntar archivo</div>
                  <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2 }}>
                    Foto, video o documento del problema · Máx. 5MB
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      alert("El archivo supera los 5MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = ev => setEvidencia({
                      nombre: file.name,
                      base64: ev.target.result,
                      tipo:   file.type,
                    });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10,
                border: "1.5px solid #a5d6a7", background: "#f1f8f1",
              }}>
                {/* Preview si es imagen */}
                {evidencia.tipo?.startsWith("image/") ? (
                  <img
                    src={evidencia.base64}
                    alt="evidencia"
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 8, background: "#e8f5e9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {evidencia.tipo?.startsWith("video/") ? "🎥" : "📄"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {evidencia.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 2 }}>Archivo adjunto</div>
                </div>
                <button
                  onClick={() => setEvidencia(null)}
                  style={{
                    width: 28, height: 28, borderRadius: 7, border: "1.5px solid #ef9a9a",
                    background: "#ffebee", cursor: "pointer", fontSize: 13, color: "#c62828",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                  title="Quitar archivo"
                >✕</button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saved || totalDevolucion === 0}>
            {saved ? "Guardando…" : " Registrar devolución"}
          </button>
        </div>

        {saved && (
          <div className="modal-success-toast">
            <span>✓</span><span>Devolución registrada con éxito</span>
          </div>
        )}
      </div>
    </div>
  );
}