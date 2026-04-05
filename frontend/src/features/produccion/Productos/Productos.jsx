import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Toast } from "./ui.jsx";
import CrearProducto from "./CrearProducto.jsx";
import EditarProducto from "./EditarProducto.jsx";
import EditarFicha from "./ficha_tecnica/EditarFicha.jsx";
import CrearFicha from "./ficha_tecnica/CrearFicha.jsx";
import SalidaModal from "./SalidaModal.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import "./Productos.css";

const ITEMS_PER_PAGE = 4;

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function calcEstado(stock, minimo) {
  return stock > 0 && stock >= minimo ? "Disponible" : "No disponible";
}
function calcTooltip(stock, minimo) {
  if (stock === 0)    return "Sin unidades en stock";
  if (stock < minimo) return `Stock por debajo del mínimo (${minimo} uds.)`;
  return `Stock suficiente (mín. ${minimo} uds.)`;
}
const ESTADO_STYLES = {
  "Disponible":    { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  "No disponible": { bg: "#ffebee", color: "#c62828", border: "#ef9a9a" },
};
function hoyISO() {
  return new Date().toISOString().split("T")[0];
}
function formatFecha(f) {
  if (!f) return "—";
  if (f.includes("/")) return f;
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}
function estaVencido(fechaVenc) {
  if (!fechaVenc) return false;
  return fechaVenc < hoyISO();
}
function diasParaVencer(fechaVenc) {
  if (!fechaVenc) return null;
  return Math.ceil((new Date(fechaVenc + "T00:00:00") - new Date(hoyISO() + "T00:00:00")) / 86400000);
}
const TIPO_COLORS = {
  vencido:    { color: "#e65100", bg: "#fff3e0", border: "#ffcc80", icon: "🕒" },
  dañado:     { color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "💥" },
  ajuste:     { color: "#1565c0", bg: "#e3f2fd", border: "#90caf9", icon: "⚖️" },
  consumo:    { color: "#4a148c", bg: "#f3e5f5", border: "#ce93d8", icon: "🍽️" },
  devolucion: { color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "↩️" },
};

/* ══════════════════════════════════════════════════════════
   TABLA — sub-componentes pequeños
══════════════════════════════════════════════════════════ */
function EstadoBadge({ stock, stockMinimo }) {
  const minimo  = stockMinimo ?? 10;
  const estado  = calcEstado(stock, minimo);
  const tooltip = calcTooltip(stock, minimo);
  const s       = ESTADO_STYLES[estado];
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: "nowrap", cursor: "default" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{estado}
      </span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", fontSize: 11, fontWeight: 500, padding: "5px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none" }}>
          {tooltip}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1a1a1a" }} />
        </span>
      )}
    </span>
  );
}

function CatCell({ cat }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ width: 34, height: 34, borderRadius: 8, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "default" }}>
        {cat?.icon || "📦"}
      </span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none" }}>
          {cat?.nombre || "—"}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1a1a1a" }} />
        </span>
      )}
    </span>
  );
}

