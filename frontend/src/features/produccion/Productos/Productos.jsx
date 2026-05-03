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

const ITEMS_PER_PAGE = 5;

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
   SUB-COMPONENTES
══════════════════════════════════════════════════════════ */

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#c62828", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>{value ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

/* ── StockBar — igual que GestionInsumos ─────────────────── */
function StockBar({ actual, minimo }) {
  const [hovered, setHovered] = useState(false);
  const pct   = minimo > 0 ? Math.min(100, Math.round((actual / (minimo * 2)) * 100)) : 100;
  const est   = actual === 0 ? "agotado" : actual < minimo ? "bajo" : "disponible";
  const color = est === "agotado" ? "#ef5350" : est === "bajo" ? "#ffa726" : "#43a047";
  const tipMap = {
    disponible: { label: "Disponible", bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" },
    bajo:       { label: "Stock bajo", bg: "#fff8e1", border: "#ffe082", text: "#f57f17" },
    agotado:    { label: "Agotado",    bg: "#ffebee", border: "#ef9a9a", text: "#c62828" },
  };
  const tip = tipMap[est];
  return (
    <div
      style={{ position: "relative", minWidth: 120 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* barra */}
      <div style={{ height: 6, borderRadius: 4, background: "#f0f0f0", overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      {/* números */}
      <span style={{ fontSize: 12, fontWeight: 600, color: "#424242" }}>
        <strong style={{ color }}>{actual}</strong>
        <span style={{ color: "#bdbdbd" }}> / mín {minimo}</span>
      </span>
      {/* tooltip */}
      {hovered && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: tip.bg,
          border: `1px solid ${tip.border}`, color: tip.text,
          fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
          whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none",
          display: "flex", alignItems: "center", gap: 5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
          {tip.label}
          {est === "bajo" && (
            <span style={{ fontWeight: 400, opacity: 0.8 }}> · faltan {minimo - actual}</span>
          )}
        </div>
      )}
    </div>
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

function ProductImg({ previews, nombre }) {
  const thumb = previews && previews.length > 0 ? previews[0] : null;
  return thumb
    ? <img src={thumb} alt={nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid #c8e6c9", flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🍌</div>;
}

/* ══════════════════════════════════════════════════════════
   LOTES PANEL — Solo lectura, manual deshabilitado
══════════════════════════════════════════════════════════ */
function LotesProductoPanel({ idProducto }) {
  const { getLotesProducto } = useApp();
  const lotes = getLotesProducto ? getLotesProducto(idProducto) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="ver-ins-section-label" style={{ margin: 0, textTransform: "none" }}>Lotes en inventario</p>
      </div>

      <div className="form-info-box" style={{ marginBottom: 14, fontSize: 11 }}>
        <p>ℹ️ Los lotes se generan automáticamente al completar una <strong>Orden de Producción</strong>.</p>
      </div>

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
                    {vencido && <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828", background: "#ffebee", padding: "2px 8px", borderRadius: 20, border: "1px solid #ef9a9a" }}>Vencido</span>}
                    {pronto && !vencido && <span style={{ fontSize: 11, fontWeight: 700, color: "#e65100", background: "#fff3e0", padding: "2px 8px", borderRadius: 20, border: "1px solid #ffcc80" }}>Vence en {dias}d</span>}
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
   VER PRODUCTO
══════════════════════════════════════════════════════════ */
function VerProducto({ product, catObj, onClose }) {
  const { getLotesProducto, getSalidasProducto, getLotesVencidosProducto } = useApp();
  const [tab, setTab] = useState("info");
  const [imgIdx, setImgIdx] = useState(0);

  const minimo   = product.stockMinimo ?? 10;
  const estado   = calcEstado(product.stock, minimo);
  const s        = ESTADO_STYLES[estado];
  const salidas  = getSalidasProducto       ? getSalidasProducto(product.id)       : [];
  const vencidos = getLotesVencidosProducto ? getLotesVencidosProducto(product.id) : [];

  const resumenSalidas = salidas.reduce((acc, sal) => {
    acc[sal.tipo] = (acc[sal.tipo] || 0) + sal.cantidad;
    return acc;
  }, {});

  const previews = product.imagenesPreview || (product.imagenPreview ? [product.imagenPreview] : []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 40px)" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ProductImg previews={previews} nombre={product.nombre} />
            <div>
              <p className="modal-header__eyebrow">Producto</p>
              <h2 className="modal-header__title">{product.nombre}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ver-ins-tabs">
          {[{ key: "info", label: "📋 Información" }, { key: "lotes", label: "📦 Lotes" }, { key: "historial", label: "🕒 Historial" }].map(t => (
            <button key={t.key} className={`ver-ins-tab${tab === t.key ? " ver-ins-tab--active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>
          {tab === "info" && (
            <>
              {/* Galería de imágenes */}
              {previews.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ width: "100%", height: 220, borderRadius: 14, overflow: "hidden", border: "1.5px solid #e8f5e9", background: "#f9fdf9" }}>
                    <img src={previews[imgIdx]} alt={product.nombre} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  {previews.length > 1 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
                      {previews.map((url, i) => (
                        <div key={i} onClick={() => setImgIdx(i)} 
                          style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid ${imgIdx === i ? "#2e7d32" : "#e0e0e0"}`, flexShrink: 0 }}>
                          <img src={url} alt="thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                  <span className="ver-ins-field__label">Estado stock</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{estado}
                  </span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Activo</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{product.activo !== false ? "Sí" : "No"}</span>
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

          {tab === "lotes" && <LotesProductoPanel idProducto={product.id} />}

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
                          <span>{tc.icon}</span>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}: <span style={{ marginLeft: 2 }}>{total} uds.</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="ver-ins-section-label" style={{ textTransform: "none" }}>Lotes vencidos</p>
              {vencidos.length === 0
                ? <div className="empty-state" style={{ padding: "14px 20px" }}><p className="empty-state__text">No hay lotes vencidos registrados.</p></div>
                : <div className="lotes-lista" style={{ marginBottom: 18 }}>
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
              }

              <p className="ver-ins-section-label" style={{ textTransform: "none", marginTop: 4 }}>Historial de salidas</p>
              {salidas.length === 0
                ? <div className="empty-state" style={{ padding: "14px 20px" }}><p className="empty-state__text">Aún no hay salidas registradas.</p></div>
                : <div className="historial-list">
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
              }
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
    toggleActivoProducto,
  } = useApp();

  const location = useLocation();
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("Todas");
  const [filterEst,  setFilterEst]  = useState("Todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const filterRef = useRef();

  // ✅ DEEP LINKING: Abrir ficha técnica desde otras vistas
  useEffect(() => {
    if (location.state?.openFicha && productos.length > 0) {
      const p = productos.find(prod => prod.id === Number(location.state.openFicha));
      if (p) {
        setModal({ type: "ficha", product: p });
        // Limpiar estado para evitar que se abra de nuevo al recargar
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, productos]);

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
            <button type="button" className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`} onClick={() => setShowFilter(v => !v)}>▼</button>
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
                <tr>
                  <th>Nº</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="empty-state__icon">🍌</div><p className="empty-state__text">Sin resultados</p></div></td></tr>
                ) : paginated.map((p, idx) => {
                  const cat = getCatProducto(p.idCategoria);
                  const previews = p.imagenesPreview || (p.imagenPreview ? [p.imagenPreview] : []);
                  return (
                    <tr key={p.id} className="tbl-row">
                      <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                      <td><div className="cat-cell"><ProductImg previews={previews} nombre={p.nombre} /><span className="cat-name">{p.nombre}</span></div></td>
                      <td><CatCell cat={cat} /></td>
                      <td><span style={{ fontWeight: 700, color: "#2e7d32", fontSize: 14 }}>${p.precio?.toLocaleString("es-CO")}</span></td>

                      <td><StockBar actual={p.stock} minimo={p.stockMinimo ?? 10} /></td>

                      <td>
                        <Toggle
                          value={p.activo !== false}
                          onChange={() => toggleActivoProducto && toggleActivoProducto(p.id)}
                        />
                      </td>
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
          descripcion={`¿Está seguro de que desea eliminar el producto "${modal.product.nombre}"?`}
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
