import { useState, useEffect } from "react";
import { G, GD, GL, GB, GGLOW, INIT_USERS, EMPTY_FILTERS, PER_PAGE, ROL_STYLES } from "./usuariosUtils.js";
import { Avatar, Toggle, RolBadge } from "./CrearUsuario.jsx";
import CrearUsuario from "./CrearUsuario.jsx";
import { Ic } from "./usuariosIcons.jsx";
import { ModalVerUsuario, ModalEliminarUsuario } from "./EditarUsuario.jsx";
import "./Usuarios.css";

// ─── TOAST ────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="toast">
      <Ic.Check />
      <span className="toast-msg">{msg}</span>
      <button className="toast-close" onClick={onClose}>
        <Ic.Close c="rgba(255,255,255,0.8)" />
      </button>
    </div>
  );
}

// ─── FILTER PANEL ─────────────────────────────────────────
function FilterPanel({ filters, onChange, onReset, activeCount }) {
  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <span className="filter-panel-title">Filtrar por</span>
        {activeCount > 0 && (
          <button className="btn-clear-filters" onClick={onReset}>
            <Ic.XCircle /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="filter-grid">
        {/* Rol */}
        <div>
          <span className="filter-section-label">Rol</span>
          {["Admin", "Empleado", "Cliente"].map(r => {
            const c = ROL_STYLES[r];
            const checked = filters.roles.includes(r);
            return (
              <div key={r} className="filter-checkbox-row" onClick={() => onChange("roles", r)}>
                <div className="filter-checkbox"
                  style={{ borderColor: checked ? c.border : "#ccc", background: checked ? c.bg : "white" }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none"
                        stroke={c.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <RolBadge rol={r} />
              </div>
            );
          })}
        </div>

        {/* Estado */}
        <div>
          <span className="filter-section-label">Estado</span>
          {[{ label: "Activo", val: "true" }, { label: "Inactivo", val: "false" }].map(({ label, val }) => {
            const checked = filters.estado === val;
            return (
              <div key={val} className="filter-radio-row" onClick={() => onChange("estado", checked ? "" : val)}>
                <div className="filter-radio"
                  style={{ borderColor: checked ? "#4caf50" : "#ccc", background: checked ? "#f5e8e8" : "white" }}>
                  {checked && <div className="filter-radio-dot" />}
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="status-dot" style={{ background: val === "true" ? "#43a047" : "#e24343" }} />
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Fecha */}
        <div>
          <span className="filter-section-label">Fecha creación</span>
          <span className="filter-date-label">Desde</span>
          <input type="date" value={filters.desde} onChange={e => onChange("desde", e.target.value)} className="filter-date-input" />
          <span className="filter-date-label">Hasta</span>
          <input type="date" value={filters.hasta} onChange={e => onChange("hasta", e.target.value)} className="filter-date-input" />
        </div>
      </div>

      {activeCount > 0 && (
        <div className="filter-chips">
          {filters.roles.map(r => (
            <span key={r} className="filter-chip" onClick={() => onChange("roles", r)}
              style={{ background: ROL_STYLES[r].bg, color: ROL_STYLES[r].color, borderColor: ROL_STYLES[r].border }}>
              {r} ✕
            </span>
          ))}
          {filters.estado && (
            <span className="filter-chip" onClick={() => onChange("estado", "")}
              style={{ background: filters.estado === "true" ? "#e8f5e9" : "#f0f0f0",
                color: filters.estado === "true" ? "#2e7d32" : "#666",
                borderColor: filters.estado === "true" ? "#c8e6c9" : "#ccc" }}>
              {filters.estado === "true" ? "Activo" : "Inactivo"} ✕
            </span>
          )}
          {filters.desde && (
            <span className="filter-chip" onClick={() => onChange("desde", "")}
              style={{ background: "#f0f0f0", color: "#555", borderColor: "#ddd" }}>
              Desde {filters.desde} ✕
            </span>
          )}
          {filters.hasta && (
            <span className="filter-chip" onClick={() => onChange("hasta", "")}
              style={{ background: "#f0f0f0", color: "#555", borderColor: "#ddd" }}>
              Hasta {filters.hasta} ✕
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function GestionUsuarios() {
  const [users, setUsers]           = useState(INIT_USERS);
  const [search, setSearch]         = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);

  const activeCount =
    filters.roles.length +
    (filters.estado ? 1 : 0) +
    (filters.desde  ? 1 : 0) +
    (filters.hasta  ? 1 : 0);

  const changeFilter = (key, val) => {
    setFilters(f => {
      if (key === "roles") {
        const has = f.roles.includes(val);
        return { ...f, roles: has ? f.roles.filter(r => r !== val) : [...f.roles, val] };
      }
      return { ...f, [key]: val };
    });
    setPage(1);
  };

  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(1); };

  const filtered = users.filter(u => {
    const matchSearch = [u.nombre, u.correo, u.rol].some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchRol    = filters.roles.length === 0 || filters.roles.includes(u.rol);
    const matchEstado = !filters.estado || String(u.estado) === filters.estado;
    const matchDesde  = !filters.desde  || u.fechaCreacion >= filters.desde;
    const matchHasta  = !filters.hasta  || u.fechaCreacion <= filters.hasta;
    return matchSearch && matchRol && matchEstado && matchDesde && matchHasta;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => setPage(1), [search, filters]);

  const toggleEstado = id => setUsers(prev => prev.map(u => u.id === id ? { ...u, estado: !u.estado } : u));
  const closeModal   = () => setModal(null);

  const handleSave = form => {
    if (modal.user) {
      setUsers(prev => prev.map(u => u.id === modal.user.id ? { ...u, ...form } : u));
      setToast("Usuario actualizado con éxito");
    } else {
      setUsers(prev => [...prev, { ...form, id: Date.now() }]);
      setToast("Usuario agregado con éxito");
    }
    closeModal();
  };

  const handleDelete = id => {
    setUsers(prev => prev.filter(u => u.id !== id));
    closeModal();
    setToast("Eliminación exitosa");
  };

  return (
    <div className="usuarios-page">

      {/* ── Header — igual que Roles ── */}
      <div className="usuarios-header">
        <h1>Gestión de Usuarios</h1>
        <div className="usuarios-header-line" />
      </div>

      <div className="usuarios-card">

        {/* ── Toolbar ── */}
        <div className="usuarios-toolbar">
          <div className="usuarios-toolbar-row">
            <div className={`usuarios-search-box${showFilter ? " filter-open" : ""}`}>
              <span className="search-icon-inner"><Ic.Search /></span>
              <input
                placeholder="Buscar por nombre, correo o rol..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <button
                className={`filter-btn${showFilter || activeCount > 0 ? " active" : ""}`}
                title="Filtros"
                onClick={() => setShowFilter(f => !f)}
              >
                <Ic.Filter active={showFilter || activeCount > 0} />
                {activeCount > 0 && <div className="filter-badge">{activeCount}</div>}
              </button>
            </div>

            <button className="btn-agregar" onClick={() => setModal({ type: "form", user: null })}>
              Agregar <Ic.Plus />
            </button>
          </div>

          {showFilter && (
            <FilterPanel filters={filters} onChange={changeFilter} onReset={resetFilters} activeCount={activeCount} />
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="usuarios-table-wrapper">
          <div className="usuarios-table">

            {/* Header */}
            <div className="table-header">
              {["Nombre", "Correo", "Rol", "Estado", "Acciones"].map((h, i) => (
                <div key={h} className={`table-header-cell${i >= 3 ? " center" : ""}`}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {paged.length === 0 ? (
              <div className="table-empty">
                {activeCount > 0 || search ? "No hay usuarios que coincidan con los filtros." : "No hay usuarios registrados."}
              </div>
            ) : (
              paged.map((user, idx) => (
                <div key={user.id} className={`table-row ${idx % 2 === 0 ? "even" : "odd"}`}>
                  <div className="table-cell-name">
                    <Avatar foto={user.foto} size={30} border={false} />
                    {user.nombre}
                  </div>
                  <div className="table-cell-email">{user.correo}</div>
                  <div><RolBadge rol={user.rol} /></div>
                  <div className="table-cell-center">
                    <Toggle on={user.estado} onToggle={() => toggleEstado(user.id)} />
                  </div>
                  <div className="table-actions">
                    {[
                      { color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", title: "Ver",      icon: <Ic.Eye />,   action: () => setModal({ type: "ver",    user }) },
                      ...( user.rol !== "Admin" ? [
                        { color: "#f9a825", bg: "#fff8e1", border: "#ffe082", title: "Editar",   icon: <Ic.Edit />,  action: () => setModal({ type: "form",   user }) },
                        { color: "#c62828", bg: "#ffebee", border: "#ef9a9a", title: "Eliminar", icon: <Ic.Trash />, action: () => setModal({ type: "delete", user }) },
                      ] : []),
                    ].map(({ color, bg, border, title, icon, action }) => (
                      <button
                        key={title}
                        title={title}
                        onClick={action}
                        className="action-btn"
                        style={{ background: bg, borderColor: border, color }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="table-count">
            {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}{" "}
            {activeCount > 0 || search ? "encontrado(s)" : "en total"}
          </div>

          {/* ── Paginación — dentro del card, igual que Roles ── */}
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
              <Ic.ChevL />
            </button>
            <div className="page-label">Página {safePage} de {totalPages}</div>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
              <Ic.ChevR />
            </button>
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      {modal?.type === "ver"    && <ModalVerUsuario     user={modal.user} onClose={closeModal} />}
      {modal?.type === "form"   && <CrearUsuario        user={modal.user} onClose={closeModal} onSave={handleSave} />}
      {modal?.type === "delete" && <ModalEliminarUsuario user={modal.user} onClose={closeModal} onConfirm={handleDelete} />}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}