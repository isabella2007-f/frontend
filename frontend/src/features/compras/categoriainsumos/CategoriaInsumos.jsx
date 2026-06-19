import { useState, useEffect, useRef } from "react";
import { fmtFecha } from "../../../utils/dateUtils.js";
import { Toast, ModalOverlay } from "./ui.jsx";
import CrearCategoriaInsumo from "./CrearCategoriaInsumo.jsx";
import EditarCategoriaInsumo from "./EditarCategoriaInsumo.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import {
  getCategorias,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  toggleEstadoCategoria,
} from "../../../services/categoriasInsumosService.js";
import "./CategoriaInsumos.css";

const ITEMS_PER_PAGE = 10;

const ADAPT = raw => ({
  id:           raw.ID_Categoria,
  nombre:       raw.Nombre_Categoria,
  descripcion:  raw.Descripcion ?? "",
  icon:         raw.Icono ?? "🧺",
  estado:       raw.Estado === 1,
  fecha:        fmtFecha(raw.Fecha_creacion),
  totalInsumos: raw.total_insumos ?? 0,
});

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
        color:      active ? "#2e7d32" : "#9e9e9e",
        border:     `1px solid ${active ? "#a5d6a7" : "#e0e0e0"}`,
      }}
    >
      <span className="status-dot" style={{ background: active ? "#43a047" : "#bdbdbd" }} />
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
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 20, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Ícono</label>
            <div style={{ width: "100%", height: 46, borderRadius: 10, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
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
          <div className="field-input field-input--disabled" style={{ minHeight: 60, lineHeight: 1.4, fontSize: 13 }}>
            {cat.descripcion || "Sin descripción registrada."}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
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

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={i} className="tbl-row">
      <td><div className="skeleton-cell" style={{ width: 28 }} /></td>
      <td><div className="skeleton-cell" style={{ width: "60%" }} /></td>
      <td><div className="skeleton-cell" style={{ width: "80%" }} /></td>
      <td><div className="skeleton-cell" style={{ width: 52 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
    </tr>
  ));
}

export default function CategoriaInsumos() {
  const [categorias,  setCategorias]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("todos");
  const [showFilter,  setShowFilter]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [modal,       setModal]       = useState(null);
  const [toast,       setToast]       = useState(null);
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

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await getCategorias();
      setCategorias((data.categorias ?? []).map(ADAPT));
    } catch (e) {
      showToast(e.message || "Error cargando categorías", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  /* ── Filtrado ── */
  const filtered = categorias.filter(c => {
    const q      = search.toLowerCase();
    const matchQ = c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);
    const matchE = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filter]);

  /* ── Toggle optimista ── */
  const handleToggle = async (cat) => {
    setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, estado: !c.estado } : c));
    try {
      await toggleEstadoCategoria(cat.id, cat.estado);
    } catch (e) {
      setCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, estado: cat.estado } : c));
      showToast(e.message || "Error al cambiar estado", "error");
    }
  };

  /* ── CRUD ── */
  const handleCreate = async (payload) => {
    try {
      await crearCategoria(payload);
      showToast("Categoría creada");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al crear la categoría", "error");
    }
  };

  const handleEdit = async (payload) => {
    try {
      await editarCategoria(modal.cat.id, payload);
      showToast("Cambios guardados");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al guardar cambios", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await eliminarCategoria(modal.cat.id);
      showToast("Categoría eliminada", "error");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al eliminar la categoría", "error");
    }
  };

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

          {(filter !== "todos" || search) && (
            <button className="btn-limpiar" onClick={() => { setSearch(""); setFilter("todos"); }}>
              ✕ Limpiar
            </button>
          )}

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div className="tbl-wrapper">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Fecha de creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : paginated.length === 0 ? (
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
                      <Toggle value={cat.estado} onChange={() => handleToggle(cat)} />
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
              <button className="pg-btn-arrow" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              <button className="pg-btn-arrow" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "crear"    && <CrearCategoriaInsumo onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarCategoriaInsumo cat={modal.cat} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <VerCategoria cat={modal.cat} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && (
        modal.cat.totalInsumos > 0 ? (
          <ModalOverlay onClose={() => setModal(null)}>
            <div className="modal-header">
              <div>
                <p className="modal-header__eyebrow">Categorías de Insumo</p>
                <h2 className="modal-header__title">No se puede eliminar</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "20px 24px 24px" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px", borderRadius: 10, background: "#fff3e0", border: "1px solid #ffcc80" }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>⚠️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#e65100", fontSize: 14 }}>
                    La categoría tiene {modal.cat.totalInsumos} insumo{modal.cat.totalInsumos !== 1 ? "s" : ""} asociado{modal.cat.totalInsumos !== 1 ? "s" : ""}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#424242" }}>
                    Debes reasignar o eliminar los insumos antes de poder eliminar la categoría <strong>"{modal.cat.nombre}"</strong>.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setModal(null)}>Entendido</button>
            </div>
          </ModalOverlay>
        ) : (
          <ModalEliminarValidado
            titulo="Eliminar categoría"
            descripcion={`¿Está seguro de que desea eliminar la categoría "${modal.cat.nombre}"?`}
            validacion={{ ok: true }}
            onClose={() => setModal(null)}
            onConfirm={handleDelete}
          />
        )
      )}

      <Toast toast={toast} />
    </div>
  );
}
