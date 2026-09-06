import { useState } from "react";
import { Shield } from "lucide-react";
import { Ic } from "./usuariosIcons.jsx";
import { RolBadge } from "./CrearUsuario.jsx";
import SearchableSelect from "../../../shared/components/SearchableSelect.jsx";
import "./Usuarios.css";

// Acción rápida "Cambiar rol" del listado de usuarios. El blindaje real (super
// admin, admin normales, no cambiarse el propio rol, promover a Admin) lo valida
// el backend en PATCH /usuarios/{id}/rol; aquí solo se guía al usuario.
export default function ModalCambiarRol({ user, roles = [], onClose, onConfirm }) {
  const rolesDisponibles = roles.filter(r => r.estado);
  const [nuevoRol, setNuevoRol] = useState(user.rol || "");
  const [saving, setSaving]     = useState(false);
  const [error,  setError]      = useState("");

  const rolObj   = rolesDisponibles.find(r => r.nombre === nuevoRol);
  const sinCambio = !nuevoRol || nuevoRol === user.rol;

  const handleConfirm = async () => {
    if (sinCambio || !rolObj) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(rolObj.id);
    } catch (e) {
      setError(e?.message || "No se pudo cambiar el rol.");
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Usuarios</p>
            <h2 className="modal-title">Cambiar rol</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><Ic.Close /></button>
        </div>

        <div className="modal-body" style={{ overflow: "hidden" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569" }}>
            Usuario: <strong>{user.nombre} {user.apellidos}</strong>
          </p>

          <div className="field-wrap" style={{ marginBottom: 12 }}>
            <label className="field-label">Rol actual</label>
            <div className="field-input field-input--disabled" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RolBadge rol={user.rol} roles={roles} />
              <span>{user.rol || "—"}</span>
            </div>
          </div>

          <div className="field-wrap">
            <label className="field-label">Nuevo rol <span className="required">*</span></label>
            <SearchableSelect
              className="field-select"
              options={rolesDisponibles}
              value={nuevoRol}
              onChange={e => setNuevoRol(e.target.value)}
              getValue={r => r.nombre}
              getLabel={r => `${r.icono && !r.iconoPreview ? r.icono + " " : ""}${r.nombre}`}
              placeholder="Seleccione un rol…"
              searchPlaceholder="Buscar rol…"
            />
          </div>

          <p style={{ margin: "12px 0 0", fontSize: 11, color: "#64748b", display: "flex", alignItems: "flex-start", gap: 5 }}>
            <Shield size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            El comportamiento del usuario pasará a depender de este rol. Si tiene la
            sesión abierta, deberá recargar o volver a iniciar sesión.
          </p>

          {error && <p className="field-error" style={{ textAlign: "center", marginTop: 8 }}>{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleConfirm} disabled={saving || sinCambio}>
            {saving ? "Cambiando…" : "Cambiar rol"}
          </button>
        </div>
      </div>
    </div>
  );
}
