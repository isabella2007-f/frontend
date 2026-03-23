import { useRef, useEffect, useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import CrearCliente from "./CrearCliente.jsx";
import { ModalVerCliente, ModalEditarCliente } from "./EditarCliente.jsx";
import "./clientes.css";

const ITEMS_PER_PAGE = 4;

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#c62828",
        boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>{value ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}>
      <span style={{ fontSize: 15 }}>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

function EliminarModal({ cliente, razon, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  if (razon) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div className="delete-icon-wrap">⚠️</div>
            <h3 className="delete-title">No se puede eliminar</h3>
            <p className="delete-body">{razon}</p>
          </div>
          <div className="modal-footer" style={{ justifyContent: "center" }}>
            <button className="btn-ghost" onClick={onClose}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  const run = async () => { setDeleting(true); await new Promise(r => setTimeout(r, 500)); onConfirm(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar cliente</h3>
          <p className="delete-body">¿Eliminar a <strong>"{cliente.nombre} {cliente.apellidos}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function GestionClientes() {
  const { clientes, crearCliente, editarCliente, toggleCliente, eliminarCliente, canDeleteCliente } = useApp();

  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
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

  const showToast = (msg, type = "success") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchQ = `${c.nombre} ${c.apellidos}`.toLowerCase().includes(q)
      || c.correo.toLowerCase().includes(q)
      || (c.municipio || "").toLowerCase().includes(q)
      || (c.numDoc || "").toLowerCase().includes(q);
    const matchE = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filter]);

  const handleCreate      = (data) => { crearCliente(data);  showToast("Cliente creado");    setModal(null); };
  const handleEdit        = (data) => { editarCliente(data); showToast("Cambios guardados"); setModal(null); };
  const handleDeleteClick = (c)    => { const check = canDeleteCliente(c.id); setModal({ mode: "delete", cliente: c, razon: check.ok ? null : check.razon }); };
  const handleDelete      = ()     => { eliminarCliente(modal.cliente.id); showToast("Cliente eliminado", "error"); setModal(null); };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Clientes</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input"
              placeholder="Buscar por nombre, correo, ciudad o documento…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={"filter-icon-btn" + (filter !== "todos" ? " has-filter" : "")}
              onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown">
                {[
                  { val: "todos",    label: "Todos",    dot: "#bdbdbd" },
                  { val: "activo",   label: "Activos",  dot: "#43a047" },
                  { val: "inactivo", label: "Inactivos",dot: "#ef5350" },
                ].map(f => (
                  <button key={f.val} className={"filter-option" + (filter === f.val ? " active" : "")}
                    onClick={() => { setFilter(f.val); setShowFilter(false); }}>
                    <span className="filter-dot" style={{ background: f.dot }} />{f.label}
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
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">👤</div>
                      <p className="empty-state__text">
                        {filter !== "todos" || search ? "Sin clientes que coincidan." : "No hay clientes registrados."}
                      </p>
                    </div>
                  </td></tr>
                ) : paginated.map((c, idx) => (
                  <tr key={c.id} className="tbl-row">
                    <td><span className="row-num">{String((safePage-1)*ITEMS_PER_PAGE+idx+1).padStart(2,"0")}</span></td>
                    <td>
                      <div className="client-cell">
                        <div className="avatar-wrap">
                          {c.fotoPreview ? <img src={c.fotoPreview} alt={c.nombre} style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span>👤</span>}
                        </div>
                        <div>
                          <div className="client-name">{c.nombre} {c.apellidos}</div>
                          <div className="client-email">{c.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td><div className="doc-badge"><span className="doc-type">{c.tipoDoc}</span><span className="doc-num">{c.numDoc}</span></div></td>
                    <td><span className="phone-cell"><span className="phone-icon">📞</span>{c.telefono}</span></td>
                    <td><div className="location-city">{c.municipio}</div><div className="location-dept">{c.departamento}</div></td>
                    <td><Toggle value={c.estado} onChange={() => toggleCliente(c.id)} /></td>
                    <td><span className="date-badge">{c.fechaCreacion}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   onClick={() => setModal({ mode:"view",   cliente:c })}>👁</button>
                        <button className="act-btn act-btn--edit"   onClick={() => setModal({ mode:"edit",   cliente:c })}>✎</button>
                        <button className="act-btn act-btn--delete" onClick={() => handleDeleteClick(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "cliente" : "clientes"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage===1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.mode === "new"    && <CrearCliente onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.mode === "edit"   && <ModalEditarCliente cliente={modal.cliente} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.mode === "view"   && <ModalVerCliente    cliente={modal.cliente} onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && <EliminarModal cliente={modal.cliente} razon={modal.razon} onClose={() => setModal(null)} onConfirm={handleDelete} />}

      <Toast toast={toast} />
    </div>
  );
}