function ProductImg({ preview, nombre }) {
  return preview
    ? <img src={preview} alt={nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid #c8e6c9", flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🍌</div>;
}

/* ══════════════════════════════════════════════════════════
   LOTES PANEL — incrustado directamente
══════════════════════════════════════════════════════════ */
function LotesProductoPanel({ idProducto }) {
  const { getLotesProducto, agregarLoteProducto } = useApp();
  const lotes   = getLotesProducto ? getLotesProducto(idProducto) : [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ id: "", fechaVenc: "", cantInicial: "", costo: "" });
  const [errors, setErrors]     = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.id.trim())                                    e.id          = "Requerido";
    if (!form.cantInicial || Number(form.cantInicial) <= 0) e.cantInicial = "Cantidad inválida";
    return e;
  };

  const handleAdd = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    agregarLoteProducto && agregarLoteProducto(idProducto, {
      id:               form.id,
      fechaVencimiento: form.fechaVenc || null,
      cantidadInicial:  Number(form.cantInicial),
      cantidadActual:   Number(form.cantInicial),
      fechaIngreso:     hoyISO(),
      costo:            form.costo ? Number(form.costo) : null,
    });
    setForm({ id: "", fechaVenc: "", cantInicial: "", costo: "" });
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="ver-ins-section-label" style={{ margin: 0, textTransform: "none" }}>Lotes en inventario</p>
        <button className="btn-save" style={{ padding: "6px 14px", fontSize: 12 }}
          onClick={() => setShowForm(v => !v)}>
          {showForm ? "Cancelar" : "+ Agregar lote"}
        </button>
      </div>

      {showForm && (
        <div className="lote-section" style={{ marginBottom: 14 }}>
          <div className="lote-section__header"><span>📦</span><p className="lote-section__title">Nuevo lote</p></div>
          <div className="lote-section__body" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="lote-field__label">ID del lote *</p>
              <input className={`field-input${errors.id ? " field-input--error" : ""}`}
                value={form.id} onChange={e => set("id", e.target.value)} placeholder="Ej. LP-001"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.id ? "#e53935" : "#e0e0e0"} />
              {errors.id && <p className="field-error">{errors.id}</p>}
            </div>
            <div>
              <p className="lote-field__label">Fecha de vencimiento</p>
              <input type="date" className="field-input" value={form.fechaVenc}
                onChange={e => set("fechaVenc", e.target.value)} />
            </div>
            <div>
              <p className="lote-field__label">Cantidad inicial *</p>
              <input type="number" min="1"
                className={`field-input${errors.cantInicial ? " field-input--error" : ""}`}
                value={form.cantInicial} onChange={e => set("cantInicial", e.target.value)} placeholder="0"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.cantInicial ? "#e53935" : "#e0e0e0"} />
              {errors.cantInicial && <p className="field-error">{errors.cantInicial}</p>}
            </div>
            <div>
              <p className="lote-field__label">Costo unitario (opcional)</p>
              <input type="number" min="0" className="field-input"
                value={form.costo} onChange={e => set("costo", e.target.value)} placeholder="$0"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
            </div>
          </div>
          <div style={{ padding: "0 14px 12px", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-save" onClick={handleAdd}>Guardar lote</button>
          </div>
        </div>
      )}

      {lotes.length === 0 ? (
        <div className="empty-state" style={{ padding: "28px 20px" }}>
          <div className="empty-state__icon">📦</div>
          <p className="empty-state__text">Sin lotes registrados para este producto</p>
        </div>
      ) : (
        <div className="lotes-lista">
          {lotes.map(lote => {
            const vencido = estaVencido(lote.fechaVencimiento);
            const dias    = diasParaVencer(lote.fechaVencimiento);
            const pronto  = dias !== null && dias >= 0 && dias <= 7;
            return (
              <div key={lote.id} className="lote-item"
                style={{ borderColor: vencido ? "#ef9a9a" : pronto ? "#ffe082" : "#c8e6c9" }}>
                <div className="lote-item__head">
                  <span className="lote-item__id">{lote.id}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {vencido && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828", background: "#ffebee", padding: "2px 8px", borderRadius: 20, border: "1px solid #ef9a9a" }}>Vencido</span>
                    )}
                    {pronto && !vencido && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#e65100", background: "#fff3e0", padding: "2px 8px", borderRadius: 20, border: "1px solid #ffcc80" }}>Vence en {dias}d</span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 12 }}>Vence: {formatFecha(lote.fechaVencimiento)}</span>
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8, fontSize: 13 }}>
                  <div><strong>Actual:</strong> {lote.cantidadActual} uds.</div>
                  <div><strong>Inicial:</strong> {lote.cantidadInicial} uds.</div>
                  <div><strong>Ingreso:</strong> {formatFecha(lote.fechaIngreso)}</div>
                  {lote.costo && <div><strong>Costo unit.:</strong> ${lote.costo?.toLocaleString("es-CO")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   VER PRODUCTO — modal con tabs (todo aquí)
══════════════════════════════════════════════════════════ */
function VerProducto({ product, catObj, onClose }) {
  const { getLotesProducto, getSalidasProducto, getLotesVencidosProducto } = useApp();
  const [tab, setTab] = useState("info");

  const minimo   = product.stockMinimo ?? 10;
  const estado   = calcEstado(product.stock, minimo);
  const s        = ESTADO_STYLES[estado];
  const salidas  = getSalidasProducto        ? getSalidasProducto(product.id)        : [];
  const vencidos = getLotesVencidosProducto  ? getLotesVencidosProducto(product.id)  : [];

  const resumenSalidas = salidas.reduce((acc, sal) => {
    acc[sal.tipo] = (acc[sal.tipo] || 0) + sal.cantidad;
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 560, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 40px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {product.imagenPreview
              ? <img src={product.imagenPreview} alt={product.nombre} style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", border: "2px solid #c8e6c9" }} />
              : <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f1f8f1", border: "2px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📦</div>
            }
            <div>
              <p className="modal-header__eyebrow">Producto</p>
              <h2 className="modal-header__title">{product.nombre}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="ver-ins-tabs">
          {[
            { key: "info",      label: "📋 Información" },
            { key: "lotes",     label: "📦 Lotes" },
            { key: "historial", label: "🕒 Historial" },
          ].map(t => (
            <button key={t.key}
              className={`ver-ins-tab${tab === t.key ? " ver-ins-tab--active" : ""}`}
              onClick={() => setTab(t.key)}>{t.label}
            </button>
          ))}
        </div>

        {/* Body con scroll */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Información ── */}
          {tab === "info" && (
            <>
              <div className="ver-ins-grid" style={{ marginBottom: 16 }}>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Nombre</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{product.nombre}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Categoría</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{catObj?.icon} {catObj?.nombre || "—"}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Precio de venta</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#2e7d32" }}>${product.precio?.toLocaleString("es-CO")}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Estado</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{estado}
                  </span>
                </div>
              </div>

              <p className="ver-ins-section-label" style={{ textTransform: "none" }}>Stock</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div className="ver-ins-stock-card ver-ins-stock-card--actual">
                  <span className="ver-ins-stock-card__num">{product.stock}</span>
                  <span className="ver-ins-stock-card__label">Stock actual</span>
                  <span className="ver-ins-stock-card__uni">uds.</span>
                </div>
                <div className="ver-ins-stock-card ver-ins-stock-card--minimo">
                  <span className="ver-ins-stock-card__num">{minimo}</span>
                  <span className="ver-ins-stock-card__label">Stock mínimo</span>
                  <span className="ver-ins-stock-card__uni">uds.</span>
                </div>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9e9e9e" }}>{calcTooltip(product.stock, minimo)}</p>
              {product.fecha && (
                <div className="date-info" style={{ marginTop: 14 }}>
                  <span>📅</span><span>Creado el <strong>{product.fecha}</strong></span>
                </div>
              )}
            </>
          )}

          {/* ── Lotes ── */}
          {tab === "lotes" && <LotesProductoPanel idProducto={product.id} />}

          {/* ── Historial ── */}
          {tab === "historial" && (
            <>
              {salidas.length > 0 && (
                <>
                  <p className="ver-ins-section-label" style={{ textTransform: "none" }}>Resumen de salidas</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                    {Object.entries(resumenSalidas).map(([tipo, total]) => {
                      const tc = TIPO_COLORS[tipo] || { color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "📋" };
                      return (
                        <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: tc.bg, border: `1px solid ${tc.border}`, fontSize: 12, fontWeight: 700, color: tc.color }}>
                          <span>{tc.icon}</span>
                          {tipo.charAt(0).toUpperCase() + tipo.slice(1)}: <span style={{ marginLeft: 2 }}>{total} uds.</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="ver-ins-section-label" style={{ textTransform: "none" }}>Lotes vencidos</p>
              {vencidos.length === 0 ? (
                <div className="empty-state" style={{ padding: "14px 20px" }}>
                  <p className="empty-state__text">No hay lotes vencidos registrados.</p>
                </div>
              ) : (
                <div className="lotes-lista" style={{ marginBottom: 18 }}>
                  {vencidos.map(lote => (
                    <div key={lote.id} className="lote-item" style={{ borderColor: "#ef9a9a" }}>
                      <div className="lote-item__head">
                        <span className="lote-item__id">{lote.id}</span>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Venció: {formatFecha(lote.fechaVencimiento)}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 8, fontSize: 13 }}>
                        <div><strong>Cantidad actual:</strong> {lote.cantidadActual} uds.</div>
                        <div><strong>Ingreso:</strong> {formatFecha(lote.fechaIngreso)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="ver-ins-section-label" style={{ textTransform: "none", marginTop: 4 }}>Historial de salidas</p>
              {salidas.length === 0 ? (
                <div className="empty-state" style={{ padding: "14px 20px" }}>
                  <p className="empty-state__text">Aún no hay salidas registradas.</p>
                </div>
              ) : (
                <div className="historial-list">
                  {salidas.map(salida => {
                    const tc = TIPO_COLORS[salida.tipo] || { color: "#757575", bg: "#f5f5f5", icon: "📋" };
                    return (
                      <div key={salida.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 9, border: "1px solid #f0f0f0", marginBottom: 6, background: "#fafafa" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg }}>{tc.icon} {salida.tipo}</span>
                          <span style={{ fontSize: 13, color: "#424242" }}>{salida.motivo}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#c62828" }}>-{salida.cantidad} uds.</span>
                          <span style={{ fontSize: 11, color: "#bdbdbd" }}>{salida.fecha}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function GestionProductos() {
  const {
    productos,
    getCatProducto,
    crearProducto, editarProducto, eliminarProducto, guardarFicha,
    canDeleteProducto,
    registrarSalidaProducto,
  } = useApp();

  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("Todas");
  const [filterEst,  setFilterEst]  = useState("Todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const ESTADOS_FILTER = ["Todos", "Disponible", "No disponible"];
  const ESTADO_DOT     = { "Disponible": "#43a047", "No disponible": "#ef5350" };

  const filtered = productos.filter(p => {
    const cat    = getCatProducto(p.idCategoria);
    const q      = search.toLowerCase();
    const estado = calcEstado(p.stock, p.stockMinimo ?? 10);
    return (
      (p.nombre.toLowerCase().includes(q) || cat.nombre.toLowerCase().includes(q)) &&
      (filterCat === "Todas" || cat.nombre === filterCat) &&
      (filterEst === "Todos" || estado === filterEst)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filterCat, filterEst]);

  const hasFilter = filterCat !== "Todas" || filterEst !== "Todos";
  const catsEnUso = ["Todas", ...new Set(productos.map(p => getCatProducto(p.idCategoria).nombre).filter(Boolean))];

  const handleCreate    = f  => { crearProducto({ ...f, fecha: new Date().toLocaleDateString("es-CO") }); showToast("Producto creado"); setModal(null); };
  const handleEdit      = f  => { editarProducto(f); showToast("Cambios guardados"); setModal(null); };
  const handleDelete    = () => { eliminarProducto(modal.product.id); showToast("Producto eliminado", "error"); setModal(null); };
  const handleSaveFicha = f  => { guardarFicha(modal.product.id, f); showToast("Ficha técnica guardada"); setModal(null); };

  const handleSalida = async (payload) => {
    if (!registrarSalidaProducto) { showToast("Función no disponible", "error"); setModal(null); return { ok: false }; }
    const result = registrarSalidaProducto(payload);
    if (result?.ok !== false) { showToast("Salida registrada y stock actualizado"); setModal(null); return { ok: true }; }
    showToast(result.razon || "Error en la salida", "error"); setModal(null); return { ok: false };
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Productos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input" placeholder="Buscar por nombre o categoría…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`} onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 200 }}>
                <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: 1.5 }}>Categoría</div>
                {catsEnUso.map(c => (
                  <button key={c} className={`filter-option${filterCat === c ? " active" : ""}`} onClick={() => setFilterCat(c)}>
                    <span className="filter-dot" style={{ background: filterCat === c ? "#43a047" : "#bdbdbd" }} />{c}
                  </button>
                ))}
                <div style={{ height: 1, background: "#f5f5f5", margin: "4px 0" }} />
                <div style={{ padding: "4px 14px", fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: 1.5 }}>Estado</div>
                {ESTADOS_FILTER.map(st => (
                  <button key={st} className={`filter-option${filterEst === st ? " active" : ""}`} onClick={() => setFilterEst(st)}>
                    <span className="filter-dot" style={{ background: ESTADO_DOT[st] || "#bdbdbd" }} />{st}
                  </button>
                ))}
                {hasFilter && (
                  <div style={{ padding: "4px 14px 8px" }}>
                    <button onClick={() => { setFilterCat("Todas"); setFilterEst("Todos"); setShowFilter(false); }}
                      style={{ width: "100%", padding: 6, borderRadius: 7, border: "1px solid #e0e0e0", background: "transparent", color: "#e53935", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>Agregar <span style={{ fontSize: 18 }}>+</span></button>
        </div>

        {/* Tabla */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr><th>Nº</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="empty-state__icon">🍌</div><p className="empty-state__text">Sin resultados</p></div></td></tr>
                ) : paginated.map((p, idx) => {
                  const cat = getCatProducto(p.idCategoria);
                  return (
                    <tr key={p.id} className="tbl-row">
                      <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                      <td><div className="cat-cell"><ProductImg preview={p.imagenPreview} nombre={p.nombre} /><span className="cat-name">{p.nombre}</span></div></td>
                      <td><CatCell cat={cat} /></td>
                      <td><span style={{ fontWeight: 700, color: "#2e7d32", fontSize: 14 }}>${p.precio?.toLocaleString("es-CO")}</span></td>
                      <td><span style={{ fontWeight: 700, fontSize: 14, color: p.stock === 0 ? "#c62828" : p.stock < (p.stockMinimo ?? 10) ? "#f57f17" : "#2e7d32" }}>{p.stock}</span></td>
                      <td><EstadoBadge stock={p.stock} stockMinimo={p.stockMinimo} /></td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"   title="Ver detalle"      onClick={() => setModal({ type: "ver",      product: p })}>👁</button>
                          <button className="act-btn act-btn--edit"   title="Editar"           onClick={() => setModal({ type: "editar",   product: p })}>✎</button>
                          <button className="act-btn act-btn--ficha"  title="Ficha técnica"    onClick={() => setModal({ type: "ficha",    product: p })}>📋</button>
                          <button className="act-btn act-btn--salida" title="Registrar salida" onClick={() => setModal({ type: "salida",   product: p })}>🚚</button>
                          <button className="act-btn act-btn--delete" title="Eliminar"         onClick={() => setModal({ type: "eliminar", product: p })}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "producto" : "productos"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Modales ══ */}
      {modal?.type === "crear"    && <CrearProducto onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarProducto product={modal.product} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerProducto product={modal.product} catObj={getCatProducto(modal.product.idCategoria)} onClose={() => setModal(null)} />}
      {modal?.type === "salida"   && (
        <SalidaModal
          entidad={modal.product}
          tipo="producto"
          stockActual={modal.product.stock}
          unidadLabel="uds."
          onClose={() => setModal(null)}
          onConfirm={handleSalida}
        />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarValidado
          titulo="Eliminar producto"
          descripcion={`¿Eliminar "${modal.product.nombre}"?`}
          validacion={canDeleteProducto(modal.product.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
      {modal?.type === "ficha" && (
        modal.product.ficha
          ? <EditarFicha ficha={modal.product.ficha} mode="edit" onClose={() => setModal(null)} onSave={handleSaveFicha} />
          : <CrearFicha  productoNombre={modal.product.nombre} productoCategoria={getCatProducto(modal.product.idCategoria)?.nombre} onClose={() => setModal(null)} onSave={handleSaveFicha} />
      )}
      <Toast toast={toast} />
    </div>
  );
}