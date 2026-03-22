import { useRef, useEffect, useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./clientes.css";

const TIPOS_DOC = ["CC", "TI", "CE", "Pasaporte", "NIT", "PPT"];
const fmtTel = raw => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
  return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
};
const toInputDate   = v => v && v.includes("/") ? v.split("/").reverse().join("-") : (v || "");
const fromInputDate = v => { if (!v) return ""; const [y,m,d] = v.split("-"); return `${d}/${m}/${y}`; };
const ITEMS_PER_PAGE = 4;

/* ── API Colombia ─────────────────────────────────────────── */
function LocationSelects({ departamento, municipio, onDepto, onMunicipio, errDepto, errMunicipio, isView }) {
  const [deptos,     setDeptos]     = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingD,   setLoadingD]   = useState(false);
  const [loadingM,   setLoadingM]   = useState(false);

  useEffect(() => {
    if (isView) return;
    setLoadingD(true);
    fetch("https://api-colombia.com/api/v1/Department")
      .then(r => r.json())
      .then(data => setDeptos(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, [isView]);

  useEffect(() => {
    if (isView) return;
    if (!departamento) { setMunicipios([]); onMunicipio(""); return; }
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    setLoadingM(true);
    onMunicipio("");
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(data => setMunicipios(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [departamento, deptos, isView]);

  if (isView) return (
    <div className="form-grid-2">
      <div className="form-group"><label className="form-label">Departamento</label><div className="field-input field-input--disabled">{departamento || "—"}</div></div>
      <div className="form-group"><label className="form-label">Municipio</label><div className="field-input field-input--disabled">{municipio || "—"}</div></div>
    </div>
  );

  return (
    <div className="form-grid-2">
      <div className="form-group">
        <label className="form-label">Departamento</label>
        <select className={"field-input" + (errDepto ? " field-input--error" : "")}
          value={departamento || ""} onChange={e => onDepto(e.target.value)}
          disabled={loadingD} style={{ cursor: "pointer" }}>
          <option value="">{loadingD ? "Cargando…" : "— Seleccionar —"}</option>
          {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        {errDepto && <p className="field-error">{errDepto}</p>}
      </div>
      <div className="form-group">
        <label className="form-label">Municipio</label>
        <select className={"field-input" + (errMunicipio ? " field-input--error" : "")}
          value={municipio || ""} onChange={e => onMunicipio(e.target.value)}
          disabled={!departamento || loadingM} style={{ cursor: "pointer" }}>
          <option value="">{!departamento ? "Seleccione depto…" : loadingM ? "Cargando…" : "— Seleccionar —"}</option>
          {municipios.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
        {errMunicipio && <p className="field-error">{errMunicipio}</p>}
      </div>
    </div>
  );
}

/* ── UI ───────────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#c62828", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
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

/* ── Modal Eliminar ───────────────────────────────────────── */
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

/* ── Formulario unificado ─────────────────────────────────── */
function ClienteForm({ initial, isNew = false, isView = false, onClose, onSave }) {
  const empty = { tipoDoc: "CC", numDoc: "", nombre: "", apellidos: "", correo: "", telefono: "", direccion: "", departamento: "", municipio: "", contrasena: "", confirmar: "", estado: true, fotoPreview: null, fechaCreacion: "" };
  const [form, setForm]         = useState(initial ? { ...initial } : empty);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fotoRef = useRef();

  useEffect(() => { if (initial) setForm({ ...initial }); }, [initial]);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const handleFoto = e => {
    if (isView) return;
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.tipoDoc)              e.tipoDoc       = "Requerido";
    if (!form.numDoc.trim())        e.numDoc        = "Requerido";
    if (!form.nombre.trim())        e.nombre        = "Requerido";
    if (!form.apellidos.trim())     e.apellidos     = "Requerido";
    if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    if (!form.telefono.trim())      e.telefono      = "Requerido";
    if (!form.fechaCreacion.trim()) e.fechaCreacion = "Requerido";
    if (!form.departamento)         e.departamento  = "Requerido";
    if (!form.municipio)            e.municipio     = "Requerido";
    if (isNew) {
      if (form.contrasena.length < 6)           e.contrasena = "Mínimo 6 caracteres";
      if (form.contrasena !== form.confirmar)    e.confirmar  = "No coinciden";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const { confirmar, ...data } = form;
    onSave({ ...data, id: initial?.id });
    setSaving(false);
  };

  const Field = ({ k, label, type = "text", ph = "", full = false }) => (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <>
            <input className={"field-input" + (errors[k] ? " field-input--error" : "")}
              type={type} value={form[k] || ""} onChange={e => set(k, e.target.value)} placeholder={ph}
              onFocus={e => e.target.style.borderColor = "#4caf50"}
              onBlur={e  => e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0"} />
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </>
      }
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Clientes</p>
            <h2 className="modal-header__title">
              {isView ? `${form.nombre} ${form.apellidos}` : isNew ? "Nuevo Cliente" : "Editar Cliente"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="avatar-upload-wrap" style={{ cursor: isView ? "default" : "pointer" }}
              onClick={() => !isView && fotoRef.current.click()}>
              {form.fotoPreview ? <img className="avatar-upload-img" src={form.fotoPreview} alt="avatar" /> : <div className="avatar-upload-placeholder">👤</div>}
              {!isView && <div className="avatar-upload-overlay">📷</div>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9e9e9e" }}>Foto de perfil</p>
            <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
          </div>

          <p className="section-label">Identificación</p>
          <div className="form-group">
            <label className="form-label">Tipo y Número de documento</label>
            {isView ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="doc-type">{form.tipoDoc}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#424242" }}>{form.numDoc || "—"}</span>
              </div>
            ) : (
              <div className="doc-combo">
                <select className={"field-input doc-sel" + (errors.tipoDoc ? " field-input--error" : "")}
                  value={form.tipoDoc} onChange={e => set("tipoDoc", e.target.value)} style={{ cursor: "pointer" }}>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className={"field-input doc-input" + (errors.numDoc ? " field-input--error" : "")}
                  type="text" value={form.numDoc} onChange={e => set("numDoc", e.target.value)} placeholder="Número de documento"
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e  => e.target.style.borderColor = errors.numDoc ? "#e53935" : "#e0e0e0"} />
              </div>
            )}
            {(errors.tipoDoc || errors.numDoc) && <p className="field-error">{errors.tipoDoc || errors.numDoc}</p>}
          </div>

          <p className="section-label">Datos personales</p>
          <div className="form-grid-2">
            <Field k="nombre"    label="Nombre"    ph="Ej. Ana" />
            <Field k="apellidos" label="Apellidos" ph="Ej. García López" />
            <Field k="correo"    label="Correo electrónico" type="email" ph="correo@ejemplo.com" full />
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              {isView ? <div className="field-input field-input--disabled">{form.telefono || "—"}</div>
                : <>
                    <input className={"field-input" + (errors.telefono ? " field-input--error" : "")}
                      type="tel" value={form.telefono || ""} maxLength={12}
                      onChange={e => set("telefono", fmtTel(e.target.value))} placeholder="300 000 0000"
                      onFocus={e => e.target.style.borderColor = "#4caf50"}
                      onBlur={e  => e.target.style.borderColor = errors.telefono ? "#e53935" : "#e0e0e0"} />
                    {errors.telefono && <p className="field-error">{errors.telefono}</p>}
                  </>
              }
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de registro</label>
              {isView ? <div className="field-input field-input--disabled">{form.fechaCreacion || "—"}</div>
                : <>
                    <input className={"field-input" + (errors.fechaCreacion ? " field-input--error" : "")}
                      type="date" value={toInputDate(form.fechaCreacion)}
                      onChange={e => set("fechaCreacion", fromInputDate(e.target.value))}
                      onFocus={e => e.target.style.borderColor = "#4caf50"}
                      onBlur={e  => e.target.style.borderColor = errors.fechaCreacion ? "#e53935" : "#e0e0e0"} />
                    {errors.fechaCreacion && <p className="field-error">{errors.fechaCreacion}</p>}
                  </>
              }
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Estado</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                <Toggle value={form.estado} onChange={v => !isView && set("estado", v)} />
                <span style={{ fontSize: 13, fontWeight: 600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>{form.estado ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
          </div>

          <p className="section-label">Ubicación</p>
          <div className="form-grid-2" style={{ marginBottom: 12 }}>
            <Field k="direccion" label="Dirección" ph="Ej. Calle 50 # 40-20, Apto 301" full />
          </div>
          <LocationSelects
            departamento={form.departamento} municipio={form.municipio}
            onDepto={v  => { set("departamento", v); set("municipio", ""); }}
            onMunicipio={v => set("municipio", v)}
            errDepto={errors.departamento} errMunicipio={errors.municipio}
            isView={isView}
          />

          {!isView && (
            <>
              <p className="section-label" style={{ marginTop: 14 }}>{isNew ? "Contraseña" : "Cambiar contraseña"}</p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    {isNew ? "Contraseña" : "Nueva contraseña"}
                    {!isNew && <span style={{ color: "#bdbdbd", fontWeight: 400, marginLeft: 4, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>}
                  </label>
                  <div className="pass-wrap">
                    <input className={"field-input" + (errors.contrasena ? " field-input--error" : "")}
                      type={showPass ? "text" : "password"} style={{ paddingRight: 36 }}
                      value={form.contrasena || ""}
                      onChange={e => set("contrasena", e.target.value)}
                      placeholder={isNew ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"}
                      onFocus={e => e.target.style.borderColor = "#4caf50"}
                      onBlur={e  => e.target.style.borderColor = errors.contrasena ? "#e53935" : "#e0e0e0"} />
                    <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>{showPass ? "🙈" : "👁"}</button>
                  </div>
                  {errors.contrasena && <p className="field-error">{errors.contrasena}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <div className="pass-wrap">
                    <input className={"field-input" + (errors.confirmar ? " field-input--error" : "")}
                      type={showPass ? "text" : "password"} style={{ paddingRight: 36 }}
                      value={form.confirmar || ""}
                      onChange={e => set("confirmar", e.target.value)}
                      placeholder="Repetir contraseña"
                      onFocus={e => e.target.style.borderColor = "#4caf50"}
                      onBlur={e  => e.target.style.borderColor = errors.confirmar ? "#e53935" : "#e0e0e0"} />
                    <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>{showPass ? "🙈" : "👁"}</button>
                  </div>
                  {errors.confirmar && <p className="field-error">{errors.confirmar}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Cancelar"}</button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner">◌</span>}
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL — conectada al AppContext
══════════════════════════════════════════════════════════ */
export default function GestionClientes() {
  const {
    clientes,
    crearCliente, editarCliente, toggleCliente, eliminarCliente,
    canDeleteCliente,
  } = useApp();

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

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleCreate = (data) => {
    crearCliente(data);
    showToast("Cliente creado");
    setModal(null);
  };

  const handleEdit = (data) => {
    editarCliente(data);
    showToast("Cambios guardados");
    setModal(null);
  };

  const handleDeleteClick = (cliente) => {
    const check = canDeleteCliente(cliente.id);
    setModal({ mode: "delete", cliente, razon: check.ok ? null : check.razon });
  };

  const handleDelete = () => {
    eliminarCliente(modal.cliente.id);
    showToast("Cliente eliminado", "error");
    setModal(null);
  };

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
                  <button key={f.val}
                    className={"filter-option" + (filter === f.val ? " active" : "")}
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
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div className="client-cell">
                        <div className="avatar-wrap">
                          {c.fotoPreview
                            ? <img src={c.fotoPreview} alt={c.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span>👤</span>}
                        </div>
                        <div>
                          <div className="client-name">{c.nombre} {c.apellidos}</div>
                          <div className="client-email">{c.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="doc-badge">
                        <span className="doc-type">{c.tipoDoc}</span>
                        <span className="doc-num">{c.numDoc}</span>
                      </div>
                    </td>
                    <td>
                      <span className="phone-cell">
                        <span className="phone-icon">📞</span>{c.telefono}
                      </span>
                    </td>
                    <td>
                      <div className="location-city">{c.municipio}</div>
                      <div className="location-dept">{c.departamento}</div>
                    </td>
                    <td>
                      <Toggle value={c.estado} onChange={() => toggleCliente(c.id)} />
                    </td>
                    <td><span className="date-badge">{c.fechaCreacion}</span></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"
                          onClick={() => setModal({ mode: "view",   cliente: c })}>👁</button>
                        <button className="act-btn act-btn--edit"
                          onClick={() => setModal({ mode: "edit",   cliente: c })}>✎</button>
                        <button className="act-btn act-btn--delete"
                          onClick={() => handleDeleteClick(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.mode === "new"    && <ClienteForm isNew onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.mode === "edit"   && <ClienteForm initial={modal.cliente} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.mode === "view"   && <ClienteForm initial={modal.cliente} isView onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && (
        <EliminarModal
          cliente={modal.cliente}
          razon={modal.razon}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}