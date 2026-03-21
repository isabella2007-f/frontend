import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { LotesInsumoPanel } from "../../compras/gestioncompras/EditarCompra.jsx";
import CrearInsumo from "./CrearInsumo.jsx";
import EditarInsumo from "./EditarInsumo.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import "./GestionInsumos.css";

const ITEMS_PER_PAGE = 8;

function calcEstado(actual, minimo) {
  if (actual === 0)    return "agotado";
  if (actual < minimo) return "bajo";
  return "disponible";
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#bdbdbd", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.4)" : "none" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label">{value ? "ON" : ""}</span>
      </span>
    </button>
  );
}

function StockBar({ actual, minimo }) {
  const [hovered, setHovered] = useState(false);
  const pct   = minimo > 0 ? Math.min(100, Math.round((actual / (minimo * 2)) * 100)) : 100;
  const est   = calcEstado(actual, minimo);
  const color = est === "agotado" ? "#ef5350" : est === "bajo" ? "#ffa726" : "#43a047";
  const tipMap = {
    disponible: { label: "Disponible", bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" },
    bajo:       { label: "Stock bajo", bg: "#fff8e1", border: "#ffe082", text: "#f57f17" },
    agotado:    { label: "Agotado",    bg: "#ffebee", border: "#ef9a9a", text: "#c62828" },
  };
  const tip = tipMap[est];
  return (
    <div className="stock-cell" style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="stock-bar-wrap">
        <div className="stock-bar" style={{ width: pct + "%", background: color }} />
      </div>
      <span className="stock-nums"><strong>{actual}</strong> / mín {minimo}</span>
      {hovered && (
        <div className="stock-tooltip" style={{ background: tip.bg, border: `1px solid ${tip.border}`, color: tip.text }}>
          <span className="stock-tooltip__dot" style={{ background: color }} />
          {tip.label}
          {est === "bajo" && <span style={{ fontWeight: 400, opacity: 0.8 }}> · faltan {minimo - actual}</span>}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MODAL VER INSUMO — reorganizado con LotesInsumoPanel
════════════════════════════════════════════════════════════ */
function VerInsumo({ ins, onClose }) {
  const { getCatInsumo, getUnidad, getStockRealInsumo } = useApp();
  const [tab, setTab] = useState("info"); // "info" | "lotes"

  const cat       = getCatInsumo(ins.idCategoria);
  const unidad    = getUnidad(ins.idUnidad);
  const est       = calcEstado(ins.stockActual, ins.stockMinimo);
  const stockReal = getStockRealInsumo(ins.id);

  const estConfig = {
    disponible: { label: "Disponible", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "✅" },
    bajo:       { label: "Stock bajo", color: "#f57f17", bg: "#fff8e1", border: "#ffe082", icon: "⚠️" },
    agotado:    { label: "Agotado",    color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "🚫" },
  };
  const ec = estConfig[est];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 40px)" }}>

        {/* ── Header ── */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="ver-ins-avatar">{cat.icon}</div>
            <div>
              <p className="modal-header__eyebrow">INSUMO #{String(ins.id).padStart(4, "0")}</p>
              <h2 className="modal-header__title">{ins.nombre}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="ver-ins-tabs">
          <button
            className={`ver-ins-tab ${tab === "info" ? "ver-ins-tab--active" : ""}`}
            onClick={() => setTab("info")}
          >
            📋 Información
          </button>
          <button
            className={`ver-ins-tab ${tab === "lotes" ? "ver-ins-tab--active" : ""}`}
            onClick={() => setTab("lotes")}
          >
            📦 Lotes en inventario
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>

          {tab === "info" && (
            <>
              {/* Alerta de stock si aplica */}
              {est !== "disponible" && (
                <div className="ver-ins-alerta" style={{ borderColor: ec.border, background: ec.bg, color: ec.color }}>
                  {ec.icon} <strong>{ec.label}</strong>
                  {est === "bajo" && ` — faltan ${ins.stockMinimo - ins.stockActual} ${unidad.simbolo} para alcanzar el mínimo`}
                  {est === "agotado" && " — este insumo no tiene stock disponible"}
                </div>
              )}

              {/* Bloque principal: categoría + unidad + estado */}
              <p className="ver-ins-section-label">Clasificación</p>
              <div className="ver-ins-grid">
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Categoría</span>
                  <span className="cat-chip" style={{ display: "inline-flex" }}>
                    <span className="cat-chip__icon">{cat.icon}</span>{cat.nombre}
                  </span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Unidad de medida</span>
                  <span className="unidad-badge">{unidad.simbolo} — {unidad.nombre}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Estado operativo</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Toggle value={ins.estado} onChange={() => {}} />
                    <span style={{ fontSize: 12, color: ins.estado ? "#2e7d32" : "#9e9e9e", fontWeight: 700 }}>
                      {ins.estado ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <p className="ver-ins-section-label">Stock</p>
              <div className="ver-ins-stock-cards">
                <div className="ver-ins-stock-card ver-ins-stock-card--actual">
                  <span className="ver-ins-stock-card__num">{ins.stockActual}</span>
                  <span className="ver-ins-stock-card__label">Stock actual</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
                <div className="ver-ins-stock-card ver-ins-stock-card--minimo">
                  <span className="ver-ins-stock-card__num">{ins.stockMinimo}</span>
                  <span className="ver-ins-stock-card__label">Stock mínimo</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
                <div className="ver-ins-stock-card ver-ins-stock-card--real">
                  <span className="ver-ins-stock-card__num">{stockReal}</span>
                  <span className="ver-ins-stock-card__label">Stock real (lotes vigentes)</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
              </div>

              {/* Barra visual */}
              <div style={{ marginTop: 12 }}>
                <StockBar actual={ins.stockActual} minimo={ins.stockMinimo} />
              </div>

              {/* Diferencia stock real vs registrado */}
              {stockReal !== ins.stockActual && (
                <div className="ver-ins-diff-aviso">
                  ℹ️ El stock real de lotes ({stockReal} {unidad.simbolo}) difiere del stock registrado ({ins.stockActual} {unidad.simbolo}). Esto puede deberse a lotes vencidos o consumo en producción.
                </div>
              )}
            </>
          )}

          {tab === "lotes" && (
            <LotesInsumoPanel idInsumo={ins.id} />
          )}

        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function GestionInsumos() {
  const {
    insumos, categoriasInsumosActivas, categoriasInsumos, unidades,
    getCatInsumo, getUnidad,
    crearInsumo, editarInsumo, toggleInsumo, eliminarInsumo,
    canDeleteInsumo,
  } = useApp();

  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("todas");
  const [filterEst,  setFilterEst]  = useState("todos");
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
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = insumos.filter(ins => {
    const q   = search.toLowerCase();
    const cat = getCatInsumo(ins.idCategoria);
    const matchQ   = ins.nombre.toLowerCase().includes(q) || cat.nombre.toLowerCase().includes(q);
    const matchCat = filterCat === "todas" || ins.idCategoria === Number(filterCat);
    const est      = calcEstado(ins.stockActual, ins.stockMinimo);
    const matchEst = filterEst === "todos" || filterEst === est ||
      (filterEst === "activo"   ? ins.estado  :
       filterEst === "inactivo" ? !ins.estado : true);
    return matchQ && matchCat && matchEst;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filterCat, filterEst]);

  const handleCreate = f  => { crearInsumo(f);   showToast("Insumo creado");    setModal(null); };
  const handleEdit   = f  => { editarInsumo(f);  showToast("Cambios guardados"); setModal(null); };
  const handleDelete = () => { eliminarInsumo(modal.ins.id); showToast("Insumo eliminado", "error"); setModal(null); };

  const statsDisp = insumos.filter(i => calcEstado(i.stockActual, i.stockMinimo) === "disponible").length;
  const statsBajo = insumos.filter(i => calcEstado(i.stockActual, i.stockMinimo) === "bajo").length;
  const statsAgot = insumos.filter(i => calcEstado(i.stockActual, i.stockMinimo) === "agotado").length;

  const filterEstOptions = [
    { val: "todos",      label: "Todos",      dot: "#bdbdbd" },
    { val: "disponible", label: "Disponible", dot: "#43a047" },
    { val: "bajo",       label: "Stock bajo", dot: "#ffa726" },
    { val: "agotado",    label: "Agotado",    dot: "#ef5350" },
    { val: "activo",     label: "Activo",     dot: "#2196f3" },
    { val: "inactivo",   label: "Inactivo",   dot: "#9e9e9e" },
  ];

  const hasFilter = filterCat !== "todas" || filterEst !== "todos";

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Insumos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "#e8f5e9" }}>🧺</div>
            <div><div className="stat-card__num">{insumos.length}</div><div className="stat-card__label">Total insumos</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "#e8f5e9" }}>✅</div>
            <div><div className="stat-card__num" style={{ color: "#2e7d32" }}>{statsDisp}</div><div className="stat-card__label">Disponibles</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "#fff8e1" }}>⚠️</div>
            <div><div className="stat-card__num" style={{ color: "#f57f17" }}>{statsBajo}</div><div className="stat-card__label">Stock bajo</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon" style={{ background: "#ffebee" }}>🚫</div>
            <div><div className="stat-card__num" style={{ color: "#c62828" }}>{statsAgot}</div><div className="stat-card__label">Agotados</div></div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text" className="search-input"
              placeholder="Buscar por nombre o categoría…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 170 }}>
                <p className="filter-section-title">Categoría</p>
                <button
                  className={`filter-option${filterCat === "todas" ? " active" : ""}`}
                  onClick={() => setFilterCat("todas")}
                >
                  <span className="filter-dot" style={{ background: "#bdbdbd" }} />Todas
                </button>
                {categoriasInsumos.map(c => (
                  <button
                    key={c.id}
                    className={`filter-option${filterCat === c.id ? " active" : ""}`}
                    onClick={() => setFilterCat(c.id)}
                  >
                    <span style={{ fontSize: 14 }}>{c.icon}</span>{c.nombre}
                  </button>
                ))}
                <p className="filter-section-title" style={{ marginTop: 6 }}>Estado</p>
                {filterEstOptions.map(f => (
                  <button
                    key={f.val}
                    className={`filter-option${filterEst === f.val ? " active" : ""}`}
                    onClick={() => { setFilterEst(f.val); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* Tabla */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Insumo</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Stock</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🧺</div>
                        <p className="empty-state__text">
                          {hasFilter || search ? "Sin insumos que coincidan." : "Sin insumos registrados"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((ins, idx) => {
                  const cat    = getCatInsumo(ins.idCategoria);
                  const unidad = getUnidad(ins.idUnidad);
                  return (
                    <tr key={ins.id} className="tbl-row">
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#bdbdbd" }}>
                          {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="insumo-name-cell">
                          <span className="insumo-name">{ins.nombre}</span>
                          <span className="insumo-id">#{String(ins.id).padStart(4, "0")}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cat-chip">
                          <span className="cat-chip__icon">{cat.icon}</span>{cat.nombre}
                        </span>
                      </td>
                      <td><span className="unidad-badge">{unidad.simbolo}</span></td>
                      <td><StockBar actual={ins.stockActual} minimo={ins.stockMinimo} /></td>
                      <td><Toggle value={ins.estado} onChange={() => toggleInsumo(ins.id)} /></td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"
                            onClick={() => setModal({ type: "ver", ins })}>👁</button>
                          <button className="act-btn act-btn--edit"
                            onClick={() => setModal({ type: "editar", ins })}>✎</button>
                          <button className="act-btn act-btn--delete"
                            onClick={() => setModal({ type: "eliminar", ins })}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "insumo" : "insumos"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>

      </div>

      {/* Modales */}
      {modal?.type === "crear"    && <CrearInsumo onClose={() => setModal(null)} onSave={handleCreate} categorias={categoriasInsumosActivas} unidades={unidades} />}
      {modal?.type === "editar"   && <EditarInsumo ins={modal.ins} onClose={() => setModal(null)} onSave={handleEdit} categorias={categoriasInsumosActivas} unidades={unidades} />}
      {modal?.type === "ver"      && <VerInsumo ins={modal.ins} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && (
        <ModalEliminarValidado
          titulo="Eliminar insumo"
          descripcion={`¿Eliminar "${modal.ins.nombre}"?`}
          validacion={canDeleteInsumo(modal.ins.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
          <span className="toast-icon">{toast.type === "error" ? "🗑️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}