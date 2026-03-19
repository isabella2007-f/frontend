import { useState, useEffect, useRef } from "react";
import { ROLES_EMPLEADO, ITEMS_PER_PAGE, INIT_EMPLEADOS } from "./empleadosUtils.js";
import { RolBadge } from "./CrearEmpleado.jsx";
import CrearEmpleado from "./CrearEmpleado.jsx";
import EditarEmpleado, { ModalVerEmpleado, ModalEliminarEmpleado } from "./EditarEmpleado.jsx";
import "./empleados.css";

/* ─── Toggle ─────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#c62828", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color:"black" }}>{value ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}>
      <span style={{ fontSize:15 }}>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function GestionEmpleados() {
  const [empleados, setEmpleados]   = useState(INIT_EMPLEADOS);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [filterRol, setFilterRol]   = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => { setToast({ message:msg, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = empleados.filter(e => {
    const q   = search.toLowerCase();
    const rol = ROLES_EMPLEADO.find(r => r.id === e.idRol)?.nombre || "";
    const matchQ   = `${e.nombre} ${e.apellidos}`.toLowerCase().includes(q) || e.correo.toLowerCase().includes(q) || e.municipio.toLowerCase().includes(q) || (e.numDoc||"").toLowerCase().includes(q) || rol.toLowerCase().includes(q);
    const matchE   = filter    === "todos" || (filter    === "activo" ? e.estado : !e.estado);
    const matchRol = filterRol === 0       || e.idRol === filterRol;
    return matchQ && matchE && matchRol;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage-1)*ITEMS_PER_PAGE, safePage*ITEMS_PER_PAGE);

  const handleSearch = value => { setSearch(value); setPage(1); };
  const handleFilterChange = value => { setFilter(value); setPage(1); };
  const handleFilterRolChange = value => { setFilterRol(value); setPage(1); };

  const handleCreate = data => { setEmpleados(p => [data, ...p]);                              showToast("Empleado creado");          setModal(null); };
  const handleEdit   = data => { setEmpleados(p => p.map(e => e.id === data.id ? data : e));  showToast("Cambios guardados");        setModal(null); };
  const handleDelete = ()   => { setEmpleados(p => p.filter(e => e.id !== modal.empleado.id)); showToast("Empleado eliminado","error"); setModal(null); };
  const toggleEstado = id   => setEmpleados(p => p.map(e => e.id === id ? { ...e, estado:!e.estado } : e));

  const hasFilter = filter !== "todos" || filterRol !== 0;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Empleados</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input"
              placeholder="Buscar por nombre, correo, ciudad, documento o rol…"
              value={search} onChange={e => handleSearch(e.target.value)} />
          </div>

          <div ref={filterRef} style={{ position:"relative" }}>
            <button className={"filter-icon-btn" + (hasFilter ? " has-filter" : "")} onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown">
                <p className="filter-section-title">Estado</p>
                {[{val:"todos",label:"Todos",dot:"#bdbdbd"},{val:"activo",label:"Activos",dot:"#43a047"},{val:"inactivo",label:"Inactivos",dot:"#ef5350"}].map(f => (
                  <button key={f.val} className={"filter-option"+(filter===f.val?" active":"")} onClick={() => handleFilterChange(f.val)}>
                    <span className="filter-dot" style={{ background:f.dot }} />{f.label}
                  </button>
                ))}
                <div style={{ height:1, background:"#f5f5f5", margin:"4px 0" }} />
                <p className="filter-section-title">Rol</p>
                <button className={"filter-option"+(filterRol===0?" active":"")} onClick={() => { handleFilterRolChange(0); setShowFilter(false); }}>
                  <span className="filter-dot" style={{ background:"#bdbdbd" }} />Todos
                </button>
                {ROLES_EMPLEADO.map(r => (
                  <button key={r.id} className={"filter-option"+(filterRol===r.id?" active":"")} onClick={() => { handleFilterRolChange(r.id); setShowFilter(false); }}>
                    <span style={{ fontSize:13 }}>{r.icon}</span>{r.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type:"crear" })}>
            Agregar <span style={{ fontSize:18 }}>+</span>
          </button>
        </div>

        {/* Tabla */}
        <div className="card">
          <div style={{ overflowX:"auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width:48 }}>Nº</th>
                  <th>Empleado</th>
                  <th>Documento</th>
                  <th>Rol</th>
                  <th>Teléfono</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">👷</div>
                      <p className="empty-state__text">Sin empleados encontrados</p>
                    </div>
                  </td></tr>
                ) : paginated.map((emp, idx) => (
                  <tr key={emp.id} className="tbl-row">
                    <td><span className="row-num">{String((safePage-1)*ITEMS_PER_PAGE+idx+1).padStart(2,"0")}</span></td>
                    <td>
                      <div className="emp-cell">
                        <div className="avatar-wrap">{emp.fotoPreview ? <img src={emp.fotoPreview} alt={emp.nombre} /> : <span>👤</span>}</div>
                        <div>
                          <div className="emp-name">{emp.nombre} {emp.apellidos}</div>
                          <div className="emp-email">{emp.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td><div className="doc-badge"><span className="doc-type">{emp.tipoDoc}</span><span className="doc-num">{emp.numDoc}</span></div></td>
                    <td><RolBadge idRol={emp.idRol} /></td>
                    <td><span className="phone-cell"><span className="phone-icon">📞</span>{emp.telefono}</span></td>
                    <td><div className="location-city">{emp.municipio}</div><div className="location-dept">{emp.departamento}</div></td>
                    <td><Toggle value={emp.estado} onChange={() => toggleEstado(emp.id)} /></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   onClick={() => setModal({ type:"ver",      empleado:emp })}>👁</button>
                        <button className="act-btn act-btn--edit"   onClick={() => setModal({ type:"editar",   empleado:emp })}>✎</button>
                        <button className="act-btn act-btn--delete" onClick={() => setModal({ type:"eliminar", empleado:emp })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "empleado" : "empleados"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "crear"    && <CrearEmpleado onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.type === "editar"   && <EditarEmpleado empleado={modal.empleado} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.type === "ver"      && <ModalVerEmpleado empleado={modal.empleado} onClose={() => setModal(null)} />}
      {modal?.type === "eliminar" && <ModalEliminarEmpleado empleado={modal.empleado} onClose={() => setModal(null)} onConfirm={handleDelete} />}

      <Toast toast={toast} />
    </div>
  );
}