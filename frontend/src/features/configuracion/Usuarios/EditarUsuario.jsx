import { useState } from "react";
import { Toggle, Avatar } from "./CrearUsuario.jsx";
import { Ic } from "./usuariosIcons.jsx";
import { G, GB } from "./usuariosUtils.js";
import "./Usuarios.css";

// ─── SHARED FIELD (read-only) ─────────────────────────────
function FieldReadOnly({ label, value }) {
  return (
    <div className="field-wrap">
      <label className="field-label">{label}</label>
      <input readOnly value={value ?? ""} className="field-input readonly" />
    </div>
  );
}

// ─── MODAL: VER DETALLES ──────────────────────────────────
export function ModalVerUsuario({ user, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 className="modal-title">
            Detalles de <em>{user.nombre} {user.apellidos}</em>
          </h2>
          <button className="modal-close-btn" onClick={onClose}><Ic.Close /></button>
        </div>

        <div className="ver-body">
          {/* Avatar */}
          <div className="ver-avatar-col">
            <Avatar foto={user.foto} size={80} />
            <span style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 600 }}>Foto</span>
          </div>

          {/* Campos */}
          <div className="ver-fields-grid">
            <FieldReadOnly label="Nombre"       value={user.nombre} />
            <FieldReadOnly label="Apellidos"    value={user.apellidos} />
            <FieldReadOnly label="Correo"       value={user.correo} />
            <FieldReadOnly label="Cédula"       value={user.cedula} />
            <FieldReadOnly label="Teléfono"     value={user.telefono} />
            <FieldReadOnly label="Dirección"    value={user.direccion} />
            <FieldReadOnly label="Municipio"    value={user.municipio} />
            <FieldReadOnly label="Departamento" value={user.departamento} />
            <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Rol</label>
              <input readOnly value={user.rol ?? ""} className="field-input readonly" />
            </div>
          </div>
        </div>

        {/* Botón cerrar — derecha abajo */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 24px 20px" }}>
          <button className="btn-cancel" onClick={onClose}>Cerrar</button>
        </div>

      </div>
    </div>
  );
}

// ─── MODAL: ELIMINAR ──────────────────────────────────────
export function ModalEliminarUsuario({ user, onClose, onConfirm }) {
  const tieneAsociados = user.id % 2 === 0;
  const [done, setDone] = useState(false);

  const handleEliminar = () => {
    setDone(true);
    setTimeout(() => { onConfirm(user.id); }, 1800);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="delete-modal-body">
          <button className="modal-close-btn" onClick={onClose}
            style={{ position: "absolute", top: 14, right: 14 }}>
            <Ic.Close />
          </button>

          <div className="delete-modal-content">
            {tieneAsociados ? <Ic.Warn /> : <Ic.TrashBig />}

            {tieneAsociados ? (
              <>
                <p className="delete-modal-text">
                  Esta acción no se puede realizar porque tiene usuarios asociados.{" "}
                  <em style={{ fontWeight: 700 }}>El estado cambiará a inactivo.</em>
                </p>
                <button className="btn-save" onClick={onClose}>Aceptar</button>
              </>
            ) : (
              <>
                <p className="delete-modal-text">
                  ¿Estás seguro que quieres eliminar a{" "}
                  <strong>{user.nombre}</strong>?{" "}
                  <strong>Esta acción no se puede deshacer.</strong>
                </p>
                <div className="delete-modal-btn-row">
                  <button className="btn-delete"  onClick={handleEliminar} disabled={done}>
                    {done ? "Eliminando…" : "Eliminar"}
                  </button>
                  <button className="btn-cancel"  onClick={onClose}>Cancelar</button>
                </div>
              </>
            )}
          </div>

          {done && (
            <div className="modal-success-toast" style={{ bottom: -56 }}>
              <Ic.Check /><span>Eliminación exitosa</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}