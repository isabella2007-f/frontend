import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Avatar, Toggle, RolBadge } from "./CrearUsuario.jsx";
import CrearUsuario from "./CrearUsuario.jsx";
import { ModalVerUsuario, ModalEliminarUsuario, ModalDesactivarUsuario } from "./EditarUsuario.jsx";
import "./Usuarios.css";

const PER_PAGE = 5;

function ToggleConTooltip({ on, onToggle, disabled, razon }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }} className="toggle-tooltip-wrap">
      <Toggle on={on} onToggle={onToggle} disabled={disabled} />
      {disabled && razon && <div className="toggle-tooltip">{razon}</div>}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
      <span style={{ fontSize: 15 }}>{toast.type === "error" ? "✕" : "✓"}</span>
      {toast.message}
    </div>
  );
}

export default function GestionUsuarios() {
  const {
    usuarios, roles, rolesActivos,
    crearUsuario, editarUsuario, toggleUsuario, eliminarUsuario,
    canDeleteUsuario,
    pedidos, ordenes, clientes,
  } = useApp();

  // ── La tabla muestra TODOS los roles (incluyendo Cliente)
  // Solo se excluyen en otras secciones según contexto del negocio
  const usuariosTabla = usuarios;

  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("todos");
  const [filterRol,  setFilterRol]  = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const filterRef = useRef();

  // Bloquear eventos de teclado cuando hay modal abierto
  useEffect(() => {
    if (!modal) return;
    const block = e => e.stopPropagation();
    document.addEventListener("keydown", block, true);
    document.addEventListener("keyup",   block, true);
    document.addEventListener("keypress",block, true);
    return () => {
      document.removeEventListener("keydown", block, true);
      document.removeEventListener("keyup",   block, true);
      document.removeEventListener("keypress",block, true);
    };
  }, [modal]);

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

  const filtered = usuariosTabla.filter(u => {
    const q      = search.toLowerCase();
    const matchQ = [u.nombre, u.apellidos, u.correo, u.rol, u.cedula, u.municipio]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE   = filter    === "todos" || (filter === "activo" ? u.estado : !u.estado);
    const matchRol = filterRol === "todos" || u.rol === filterRol;
    return matchQ && matchE && matchRol;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filter, filterRol]);

  const handleSave = (form) => {
    if (modal?.user) {
      editarUsuario({ ...modal.user, ...form });
      showToast("Usuario actualizado");
    } else {
      crearUsuario(form);
      showToast("Usuario creado");
    }
    setModal(null);
  };

  const getAdvertenciasEliminar = (user) => {
    // Bloqueo duro: admin principal
    if (user.esAdmin) return {
      bloqueado: true,
      razon: `El usuario "${user.nombre} ${user.apellidos}" posee privilegios de administrador principal y está protegido.`,
    };

    const advertencias = [];

    // Pedidos activos asignados como domiciliario
    const pedidosAsignados = pedidos.filter(p =>
      p.idEmpleado === user.id && !["Entregado", "Cancelado"].includes(p.estado)
    );
    if (pedidosAsignados.length > 0) {
      const lista = pedidosAsignados.map(p => p.numero).join(", ");
      advertencias.push(
        `Está asignado como domiciliario en ${pedidosAsignados.length === 1 ? "el pedido" : "los pedidos"} ${lista}. Si se elimina, deberá reasignar un responsable a ${pedidosAsignados.length === 1 ? "dicho pedido" : "dichos pedidos"}.`
      );
    }

    // Órdenes de producción activas asignadas
    const ordenesAsignadas = ordenes.filter(o =>
      o.idEmpleado === user.id && !["Completada", "Cancelada"].includes(o.estado)
    );
    if (ordenesAsignadas.length > 0) {
      const lista = ordenesAsignadas.map(o => o.id).join(", ");
      advertencias.push(
        `Está asignado como operario en ${ordenesAsignadas.length === 1 ? "la orden de producción" : "las órdenes de producción"} ${lista}. Si se elimina, deberá reasignar un responsable a ${ordenesAsignadas.length === 1 ? "dicha orden" : "dichas órdenes"}.`
      );
    }

    // Si es cliente: pedidos en curso
    if (user.rol === "Cliente") {
      const clienteVinculado = clientes.find(c =>
        c.correo === user.correo || c.numDoc === user.cedula
      );
      if (clienteVinculado) {
        const pedidosCliente = pedidos.filter(p =>
          p.idCliente === clienteVinculado.id && !["Entregado", "Cancelado"].includes(p.estado)
        );
        if (pedidosCliente.length > 0) {
          const lista = pedidosCliente.map(p => p.numero).join(", ");
          advertencias.push(
            `Tiene ${pedidosCliente.length === 1 ? "el pedido" : "los pedidos"} ${lista} en curso. Si se elimina, ${pedidosCliente.length === 1 ? "dicho pedido quedará" : "dichos pedidos quedarán"} sin cliente asociado y deberá gestionarlos manualmente.`
          );
        }
      }
    }

    return { bloqueado: false, advertencias };
  };

  const handleDeleteClick = (user) => {
    const resultado = getAdvertenciasEliminar(user);
    if (resultado.bloqueado) {
      setModal({ type: "delete", user, razon: resultado.razon, advertencias: [] });
    } else {
      setModal({ type: "delete", user, razon: null, advertencias: resultado.advertencias });
    }
  };

  const handleDeleteConfirm = (id) => {
    eliminarUsuario(id);
    showToast("Usuario eliminado", "error");
    setModal(null);
  };

  // ── Desactivar usuario: verificar elementos asociados ────
  const getAdvertenciasDesactivar = (user) => {
    const advertencias = [];

    // Pedidos activos asignados como empleado
    const pedidosAsignados = pedidos.filter(p =>
      p.idEmpleado === user.id && !["Entregado", "Cancelado"].includes(p.estado)
    );
    if (pedidosAsignados.length > 0) {
      advertencias.push(
        `Tiene ${pedidosAsignados.length} pedido${pedidosAsignados.length > 1 ? "s" : ""} activo${pedidosAsignados.length > 1 ? "s" : ""} asignado${pedidosAsignados.length > 1 ? "s" : ""} como domiciliario. Quedará${pedidosAsignados.length > 1 ? "n" : ""} sin responsable.`
      );
    }

    // Órdenes de producción activas asignadas
    const ordenesAsignadas = ordenes.filter(o =>
      o.idEmpleado === user.id && !["Completada", "Cancelada"].includes(o.estado)
    );
    if (ordenesAsignadas.length > 0) {
      advertencias.push(
        `Tiene ${ordenesAsignadas.length} orden${ordenesAsignadas.length > 1 ? "es" : ""} de producción activa${ordenesAsignadas.length > 1 ? "s" : ""} asignada${ordenesAsignadas.length > 1 ? "s" : ""}. Quedará${ordenesAsignadas.length > 1 ? "n" : ""} sin operario.`
      );
    }

    // Si es cliente: pedidos activos como cliente
    if (user.rol === "Cliente") {
      const clienteVinculado = clientes.find(c => c.correo === user.correo || c.numDoc === user.cedula);
      if (clienteVinculado) {
        const pedidosCliente = pedidos.filter(p =>
          p.idCliente === clienteVinculado.id && !["Entregado", "Cancelado"].includes(p.estado)
        );
        if (pedidosCliente.length > 0) {
          advertencias.push(
            `Este cliente tiene ${pedidosCliente.length} pedido${pedidosCliente.length > 1 ? "s" : ""} en curso. Su cuenta quedará inactiva pero los pedidos continuarán.`
          );
        }
      }
    }

    return advertencias;
  };

  const handleToggleClick = (user) => {
    const rolObj = roles.find(r => r.nombre === user.rol);

    // Bloqueos que impiden cambiar estado
    const bloqueadoPorRol = rolObj && !rolObj.estado;
    const esAdminProtegido = user.esAdmin;
    if (bloqueadoPorRol || esAdminProtegido) return; // ya manejado por tooltip

    // Si se va a DESACTIVAR (estado: true → false), verificar advertencias
    if (user.estado) {
      const advertencias = getAdvertenciasDesactivar(user);
      if (advertencias.length > 0) {
        setModal({ type: "desactivar", user, advertencias });
        return;
      }
    }

    // Sin advertencias: toggle directo
    toggleUsuario(user.id);
  };

  const handleToggleConfirm = (userId) => {
    toggleUsuario(userId);
    showToast("Estado del usuario actualizado");
  };

  const hasFilter = filter !== "todos" || filterRol !== "todos";

  // Todos los roles disponibles para el filtro
  const todosLosRoles = [...new Set(usuarios.map(u => u.rol).filter(Boolean))].sort();

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Usuarios</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, correo, rol o documento…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={"filter-icon-btn" + (hasFilter ? " has-filter" : "")}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>

            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 170 }}>
                <p className="filter-section-title">Estado</p>
                {[
                  { val: "todos",    label: "Todos",     dot: "#bdbdbd" },
                  { val: "activo",   label: "Activos",   dot: "#43a047" },
                  { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
                ].map(f => (
                  <button key={f.val}
                    className={"filter-option" + (filter === f.val ? " active" : "")}
                    onClick={() => { setFilter(f.val); setPage(1); }}>
                    <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                  </button>
                ))}
                <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />
                <p className="filter-section-title">Rol</p>
                <button
                  className={"filter-option" + (filterRol === "todos" ? " active" : "")}
                  onClick={() => { setFilterRol("todos"); setPage(1); setShowFilter(false); }}>
                  <span className="filter-dot" style={{ background: "#bdbdbd" }} />Todos
                </button>
                {todosLosRoles.map(r => (
                  <button key={r}
                    className={"filter-option" + (filterRol === r ? " active" : "")}
                    onClick={() => { setFilterRol(r); setPage(1); setShowFilter(false); }}>
                    <span className="filter-dot" style={{ background: "#2e7d32" }} />{r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "form", user: null })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Nº</th>
                  <th>Usuario</th>
                  <th>Cédula</th>
                  <th>Teléfono</th>
                  <th>Ubicación</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state__icon">👤</div>
                      <p className="empty-state__text">
                        {hasFilter || search ? "Sin usuarios que coincidan." : "No hay usuarios registrados."}
                      </p>
                    </div>
                  </td></tr>
                ) : paged.map((user, idx) => {
                  const rolObj = roles.find(r => r.nombre === user.rol);
                  const bloqueadoPorRol = rolObj && !rolObj.estado;
                  const razon = bloqueadoPorRol
                    ? `El rol "${user.rol}" está desactivado`
                    : user.esAdmin
                    ? "El administrador principal no puede desactivarse"
                    : null;

                  return (
                    <tr key={user.id} className="tbl-row">
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="client-cell">
                          <div className="avatar-wrap">
                            <Avatar foto={user.foto} size={38} border={false} />
                          </div>
                          <div>
                            <div className="client-name">{user.nombre} {user.apellidos}</div>
                            <div className="client-email">{user.correo}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="doc-badge">
                          <span className="doc-type">{user.tipoDocumento || "CC"}</span>
                          <span className="doc-num">{user.cedula || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="phone-cell">
                          <span className="phone-icon">📞</span>
                          {user.telefono || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="location-city">{user.municipio    || "—"}</div>
                        <div className="location-dept">{user.departamento || ""}</div>
                      </td>
                      <td><RolBadge rol={user.rol} /></td>
                      <td>
                        <ToggleConTooltip
                          on={user.estado}
                          onToggle={() => handleToggleClick(user)}
                          disabled={!!razon}
                          razon={razon}
                        />
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"
                            onClick={() => setModal({ type: "ver", user })}>👁</button>
                          {!user.esAdmin && <>
                            <button className="act-btn act-btn--edit"
                              onClick={() => setModal({ type: "form", user })}>✎</button>
                            <button className="act-btn act-btn--delete"
                              onClick={() => handleDeleteClick(user)}>🗑️</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"} en total
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

      {/* Modales */}
      {modal?.type === "ver" && (
        <ModalVerUsuario user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === "form" && (
        <CrearUsuario
          user={modal.user}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.type === "delete" && (
        <ModalEliminarUsuario
          user={modal.user}
          razon={modal.razon}
          advertencias={modal.advertencias || []}
          onClose={() => setModal(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {modal?.type === "desactivar" && (
        <ModalDesactivarUsuario
          user={modal.user}
          advertencias={modal.advertencias}
          onClose={() => setModal(null)}
          onConfirm={handleToggleConfirm}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}