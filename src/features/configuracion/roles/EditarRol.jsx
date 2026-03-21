import { useState, useRef, useEffect } from "react";
import "./Roles.css";

const ICON_OPTIONS = ["👤","👑","🛡️","🔧","📦","💼","🧑‍💻","📊","🔑","⚙️","👷","🧑‍🍳"];

const MODULOS = [
  { key: "Dashboard", label: "Dashboard", icon: "📊" },
  { key: "Roles", label: "Roles", icon: "🛡️" },
  { key: "Usuarios", label: "Usuarios", icon: "👥" },
  { key: "Acceso", label: "Acceso", icon: "🔐" },

  { key: "CategoriaInsumos", label: "Categoría Insumos", icon: "📂" },
  { key: "Insumos", label: "Insumos", icon: "🧪" },
  { key: "Proveedores", label: "Proveedores", icon: "🚚" },

  { key: "CategoriaProductos", label: "Categoría Productos", icon: "📦" },
  { key: "GestionProductos", label: "Gestión Productos", icon: "📋" },
  { key: "FichaTecnica", label: "Ficha Técnica", icon: "📝" },
  { key: "OrdenesProduccion", label: "Órdenes de Producción", icon: "🏭" },

  { key: "Clientes", label: "Clientes", icon: "🧑‍💼" },
  { key: "Pedidos", label: "Pedidos", icon: "🛒" },
  { key: "GestionVentas", label: "Gestión Ventas", icon: "💰" },
  { key: "Devoluciones", label: "Devoluciones", icon: "↩️" },
  { key: "Domicilios", label: "Domicilios", icon: "🏍️" }
];

