import { useState, useRef, useEffect } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./proveedores.css";
import CrearProveedor   from "./CrearProveedor";
import EditarProveedor  from "./EditarProveedor";
import ModalEliminarValidado from "../../../ModalEliminarValidado";

const ITEMS_PER_PAGE = 5;

/* ── Toast ────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}>
      <span style={{ fontSize: 15 }}>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function GestionProveedores() {
  const { 
    proveedores, 
    compras, 
    crearProveedor, 
    editarProveedor, 
    eliminarProveedor,
    canDeleteProveedor 
  } = useApp();

  const [search, setSearch]           = useState("");
  const [filterCiudad, setFilterCiudad] = useState("todas");
  const [showFilter, setShowFilter]   = useState(false);
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null);
  const [toast, setToast]             = useState(null);
  const filterRef                     = useRef();

  /* Cerrar dropdown al hacer clic fuera */
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

  /* Ciudades únicas para el filtro */
  const ciudadesUnicas = [...new Set(proveedores.map(p => p.ciudad).filter(Boolean))].sort();

  /* ── Filtrado ── */
  const filtered = proveedores.filter(p => {
    const q = search.toLowerCase();
    const matchQ = (
      p.responsable.toLowerCase().includes(q) ||
      (p.correo    || "").toLowerCase().includes(q) ||
      (p.celular   || "").toLowerCase().includes(q) ||
      (p.direccion || "").toLowerCase().includes(q)
    );
    const matchCiudad = filterCiudad === "todas" || p.ciudad === filterCiudad;
    return matchQ && matchCiudad;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filterCiudad]);

  const hasFilter = filterCiudad !== "todas";

  /* ── CRUD ── */
  const handleCreate = data => {
    crearProveedor(data);
    showToast("Proveedor creado");
    setModal(null);
  };
  const handleEdit = data => {
    editarProveedor(data);
    showToast("Cambios guardados");
    setModal(null);
  };
  const handleDelete = () => {
    eliminarProveedor(modal.proveedor.id);
    showToast("Proveedor eliminado", "error");
    setModal(null);
  };

  return (
    <div className="page-wrapper">

      {/* ENCABEZADO */}
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Proveedores</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por responsable, correo, celular o dirección…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Botón filtro + dropdown */}
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={"filter-icon-btn" + (hasFilter ? " has-filter" : "")}
              onClick={() => setShowFilter(v => !v)}
            >
              ▼
            </button>

            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 170 }}>
                <p className="filter-section-title">Ciudad</p>
                <button
                  className={"filter-option" + (filterCiudad === "todas" ? " active" : "")}
                  onClick={() => { setFilterCiudad("todas"); setPage(1); setShowFilter(false); }}
                >
                  <span className="filter-dot" style={{ background: "#bdbdbd" }} />Todas
                </button>
                {ciudadesUnicas.map(ciudad => (
                  <button
                    key={ciudad}
                    className={"filter-option" + (filterCiudad === ciudad ? " active" : "")}
                    onClick={() => { setFilterCiudad(ciudad); setPage(1); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: "#2e7d32" }} />{ciudad}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ mode: "new" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* TABLA */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Nº</th>
                  <th>Responsable</th>
                  <th>Dirección</th>
                  <th>Celular</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🏭</div>
                        <p className="empty-state__text">
                          {hasFilter || search ? "Sin proveedores que coincidan." : "Sin proveedores registrados"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((p, idx) => (
                  <tr key={p.id} className="tbl-row">

                    {/* Nº */}
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>

                    {/* Responsable */}
                    <td>
                      <div className="prov-cell">
                        <div className="prov-avatar">🏭</div>
                        <div>
                          <div className="prov-name">{p.responsable}</div>
                          <div className="prov-id">ID #{p.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Dirección */}
                    <td style={{ fontSize: 13, color: "#424242", maxWidth: 200 }}>
                      {p.direccion || "—"}
                    </td>

                    {/* Celular */}
                    <td>
                      <span className="phone-cell">
                        <span className="phone-icon">📞</span>
                        {p.celular || "—"}
                      </span>
                    </td>

                    {/* Correo */}
                    <td>
                      <span className="client-email" style={{ fontSize: 13 }}>
                        {p.correo || "—"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"
                          onClick={() => setModal({ mode: "view", proveedor: p })}>👁</button>
                        <button className="act-btn act-btn--edit"
                          onClick={() => setModal({ mode: "edit", proveedor: p })}>✎</button>
                        <button className="act-btn act-btn--delete"
                          onClick={() => setModal({ mode: "delete", proveedor: p })}>🗑️</button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "proveedor" : "proveedores"} en total
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

      {/* MODALES */}
      {modal?.mode === "new" && (
        <CrearProveedor onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal?.mode === "edit" && (
        <EditarProveedor
          proveedor={modal.proveedor}
          mode="edit"
          compras={compras}
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      )}
      {modal?.mode === "view" && (
        <EditarProveedor
          proveedor={modal.proveedor}
          mode="view"
          compras={compras}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "delete" && (
        <ModalEliminarValidado
          titulo="Eliminar proveedor"
          descripcion={`¿Está seguro de que desea eliminar al proveedor "${modal.proveedor.responsable}"?`}
          validacion={canDeleteProveedor(modal.proveedor.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}