import { useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import { Avatar } from "./CrearUsuario.jsx";
import { Ic } from "./usuariosIcons.jsx";
import { getRolStyle } from "./usuariosUtils.js";
import "./Usuarios.css";

// ─── Campo solo lectura ───────────────────────────────────
function FieldView({ label, value, full = false }) {
  return (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      <div className="field-input field-input--disabled">{value || "—"}</div>
    </div>
  );
}

// ─── Toggle visual solo lectura ───────────────────────────
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

// ─── Secciones del side panel ─────────────────────────────
const NAV_ITEMS = [
  { id: "personal",  label: "Personal",  icon: "👤" },
  { id: "ubicacion", label: "Ubicación", icon: "📍" },
  { id: "rol",       label: "Rol",       icon: "🎖️" },
];

// ─── MODAL VER USUARIO — SIDE PANEL ──────────────────────
export function ModalVerUsuario({ user, onClose }) {
  const { roles } = useApp();
  const [activeSection, setActiveSection] = useState("personal");

  const rolObj   = roles.find(r => r.nombre === user.rol);
  const rolStyle = getRolStyle(user.rol);
  const razonInactivo = !user.estado && rolObj && !rolObj.estado
    ? `El rol "${user.rol}" está desactivado`
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Caja más ancha para el layout side panel */}
      <div
        className="modal-box"
        style={{ maxWidth: 660, width: "100%", maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Usuarios</p>
            <h2 className="modal-header__title">
              {user.nombre} {user.apellidos}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* SIDE PANEL LAYOUT */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* NAV LATERAL */}
          <nav style={{
            width: 160,
            borderRight: "1px solid #f0f0f0",
            background: "#fafdf9",
            display: "flex",
            flexDirection: "column",
            padding: "12px 0",
            flexShrink: 0,
          }}>
            {/* Avatar compacto en la nav */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
              <Avatar foto={user.foto} size={52} border />
            </div>

            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  border: "none",
                  borderLeft: activeSection === item.id ? "3px solid #2e7d32" : "3px solid transparent",
                  background: activeSection === item.id ? "#e8f5e9" : "transparent",
                  color: activeSection === item.id ? "#2e7d32" : "#757575",
                  fontWeight: activeSection === item.id ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* CONTENIDO — sin overflow, cada sección cabe */}
          <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>

            {/* ── Sección: Personal ── */}
            {activeSection === "personal" && (
              <>
                <p className="section-label" style={{ marginTop: 0 }}>Identificación</p>
                <div className="form-group">
                  <label className="form-label">Tipo y Número de documento</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="doc-type">CC</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#424242" }}>
                      {user.cedula || "—"}
                    </span>
                  </div>
                </div>

                <p className="section-label">Datos personales</p>
                <div className="form-grid-2">
                  <FieldView label="Nombre"    value={user.nombre} />
                  <FieldView label="Apellidos" value={user.apellidos} />
                  <FieldView label="Correo electrónico" value={user.correo} full />
                  <FieldView label="Teléfono"  value={user.telefono} />
                  <FieldView label="Fecha de registro" value={user.fechaCreacion} />
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Estado</label>
                    <ToggleView value={user.estado} razon={razonInactivo} />
                  </div>
                </div>
              </>
            )}

            {/* ── Sección: Ubicación ── */}
            {activeSection === "ubicacion" && (
              <>
                <p className="section-label" style={{ marginTop: 0 }}>Ubicación</p>
                <div className="form-grid-2">
                  <FieldView label="Dirección"    value={user.direccion} full />
                  <FieldView label="Departamento" value={user.departamento} />
                  <FieldView label="Municipio"    value={user.municipio} />
                </div>
              </>
            )}

            {/* ── Sección: Rol ── */}
            {activeSection === "rol" && (
              <>
                <p className="section-label" style={{ marginTop: 0 }}>Rol asignado</p>
                <div className="form-group">
                  <label className="form-label">Rol</label>
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

                {/* Estado del rol */}
                {rolObj && (
                  <div className="form-group">
                    <label className="form-label">Estado del rol</label>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 8,
                      background: rolObj.estado ? "#e8f5e9" : "#ffebee",
                      border: `1px solid ${rolObj.estado ? "#c8e6c9" : "#ef9a9a"}`,
                      fontSize: 12, fontWeight: 700,
                      color: rolObj.estado ? "#2e7d32" : "#c62828",
                    }}>
                      {rolObj.estado ? "✓ Activo" : "✕ Desactivado"}
                    </div>
                  </div>
                )}

                {user.fechaCreacion && (
                  <div className="date-info" style={{ marginTop: 16 }}>
                    <span>📅</span>
                    <span>Usuario desde <strong>{user.fechaCreacion}</strong></span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ELIMINAR ───────────────────────────────────────
export function ModalEliminarUsuario({ user, razon, onClose, onConfirm }) {
  const [done, setDone] = useState(false);

  const handleEliminar = () => {
    setDone(true);
    setTimeout(() => { onConfirm(user.id); }, 800);
  };

  if (razon) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
            <div className="delete-icon-wrap" style={{ background: "#fff8e1", border: "1px solid #ffe082", color: "#e65100" }}>⚠️</div>
            <h3 className="delete-title">Restricción de seguridad</h3>
            <p className="delete-body" style={{ color: "#e65100", fontWeight: 500 }}>{razon}</p>
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
            ¿Está seguro de que desea eliminar permanentemente al usuario <strong>"{user.nombre} {user.apellidos}"</strong>?
          </p>
          <p className="delete-warn">Esta operación es definitiva y no podrá ser revertida.</p>
          <div className="modal-footer modal-footer--center">
            <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
            <button className="btn-danger" onClick={handleEliminar} disabled={done}>
              {done ? "Eliminando…" : "Confirmar eliminación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}