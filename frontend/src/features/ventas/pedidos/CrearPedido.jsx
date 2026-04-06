import { useState, useRef, useEffect } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./Pedidos.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const METODOS_PAGO = ["Efectivo 💵", "Transferencia 🏦"];

const EMPTY_FORM = {
  idCliente:         "",
  productosItems:    [],
  metodo_pago:       "",
  domicilio:         false,
  direccion_entrega: "",
  notas:             "",
  descuento:         0,
};

/* ─── SelectArrow ────────────────────────────────────────── */
function SelectArrow() {
  return (
    <div className="select-arrow">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ─── BuscadorProducto ───────────────────────────────────── */
function BuscadorProducto({ productosSeleccionados, onAgregar }) {
  const { productos, getCatProducto } = useApp();
  const [query,   setQuery]   = useState("");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const idsSeleccionados = productosSeleccionados.map(p => p.idProducto);

  const filtrados = productos
    .filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()))
    .filter(p => !idsSeleccionados.includes(p.id));

  const handleSelect = (prod) => {
    onAgregar({
      idProducto:  prod.id,
      nombre:      prod.nombre,
      precio:      prod.precio,
      cantidad:    1,
      stockActual: prod.stock,
      stockOk:     prod.stock > 0,
    });
    setQuery("");
    setAbierto(false);
  };

  return (
    <div ref={ref} className="product-search-wrap">
      <input
        className="field-input"
        placeholder="Buscar producto por nombre…"
        value={query}
        onChange={e => { setQuery(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
      />
      {abierto && query.length > 0 && (
        <div className="product-dropdown">
          {filtrados.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "#9e9e9e" }}>
              Sin resultados
            </div>
          ) : filtrados.map(prod => {
            const sinStock  = prod.stock === 0;
            const pocoStock = prod.stock > 0 && prod.stock < prod.stockMinimo;
            return (
              <div key={prod.id} className="product-option" onClick={() => handleSelect(prod)}>
                <div>
                  <div className="product-option__name">{prod.nombre}</div>
                  <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 1 }}>
                    {getCatProducto(prod.idCategoria)?.nombre}
                  </div>
                </div>
                <div className="product-option__right">
                  <span className="product-option__price">{fmt(prod.precio)}</span>
                  <span className={
                    sinStock    ? "product-option__stock product-option__stock--none" :
                    pocoStock   ? "product-option__stock product-option__stock--low"  :
                                  "product-option__stock"
                  }>
                    {sinStock ? "Sin stock" : `Stock: ${prod.stock}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── ProductoItem ───────────────────────────────────────── */
function ProductoItem({ item, onChange, onRemove }) {
  const sinStock  = item.stockActual === 0;
  const pocoStock = item.stockActual > 0 && item.cantidad > item.stockActual;

  const setQty = (val) => {
    const n = Math.max(1, Math.min(999, Number(val) || 1));
    onChange({ ...item, cantidad: n, stockOk: item.stockActual >= n });
  };

  return (
    <div className="producto-item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="producto-item__name">{item.nombre}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
          <span className="producto-item__price">{fmt(item.precio)} c/u</span>
          {sinStock && (
            <span className="producto-item__stock-warn producto-item__stock-warn--none">Sin stock</span>
          )}
          {!sinStock && pocoStock && (
            <span className="producto-item__stock-warn producto-item__stock-warn--low">
              Stock insuf. ({item.stockActual} disp.)
            </span>
          )}
        </div>
      </div>

      <div className="producto-item__qty-wrap">
        <button className="qty-btn" onClick={() => setQty(item.cantidad - 1)}>−</button>
        <input
          type="number" min={1} className="qty-input"
          value={item.cantidad}
          onChange={e => setQty(e.target.value)}
        />
        <button className="qty-btn" onClick={() => setQty(item.cantidad + 1)}>+</button>
      </div>

      <div className="producto-item__total">{fmt(item.precio * item.cantidad)}</div>

      <button className="producto-item__remove" onClick={onRemove}>✕</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CREAR PEDIDO
   ═══════════════════════════════════════════════════════════ */
export default function CrearPedido({ onClose, onSave }) {
  const { clientesActivos: clientes } = useApp();

  const [form, setForm]     = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saved,  setSaved]  = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  /* ─── Cálculos ─── */
  const subtotal  = form.productosItems.reduce((a, p) => a + p.precio * p.cantidad, 0);
  const descuento = Number(form.descuento) || 0;
  const total     = Math.max(0, subtotal - descuento);
  const hayProductosSinStock = form.productosItems.some(
    p => !p.stockOk || p.cantidad > p.stockActual
  );

  /* ─── Validación ─── */
  const validate = () => {
    const e = {};
    if (!form.idCliente)                  e.idCliente        = "Selecciona un cliente";
    if (form.productosItems.length === 0) e.productos        = "Agrega al menos un producto";
    if (!form.metodo_pago)                e.metodo_pago      = "Selecciona método de pago";
    if (form.domicilio && !form.direccion_entrega.trim())
                                          e.direccion_entrega = "Ingresa la dirección";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaved(true);

    const cliente = clientes.find(c => c.id === form.idCliente);

    const payload = {
      idCliente: form.idCliente,
      cliente: {
        nombre:   `${cliente.nombre} ${cliente.apellidos}`,
        correo:   cliente.correo,
        telefono: cliente.telefono,
      },
      productosItems:    form.productosItems,
      metodo_pago:       form.metodo_pago,
      domicilio:         form.domicilio,
      direccion_entrega: form.domicilio ? form.direccion_entrega : null,
      notas:             form.notas,
      descuento,
      subtotal,
      total,
      orden_produccion:  hayProductosSinStock,
    };

    setTimeout(() => onSave(payload), 900);
  };

  /* ─── Productos ─── */
  const agregarProducto = (item) => {
    setErrors(e => ({ ...e, productos: "" }));
    setForm(f => ({ ...f, productosItems: [...f.productosItems, item] }));
  };

  const cambiarProducto = (idx, item) => {
    setForm(f => {
      const arr = [...f.productosItems]; arr[idx] = item;
      return { ...f, productosItems: arr };
    });
  };

  const quitarProducto = (idx) => {
    setForm(f => ({ ...f, productosItems: f.productosItems.filter((_, i) => i !== idx) }));
  };

  const clienteSeleccionado = clientes.find(c => c.id === form.idCliente);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Pedidos</p>
            <h2 className="modal-header__title">Nuevo pedido</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* ── Cliente ── */}
          <p className="section-label" style={{textTransform: "none"}}>Cliente</p>
          <div className="field-wrap">
            <label className="field-label">Cliente <span className="required">*</span></label>
            <div className="select-wrap">
              <select
                className={`field-select${errors.idCliente ? " error" : ""}`}
                value={form.idCliente}
                onChange={e => set("idCliente", e.target.value)}
              >
                <option value="">Seleccione un cliente…</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellidos} — {c.correo}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
            {errors.idCliente && <span className="field-error">{errors.idCliente}</span>}
          </div>

          {clienteSeleccionado && (
            <div className="info-box info-box--success" style={{ marginTop: -2 }}>
              <span className="info-box__icon">👤</span>
              <span className="info-box__text">
                {clienteSeleccionado.telefono} · {clienteSeleccionado.municipio || "Sin ciudad"}
              </span>
            </div>
          )}

          {/* ── Productos ── */}
          <p className="section-label" style={{textTransform: "none"}} >Productos</p>
          <BuscadorProducto
            productosSeleccionados={form.productosItems}
            onAgregar={agregarProducto}
          />
          {errors.productos && (
            <span className="field-error" style={{ marginTop: -4 }}>{errors.productos}</span>
          )}

          {form.productosItems.length > 0 && (
            <>
              <div className="productos-list">
                {form.productosItems.map((item, idx) => (
                  <ProductoItem
                    key={item.idProducto}
                    item={item}
                    onChange={v => cambiarProducto(idx, v)}
                    onRemove={() => quitarProducto(idx)}
                  />
                ))}
              </div>

              {hayProductosSinStock && (
                <div className="info-box info-box--warn">
                  <span className="info-box__icon">⚠️</span>
                  <div className="info-box__text">
                    <span className="info-box__label">Productos con stock insuficiente</span>
                    Se generará automáticamente una orden de producción al guardar.
                  </div>
                </div>
              )}

              <div className="form-grid-2" style={{ alignItems: "end" }}>
                <div className="field-wrap">
                  <label className="field-label">Descuento (COP)</label>
                  <input
                    type="number" min={0} max={subtotal}
                    className="field-input"
                    value={form.descuento}
                    onChange={e => set("descuento", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="totales-box">
                  <div className="totales-row">
                    <span>Subtotal</span><span>{fmt(subtotal)}</span>
                  </div>
                  {descuento > 0 && (
                    <div className="totales-row totales-row--descuento">
                      <span>Descuento</span><span>− {fmt(descuento)}</span>
                    </div>
                  )}
                  <div className="totales-row totales-row--total">
                    <span>Total</span><span>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Pago y entrega ── */}
          <p className="section-label" style={{textTransform: "none"}} >Pago y entrega</p>
          <div className="form-grid-2">
            <div className="field-wrap">
              <label className="field-label">Método de pago <span className="required">*</span></label>
              <div className="select-wrap">
                <select
                  className={`field-select${errors.metodo_pago ? " error" : ""}`}
                  value={form.metodo_pago}
                  onChange={e => set("metodo_pago", e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <SelectArrow />
              </div>
              {errors.metodo_pago && <span className="field-error">{errors.metodo_pago}</span>}
            </div>

            <div className="field-wrap">
              <label className="field-label">Tipo de entrega</label>
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                {[
                  { val: false, label: "🏪 Tienda"   },
                  { val: true,  label: "🛵 Domicilio" },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => set("domicilio", opt.val)}
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      border: form.domicilio === opt.val ? "2px solid #2e7d32" : "1.5px solid #e0e0e0",
                      background: form.domicilio === opt.val ? "#e8f5e9" : "#fff",
                      color:      form.domicilio === opt.val ? "#2e7d32" : "#616161",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.domicilio && (
            <div className="field-wrap">
              <label className="field-label">Dirección de entrega <span className="required">*</span></label>
              <input
                className={`field-input${errors.direccion_entrega ? " error" : ""}`}
                placeholder="Ej: Cra 5 #12-34, Apto 201, Medellín"
                value={form.direccion_entrega}
                onChange={e => set("direccion_entrega", e.target.value)}
              />
              {errors.direccion_entrega && (
                <span className="field-error">{errors.direccion_entrega}</span>
              )}
              {/* Sugerencia dirección del cliente — opcional */}
              {clienteSeleccionado?.direccion && !form.direccion_entrega && (
                <button
                  onClick={() => set("direccion_entrega", clienteSeleccionado.direccion)}
                  style={{
                    marginTop: 5, background: "none", border: "none", padding: 0,
                    fontSize: 11, color: "#2e7d32", cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left", fontWeight: 600,
                  }}
                >
                  ↳ Usar dirección registrada: <span style={{ textDecoration: "underline" }}>{clienteSeleccionado.direccion}</span>
                </button>
              )}
            </div>
          )}

          <div className="field-wrap">
            <label className="field-label">Notas del pedido</label>
            <textarea
              className="field-textarea"
              rows={2}
              placeholder="Indicaciones especiales, alergias, personalización…"
              value={form.notas}
              onChange={e => set("notas", e.target.value)}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave} disabled={saved}>
            {saved ? "Guardando…" : "Crear pedido"}
          </button>
        </div>

        {saved && (
          <div className="modal-success-toast">
            <span>✓</span>
            <span>Pedido creado con éxito</span>
          </div>
        )}
      </div>
    </div>
  );
}