import { useState, useEffect, useRef } from "react";
import { Toast, ModalOverlay } from "./ui.jsx";
import CrearProducto from "./CrearProducto.jsx";
import EditarProducto from "./EditarProducto.jsx";
import EditarFicha from "./ficha_tecnica/EditarFicha.jsx";
import CrearFicha from "./ficha_tecnica/CrearFicha.jsx";
import "./Productos.css";

const initialProducts = [
  { id: 1, nombre: "Muffin de plátano",      categoria: "Postres",    precio: 10000, stock: 50, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 2, nombre: "Palito de queso",          categoria: "Congelados", precio: 5000,  stock: 0,  stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 3, nombre: "Chips de plátano verde",   categoria: "Snacks",     precio: 3500,  stock: 7,  stockMinimo: 15, imagen: null, imagenPreview: null, fecha: "01/01/2026", ficha: null },
  { id: 4, nombre: "Harina de plátano 500g",   categoria: "Harinas",    precio: 12000, stock: 80, stockMinimo: 20, imagen: null, imagenPreview: null, fecha: "20/02/2026", ficha: null },
  { id: 5, nombre: "Tostones orgánicos",        categoria: "Orgánicos",  precio: 7500,  stock: 15, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "28/02/2026", ficha: null },
];

const CATEGORIAS_FILTER = ["Todas","Congelados","Postres","Snacks","Bebidas","Harinas","Orgánicos"];
const ITEMS_PER_PAGE    = 4;

/* ── Ícono por categoría ─────────────────────────────────── */
const CAT_ICONS = {
  "Congelados": "🧊", "Postres": "🍮", "Snacks": "🍟",
  "Bebidas": "🥤", "Harinas": "🌾", "Orgánicos": "🌿",
};

/* ── Estado automático ───────────────────────────────────── */
function calcEstado(stock, minimo) {
  return stock > 0 && stock >= minimo ? "Disponible" : "No disponible";
}

function calcTooltip(stock, minimo) {
  if (stock === 0)       return "Sin unidades en stock";
  if (stock < minimo)    return `Stock por debajo del mínimo (${minimo} uds.)`;
  return `Stock suficiente (mín. ${minimo} uds.)`;
}

const ESTADO_STYLES = {
  "Disponible":    { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  "No disponible": { bg: "#ffebee", color: "#c62828", border: "#ef9a9a" },
};

/* ── EstadoBadge con tooltip ─────────────────────────────── */
function EstadoBadge({ stock, stockMinimo }) {
  const minimo  = stockMinimo ?? 10;
  const estado  = calcEstado(stock, minimo);
  const tooltip = calcTooltip(stock, minimo);
  const s       = ESTADO_STYLES[estado];
  const [show, setShow] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        whiteSpace: "nowrap", cursor: "default",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
        {estado}
      </span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff",
          fontSize: 11, fontWeight: 500,
          padding: "5px 10px", borderRadius: 7,
          whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          pointerEvents: "none",
        }}>
          {tooltip}
          <span style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #1a1a1a",
          }} />
        </span>
      )}
    </span>
  );
}

/* ── CategoríaCell con hover ─────────────────────────────── */
function CatCell({ categoria }) {
  const [show, setShow] = useState(false);
  const icon = CAT_ICONS[categoria] || "📦";
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        width: 34, height: 34, borderRadius: 8,
        background: "#f1f8f1", border: "1px solid #c8e6c9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 17, cursor: "default",
      }}>{icon}</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#fff",
          fontSize: 11, fontWeight: 600,
          padding: "4px 10px", borderRadius: 7,
          whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          pointerEvents: "none",
        }}>
          {categoria}
          <span style={{
            position: "absolute", top: "100%", left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #1a1a1a",
          }} />
        </span>
      )}
    </span>
  );
}

/* ── Product image ───────────────────────────────────────── */
function ProductImg({ preview, nombre }) {
  return preview
    ? <img src={preview} alt={nombre} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid #c8e6c9", flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🍌</div>;
}

