import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Toast, ModalOverlay } from "./ui.jsx";
import CrearCategoria from "./CrearCategoria.jsx";
import EditarCategoria from "./EditarCategoria.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import "./Categoriaproductos.css";

const ITEMS_PER_PAGE = 4;

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

function StatusPill({ active }) {
  return (
    <span className="status-pill" style={{ background: active ? "#e8f5e9" : "#f5f5f5", color: active ? "#2e7d32" : "#9e9e9e", border: `1px solid ${active ? "#a5d6a7" : "#e0e0e0"}` }}>
      <span className="status-dot" style={{ background: active ? "#43a047" : "#bdbdbd" }} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function VerCategoria({ category, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categorías</p>
          <h2 className="modal-header__title">Detalle</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-group"><label className="form-label">Ícono</label><span style={{ fontSize: 30 }}>{category.icon}</span></div>
        <div className="form-group"><label className="form-label">Nombre</label><div className="field-input field-input--disabled">{category.nombre}</div></div>
        <div className="form-group"><label className="form-label">Descripción</label><div className="field-input field-input--disabled" style={{ minHeight: 68, lineHeight: 1.5 }}>{category.descripcion}</div></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Estado</label><StatusPill active={category.estado} /></div>
        {category.fecha && <div className="date-info"><span>📅</span><span>Creada el <strong>{category.fecha}</strong></span></div>}
      </div>
      <div className="modal-footer"><button className="btn-ghost" onClick={onClose}>Cerrar</button></div>
    </ModalOverlay>
  );
}

export default function CategoriaProductos() {
  const {
    categoriasProductos,
    crearCatProducto, editarCatProducto, toggleCatProducto, eliminarCatProducto,
    canDeleteCatProducto,
  } = useApp();

  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef(null);

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = categoriasProductos.filter(c => {
    const q = search.toLowerCase();
    return (c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q)) &&
      (filter === "todos" || (filter === "activo" ? c.estado : !c.estado));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filter]);

  const handleCreate = f  => { crearCatProducto({ ...f, fecha: new Date().toLocaleDateString("es-CO") }); showToast("Categoría creada"); setModal(null); };
  const handleEdit   = f  => { editarCatProducto(f); showToast("Cambios guardados"); setModal(null); };
  const handleDelete = () => { eliminarCatProducto(modal.category.id); showToast("Categoría eliminada", "error"); setModal(null); };

  const filterOptions = [
    { val: "todos", label: "Todos", dot: "#bdbdbd" },
    { val: "activo", label: "Activos", dot: "#43a047" },
    { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Categorías de Productos</h1>
        <div className="page-header__line" />
      </div>
      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input" placeholder="Buscar por nombre o descripción…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${filter !== "todos" ? " has-filter" : ""}`} onClick={() => setShowFilter(v => !v)} title="Filtrar">▼</button>
            {showFilter && (
              <div className="filter-dropdown">
                {filterOptions.map(f => (
                  <button key={f.val} className={`filter-option${filter === f.val ? " active" : ""}`} onClick={() => { setFilter(f.val); setShowFilter(false); }}>
                    <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>Agregar <span style={{ fontSize: 18 }}>+</span></button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead><tr><th>Nº</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state__icon">🍌</div><p className="empty-state__text">Sin resultados</p></div></td></tr>
                ) : paginated.map((cat, idx) => (
                  <tr key={cat.id} className="tbl-row">
                    <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                    <td>
                      <div className="cat-cell">
                        <div className="cat-icon-box">{cat.icon}</div>
                        <span className="cat-name">{cat.nombre}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}><span className="cat-desc">{cat.descripcion}</span></td>
                    <td><Toggle value={cat.estado} onChange={() => toggleCatProducto(cat.id)} /></td>
                    <td><span className="cat-date">{cat.fecha}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   onClick={() => setModal({ type: "ver",      category: cat })}>👁</button>
                        <button className="act-btn act-btn--edit"   onClick={() => setModal({ type: "editar",   category: cat })}>✎</button>
                        <button className="act-btn act-btn--delete" onClick={() => setModal({ type: "eliminar", category: cat })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "categoría" : "categorías"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "crear"    && <CrearCategoria onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarCategoria category={modal.category} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerCategoria category={modal.category} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && (
        <ModalEliminarValidado
          titulo="Eliminar categoría"
          descripcion={`¿Eliminar "${modal.category.nombre}"?`}
          validacion={canDeleteCatProducto(modal.category.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}