import { useState, useEffect, useRef } from "react";
import { C } from "./theme.js";
import { Toast, ModalOverlay } from "./ui.jsx";
import CrearCategoria from "./CrearCategoria.jsx";
import EditarCategoria from "./EditarCategoria.jsx";
import "./Categoriaproductos.css";

const initialCategories = [
  { id: 1, nombre: "Congelados", descripcion: "Productos fríos a base de plátano",  estado: true,  fecha: "12/12/2025", icon: "🧊" },
  { id: 2, nombre: "Postres",    descripcion: "Productos dulces de plátano",         estado: true,  fecha: "12/12/2025", icon: "🍮" },
  { id: 3, nombre: "Snacks",     descripcion: "Tostones y chips de plátano",         estado: false, fecha: "01/01/2026", icon: "🍟" },
  { id: 4, nombre: "Harinas",    descripcion: "Harinas y mezclas de plátano verde", estado: true,  fecha: "20/02/2026", icon: "🌾" },
  { id: 5, nombre: "Orgánicos",  descripcion: "Línea orgánica certificada",          estado: false, fecha: "28/02/2026", icon: "🌿" },
];

const ITEMS_PER_PAGE = 4;

/* ── Toggle ──────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="toggle-btn"
      style={{
        background: value ? "#43a047" : "#c62828",
        boxShadow: value
          ? "0 2px 8px rgba(67,160,71,0.45)"
          : "0 2px 8px rgba(198,40,40,0.3)",
      }}
    >
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>
          {value ? "ON" : "OFF"}
        </span>
      </span>
    </button>
  );
}

/* ── Status pill ─────────────────────────────────────────── */
function StatusPill({ active }) {
  return (
    <span
      className="status-pill"
      style={{
        background: active ? "#e8f5e9" : "#f5f5f5",
        color:      active ? "#2e7d32" : "#9e9e9e",
        border:     `1px solid ${active ? "#a5d6a7" : "#e0e0e0"}`,
      }}
    >
      <span className="status-dot" style={{ background: active ? "#43a047" : "#bdbdbd" }} />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

/* ── Delete modal ────────────────────────────────────────── */
function EliminarCategoria({ category, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => {
    setDeleting(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm();
  };
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar categoría</h3>
          <p className="delete-body">¿Eliminar <strong>"{category.nombre}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ── Ver modal ───────────────────────────────────────────── */
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
        <div className="form-group">
          <label className="form-label">Ícono</label>
          <span style={{ fontSize: 30 }}>{category.icon}</span>
        </div>
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <div className="field-input field-input--disabled">{category.nombre}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <div className="field-input field-input--disabled" style={{ minHeight: 68, lineHeight: 1.5 }}>
            {category.descripcion}
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Estado</label>
          <StatusPill active={category.estado} />
        </div>
        {category.fecha && (
          <div className="date-info">
            <span>📅</span>
            <span>Creada el <strong>{category.fecha}</strong></span>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </ModalOverlay>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function CategoriaProductos() {
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef = useRef(null);

  // close filter dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = categories.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);
    const matchE = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filter]);

  const handleCreate = form => { setCategories(p => [form, ...p]); showToast("Categoría creada"); setModal(null); };
  const handleEdit   = form => { setCategories(p => p.map(c => c.id === form.id ? form : c)); showToast("Cambios guardados"); setModal(null); };
  const handleDelete = ()   => { setCategories(p => p.filter(c => c.id !== modal.category.id)); showToast("Categoría eliminada", "error"); setModal(null); };
  const handleToggle = id   => setCategories(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));

  const filterOptions = [
    { val: "todos",    label: "Todos",     dot: "#bdbdbd" },
    { val: "activo",   label: "Activos",   dot: "#43a047" },
    { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
  ];

  return (
    <div className="page-wrapper">

      {/* ── Header band ── */}
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Categorías de Productos</h1>
        <div className="page-header__line" />
      </div>

      {/* ── Content ── */}
      <div className="page-inner">

        {/* Toolbar: search + filter icon + agregar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre o descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter icon with dropdown */}
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${filter !== "todos" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
              title="Filtrar"
            >
              ▼
            </button>
            {showFilter && (
              <div className="filter-dropdown">
                {filterOptions.map(f => (
                  <button
                    key={f.val}
                    className={`filter-option${filter === f.val ? " active" : ""}`}
                    onClick={() => { setFilter(f.val); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: f.dot }} />
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Agregar <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          </button>
        </div>

        {/* Table card */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🍌</div>
                        <p className="empty-state__text">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((cat, idx) => (
                  <tr key={cat.id} className="tbl-row">
                    <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                    <td>
                      <div className="cat-cell">
                        <div className="cat-icon-box">{cat.icon}</div>
                        <span className="cat-name">{cat.nombre}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <span className="cat-desc">{cat.descripcion}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Toggle value={cat.estado} onChange={() => handleToggle(cat.id)} />
                      </div>
                    </td>
                    <td><span className="cat-date">{cat.fecha}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   title="Ver"      onClick={() => setModal({ type: "ver",      category: cat })}>👁</button>
                        <button className="act-btn act-btn--edit"   title="Editar"   onClick={() => setModal({ type: "editar",   category: cat })}>✎</button>
                        <button className="act-btn act-btn--delete" title="Eliminar" onClick={() => setModal({ type: "eliminar", category: cat })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "categoría" : "categorías"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "crear"    && <CrearCategoria onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarCategoria category={modal.category} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerCategoria category={modal.category} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && <EliminarCategoria category={modal.category} onClose={() => setModal(null)} onConfirm={handleDelete} />}

      <Toast toast={toast} />
    </div>
  );
}