/* ── Delete modal ────────────────────────────────────────── */
function EliminarProducto({ product, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => { setDeleting(true); await new Promise(r => setTimeout(r, 500)); onConfirm(); };
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar producto</h3>
          <p className="delete-body">¿Eliminar <strong>"{product.nombre}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ── Ver producto ────────────────────────────────────────── */
function VerProducto({ product, onClose }) {
  const minimo = product.stockMinimo ?? 10;
  const estado = calcEstado(product.stock, minimo);
  const s      = ESTADO_STYLES[estado];
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Productos</p>
          <h2 className="modal-header__title">Detalle del producto</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <div className="field-input field-input--disabled">{product.nombre}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <div className="field-input field-input--disabled">{product.categoria}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Precio de venta</label>
            <div className="field-input field-input--disabled">${product.precio?.toLocaleString("es-CO")}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Stock</label>
            <div className="field-input field-input--disabled">{product.stock} unidades</div>
          </div>
          <div className="form-group">
            <label className="form-label">Stock mínimo</label>
            <div className="field-input field-input--disabled">{minimo} unidades</div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{estado}
            </span>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9e9e9e" }}>{calcTooltip(product.stock, minimo)}</p>
          </div>
        </div>
        {product.fecha && (
          <div className="date-info">
            <span>📅</span>
            <span>Creado el <strong>{product.fecha}</strong></span>
          </div>
        )}
        {product.imagenPreview && (
          <div style={{ marginTop: 14 }}>
            <label className="form-label">Imagen</label>
            <img src={product.imagenPreview} alt={product.nombre} style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: "1px solid #c8e6c9" }} />
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </ModalOverlay>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function GestionProductos() {
  const [products, setProducts]     = useState(initialProducts);
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("Todas");
  const [filterEst, setFilterEst]   = useState("Todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const ESTADOS_FILTER = ["Todos", "Disponible", "No disponible"];
  const ESTADO_DOT     = { "Disponible": "#43a047", "No disponible": "#ef5350" };

  const filtered = products.filter(p => {
    const q      = search.toLowerCase();
    const estado = calcEstado(p.stock, p.stockMinimo ?? 10);
    return (
      (p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)) &&
      (filterCat === "Todas" || p.categoria === filterCat) &&
      (filterEst === "Todos" || estado === filterEst)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filterCat, filterEst]);

  const hasFilter = filterCat !== "Todas" || filterEst !== "Todos";

  const handleCreate    = f  => { setProducts(p => [f, ...p]); showToast("Producto creado"); setModal(null); };
  const handleEdit      = f  => { setProducts(p => p.map(x => x.id === f.id ? f : x)); showToast("Cambios guardados"); setModal(null); };
  const handleDelete    = () => { setProducts(p => p.filter(x => x.id !== modal.product.id)); showToast("Producto eliminado", "error"); setModal(null); };
  const handleSaveFicha = f  => {
    setProducts(p => p.map(x => x.id === modal.product.id ? { ...x, ficha: f } : x));
    showToast("Ficha técnica guardada");
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Productos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input"
              placeholder="Buscar por nombre o categoría…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)} title="Filtrar">▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 200 }}>
                <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: 1.5 }}>Categoría</div>
                {CATEGORIAS_FILTER.map(c => (
                  <button key={c} className={`filter-option${filterCat === c ? " active" : ""}`} onClick={() => setFilterCat(c)}>
                    <span className="filter-dot" style={{ background: filterCat === c ? "#43a047" : "#bdbdbd" }} />{c}
                  </button>
                ))}
                <div style={{ height: 1, background: "#f5f5f5", margin: "4px 0" }} />
                <div style={{ padding: "4px 14px 4px", fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: 1.5 }}>Estado</div>
                {ESTADOS_FILTER.map(s => (
                  <button key={s} className={`filter-option${filterEst === s ? " active" : ""}`} onClick={() => setFilterEst(s)}>
                    <span className="filter-dot" style={{ background: ESTADO_DOT[s] || "#bdbdbd" }} />{s}
                  </button>
                ))}
                {hasFilter && (
                  <div style={{ padding: "4px 14px 8px" }}>
                    <button onClick={() => { setFilterCat("Todas"); setFilterEst("Todos"); setShowFilter(false); }}
                      style={{ width: "100%", padding: "6px", borderRadius: 7, border: "1px solid #e0e0e0", background: "transparent", color: "#e53935", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Agregar <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          </button>
        </div>

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
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state__icon">🍌</div>
                      <p className="empty-state__text">Sin resultados</p>
                    </div>
                  </td></tr>
                ) : paginated.map((p, idx) => (
                  <tr key={p.id} className="tbl-row">
                    <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                    <td>
                      <div className="cat-cell">
                        <ProductImg preview={p.imagenPreview} nombre={p.nombre} />
                        <span className="cat-name">{p.nombre}</span>
                      </div>
                    </td>
                    <td><CatCell categoria={p.categoria} /></td>
                    <td><span style={{ fontWeight: 700, color: "#2e7d32", fontSize: 14 }}>${p.precio?.toLocaleString("es-CO")}</span></td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: p.stock === 0 ? "#c62828" : p.stock < (p.stockMinimo ?? 10) ? "#f57f17" : "#2e7d32" }}>
                        {p.stock}
                      </span>
                    </td>
                    <td><EstadoBadge stock={p.stock} stockMinimo={p.stockMinimo} /></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   title="Ver"            onClick={() => setModal({ type: "ver",      product: p })}>👁</button>
                        <button className="act-btn act-btn--edit"   title="Editar"          onClick={() => setModal({ type: "editar",   product: p })}>✎</button>
                        <button className="act-btn act-btn--ficha"  title="Ficha técnica"  onClick={() => setModal({ type: "ficha",    product: p })}>📋</button>
                        <button className="act-btn act-btn--delete" title="Eliminar"        onClick={() => setModal({ type: "eliminar", product: p })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {modal?.type === "crear"    && <CrearProducto onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarProducto product={modal.product} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerProducto product={modal.product} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && <EliminarProducto product={modal.product} onClose={() => setModal(null)} onConfirm={handleDelete} />}
      {modal?.type === "ficha"    && (
        modal.product.ficha
          ? <EditarFicha ficha={modal.product.ficha} mode="edit" onClose={() => setModal(null)} onSave={handleSaveFicha} />
          : <CrearFicha productoNombre={modal.product.nombre} productoCategoria={modal.product.categoria} onClose={() => setModal(null)} onSave={handleSaveFicha} />
      )}

      <Toast toast={toast} />
    </div>
  );
}