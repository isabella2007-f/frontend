import { useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Avatar } from "./CrearUsuario.jsx";
import { Ic } from "./usuariosIcons.jsx";
import { getRolStyle } from "./usuariosUtils.js";
import "./Usuarios.css";

/* ─── Campo solo lectura (igual a field-input--disabled en Clientes) ── */
function FieldView({ label, value, full = false }) {
  return (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      <div className="field-input field-input--disabled">{value || "—"}</div>
    </div>
  );
}

/* ─── Toggle visual solo lectura con tooltip de razón ─────── */
function ToggleView({ value, razon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
      <div style={{ position: "relative", display: "inline-flex" }} className="toggle-tooltip-wrap">
        <button
          className="toggle-btn"
          style={{
            background: value ? "#43a047" : "#c62828",
            boxShadow: value
              ? "0 2px 8px rgba(67,160,71,0.45)"
              : "0 2px 8px rgba(198,40,40,0.3)",
            cursor: "default",
            opacity: razon ? 0.6 : 1,
          }}
        >
          <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
            <span className="toggle-label" style={{ color: "black" }}>
              {value ? "ON" : "OFF"}
            </span>
          </span>
        </button>
        {razon && <div className="toggle-tooltip">{razon}</div>}
      </div>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: value ? "#2e7d32" : "#9e9e9e" }}>
          {value ? "Activo" : "Inactivo"}
        </span>
        {razon && (
          <div style={{ fontSize: 11, color: "#ef5350", marginTop: 2, fontWeight: 600 }}>
            ⚠️ {razon}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MODAL VER USUARIO ──────────────────────────────────── */
export function ModalVerUsuario({ user, onClose }) {
  const { roles } = useApp();
  const rolObj   = roles.find(r => r.nombre === user.rol);
  const rolStyle = getRolStyle(user.rol);
  const razonInactivo = !user.estado && rolObj && !rolObj.estado
    ? `El rol "${user.rol}" está desactivado`
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>

        {/* HEADER — igual a Clientes */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Usuarios</p>
            <h2 className="modal-header__title">
              {user.nombre} {user.apellidos}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>

          {/* Avatar — igual a Clientes */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="avatar-upload-wrap" style={{ cursor: "default" }}>
              {user.foto
                ? <img className="avatar-upload-img" src={user.foto} alt="avatar" />
                : <div className="avatar-upload-placeholder">👤</div>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9e9e9e" }}>Foto de perfil</p>
          </div>

          {/* Identificación */}
          <p className="section-label">Identificación</p>
          <div className="form-group">
            <label className="form-label">Tipo y Número de documento</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="doc-type">CC</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#424242" }}>
                {user.cedula || "—"}
              </span>
            </div>
          </div>

          {/* Datos personales */}
          <p className="section-label">Datos personales</p>
          <div className="form-grid-2">
            <FieldView label="Nombre"    value={user.nombre} />
            <FieldView label="Apellidos" value={user.apellidos} />
            <FieldView label="Correo electrónico" value={user.correo} full />
            <FieldView label="Teléfono"  value={user.telefono} />

            {/* Fecha de registro */}
            <div className="form-group">
              <label className="form-label">Fecha de registro</label>
              <div className="field-input field-input--disabled">
                {user.fechaCreacion || "—"}
              </div>
            </div>

            {/* Estado */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Estado</label>
              <ToggleView value={user.estado} razon={razonInactivo} />
            </div>
          </div>

          {/* Ubicación */}
          <p className="section-label">Ubicación</p>
          <div className="form-grid-2">
            <FieldView label="Dirección"    value={user.direccion} full />
            <FieldView label="Departamento" value={user.departamento} />
            <FieldView label="Municipio"    value={user.municipio} />
          </div>

          {/* Rol */}
          <p className="section-label">Rol</p>
          <div className="form-group">
            <label className="form-label">Rol asignado</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
              <span
                className="rol-badge"
                style={{
                  background: rolStyle.bg,
                  color: rolStyle.color,
                  borderColor: rolStyle.border,
                  fontSize: 13,
                  padding: "4px 14px",
                }}
              >
                {user.rol || "—"}
              </span>
            </div>
          </div>

          {/* Fecha creación */}
          {user.fechaCreacion && (
            <div className="date-info" style={{ marginTop: 8 }}>
              <span>📅</span>
              <span>
                Usuario desde <strong>{user.fechaCreacion}</strong>
              </span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MODAL ELIMINAR ─────────────────────────────────────── */
export function ModalEliminarUsuario({ user, razon, onClose, onConfirm }) {
  const [done, setDone] = useState(false);

  const handleEliminar = () => {
    setDone(true);
    setTimeout(() => { onConfirm(user.id); }, 800);
  };

  // Bloqueado por validación del contexto
  if (razon) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar usuario</h3>
          <p className="delete-body">
            ¿Eliminar a <strong>"{user.nombre} {user.apellidos}"</strong>?
          </p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
          <div className="modal-footer modal-footer--center">
            <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
            <button className="btn-danger" onClick={handleEliminar} disabled={done}>
              {done ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}