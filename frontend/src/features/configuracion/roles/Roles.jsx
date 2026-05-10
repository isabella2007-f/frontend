import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import CrearRol from "./CrearRol.jsx";
import EditarRol from "./EditarRol.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import "./Roles.css";

const ITEMS_PER_PAGE = 4;

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={onChange}
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

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
      <span className="toast-icon">{toast.type === "error" ? "✕" : "✓"}</span>
      {toast.message}
    </div>
  );
}

/** Modal de advertencia genérico (bloqueo o confirmación). */
function AdvertenciaModal({ titulo, mensaje, onClose, onConfirm, confirmLabel = "Confirmar", bloqueado = false }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm?.();
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">{bloqueado ? "⚠️" : "🔄"}</div>
          <h3 className="delete-title">{titulo}</h3>
          <p className="delete-body">{mensaje}</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-ghost" onClick={onClose}>{bloqueado ? "Entendido" : "Cancelar"}</button>
          {!bloqueado && (
            <button className="btn-danger" onClick={run} disabled={loading}>
              {loading ? "Procesando…" : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GestionRoles() {
  const {
    roles,
    usuariosPorRol,
    crearRol,
    editarRol,
    toggleRol,
    eliminarRol,
    canDeleteRol,
  } = useApp();

  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef();

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

  const filtered   = roles.filter(r => {
    const matchQ = r.nombre.toLowerCase().includes(search.toLowerCase());
    const matchE = filter === "todos" || (filter === "activo" ? r.estado : !r.estado);
    return matchQ && matchE;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filter]);

  const handleSave = (form) => {
    if (modal.mode === "new") { crearRol(form);  showToast("Rol creado"); }
    else                      { editarRol(form); showToast("Cambios guardados"); }
    setModal(null);
  };

  const handleDeleteClick = (rol) => {
    const check = canDeleteRol(rol.id);
    setModal({ mode: "delete", rol, razon: check.ok ? null : check.razon });
  };

  const handleDeleteConfirm = () => {
    eliminarRol(modal.rol.id);
    showToast("Rol eliminado", "error");
    setModal(null);
  };

  /**
   * Intento de cambiar el toggle de estado de un rol.
   *
   * Regla de negocio:
   *  – Si el rol es admin (esAdmin = true) y está activo (estado = true),
   *    verificar que exista al menos OTRO rol admin activo antes de desactivarlo.
   *    Si no existe, bloquear con advertencia.
   */
  const handleToggleClick = (rol) => {
    const intentaDesactivar = rol.estado; // true → quiere pasar a false

    if (rol.esAdmin && intentaDesactivar) {
      const otrosAdminsActivos = roles.filter(
        r => r.id !== rol.id && r.esAdmin && r.estado
      );
      if (otrosAdminsActivos.length === 0) {
        // No hay otro admin activo → bloquear
        setModal({
          mode: "toggleBlock",
          titulo: "No se puede desactivar",
          mensaje: `"${rol.nombre}" es el único rol administrador activo. Activa otro rol admin antes de desactivar este.`,
        });
        return;
      }
    }

    // Caso permitido → ejecutar directamente
    toggleRol(rol.id);
    showToast(
      rol.estado ? `Rol "${rol.nombre}" desactivado` : `Rol "${rol.nombre}" activado`,
      rol.estado ? "error" : "success"
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Roles</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar rol…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={"filter-icon-btn" + (filter !== "todos" ? " has-filter" : "")}
              onClick={() => setShowFilter(v => !v)}
            >
              ▼
            </button>
            {showFilter && (
              <div className="filter-dropdown">
                {[
                  { val: "todos",    label: "Todos",    dot: "#bdbdbd" },
                  { val: "activo",   label: "Activos",  dot: "#43a047" },
                  { val: "inactivo", label: "Inactivos",dot: "#ef5350" },
                ].map(f => (
                  <button
                    key={f.val}
                    className={"filter-option" + (filter === f.val ? " active" : "")}
                    onClick={() => { setFilter(f.val); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: f.dot }} />
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ mode: "new" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Nº</th>
                  <th>Ícono</th>
                  <th>Rol</th>
                  <th>Usuarios</th>
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
                        <div className="empty-state__icon">🛡️</div>
                        <p className="empty-state__text">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((rol, idx) => (
                  <tr key={rol.id} className="tbl-row">
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="rol-icon-wrap" style={{ cursor: "default" }}>
                        {rol.iconoPreview && <img src={rol.iconoPreview} alt={rol.nombre} />}
                        {!rol.iconoPreview && <span style={{ fontSize: 20 }}>{rol.icono}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="cat-name">{rol.nombre}</span>
                      {rol.esAdmin && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#f9a825",
                          background: "#fff8e1",
                          border: "1px solid #ffe082",
                          borderRadius: 6,
                          padding: "1px 6px",
                        }}>
                          protegido
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: (usuariosPorRol[rol.nombre] ?? 0) > 0 ? "#2e7d32" : "#bdbdbd",
                        background: (usuariosPorRol[rol.nombre] ?? 0) > 0 ? "#e8f5e9" : "#fafafa",
                        border: `1px solid ${(usuariosPorRol[rol.nombre] ?? 0) > 0 ? "#c8e6c9" : "#eeeeee"}`,
                        borderRadius: 20,
                        padding: "2px 10px",
                      }}>
                        {usuariosPorRol[rol.nombre] ?? 0}
                      </span>
                    </td>
                    <td>
                      {/* Toggle protegido por handleToggleClick */}
                      <Toggle
                        value={rol.estado}
                        onChange={() => handleToggleClick(rol)}
                      />
                    </td>
                    <td><span className="date-badge">{rol.fecha}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="act-btn act-btn--view"
                          onClick={() => setModal({ mode: "view", rol })}
                        >
                          👁
                        </button>
                        {!rol.esAdmin && (
                          <>
                            <button
                              className="act-btn act-btn--edit"
                              onClick={() => setModal({ mode: "edit", rol })}
                            >
                              ✎
                            </button>
                            <button
                              className="act-btn act-btn--delete"
                              onClick={() => handleDeleteClick(rol)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "rol" : "roles"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                ‹
              </button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button
                className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                ›
              </button>
              <button className="pg-btn-arrow" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modales ── */}
      {modal?.mode === "new"    && <CrearRol onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.mode === "edit"   && <EditarRol rol={modal.rol} mode="edit" onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.mode === "view"   && <EditarRol rol={modal.rol} mode="view" onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && (
        <ModalEliminarValidado
          titulo="Eliminar rol"
          descripcion={`¿Está seguro de que desea eliminar el rol "${modal.rol.nombre}"?`}
          validacion={canDeleteRol(modal.rol.id)}
          onClose={() => setModal(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {modal?.mode === "toggleBlock" && (
        <AdvertenciaModal
          titulo={modal.titulo}
          mensaje={modal.mensaje}
          bloqueado
          onClose={() => setModal(null)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}