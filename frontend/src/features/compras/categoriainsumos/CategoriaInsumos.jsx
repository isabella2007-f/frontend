import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Toast, ModalOverlay } from "./ui.jsx";
import CrearCategoriaInsumo from "./CrearCategoriaInsumo.jsx";
import EditarCategoriaInsumo from "./EditarCategoriaInsumo.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import "./CategoriaInsumos.css";

const ITEMS_PER_PAGE = 5;

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#bdbdbd", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "none" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label">{value ? "ON" : ""}</span>
      </span>
    </button>
  );
}

function InsumosPills({ insumos = [] }) {
  const MAX  = 3;
  const rest = insumos.length - MAX;
  return (
    <div className="insumos-pills">
      {insumos.slice(0, MAX).map(i => <span key={i} className="insumo-pill">{i}</span>)}
      {rest > 0 && <span className="insumo-pill insumo-pill--more">+{rest} más</span>}
      {insumos.length === 0 && <span className="insumo-pill insumo-pill--empty">Sin insumos</span>}
    </div>
  );
}

function VerCategoria({ cat, insumosDeCategoria, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categoría de insumos</p>
          <h2 className="modal-header__title">Detalle</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Ícono</label>
          <span style={{ fontSize: 32 }}>{cat.icon}</span>
        </div>
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <div className="field-input field-input--disabled">{cat.nombre}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <div className="field-input field-input--disabled" style={{ minHeight: 60 }}>{cat.descripcion}</div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Estado</label>
          <span className="status-pill" style={{
            background: cat.estado ? "#e8f5e9" : "#f5f5f5",
            color: cat.estado ? "#2e7d32" : "#9e9e9e",
            border: `1px solid ${cat.estado ? "#a5d6a7" : "#e0e0e0"}`
          }}>
            <span className="status-dot" style={{ background: cat.estado ? "#43a047" : "#bdbdbd" }} />
            {cat.estado ? "Activo" : "Inactivo"}
          </span>
        </div>
        {cat.fecha && (
          <div className="date-info">
            <span>📅</span>
            <span>Creada el <strong>{cat.fecha}</strong></span>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </ModalOverlay>
  );
}

export default function CategoriaInsumos() {
  const {
    categoriasInsumos,
    insumosPorCategoriaId,          // ← nombres de insumos activos por idCategoria
    crearCatInsumo, editarCatInsumo, toggleCatInsumo, eliminarCatInsumo,
    canDeleteCatInsumo,
  } = useApp();

  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* Obtiene los nombres de insumos activos de una categoría */
  const getInsumosCat = (catId) => insumosPorCategoriaId[catId] || [];

  const filtered = categoriasInsumos.filter(c => {
    const q            = search.toLowerCase();
    const insumosNombres = getInsumosCat(c.id);
    const matchQ = (
      c.nombre.toLowerCase().includes(q) ||
      c.descripcion.toLowerCase().includes(q) ||
      insumosNombres.some(i => i.toLowerCase().includes(q))
    );
    const matchEst = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchEst;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filter]);

  const handleCreate = f  => { crearCatInsumo({ ...f, fecha: new Date().toLocaleDateString("es-CO") }); showToast("Categoría creada");    setModal(null); };
  const handleEdit   = f  => { editarCatInsumo(f);                                                      showToast("Cambios guardados");   setModal(null); };
  const handleDelete = () => { eliminarCatInsumo(modal.cat.id);                                         showToast("Categoría eliminada", "error"); setModal(null); };

  const filterOptions = [
    { val: "todos",    label: "Todos",     dot: "#bdbdbd" },
    { val: "activo",   label: "Activos",   dot: "#43a047" },
    { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Categorías de Insumos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text" className="search-input"
              placeholder="Buscar por nombre, descripción o insumo…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${filter !== "todos" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown">
                {filterOptions.map(f => (
                  <button
                    key={f.val}
                    className={`filter-option${filter === f.val ? " active" : ""}`}
                    onClick={() => { setFilter(f.val); setShowFilter(false); }}
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

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Insumos</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🧺</div>
                        <p className="empty-state__text">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((cat, idx) => (
                  <tr key={cat.id} className="tbl-row">
                    <td>
                      <span className="cat-num">
                        {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="cat-cell">
                        <div className="cat-icon-box">{cat.icon}</div>
                        <span className="cat-name">{cat.nombre}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span className="cat-desc">{cat.descripcion}</span>
                    </td>
                    <td>
                      {/* Muestra solo la cantidad de insumos asignados */}
                      <span className="cat-num">{getInsumosCat(cat.id).length} insumos</span>
                    </td>
                    <td>
                      <Toggle value={cat.estado} onChange={() => toggleCatInsumo(cat.id)} />
                    </td>
                    <td>
                      <span className="cat-date">{cat.fecha}</span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"
                          onClick={() => setModal({ type: "ver", cat })}>👁</button>
                        <button className="act-btn act-btn--edit"
                          onClick={() => setModal({ type: "editar", cat })}>✎</button>
                        <button className="act-btn act-btn--delete"
                          onClick={() => setModal({ type: "eliminar", cat })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "categoría" : "categorías"} en total
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

      {modal?.type === "crear"    && <CrearCategoriaInsumo onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarCategoriaInsumo cat={modal.cat} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && (
        <VerCategoria
          cat={modal.cat}
          insumosDeCategoria={getInsumosCat(modal.cat.id)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarValidado
          titulo="Eliminar categoría de insumos"
          descripcion={`¿Eliminar "${modal.cat.nombre}"?`}
          validacion={canDeleteCatInsumo(modal.cat.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}