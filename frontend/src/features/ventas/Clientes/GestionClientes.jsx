import { useState, useRef, useEffect } from "react";

/* ─── Catálogos ───────────────────────────────────────────── */
const TIPOS_DOC = ["CC","TI","CE","Pasaporte","NIT","PPT"];

const DEPARTAMENTOS = [
  "Antioquia","Cundinamarca","Valle del Cauca","Atlántico","Santander",
  "Bolívar","Nariño","Córdoba","Tolima","Cauca",
];
const MUNICIPIOS = {
  "Antioquia":       ["Medellín","Bello","Itagüí","Envigado","Sabaneta"],
  "Cundinamarca":    ["Bogotá","Soacha","Chía","Zipaquirá","Facatativá"],
  "Valle del Cauca": ["Cali","Buenaventura","Palmira","Tuluá","Buga"],
  "Atlántico":       ["Barranquilla","Soledad","Malambo","Sabanalarga"],
  "Santander":       ["Bucaramanga","Floridablanca","Girón","Piedecuesta"],
  "Bolívar":         ["Cartagena","Magangué","Mompós"],
  "Nariño":          ["Pasto","Tumaco","Ipiales"],
  "Córdoba":         ["Montería","Cereté","Lorica"],
  "Tolima":          ["Ibagué","Espinal","Melgar"],
  "Cauca":           ["Popayán","Santander de Quilichao","Puerto Tejada"],
};

/* Genera un ID único no secuencial */
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/* Formatea teléfono colombiano: 3001234567 → 300 123 4567 */
const fmtTel = raw => {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
  return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
};

const initialClientes = [
  { id:uid(), tipoDoc:"CC",       numDoc:"1012345678", nombre:"Ana",    apellidos:"García López",   correo:"ana.garcia@email.com",   telefono:"300 123 4567", direccion:"Calle 50 # 40-20",   departamento:"Antioquia",       municipio:"Medellín",     estado:true,  fotoPreview:null, fechaCreacion:"12/12/2025" },
  { id:uid(), tipoDoc:"CC",       numDoc:"80456789",   nombre:"Carlos", apellidos:"Pérez Ruiz",     correo:"carlos.perez@email.com", telefono:"310 987 6543", direccion:"Carrera 15 # 8-30",  departamento:"Cundinamarca",    municipio:"Bogotá",       estado:true,  fotoPreview:null, fechaCreacion:"15/01/2026" },
  { id:uid(), tipoDoc:"CE",       numDoc:"E-1234567",  nombre:"Lucía",  apellidos:"Martínez Vega",  correo:"lucia.mv@email.com",     telefono:"315 456 7890", direccion:"Av. 6N # 23-10",     departamento:"Valle del Cauca", municipio:"Cali",         estado:false, fotoPreview:null, fechaCreacion:"01/02/2026" },
  { id:uid(), tipoDoc:"CC",       numDoc:"72654321",   nombre:"Jorge",  apellidos:"Torres Suárez",  correo:"jorge.torres@email.com", telefono:"320 321 0987", direccion:"Calle 72 # 45-55",   departamento:"Atlántico",       municipio:"Barranquilla", estado:true,  fotoPreview:null, fechaCreacion:"20/02/2026" },
  { id:uid(), tipoDoc:"TI",       numDoc:"1234567890", nombre:"María",  apellidos:"López Castillo", correo:"maria.lc@email.com",     telefono:"317 654 3210", direccion:"Diagonal 30 # 12-5", departamento:"Santander",       municipio:"Bucaramanga",  estado:true,  fotoPreview:null, fechaCreacion:"28/02/2026" },
];

const ITEMS_PER_PAGE = 4;