const ACCIONES = [
  { key: "ver",      label: "Ver",      icon: "👁️",  color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" },
  { key: "crear",    label: "Crear",    icon: "➕",   color: "#1565c0", bg: "#e3f2fd", border: "#90caf9" },
  { key: "editar",   label: "Editar",   icon: "✎",    color: "#e65100", bg: "#fff3e0", border: "#ffcc80" },
  { key: "eliminar", label: "Eliminar", icon: "🗑️",  color: "#c62828", bg: "#ffebee", border: "#ef9a9a" },
];

function buildPermisos(overrides = []) {
  const map = {};
  overrides.forEach(p => { if (p.modulo) map[p.id] = p.estado; });
  return MODULOS.flatMap(m =>
    ACCIONES.map(a => {
      const id = `${m.key}_${a.key}`;
      return { id, modulo: m.key, accion: a.key, nombre: `${a.label} ${m.label.toLowerCase()}`, estado: map[id] ?? false };
    })
  );
}

function PermisosModal({ permisos, isView, onChange, onClose }) {
  const [tab, setTab] = useState(MODULOS[0].key);

  const normalizar = (raw) => {
    if (raw.length > 0 && raw[0].modulo) return raw;
    return buildPermisos(raw);
  };

  const [local, setLocal] = useState(() => normalizar(permisos));

  const toggle = (id) => {
    if (isView) return;
    setLocal(prev => prev.map(p => p.id === id ? { ...p, estado: !p.estado } : p));
  };

  const toggleAll = (moduloKey, valor) => {
    if (isView) return;
    setLocal(prev => prev.map(p => p.modulo === moduloKey ? { ...p, estado: valor } : p));
  };

  const tabMeta    = MODULOS.find(m => m.key === tab);
  const tabItems   = local.filter(p => p.modulo === tab);
  const tabActivos = tabItems.filter(p => p.estado).length;
  const todosOn    = tabActivos === tabItems.length;
  const totalActivos = local.filter(p => p.estado).length;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="pmod-box" onClick={e => e.stopPropagation()}>

        <div className="pmod-header">
          <div>
            <p className="modal-header__eyebrow">Gestión de permisos</p>
            <h2 className="modal-header__title">Permisos del rol</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="pmod-global-badge">{totalActivos}/{local.length} activos</span>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="pmod-tabs-wrap">
          <div className="pmod-tabs">
            {MODULOS.map(m => {
              const mActivos = local.filter(p => p.modulo === m.key && p.estado).length;
              const isActive = tab === m.key;
              return (
                <button key={m.key} className={`pmod-tab${isActive ? " pmod-tab--active" : ""}`} onClick={() => setTab(m.key)}>
                  <span className="pmod-tab-icon">{m.icon}</span>
                  <span className="pmod-tab-label">{m.label}</span>
                  {mActivos > 0 && (
                    <span className={`pmod-tab-dot${isActive ? " pmod-tab-dot--active" : ""}`}>{mActivos}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pmod-body">
          <div className="pmod-module-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 30 }}>{tabMeta?.icon}</span>
              <div>
                <p className="pmod-module-title">{tabMeta?.label}</p>
                <p className="pmod-module-sub">{tabActivos} de {tabItems.length} acciones habilitadas</p>
              </div>
            </div>
            {!isView && (
              <button className={`pmod-toggle-all${todosOn ? " pmod-toggle-all--off" : ""}`} onClick={() => toggleAll(tab, !todosOn)}>
                {todosOn ? "Desactivar todo" : "Activar todo"}
              </button>
            )}
          </div>

          <div className="pmod-acciones-grid">
            {ACCIONES.map(accion => {
              const permiso = tabItems.find(p => p.accion === accion.key);
              if (!permiso) return null;
              return (
                <div
                  key={accion.key}
                  className={`pmod-accion-card${permiso.estado ? " pmod-accion-card--on" : ""}${isView ? " pmod-accion-card--view" : ""}`}
                  style={permiso.estado ? { borderColor: accion.border, background: accion.bg } : {}}
                  onClick={() => toggle(permiso.id)}
                >
                  <div className="pmod-accion-icon" style={permiso.estado ? { background: accion.bg, borderColor: accion.border } : {}}>
                    <span style={{ fontSize: 24 }}>{accion.icon}</span>
                  </div>
                  <p className="pmod-accion-label" style={permiso.estado ? { color: accion.color } : {}}>
                    {accion.label}
                  </p>
                  <div className="pmod-accion-check" style={permiso.estado ? { background: accion.color, borderColor: accion.color } : {}}>
                    {permiso.estado && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Cancelar"}</button>
          {!isView && (
            <button className="btn-save" onClick={() => { onChange(local); onClose(); }}>
              Aplicar permisos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditarRol({ rol, mode = "edit", onClose, onSave }) {
  const normalize = (p) => p?.length > 0 && p[0].modulo ? p : buildPermisos(p || []);

  const [form, setForm]                 = useState({ ...rol, permisos: normalize(rol.permisos) });
  const [errors, setErrors]             = useState({});
  const [saving, setSaving]             = useState(false);
  const [pickingIcon, setPickingIcon]   = useState(false);
  const [showPermisos, setShowPermisos] = useState(false);
  const fileRef = useRef();
  const isView  = mode === "view";

  useEffect(() => {
    if (rol) setForm({ ...rol, permisos: normalize(rol.permisos) });
  }, [rol]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const handleIconFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { set("iconoPreview", ev.target.result); set("icono", null); };
    reader.readAsDataURL(file);
  };

  const activosCount = form.permisos?.filter(p => p.estado).length || 0;
  const totalCount   = form.permisos?.length || 0;

  const handleSave = async () => {
    if (!form.nombre.trim()) { setErrors({ nombre: "Campo requerido" }); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(form);
    setSaving(false);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <p className="modal-header__eyebrow">Roles</p>
              <h2 className="modal-header__title">{isView ? "Ver rol" : "Editar rol"}</h2>
            </div>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Ícono</label>
              <div className="icon-row">
                <div className="rol-icon-wrap" style={{ cursor: isView ? "default" : "pointer" }}
                  onClick={() => !isView && fileRef.current.click()}>
                  {form.iconoPreview ? <img src={form.iconoPreview} alt="icon" /> : <span style={{ fontSize: 22 }}>{form.icono}</span>}
                </div>
                {!isView && (
                  <>
                    <button className="icon-change-btn" onClick={() => fileRef.current.click()}>Cambiar imagen</button>
                    <span style={{ color: "#9e9e9e", fontSize: 12 }}>o</span>
                    <button className="icon-change-btn" onClick={() => setPickingIcon(v => !v)}>Elegir emoji</button>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleIconFile} />
              </div>
              {!isView && pickingIcon && (
                <div className="icon-picker-grid">
                  {ICON_OPTIONS.map(ic => (
                    <button key={ic} className={`icon-option${form.icono === ic ? " selected" : ""}`}
                      onClick={() => { set("icono", ic); set("iconoPreview", null); setPickingIcon(false); }}>{ic}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del rol</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.nombre}</div>
                : <>
                    <input className={`field-input${errors.nombre ? " field-input--error" : ""}`}
                      value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej. Administrador"
                      onFocus={e => e.target.style.borderColor="#4caf50"}
                      onBlur={e  => e.target.style.borderColor=errors.nombre ? "#e53935" : "#e0e0e0"} />
                    {errors.nombre && <p className="field-error">{errors.nombre}</p>}
                  </>
              }
            </div>

            {rol?.fecha && (
              <div className="date-info" style={{ marginBottom: 16 }}>
                <span>📅</span><span>Creado el <strong>{rol.fecha}</strong></span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Permisos</label>
              <button className="permisos-open-btn" onClick={() => setShowPermisos(true)}>
                <span>🔐</span>
                <span>Ver y gestionar permisos</span>
                <span className="permiso-grupo-badge" style={{ marginLeft: "auto" }}>{activosCount}/{totalCount} activos</span>
                <span style={{ color: "#9e9e9e", fontSize: 13 }}>›</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Salir sin guardar"}</button>
            {!isView && (
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving && <span className="spinner">◌</span>}
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showPermisos && (
        <PermisosModal
          permisos={form.permisos}
          isView={isView}
          onChange={permisos => set("permisos", permisos)}
          onClose={() => setShowPermisos(false)}
        />
      )}
    </>
  );
}