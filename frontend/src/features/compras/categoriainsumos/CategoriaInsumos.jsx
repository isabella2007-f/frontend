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

function StatusPill({ active }) {
  return (
    <span
      className="status-pill"
      style={{
        background: active ? "#e8f5e9" : "#f5f5f5",
        color: active ? "#2e7d32" : "#9e9e9e",
        border: `1px solid ${active ? "#a5d6a7" : "#e0e0e0"}`,
      }}
    >
      <span
        className="status-dot"
        style={{ background: active ? "#43a047" : "#bdbdbd" }}
      />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function VerCategoria({ cat, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">Categorías de Insumo</p>
          <h2 className="modal-header__title">Detalle de Categoría</h2>
        </div>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            gap: 20,
            marginBottom: 16,
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Ícono</label>
            <div
              style={{
                width: "100%",
                height: 46,
                borderRadius: 10,
                background: "#f1f8f1",
                border: "1px solid #c8e6c9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              {cat.icon}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre</label>
            <div className="field-input field-input--disabled">{cat.nombre}</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <div
            className="field-input field-input--disabled"
            style={{ minHeight: 60, lineHeight: 1.4, fontSize: 13 }}
          >
            {cat.descripcion || "Sin descripción registrada."}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 8,
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado actual</label>
            <StatusPill active={cat.estado} />
          </div>
          {cat.fecha && (
            <div style={{ textAlign: "right", fontSize: 11, color: "#9e9e9e" }}>
              <p style={{ margin: 0 }}>Fecha de creación</p>
              <strong style={{ color: "#616161" }}>{cat.fecha}</strong>
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </ModalOverlay>
  );
}

export default function CategoriaInsumos() {
  const {
    categoriasInsumos, insumos,
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
      if (filterRef.current && !filterRef.current.contains(e.target))
        setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = categoriasInsumos.filter(c => {
    const q      = search.toLowerCase();
    const matchQ = c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);
    const matchE = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  useEffect(() => setPage(1), [search, filter]);

  /* ── Toggle con validación de insumos asociados ── */
  const handleToggle = (cat) => {
    // Solo validar cuando se intenta DESACTIVAR (estado actual = true)
    if (cat.estado) {
      const insumosAsociados = insumos.filter(i => i.idCategoria === cat.id && i.estado);
      if (insumosAsociados.length > 0) {
        showToast(
          `No se puede desactivar "${cat.nombre}": tiene ${insumosAsociados.length} insumo${insumosAsociados.length > 1 ? "s" : ""} activo${insumosAsociados.length > 1 ? "s" : ""} asociado${insumosAsociados.length > 1 ? "s" : ""}.`,
          "error"
        );
        return;
      }
    }
    toggleCatInsumo(cat.id);
  };

  const handleCreate = f => {
    crearCatInsumo({ ...f, fecha: new Date().toLocaleDateString("es-CO") });
    showToast("Categoría creada");
    setModal(null);
  };
  const handleEdit   = f  => { editarCatInsumo(f);                showToast("Cambios guardados");          setModal(null); };
  const handleDelete = () => { eliminarCatInsumo(modal.cat.id);   showToast("Categoría eliminada", "error"); setModal(null); };

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
              type="text"
              className="search-input"
              placeholder="Buscar por nombre o descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
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
                    <span className="filter-dot" style={{ background: f.dot }} />
                    {f.label}
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
                      {/* Toggle con validación inline */}
                      <Toggle value={cat.estado} onChange={() => handleToggle(cat)} />
                    </td>
                    <td>
                      <span className="cat-date">{cat.fecha}</span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="act-btn act-btn--view"
                          onClick={() => setModal({ type: "ver", cat })}
                        >👁</button>
                        <button
                          className="act-btn act-btn--edit"
                          onClick={() => setModal({ type: "editar", cat })}
                        >✎</button>
                        <button
                          className="act-btn act-btn--delete"
                          onClick={() => setModal({ type: "eliminar", cat })}
                        >🗑️</button>
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
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
              >«</button>
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >›</button>
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
              >»</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "crear"    && <CrearCategoriaInsumo onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarCategoriaInsumo cat={modal.cat} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerCategoria cat={modal.cat} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && (
        <ModalEliminarValidado
          titulo="Eliminar categoría"
          descripcion={`¿Está seguro de que desea eliminar la categoría "${modal.cat.nombre}"?`}
          validacion={canDeleteCatInsumo(modal.cat.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}