/* ─── Estilos ─────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,600;0,700;0,800;1,700;1,800&family=DM+Sans:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: 'DM Sans', sans-serif; color: #1a1a1a; }

@keyframes fadeIn       { from{opacity:0}                             to{opacity:1} }
@keyframes slideUp      { from{transform:translateY(26px);opacity:0}  to{transform:translateY(0);opacity:1} }
@keyframes slideInRight { from{transform:translateX(70px);opacity:0}  to{transform:translateX(0);opacity:1} }
@keyframes spin         { to{transform:rotate(360deg)} }

.page-wrapper { min-height:100vh; width:100%; background:linear-gradient(180deg,#e8f5e9 0%,#f5fbf5 18%,#ffffff 42%); padding-bottom:60px; }

.page-header { text-align:center; padding:40px 20px 32px; }
.page-header__title { margin:0 0 10px; font-family:'Nunito',sans-serif; font-size:clamp(26px,4.5vw,38px); font-weight:800; font-style:italic; color:#2e7d32; letter-spacing:-0.3px; }
.page-header__line  { width:52px; height:3.5px; background:#2e7d32; border-radius:2px; margin:0 auto; }

.page-inner { max-width:1180px; margin:0 auto; padding:0 24px; }

.toolbar { display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.search-wrap { flex:1; min-width:200px; position:relative; }
.search-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#9e9e9e; font-size:16px; pointer-events:none; }
.search-input { width:100%; padding:12px 14px 12px 42px; border-radius:10px; border:1.5px solid #e0e0e0; font-size:14px; outline:none; font-family:inherit; color:#1a1a1a; background:#fff; transition:border .18s; }
.search-input:focus { border-color:#4caf50; }

.filter-icon-btn { width:44px; height:44px; border-radius:10px; border:1.5px solid #e0e0e0; background:#fff; cursor:pointer; font-size:16px; color:#757575; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; position:relative; }
.filter-icon-btn:hover, .filter-icon-btn.has-filter { border-color:#4caf50; color:#2e7d32; background:#f1f8f1; }

.filter-dropdown { position:absolute; top:calc(100% + 6px); right:0; background:#fff; border-radius:10px; border:1px solid #e0e0e0; box-shadow:0 8px 24px rgba(0,0,0,.1); min-width:150px; z-index:100; overflow:hidden; animation:slideUp .18s ease; }
.filter-option { display:flex; align-items:center; gap:8px; padding:10px 14px; font-size:13px; font-weight:500; color:#424242; cursor:pointer; transition:background .12s; border:none; background:transparent; width:100%; font-family:inherit; }
.filter-option:hover  { background:#f5f5f5; }
.filter-option.active { background:#f1f8f1; color:#2e7d32; font-weight:700; }
.filter-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

.btn-agregar { padding:11px 22px; border-radius:10px; border:none; background:#2e7d32; color:#fff; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; white-space:nowrap; transition:background .18s; flex-shrink:0; }
.btn-agregar:hover { background:#388e3c; }

.card { background:#fff; border-radius:14px; border:1.5px solid #c8e6c9; overflow:hidden; box-shadow:0 2px 16px rgba(46,125,50,.07); }

.tbl { width:100%; border-collapse:collapse; }
.tbl thead tr { background:#2e7d32; }
.tbl th { padding:13px 16px; font-size:11px; font-weight:700; color:#fff; text-align:left; white-space:nowrap; letter-spacing:.5px; text-transform:uppercase; }
.tbl th:last-child { text-align:center; }
.tbl-row { border-bottom:1px solid #f1f8f1; background:#fff; transition:background .12s; }
.tbl-row:last-child { border-bottom:none; }
.tbl-row:hover { background:#f9fdf9; }
.tbl td { padding:12px 16px; vertical-align:middle; }

/* Número de fila */
.row-num { font-size:11px; font-weight:700; color:#bdbdbd; background:#fafafa; border-radius:6px; padding:3px 7px; display:inline-block; min-width:28px; text-align:center; }

/* Cliente cell */
.client-cell { display:flex; align-items:center; gap:10px; min-width:160px; }
.client-name { font-weight:700; color:#1a1a1a; font-size:13.5px; line-height:1.3; }
.client-email { font-size:11px; color:#9e9e9e; margin-top:1px; }

/* Doc badge */
.doc-badge { display:inline-flex; align-items:center; gap:6px; }
.doc-type  { font-size:10px; font-weight:800; background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; border-radius:5px; padding:2px 7px; letter-spacing:.4px; white-space:nowrap; }
.doc-num   { font-size:13px; font-weight:600; color:#424242; font-variant-numeric:tabular-nums; white-space:nowrap; }

/* Teléfono */
.phone-cell { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:#37474f; background:#f1f8f1; border:1px solid #c8e6c9; border-radius:8px; padding:5px 11px; letter-spacing:.4px; font-variant-numeric:tabular-nums; white-space:nowrap; }
.phone-icon { font-size:12px; }

/* Ubicación */
.location-city { font-size:13px; font-weight:600; color:#1a1a1a; }
.location-dept { font-size:11px; color:#9e9e9e; margin-top:1px; }

/* Fecha */
.date-badge { font-size:12px; color:#757575; background:#fafafa; border:1px solid #eeeeee; border-radius:6px; padding:4px 9px; white-space:nowrap; display:inline-block; }

/* Avatar */
.avatar-wrap { width:38px; height:38px; border-radius:50%; background:#e8f5e9; border:2px solid #c8e6c9; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; overflow:hidden; }
.avatar-wrap img { width:100%; height:100%; object-fit:cover; }

.toggle-btn   { position:relative; width:52px; height:28px; border-radius:14px; border:none; cursor:pointer; transition:background .25s; flex-shrink:0; }
.toggle-thumb { position:absolute; top:3px; width:22px; height:22px; border-radius:50%; background:#fff; transition:left .25s; box-shadow:0 1px 4px rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center; }
.toggle-label { font-size:9px; font-weight:800; color:#2e7d32; letter-spacing:.3px; }

.actions-cell { display:flex; gap:6px; justify-content:center; }
.act-btn { width:34px; height:34px; border-radius:8px; border:1.5px solid transparent; cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all .15s; background:none; }
.act-btn:hover       { transform:scale(1.1); }
.act-btn--view   { background:#e8f5e9; border-color:#a5d6a7; color:#2e7d32; }
.act-btn--edit   { background:#fff8e1; border-color:#ffe082; color:#f9a825; }
.act-btn--delete { background:#ffebee; border-color:#ef9a9a; color:#c62828; }

.pagination-bar   { display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px 20px 20px; background:#fff; }
.pagination-count { font-size:12px; color:#9e9e9e; align-self:flex-end; }
.pagination-btns  { display:flex; align-items:center; gap:8px; }
.pg-btn-arrow { width:36px; height:36px; border-radius:50%; border:1.5px solid #c8e6c9; background:#fff; color:#2e7d32; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.pg-btn-arrow:hover:not(:disabled) { background:#e8f5e9; }
.pg-btn-arrow:disabled { opacity:.35; cursor:not-allowed; }
.pg-pill { padding:9px 28px; border-radius:30px; border:none; background:#2e7d32; color:#fff; font-weight:700; font-size:14px; font-family:inherit; }

.empty-state { padding:56px 20px; text-align:center; }
.empty-state__icon { font-size:32px; opacity:.35; margin-bottom:10px; }
.empty-state__text { color:#9e9e9e; font-size:14px; margin:0; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; animation:fadeIn .18s ease; }
.modal-box     { background:#fff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,.18); animation:slideUp .26s cubic-bezier(.34,1.4,.64,1); overflow:hidden; }
.modal-box--sm   { max-width:380px; }
.modal-box--wide { max-width:560px; }

.modal-header { padding:20px 24px 16px; border-bottom:1px solid #f5f5f5; display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg,#f1f8f1,#fff); }
.modal-header__eyebrow { margin:0 0 2px; font-size:10px; font-weight:700; letter-spacing:2px; color:#9e9e9e; }
.modal-header__title   { margin:0; font-family:'Nunito',sans-serif; font-size:17px; font-weight:800; color:#2e7d32; }
.modal-close-btn { width:30px; height:30px; border-radius:8px; border:1px solid #e0e0e0; background:transparent; cursor:pointer; color:#757575; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.modal-close-btn:hover { background:#f5f5f5; }

.modal-body   { padding:20px 24px; }
.modal-footer { padding:14px 24px 20px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid #f5f5f5; }
.modal-footer--center { justify-content:stretch; padding:0 24px 20px; }

.form-group { margin-bottom:16px; }
.form-label { display:block; font-size:11px; font-weight:700; color:#757575; letter-spacing:.8px; text-transform:uppercase; margin-bottom:6px; }
.form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

.field-input { width:100%; padding:10px 13px; border-radius:9px; border:1.5px solid #e0e0e0; background:#fff; color:#1a1a1a; outline:none; font-family:inherit; font-size:14px; transition:border .18s; line-height:1.5; }
.field-input:focus     { border-color:#4caf50; }
.field-input--error    { border-color:#e53935; }
.field-input--disabled { background:#fafafa; color:#424242; cursor:default; }
.field-error { margin:4px 0 0; font-size:11px; color:#e53935; }

/* Combo tipo + número de documento */
.doc-combo            { display:flex; gap:8px; }
.doc-combo .doc-sel   { width:115px; flex-shrink:0; }
.doc-combo .doc-input { flex:1; }

/* Sección header en modal */
.section-label { margin:8px 0 12px; font-size:10.5px; font-weight:700; color:#9e9e9e; letter-spacing:1px; text-transform:uppercase; padding-bottom:6px; border-bottom:1px solid #f5f5f5; }

/* Avatar upload */
.avatar-upload-wrap { position:relative; width:88px; height:88px; border-radius:50%; margin:0 auto 4px; cursor:pointer; }
.avatar-upload-img  { width:88px; height:88px; border-radius:50%; object-fit:cover; border:3px solid #c8e6c9; }
.avatar-upload-placeholder { width:88px; height:88px; border-radius:50%; background:#e8f5e9; border:3px dashed #c8e6c9; display:flex; align-items:center; justify-content:center; font-size:34px; }
.avatar-upload-overlay { position:absolute; inset:0; border-radius:50%; background:rgba(46,125,50,.55); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .18s; color:#fff; font-size:20px; }
.avatar-upload-wrap:hover .avatar-upload-overlay { opacity:1; }

.pass-wrap { position:relative; }
.pass-toggle-btn { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:15px; color:#9e9e9e; }

/* Botones */
.btn-ghost { padding:9px 20px; border-radius:9px; border:1.5px solid #e0e0e0; background:transparent; color:#616161; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; transition:all .15s; }
.btn-ghost:hover { background:#f5f5f5; }
.btn-save  { padding:9px 24px; border-radius:9px; border:none; background:#2e7d32; color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; box-shadow:0 3px 10px rgba(46,125,50,.35); transition:all .18s; display:flex; align-items:center; gap:6px; }
.btn-save:hover:not(:disabled) { background:#388e3c; }
.btn-save:disabled { background:#bdbdbd; box-shadow:none; cursor:not-allowed; }
.btn-danger { flex:1; padding:10px; border-radius:9px; border:none; background:#c62828; color:#fff; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; box-shadow:0 3px 10px rgba(198,40,40,.3); transition:all .18s; }
.btn-danger:hover:not(:disabled) { background:#b71c1c; }
.btn-danger:disabled { background:#bdbdbd; box-shadow:none; cursor:not-allowed; }
.btn-cancel-full { flex:1; padding:10px; border-radius:9px; border:1.5px solid #e0e0e0; background:transparent; color:#616161; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; }

.delete-icon-wrap { width:52px; height:52px; border-radius:14px; background:#ffebee; border:1px solid #ef9a9a; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 14px; }
.delete-title { margin:0 0 8px; font-size:17px; font-weight:700; color:#1a1a1a; font-family:'Nunito',sans-serif; }
.delete-body  { margin:0 0 4px; font-size:14px; color:#616161; }
.delete-warn  { margin:0; font-size:12px; color:#9e9e9e; }

.spinner { display:inline-block; animation:spin .7s linear infinite; font-size:14px; }
.toast { position:fixed; bottom:28px; right:28px; z-index:2000; padding:12px 20px; border-radius:12px; color:#fff; font-weight:600; font-size:13px; box-shadow:0 8px 24px rgba(0,0,0,.18); display:flex; align-items:center; gap:8px; animation:slideInRight .32s cubic-bezier(.34,1.4,.64,1); }

::-webkit-scrollbar       { width:4px; }
::-webkit-scrollbar-thumb { background:#c8e6c9; border-radius:4px; }
`;

/* ─── UI pequeños ─────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="toggle-btn"
      style={{
        background: value ? "#43a047" : "#c62828",
        boxShadow: value
          ? "0 2px 8px rgba(67,160,71,0.45)"
          : "0 2px 8px rgba(198,40,40,0.3)",
      }}
    >
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color: "black" }}>
          {value ? "ON" : "OFF"}
        </span>
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

function Field({ k, label, type = "text", ph = "", full = false, form, errors = {}, isView, onChange }) {
  return (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : {}}>
      <label className="form-label">{label}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <>
            <input className={"field-input" + (errors[k] ? " field-input--error" : "")}
              type={type} value={form[k] || ""} onChange={e => onChange(k, e.target.value)} placeholder={ph}
              onFocus={e => (e.target.style.borderColor = "#4caf50")}
              onBlur={e => (e.target.style.borderColor = errors[k] ? "#e53935" : "#e0e0e0")} />
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </>
      }
    </div>
  );
}

/* ─── Modal Eliminar ──────────────────────────────────────── */
function EliminarModal({ cliente, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
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

/* ─── Formulario unificado Crear / Editar / Ver ───────────── */
function ClienteForm({ initial, isNew = false, isView = false, onClose, onSave }) {
  const empty = {
    tipoDoc: "CC", numDoc: "", nombre: "", apellidos: "",
    correo: "", telefono: "", direccion: "",
    departamento: "", municipio: "",
    contrasena: "", confirmar: "",
    estado: true, fotoPreview: null, fechaCreacion: "",
  };

  const [form, setForm]       = useState(initial ? { ...initial } : empty);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fotoRef = useRef();

  useEffect(() => { if (initial) setForm({ ...initial }); }, [initial]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  /* Teléfono con formato automático */
  const handleTel = v => set("telefono", fmtTel(v));

  const handleFoto = e => {
    if (isView) return;
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  /* Convierte dd/mm/yyyy ↔ yyyy-mm-dd para input[type=date] */
  const toInputDate = v =>
    v && v.includes("/") ? v.split("/").reverse().join("-") : (v || "");
  const fromInputDate = v => {
    if (!v) return "";
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
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
      if (form.contrasena.length < 6)              e.contrasena = "Mínimo 6 caracteres";
      if (form.contrasena !== form.confirmar)       e.confirmar  = "No coinciden";
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    const { confirmar, ...data } = form;
    onSave({ ...data, id: initial?.id ?? uid() });
    setSaving(false);
  };

  const fp = { form, errors, isView, onChange: set };

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

          {/* ── Avatar ── */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div className="avatar-upload-wrap" style={{ cursor: isView ? "default" : "pointer" }}
              onClick={() => !isView && fotoRef.current.click()}>
              {form.fotoPreview
                ? <img className="avatar-upload-img" src={form.fotoPreview} alt="avatar" />
                : <div className="avatar-upload-placeholder">👤</div>}
              {!isView && <div className="avatar-upload-overlay">📷</div>}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9e9e9e" }}>Foto de perfil</p>
            <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
          </div>

          {/* ── Identificación ── */}
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
                <select
                  className={"field-input doc-sel" + (errors.tipoDoc ? " field-input--error" : "")}
                  value={form.tipoDoc}
                  onChange={e => set("tipoDoc", e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  className={"field-input doc-input" + (errors.numDoc ? " field-input--error" : "")}
                  type="text" value={form.numDoc}
                  onChange={e => set("numDoc", e.target.value)}
                  placeholder="Número de documento"
                  onFocus={e => (e.target.style.borderColor = "#4caf50")}
                  onBlur={e => (e.target.style.borderColor = errors.numDoc ? "#e53935" : "#e0e0e0")}
                />
              </div>
            )}
            {(errors.tipoDoc || errors.numDoc) && (
              <p className="field-error">{errors.tipoDoc || errors.numDoc}</p>
            )}
          </div>

          {/* ── Datos personales ── */}
          <p className="section-label">Datos personales</p>

          <div className="form-grid-2">
            <Field k="nombre"    label="Nombre"    ph="Ej. Ana"          {...fp} />
            <Field k="apellidos" label="Apellidos" ph="Ej. García López" {...fp} />
            <Field k="correo"    label="Correo electrónico" type="email" ph="correo@ejemplo.com" full {...fp} />

            {/* Teléfono con formato automático */}
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.telefono || "—"}</div>
                : <>
                    <input
                      className={"field-input" + (errors.telefono ? " field-input--error" : "")}
                      type="tel" value={form.telefono} maxLength={12}
                      onChange={e => handleTel(e.target.value)}
                      placeholder="300 000 0000"
                      onFocus={e => (e.target.style.borderColor = "#4caf50")}
                      onBlur={e => (e.target.style.borderColor = errors.telefono ? "#e53935" : "#e0e0e0")}
                    />
                    {errors.telefono && <p className="field-error">{errors.telefono}</p>}
                  </>
              }
            </div>

            {/* Fecha de registro (manual con date picker) */}
            <div className="form-group">
              <label className="form-label">Fecha de registro</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.fechaCreacion || "—"}</div>
                : <>
                    <input
                      className={"field-input" + (errors.fechaCreacion ? " field-input--error" : "")}
                      type="date"
                      value={toInputDate(form.fechaCreacion)}
                      onChange={e => set("fechaCreacion", fromInputDate(e.target.value))}
                      onFocus={e => (e.target.style.borderColor = "#4caf50")}
                      onBlur={e => (e.target.style.borderColor = errors.fechaCreacion ? "#e53935" : "#e0e0e0")}
                    />
                    {errors.fechaCreacion && <p className="field-error">{errors.fechaCreacion}</p>}
                  </>
              }
            </div>

            {/* Estado */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Estado</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                <Toggle value={form.estado} onChange={v => !isView && set("estado", v)} />
                <span style={{ fontSize: 13, fontWeight: 600, color: form.estado ? "#2e7d32" : "#9e9e9e" }}>
                  {form.estado ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Ubicación ── */}
          <p className="section-label">Ubicación</p>

          <div className="form-grid-2">
            <Field k="direccion" label="Dirección" ph="Ej. Calle 50 # 40-20, Apto 301" full {...fp} />

            <div className="form-group">
              <label className="form-label">Departamento</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.departamento || "—"}</div>
                : <>
                    <select className={"field-input" + (errors.departamento ? " field-input--error" : "")}
                      value={form.departamento || ""}
                      onChange={e => { set("departamento", e.target.value); set("municipio", ""); }}
                      style={{ cursor: "pointer" }}>
                      <option value="">— Seleccionar —</option>
                      {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.departamento && <p className="field-error">{errors.departamento}</p>}
                  </>
              }
            </div>

            <div className="form-group">
              <label className="form-label">Municipio</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.municipio || "—"}</div>
                : <>
                    <select className={"field-input" + (errors.municipio ? " field-input--error" : "")}
                      value={form.municipio || ""}
                      onChange={e => set("municipio", e.target.value)}
                      style={{ cursor: "pointer" }} disabled={!form.departamento}>
                      <option value="">— Seleccionar —</option>
                      {(MUNICIPIOS[form.departamento] || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {errors.municipio && <p className="field-error">{errors.municipio}</p>}
                  </>
              }
            </div>
          </div>

          {/* ── Contraseña ── */}
          {!isView && (
            <>
              <p className="section-label">
                {isNew ? "Contraseña" : "Contraseña"}
              </p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    {isNew ? "Contraseña" : "Nueva contraseña"}
                    {!isNew && <span style={{ color: "#bdbdbd", fontWeight: 400, marginLeft: 4, textTransform: "none" }}>(opcional)</span>}
                  </label>
                  <div className="pass-wrap">
                    <input className={"field-input" + (errors.contrasena ? " field-input--error" : "")}
                      type={showPass ? "text" : "password"} style={{ paddingRight: 36 }}
                      value={form.contrasena || ""}
                      onChange={e => set("contrasena", e.target.value)}
                      placeholder={isNew ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"}
                      onFocus={e => (e.target.style.borderColor = "#4caf50")}
                      onBlur={e => (e.target.style.borderColor = errors.contrasena ? "#e53935" : "#e0e0e0")} />
                    <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass ? "🙈" : "👁"}
                    </button>
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
                      onFocus={e => (e.target.style.borderColor = "#4caf50")}
                      onBlur={e => (e.target.style.borderColor = errors.confirmar ? "#e53935" : "#e0e0e0")} />
                    <button className="pass-toggle-btn" onClick={() => setShowPass(v => !v)}>
                      {showPass ? "🙈" : "👁"}
                    </button>
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

/* ─── Componente principal ────────────────────────────────── */
export default function GestionClientes() {
  const [clientes, setClientes]     = useState(initialClientes);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef();

  useEffect(() => {
    const id = "gc-styles";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id; tag.textContent = css;
      document.head.appendChild(tag);
    }
  }, []);

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
    const matchQ =
      `${c.nombre} ${c.apellidos}`.toLowerCase().includes(q) ||
      c.correo.toLowerCase().includes(q) ||
      c.municipio.toLowerCase().includes(q) ||
      (c.numDoc || "").toLowerCase().includes(q);
    const matchE = filter === "todos" || (filter === "activo" ? c.estado : !c.estado);
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filter]);

  const handleCreate = data => { setClientes(p => [data, ...p]); showToast("Cliente creado");        setModal(null); };
  const handleEdit   = data => { setClientes(p => p.map(c => c.id === data.id ? data : c)); showToast("Cambios guardados"); setModal(null); };
  const handleDelete = ()   => { setClientes(p => p.filter(c => c.id !== modal.cliente.id)); showToast("Cliente eliminado", "error"); setModal(null); };
  const toggleEstado = id   => setClientes(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));

  const filterOpts = [
    { val: "todos",    label: "Todos",     dot: "#bdbdbd" },
    { val: "activo",   label: "Activos",   dot: "#43a047" },
    { val: "inactivo", label: "Inactivos", dot: "#ef5350" },
  ];

  return (
    <div className="page-wrapper">

      <div className="page-header">
        <h1 className="page-header__title">Gestión de Clientes</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* Toolbar */}
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
                {filterOpts.map(f => (
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

        {/* Tabla */}
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
                      <p className="empty-state__text">Sin clientes</p>
                    </div>
                  </td></tr>
                ) : paginated.map((c, idx) => (
                  <tr key={c.id} className="tbl-row">

                    <td><span className="row-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>

                    <td>
                      <div className="client-cell">
                        <div className="avatar-wrap">
                          {c.fotoPreview ? <img src={c.fotoPreview} alt={c.nombre} /> : <span>👤</span>}
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
                        <span className="phone-icon">📞</span>
                        {c.telefono}
                      </span>
                    </td>

                    <td>
                      <div className="location-city">{c.municipio}</div>
                      <div className="location-dept">{c.departamento}</div>
                    </td>

                    <td><Toggle value={c.estado} onChange={() => toggleEstado(c.id)} /></td>

                    <td><span className="date-badge">{c.fechaCreacion}</span></td>

                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   onClick={() => setModal({ mode: "view",   cliente: c })}>👁</button>
                        <button className="act-btn act-btn--edit"   onClick={() => setModal({ mode: "edit",   cliente: c })}>✎</button>
                        <button className="act-btn act-btn--delete" onClick={() => setModal({ mode: "delete", cliente: c })}>🗑️</button>
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
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.mode === "new"    && <ClienteForm isNew onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.mode === "edit"   && <ClienteForm initial={modal.cliente} onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.mode === "view"   && <ClienteForm initial={modal.cliente} isView onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && <EliminarModal cliente={modal.cliente} onClose={() => setModal(null)} onConfirm={handleDelete} />}

      <Toast toast={toast} />
    </div>
  );
}