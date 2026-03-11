import { useState, useEffect, useRef } from "react";
import CrearRol from "./CrearRol.jsx";
import EditarRol from "./EditarRol.jsx";
import "./Roles.css";

const initialRoles = [
  { id: 1, nombre: "Admin", icono: "👑", iconoPreview: null, estado: true, fecha: "12/12/2025", esAdmin: true },
  { id: 2, nombre: "Empleado", icono: "👷", iconoPreview: null, estado: false, fecha: "12/12/2025" },
  { id: 3, nombre: "Cliente", icono: "👤", iconoPreview: null, estado: true, fecha: "01/01/2026" },
];

const ITEMS_PER_PAGE = 4;

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

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className="toast"
      style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}
    >
      <span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

function EliminarModal({ rol, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 500));
    onConfirm();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar rol</h3>
          <p className="delete-body">
            ¿Eliminar <strong>"{rol.nombre}"</strong>?
          </p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>

        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={run} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GestionRoles() {
  const [roles, setRoles] = useState(initialRoles);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = (e) => {
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

  const filtered = roles.filter((r) => {
    const matchQ = r.nombre.toLowerCase().includes(search.toLowerCase());
    const matchE =
      filter === "todos" || (filter === "activo" ? r.estado : !r.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  useEffect(() => setPage(1), [search, filter]);

  const handleSave = (form) => {
    if (modal.mode === "new") {
      setRoles((p) => [form, ...p]);
      showToast("Rol creado");
    } else {
      setRoles((p) => p.map((r) => (r.id === form.id ? form : r)));
      showToast("Cambios guardados");
    }
    setModal(null);
  };

  const handleDelete = () => {
    setRoles((p) => p.filter((r) => r.id !== modal.rol.id));
    showToast("Rol eliminado", "error");
    setModal(null);
  };

  const filterOptions = [
    { val: "todos", label: "Todos", dot: "#bdbdbd" },
    { val: "activo", label: "Activos", dot: "#43a047" },
    { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
  ];

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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="btn-agregar"
            onClick={() => setModal({ mode: "new" })}
          >
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Ícono</th>
                  <th>Rol</th>
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
                        <div className="empty-state__icon">🛡️</div>
                        <p className="empty-state__text">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((rol, idx) => (
                    <tr key={rol.id} className="tbl-row">
                      <td>
                        <span className="cat-num">
                          {String(
                            (safePage - 1) * ITEMS_PER_PAGE + idx + 1
                          ).padStart(2, "0")}
                        </span>
                      </td>

                      <td>
                        <div
                          className="rol-icon-wrap"
                          style={{ cursor: "default" }}
                        >
                          {rol.iconoPreview ? (
                            <img src={rol.iconoPreview} alt={rol.nombre} />
                          ) : (
                            <span style={{ fontSize: 20 }}>{rol.icono}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="cat-name">{rol.nombre}</span>
                        {rol.esAdmin && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#f9a825",
                              background: "#fff8e1",
                              border: "1px solid #ffe082",
                              borderRadius: 6,
                              padding: "1px 6px",
                            }}
                          >
                            protegido
                          </span>
                        )}
                      </td>

                      <td>
                        <Toggle
                          value={rol.estado}
                          onChange={() =>
                            setRoles((p) =>
                              p.map((r) =>
                                r.id === rol.id
                                  ? { ...r, estado: !r.estado }
                                  : r
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        <span className="cat-date">{rol.fecha}</span>
                      </td>

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
                                onClick={() =>
                                  setModal({ mode: "edit", rol })
                                }
                              >
                                ✎
                              </button>
                              <button
                                className="act-btn act-btn--delete"
                                onClick={() =>
                                  setModal({ mode: "delete", rol })
                                }
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal?.mode === "new" && (
        <CrearRol onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal?.mode === "edit" && (
        <EditarRol
          rol={modal.rol}
          mode="edit"
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.mode === "view" && (
        <EditarRol rol={modal.rol} mode="view" onClose={() => setModal(null)} />
      )}
      {modal?.mode === "delete" && (
        <EliminarModal
          rol={modal.rol}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}