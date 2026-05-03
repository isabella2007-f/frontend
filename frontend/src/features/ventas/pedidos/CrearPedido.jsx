import { useState, useRef, useEffect } from "react";
import { useApp } from "../../../AppContext.jsx";
import { DEPARTAMENTOS, getCiudades } from "../../../utils/departamentosYCiudades.js";
import "./Pedidos.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const METODOS_PAGO = ["Efectivo 💵", "Transferencia 🏦"];

const EMPTY_FORM = {
  idCliente:         "",
  productosItems:    [],
  metodo_pago:       "",
  comprobante:       null,
  comprobantePreview: null,
  domicilio:         false,
  direccion_entrega: "",
  departamento:      "",
  municipio:         "",
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

/* ─── BARRA DE PASOS ─────────────────────────────────────── */
const STEPS = ["Cliente", "Productos", "Pago y entrega"];

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

/* ═══════════════════════════════════════════════════════════
   MODAL CREAR PEDIDO
   ═══════════════════════════════════════════════════════════ */
export default function CrearPedido({ onClose, onSave }) {
  const { clientesActivos: clientes } = useApp();

  const [form, setForm]     = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saved,  setSaved]  = useState(false);
  const [step,   setStep]   = useState(1);

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

  /* ─── Validación por paso ─── */
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.idCliente) e.idCliente = "Selecciona un cliente";
    }
    if (s === 2) {
      if (form.productosItems.length === 0) e.productos = "Agrega al menos un producto";
    }
    if (s === 3) {
      if (!form.metodo_pago) e.metodo_pago = "Selecciona método de pago";
      
      if (form.metodo_pago === "Transferencia 🏦" && !form.comprobantePreview) {
        e.comprobante = "El comprobante es obligatorio para transferencias";
      }

      if (form.domicilio) {
        if (!form.direccion_entrega.trim()) e.direccion_entrega = "Ingresa la dirección";
        if (!form.departamento.trim())       e.departamento = "Selecciona el departamento";
        if (!form.municipio.trim())          e.municipio = "Selecciona el municipio";
      }
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
    const e = validateStep(3);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaved(true);

    const cliente = clientes.find(c => String(c.id) === String(form.idCliente));

    const payload = {
      idCliente: form.idCliente,
      cliente: {
        nombre:   `${cliente.nombre} ${cliente.apellidos}`,
        correo:   cliente.correo,
        telefono: cliente.telefono,
      },
      productosItems:    form.productosItems,
      metodo_pago:       form.metodo_pago,
      comprobante:       form.comprobantePreview,
      domicilio:         form.domicilio,
      direccion_entrega: form.domicilio ? form.direccion_entrega : null,
      departamento:      form.domicilio ? form.departamento      : null,
      municipio:         form.domicilio ? form.municipio         : null,
      notas:             form.notas,
      descuento,
      subtotal,
      total,
      orden_produccion:  hayProductosSinStock,
    };

    setTimeout(() => onSave(payload), 900);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, comprobante: file, comprobantePreview: ev.target.result }));
      setErrors(err => ({ ...err, comprobante: "" }));
    };
    reader.readAsDataURL(file);
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

  const clienteSeleccionado = clientes.find(c => String(c.id) === String(form.idCliente));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Pedidos</p>
            <h2 className="modal-header__title">Nuevo pedido</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div style={{ padding: "16px 24px 0" }}>
          <StepsBar current={step} />
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 280 }}>

          {/* ── Paso 1: Cliente ── */}
          {step === 1 && (
            <>
              <p className="section-label" style={{ textTransform: "none", marginTop: 0 }}>Seleccionar Cliente</p>
              <div className="field-wrap">
                <label className="field-label">Cliente <span className="required">*</span></label>
                <div className="select-wrap">
                  <select
                    className={`field-select${errors.idCliente ? " error" : ""}`}
                    value={form.idCliente}
                    onChange={e => {
                      const id = e.target.value;
                      const cli = clientes.find(c => String(c.id) === String(id));
                      setForm(f => ({
                        ...f,
                        idCliente: id,
                        departamento: cli?.departamento || "",
                        municipio: cli?.municipio || "",
                        direccion_entrega: cli?.direccion || ""
                      }));
                      setErrors(err => ({ ...err, idCliente: "" }));
                    }}
                  >
                    <option value="">Seleccione un cliente…</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellidos}
                      </option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
                {errors.idCliente && <span className="field-error">{errors.idCliente}</span>}
              </div>

              {clienteSeleccionado && (
                <div className="info-box info-box--success" style={{ marginTop: 16 }}>
                  <span className="info-box__icon">👤</span>
                  <div className="info-box__text">
                    <span className="info-box__label">{clienteSeleccionado.nombre} {clienteSeleccionado.apellidos}</span>
                    {clienteSeleccionado.telefono} · {clienteSeleccionado.correo}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Paso 2: Productos ── */}
          {step === 2 && (
            <>
              <p className="section-label" style={{ textTransform: "none", marginTop: 0 }}>Agregar Productos</p>
              <BuscadorProducto
                productosSeleccionados={form.productosItems}
                onAgregar={agregarProducto}
              />
              {errors.productos && (
                <span className="field-error" style={{ marginTop: 4 }}>{errors.productos}</span>
              )}

              {form.productosItems.length > 0 && (
                <div className="productos-list" style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                  {form.productosItems.map((item, idx) => (
                    <ProductoItem
                      key={item.idProducto}
                      item={item}
                      onChange={v => cambiarProducto(idx, v)}
                      onRemove={() => quitarProducto(idx)}
                    />
                  ))}
                </div>
              )}

              <div className="totales-box" style={{ marginTop: 16, background: "#f9fdf9", padding: 12, borderRadius: 10, border: "1px solid #c8e6c9" }}>
                <div className="totales-row" style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>Subtotal</span><strong>{fmt(subtotal)}</strong>
                </div>
                <div className="totales-row totales-row--total" style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "#2e7d32", marginTop: 4, paddingTop: 4, borderTop: "1px dashed #c8e6c9" }}>
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>
            </>
          )}

          {/* ── Paso 3: Pago y entrega ── */}
          {step === 3 && (
            <>
              <p className="section-label" style={{ textTransform: "none", marginTop: 0 }}>Finalizar Pedido</p>
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
                        className="btn-ghost"
                        style={{
                          flex: 1, padding: "8px", fontSize: 11,
                          borderColor: form.domicilio === opt.val ? "#2e7d32" : "#e0e0e0",
                          background:  form.domicilio === opt.val ? "#e8f5e9" : "#fff",
                          color:       form.domicilio === opt.val ? "#2e7d32" : "#616161",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.metodo_pago === "Transferencia 🏦" && (
                <div className="field-wrap" style={{ marginTop: 12 }}>
                  <label className="field-label">Comprobante de pago <span className="required">*</span></label>
                  <div className="comprobante-upload">
                    {form.comprobantePreview ? (
                      <div className="comprobante-preview-wrap">
                        <img src={form.comprobantePreview} alt="Comprobante" className="comprobante-preview-img" />
                        <button className="comprobante-remove-btn" onClick={() => setForm(f => ({ ...f, comprobante: null, comprobantePreview: null }))}>✕</button>
                      </div>
                    ) : (
                      <label className={`comprobante-dropzone${errors.comprobante ? " error" : ""}`}>
                        <input type="file" accept="image/*" onChange={handleFile} hidden />
                        <span style={{ fontSize: 24 }}>📤</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Subir comprobante</span>
                        <span style={{ fontSize: 10, color: "#9e9e9e" }}>JPG, PNG o WEBP</span>
                      </label>
                    )}
                  </div>
                  {errors.comprobante && <span className="field-error">{errors.comprobante}</span>}
                </div>
              )}

              {form.domicilio && (
                <>
                  <div className="field-wrap" style={{ marginTop: 12 }}>
                    <label className="field-label">Dirección de entrega <span className="required">*</span></label>
                    <input
                      className={`field-input${errors.direccion_entrega ? " error" : ""}`}
                      placeholder="Ej: Cra 5 #12-34..."
                      value={form.direccion_entrega}
                      onChange={e => set("direccion_entrega", e.target.value)}
                    />
                    {errors.direccion_entrega && (
                      <span className="field-error">{errors.direccion_entrega}</span>
                    )}
                  </div>

                  <div className="form-grid-2" style={{ marginTop: 12 }}>
                    <div className="field-wrap">
                      <label className="field-label">Departamento <span className="required">*</span></label>
                      <div className="select-wrap">
                        <select
                          className={`field-select${errors.departamento ? " error" : ""}`}
                          value={form.departamento}
                          onChange={e => {
                            setForm(f => ({ ...f, departamento: e.target.value, municipio: "" }));
                            setErrors(err => ({ ...err, departamento: "" }));
                          }}
                        >
                          <option value="">Seleccione…</option>
                          {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <SelectArrow />
                      </div>
                      {errors.departamento && (
                        <span className="field-error">{errors.departamento}</span>
                      )}
                    </div>

                    <div className="field-wrap">
                      <label className="field-label">Municipio <span className="required">*</span></label>
                      <div className="select-wrap">
                        <select
                          className={`field-select${errors.municipio ? " error" : ""}`}
                          value={form.municipio}
                          onChange={e => set("municipio", e.target.value)}
                          disabled={!form.departamento}
                        >
                          <option value="">Seleccione…</option>
                          {getCiudades(form.departamento).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <SelectArrow />
                      </div>
                      {errors.municipio && (
                        <span className="field-error">{errors.municipio}</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="field-wrap" style={{ marginTop: 12 }}>
                <label className="field-label">Descuento (COP)</label>
                <input
                  type="number" min={0} max={subtotal}
                  className="field-input"
                  value={form.descuento}
                  onChange={e => set("descuento", e.target.value)}
                  placeholder="0"
                />
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
            {step < 3
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave} disabled={saved}>
                  {saved ? "Guardando…" : "Crear pedido"}
                </button>
            }
          </div>
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