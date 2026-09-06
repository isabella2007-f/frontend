import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Clock, DollarSign, Plus, Search, Filter, X, Check,
  ChevronLeft, ChevronRight, Eye, Pencil, Ban, CreditCard,
  AlertCircle, Loader2, Trash2, ArrowLeft, CalendarRange, User,
  Wallet, Receipt,
} from "lucide-react";
import {
  listarLiquidaciones, generarLiquidacion, obtenerLiquidacion,
  editarLiquidacion, pagarLiquidacion, anularLiquidacion,
  listarRegistros, crearRegistro, eliminarRegistro,
  listarTarifas, crearTarifa,
  getEmpleadosParaLiquidaciones,
} from "../../../services/liquidacionesService";
import "./GestionLiquidaciones.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function fmtFechaHora(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtHora(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function fmtMoneda(v) {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

/** Nombre completo del empleado, venga en PascalCase o en minúscula. */
function nombreEmpleado(e) {
  return `${e.Nombre || e.nombre || ""} ${e.Apellidos || e.apellidos || ""}`.trim();
}

/** Opciones de empleado: el mismo <select> se repetía en cinco sitios. */
function OpcionesEmpleados({ empleados }) {
  return empleados.map(e => (
    <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
      {nombreEmpleado(e)}
    </option>
  ));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`liq-toast ${toast.type === "success" ? "liq-toast--ok" : "liq-toast--err"}`}>
      {toast.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
      {toast.msg}
    </div>
  );
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

const ESTADO_CFG = {
  Borrador: { cls: "badge--draft",   label: "Borrador",       color: "#f9a825" },
  Pagada:   { cls: "badge--paid",    label: "Pagada",         color: "#43a047" },
  Anulada:  { cls: "badge--voided",  label: "Anulada",        color: "#c62828" },
  pendiente:      { cls: "badge--pending", label: "Pendiente",      color: "#93a598" },
  en_liquidacion: { cls: "badge--draft",   label: "En liquidación", color: "#f9a825" },
  liquidado:      { cls: "badge--paid",    label: "Liquidado",      color: "#43a047" },
};

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CFG[estado] || { cls: "badge--neutral", label: estado };
  return <span className={`liq-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Paginación ───────────────────────────────────────────────────────────────

function Paginacion({ pagina, total, porPagina, onCambiar }) {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  return (
    <div className="liq-paginacion">
      <button disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)} aria-label="Página anterior">
        <ChevronLeft size={15} />
      </button>
      <span>{pagina} / {totalPags}</span>
      <button disabled={pagina >= totalPags} onClick={() => onCambiar(pagina + 1)} aria-label="Página siguiente">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Esqueleto de carga ───────────────────────────────────────────────────────

function SkeletonTabla({ filas = 5 }) {
  return (
    <div>
      {Array.from({ length: filas }, (_, i) => <div key={i} className="liq-skel-fila" />)}
    </div>
  );
}

// ─── Estado vacío ─────────────────────────────────────────────────────────────

function Vacio({ icono, titulo, texto }) {
  // El plugin de React no está en esta config de eslint: un componente recibido
  // como parámetro se marca sin uso, así que se reasigna a una constante.
  const Icono = icono;
  return (
    <div className="liq-empty-state">
      <Icono size={30} strokeWidth={1.5} />
      <p><strong>{titulo}</strong>{texto}</p>
    </div>
  );
}

// ─── Modal genérico ───────────────────────────────────────────────────────────

function Modal({ titulo, onClose, children, ancho = "500px", icono, peligro = false }) {
  const Icono = icono || FileText;
  return (
    <div className="liq-overlay">
      <div className="liq-modal" style={{ maxWidth: ancho }}>
        <div className={`liq-modal__header${peligro ? " liq-modal__header--peligro" : ""}`}>
          <span className="liq-modal__header-icon"><Icono size={19} /></span>
          <h3>{titulo}</h3>
          <button className="liq-modal__close" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="liq-modal__body">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — CONFIGURAR TARIFA
// ═══════════════════════════════════════════════════════════════════════════════

function ModalTarifa({ empleados, onClose, onGuardado }) {
  const [form, setForm] = useState({ idEmpleado: "", tarifaHora: "", fechaInicio: "" });
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function guardar() {
    if (!form.idEmpleado) return setErr("Selecciona un empleado");
    const tarifa = parseFloat(form.tarifaHora);
    if (!form.tarifaHora || isNaN(tarifa) || tarifa <= 0)
      return setErr("La tarifa debe ser un número mayor a cero");
    if (!form.fechaInicio) return setErr("Indica la fecha de vigencia");
    setErr(""); setLoading(true);
    try {
      await crearTarifa({
        idEmpleado:  parseInt(form.idEmpleado),
        tarifaHora:  tarifa,
        fechaInicio: `${form.fechaInicio}T00:00:00`,
      });
      onGuardado();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Configurar tarifa por hora" onClose={onClose} icono={DollarSign}>
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: e.target.value }))}>
          <option value="">Seleccionar…</option>
          <OpcionesEmpleados empleados={empleados} />
        </select>
        <label>Tarifa por hora (COP) *</label>
        <input type="number" min="0.01" step="0.01" placeholder="Ej: 15000"
          value={form.tarifaHora} onChange={e => setForm(f => ({ ...f, tarifaHora: e.target.value }))} />
        <label>Fecha de vigencia *</label>
        <input type="date" value={form.fechaInicio}
          onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
        {err && <p className="liq-form__error"><AlertCircle size={14} /> {err}</p>}
        <div className="liq-form__actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Guardar tarifa
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — REGISTRAR HORAS
// ═══════════════════════════════════════════════════════════════════════════════

function ModalRegistrarHoras({ empleados, onClose, onGuardado }) {
  const [form, setForm] = useState({
    idEmpleado: "", idOrdenProduccion: "", idDomicilio: "",
    fecha: "", horaInicio: "", horaFin: "",
  });
  const [horas, setHoras] = useState(null);
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  function calcHoras(ini, fin) {
    if (!ini || !fin) return null;
    const diff = (new Date(fin) - new Date(ini)) / 3600000;
    return diff > 0 ? Math.round(diff * 100) / 100 : null;
  }

  function handleChange(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (next.fecha && next.horaInicio && next.horaFin) {
        const ini = `${next.fecha}T${next.horaInicio}`;
        const fin = `${next.fecha}T${next.horaFin}`;
        setHoras(calcHoras(ini, fin));
      }
      return next;
    });
  }

  async function guardar() {
    if (!form.idEmpleado) return setErr("Selecciona un empleado");
    if (!form.fecha) return setErr("Indica la fecha");
    if (!form.horaInicio || !form.horaFin) return setErr("Indica hora de inicio y fin");
    const ini = `${form.fecha}T${form.horaInicio}:00`;
    const fin = `${form.fecha}T${form.horaFin}:00`;
    if (new Date(fin) <= new Date(ini)) return setErr("La hora de fin debe ser posterior a la de inicio");
    setErr(""); setLoading(true);
    try {
      await crearRegistro({
        idEmpleado:         parseInt(form.idEmpleado),
        idOrdenProduccion:  form.idOrdenProduccion ? parseInt(form.idOrdenProduccion) : null,
        idDomicilio:        form.idDomicilio ? parseInt(form.idDomicilio) : null,
        fecha:              `${form.fecha}T00:00:00`,
        horaInicio:         ini,
        horaFin:            fin,
      });
      onGuardado();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Registrar horas trabajadas" onClose={onClose} ancho="560px" icono={Clock}>
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => handleChange("idEmpleado", e.target.value)}>
          <option value="">Seleccionar…</option>
          <OpcionesEmpleados empleados={empleados} />
        </select>
        <div className="liq-form__row">
          <div>
            <label>Origen — Orden de producción</label>
            <input type="number" placeholder="ID (opcional)"
              value={form.idOrdenProduccion} onChange={e => handleChange("idOrdenProduccion", e.target.value)} />
          </div>
          <div>
            <label>Origen — Entrega (domicilio)</label>
            <input type="number" placeholder="ID (opcional)"
              value={form.idDomicilio} onChange={e => handleChange("idDomicilio", e.target.value)} />
          </div>
        </div>
        <label>Fecha *</label>
        <input type="date" value={form.fecha} onChange={e => handleChange("fecha", e.target.value)} />
        <div className="liq-form__row">
          <div>
            <label>Hora inicio *</label>
            <input type="time" value={form.horaInicio} onChange={e => handleChange("horaInicio", e.target.value)} />
          </div>
          <div>
            <label>Hora fin *</label>
            <input type="time" value={form.horaFin} onChange={e => handleChange("horaFin", e.target.value)} />
          </div>
        </div>
        {horas !== null && (
          <p className="liq-form__info">
            <Clock size={15} /> Horas calculadas: <strong>{horas} h</strong>
          </p>
        )}
        {err && <p className="liq-form__error"><AlertCircle size={14} /> {err}</p>}
        <div className="liq-form__actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Guardar registro
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — GENERAR LIQUIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function ModalGenerarLiquidacion({ empleados, onClose, onGenerada }) {
  const [form, setForm] = useState({ idEmpleado: "", fechaInicio: "", fechaFin: "" });
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function generar() {
    if (!form.idEmpleado) return setErr("Selecciona un empleado");
    if (!form.fechaInicio || !form.fechaFin) return setErr("Indica el rango de fechas");
    if (new Date(form.fechaFin) < new Date(form.fechaInicio))
      return setErr("La fecha fin debe ser posterior a la de inicio");
    setErr(""); setLoading(true);
    try {
      const liq = await generarLiquidacion({
        idEmpleado:   parseInt(form.idEmpleado),
        fechaInicio:  `${form.fechaInicio}T00:00:00`,
        fechaFin:     `${form.fechaFin}T23:59:59`,
      });
      onGenerada(liq);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Generar liquidación" onClose={onClose} icono={Receipt}>
      <p className="liq-modal__desc">
        Se reunirán todas las horas <strong>pendientes</strong> del empleado dentro del rango
        elegido. La liquidación queda en estado Borrador y podrás ajustarla antes de pagar.
      </p>
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: e.target.value }))}>
          <option value="">Seleccionar…</option>
          <OpcionesEmpleados empleados={empleados} />
        </select>
        <div className="liq-form__row">
          <div>
            <label>Fecha inicio *</label>
            <input type="date" value={form.fechaInicio}
              onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
          </div>
          <div>
            <label>Fecha fin *</label>
            <input type="date" value={form.fechaFin}
              onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))} />
          </div>
        </div>
        {err && <p className="liq-form__error"><AlertCircle size={14} /> {err}</p>}
        <div className="liq-form__actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={generar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Generar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — REGISTRAR PAGO
// ═══════════════════════════════════════════════════════════════════════════════

const METODOS_PAGO = ["Efectivo", "Transferencia", "Nómina", "Cheque", "Otro"];

function ModalPago({ liquidacion, onClose, onPagada }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    metodoPago: "", referenciaPago: "", fechaPago: hoy, observaciones: "",
  });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  async function pagar() {
    if (!form.metodoPago) return setErr("Debe seleccionar un método de pago.");
    if (!form.referenciaPago.trim()) return setErr("Debe ingresar la referencia del pago.");
    if (!form.fechaPago) return setErr("La fecha de pago es obligatoria.");
    if (form.fechaPago > hoy) return setErr("La fecha de pago no puede ser posterior a hoy.");
    setErr(""); setLoading(true);
    try {
      await pagarLiquidacion(liquidacion.ID_Liquidacion, {
        metodoPago:      form.metodoPago,
        referenciaPago:  form.referenciaPago.trim(),
        fechaPago:       `${form.fechaPago}T12:00:00`,
        observacionesPago: form.observaciones.trim() || null,
      });
      onPagada();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Registrar pago de liquidación" onClose={onClose} icono={Wallet} ancho="540px">
      <p className="liq-modal__desc">
        Total a pagar: <strong>{fmtMoneda(liquidacion.Total)}</strong> a{" "}
        <strong>{liquidacion.nombre_empleado}</strong>
      </p>
      <div className="liq-form">
        <label>Método de pago *</label>
        <select value={form.metodoPago} onChange={e => setForm(f => ({ ...f, metodoPago: e.target.value }))}>
          <option value="">Seleccionar…</option>
          {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <label>Referencia de pago * (número de comprobante, cheque o transferencia)</label>
        <input type="text" maxLength={100} placeholder="Ej: REF-2026-09-001 o número de comprobante"
          value={form.referenciaPago}
          onChange={e => setForm(f => ({ ...f, referenciaPago: e.target.value }))} />
        <label>Fecha de pago *</label>
        <input type="date" max={hoy} value={form.fechaPago}
          onChange={e => setForm(f => ({ ...f, fechaPago: e.target.value }))} />
        <label>Observaciones (opcional)</label>
        <textarea rows={3} placeholder="Notas adicionales sobre el pago…"
          value={form.observaciones}
          onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
        {err && <p className="liq-form__error"><AlertCircle size={14} /> {err}</p>}
        <div className="liq-form__actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={pagar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <CreditCard size={14} />} Confirmar pago
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — ANULAR LIQUIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function ModalAnular({ liquidacion, onClose, onAnulada }) {
  const [motivo, setMotivo] = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  async function anular() {
    if (!motivo.trim() || motivo.trim().length < 10)
      return setErr("El motivo debe tener al menos 10 caracteres");
    setErr(""); setLoading(true);
    try {
      await anularLiquidacion(liquidacion.ID_Liquidacion, { motivoAnulacion: motivo.trim() });
      onAnulada();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Anular liquidación" onClose={onClose} icono={Ban} peligro>
      <p className="liq-modal__desc liq-modal__desc--warn">
        <AlertCircle size={16} />
        <span>
          Esta acción es irreversible. La liquidación quedará anulada y sus horas volverán a
          estar disponibles.
        </span>
      </p>
      <div className="liq-form">
        <label>Motivo de anulación * (mínimo 10 caracteres)</label>
        <textarea rows={4} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Describe el motivo de la anulación…" />
        {err && <p className="liq-form__error"><AlertCircle size={14} /> {err}</p>}
        <div className="liq-form__actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={anular} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <Ban size={14} />} Anular liquidación
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA — DETALLE DE LIQUIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

function DetalleLiquidacion({ idLiquidacion, onVolver, onCambio }) {
  const [detalle, setDetalle]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState("");
  const [modalPago, setModalPago]     = useState(false);
  const [modalAnular, setModalAnular] = useState(false);
  const [toast, setToast]             = useState(null);

  // Para edición de borrador
  const [modoEdicion, setModoEdicion]   = useState(false);
  const [pendientes, setPendientes]     = useState([]);
  const [selAgregar, setSelAgregar]     = useState([]);
  const [loadingEdit, setLoadingEdit]   = useState(false);

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const d = await obtenerLiquidacion(idLiquidacion);
      setDetalle(d);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [idLiquidacion]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cargarPendientes() {
    if (!detalle) return;
    try {
      const res = await listarRegistros({
        idEmpleado: detalle.ID_Empleado, estado: "pendiente", porPagina: 100,
      });
      setPendientes(res.items || []);
    } catch (e) { mostrarToast(e.message, "error"); }
  }

  function toggleAgregar(id) {
    setSelAgregar(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function quitarRegistro(idRegistro) {
    setLoadingEdit(true);
    try {
      const d = await editarLiquidacion(idLiquidacion, { registrosQuitar: [idRegistro] });
      setDetalle(d);
      mostrarToast("Registro quitado. Total recalculado.");
      onCambio && onCambio();
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoadingEdit(false); }
  }

  async function agregarSeleccionados() {
    if (!selAgregar.length) return;
    setLoadingEdit(true);
    try {
      const d = await editarLiquidacion(idLiquidacion, { registrosAgregar: selAgregar });
      setDetalle(d);
      setSelAgregar([]);
      setModoEdicion(false);
      mostrarToast("Registros agregados. Total recalculado.");
      onCambio && onCambio();
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoadingEdit(false); }
  }

  if (loading) return <div className="liq-loading"><Loader2 className="spin" size={26} /> Cargando detalle…</div>;
  if (err) return <div className="liq-error"><AlertCircle size={18} /> {err}</div>;
  if (!detalle) return null;

  const esBorrador = detalle.Estado === "Borrador";
  const esAnulada  = detalle.Estado === "Anulada";
  const colorEstado = (ESTADO_CFG[detalle.Estado] || {}).color || "#43a047";
  const editable   = modoEdicion && esBorrador;

  return (
    <div className="liq-detalle">
      <Toast toast={toast} />
      <div className="liq-detalle__back">
        <button className="btn-ghost" onClick={onVolver}><ArrowLeft size={15} /> Volver al listado</button>
      </div>

      {/* Cabecera */}
      <div className="liq-detalle__card" style={{ "--e-color": colorEstado }}>
        <div className="liq-detalle__card-header">
          <div>
            <h2>Liquidación #{detalle.ID_Liquidacion}</h2>
            <p className="liq-detalle__empleado">{detalle.nombre_empleado}</p>
            <div className="liq-detalle__meta">
              <span>
                <CalendarRange size={13} />
                {fmtFecha(detalle.Fecha_Inicio)} – {fmtFecha(detalle.Fecha_Fin)}
              </span>
              <span><Clock size={13} /> Creada {fmtFechaHora(detalle.Fecha_Creacion)}</span>
            </div>
          </div>
          <div className="liq-detalle__card-right">
            <EstadoBadge estado={detalle.Estado} />
            <span className="liq-detalle__total-label">Total</span>
            <p className="liq-detalle__total">{fmtMoneda(detalle.Total)}</p>
            {detalle.Metodo_Pago && (
              <p className="liq-detalle__pago-info">
                <Wallet size={13} /> {detalle.Metodo_Pago} — {fmtFecha(detalle.Fecha_Pago)}
              </p>
            )}
          </div>
        </div>

        {esAnulada && (
          <div className="liq-detalle__anulacion-info">
            <Ban size={15} />
            <span><strong>Motivo de anulación:</strong> {detalle.Motivo_Anulacion}</span>
            <span className="liq-detalle__anulacion-fecha">({fmtFechaHora(detalle.Fecha_Anulacion)})</span>
          </div>
        )}

        {/* Acciones de estado */}
        {esBorrador && (
          <div className="liq-detalle__acciones">
            <button className="btn-secondary" onClick={() => { setModoEdicion(true); cargarPendientes(); }}>
              <Pencil size={14} /> Editar registros
            </button>
            <button className="btn-primary" onClick={() => setModalPago(true)}>
              <CreditCard size={14} /> Registrar pago
            </button>
            <button className="btn-danger-outline" onClick={() => setModalAnular(true)}>
              <Ban size={14} /> Anular
            </button>
          </div>
        )}
      </div>

      {/* Resumen financiero */}
      {detalle.registros && detalle.registros.length > 0 && (() => {
        const totalHoras = detalle.registros.reduce((s, r) => s + r.Horas_Trabajadas, 0);
        return (
          <div className="liq-detalle__resumen">
            <div className="liq-detalle__resumen-fila">
              <span>Total de horas</span>
              <span className="liq-horas">{Math.round(totalHoras * 100) / 100} h</span>
            </div>
            <div className="liq-detalle__resumen-fila liq-detalle__resumen-fila--total">
              <span>Total a pagar</span>
              <span className="liq-monto">{fmtMoneda(detalle.Total)}</span>
            </div>
          </div>
        );
      })()}

      {/* Información de pago (solo si está Pagada) */}
      {detalle.Estado === "Pagada" && detalle.Metodo_Pago && (
        <div className="liq-detalle__pago-detalle">
          <h3>Información de pago</h3>
          <div className="liq-detalle__pago-grid">
            <div>
              <span className="liq-detalle__pago-label">Método</span>
              <span className="liq-detalle__pago-valor">{detalle.Metodo_Pago}</span>
            </div>
            <div>
              <span className="liq-detalle__pago-label">Fecha de pago</span>
              <span className="liq-detalle__pago-valor">{fmtFecha(detalle.Fecha_Pago)}</span>
            </div>
            {detalle.Referencia_Pago && (
              <div>
                <span className="liq-detalle__pago-label">Referencia</span>
                <span className="liq-detalle__pago-valor liq-detalle__pago-ref">{detalle.Referencia_Pago}</span>
              </div>
            )}
            {detalle.Observaciones_Pago && (
              <div className="liq-detalle__pago-obs">
                <span className="liq-detalle__pago-label">Observaciones</span>
                <span className="liq-detalle__pago-valor">{detalle.Observaciones_Pago}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla de registros */}
      <div className="liq-detalle__tabla-card">
        <div className="liq-detalle__tabla-header">
          <h3>Desglose de horas</h3>
          {editable && (
            <button className="btn-ghost btn-ghost--sm" onClick={() => setModoEdicion(false)}>
              <X size={13} /> Cerrar edición
            </button>
          )}
        </div>

        {detalle.registros && detalle.registros.length > 0 ? (
          <div className="liq-tabla-wrap">
            <table className="liq-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Horario</th>
                  <th>Horas</th>
                  <th>Tarifa/h</th>
                  <th>Subtotal</th>
                  {editable && <th>Quitar</th>}
                </tr>
              </thead>
              <tbody>
                {detalle.registros.map(r => (
                  <tr key={r.ID_Registro}>
                    <td data-label="Fecha" className="liq-celda-fuerte">{fmtFecha(r.Fecha)}</td>
                    <td data-label="Origen">{r.origen_label}</td>
                    <td data-label="Horario" className="liq-celda-tenue">{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                    <td data-label="Horas"><span className="liq-horas">{r.Horas_Trabajadas} h</span></td>
                    <td data-label="Tarifa/h" className="liq-celda-tenue">{fmtMoneda(r.tarifa_aplicada)}</td>
                    <td data-label="Subtotal"><span className="liq-monto">{fmtMoneda(r.subtotal)}</span></td>
                    {editable && (
                      <td>
                        <button className="btn-icon btn-icon--danger" disabled={loadingEdit}
                          aria-label="Quitar registro"
                          onClick={() => quitarRegistro(r.ID_Registro)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="liq-tabla__total-row">
                  <td colSpan={5}>TOTAL</td>
                  <td data-label="Total"><span className="liq-monto">{fmtMoneda(detalle.Total)}</span></td>
                  {editable && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="liq-empty">Esta liquidación no tiene registros de horas.</p>
        )}

        {/* Panel para agregar registros */}
        {editable && (
          <div className="liq-edicion-agregar">
            <h4>Registros pendientes disponibles para agregar</h4>
            {pendientes.length === 0 ? (
              <p className="liq-empty">No hay registros pendientes para este empleado.</p>
            ) : (
              <>
                <div className="liq-tabla-wrap">
                  <table className="liq-tabla liq-tabla--seleccion">
                    <thead>
                      <tr>
                        <th>Sel.</th><th>Fecha</th><th>Origen</th><th>Horario</th><th>Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.map(r => (
                        <tr key={r.ID_Registro} className={selAgregar.includes(r.ID_Registro) ? "selected" : ""}>
                          <td>
                            <input type="checkbox" checked={selAgregar.includes(r.ID_Registro)}
                              aria-label={`Seleccionar registro ${r.ID_Registro}`}
                              onChange={() => toggleAgregar(r.ID_Registro)} />
                          </td>
                          <td data-label="Fecha" className="liq-celda-fuerte">{fmtFecha(r.Fecha)}</td>
                          <td data-label="Origen">{r.origen_label}</td>
                          <td data-label="Horario" className="liq-celda-tenue">{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                          <td data-label="Horas"><span className="liq-horas">{r.Horas_Trabajadas} h</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="liq-form__actions">
                  <button className="btn-primary" disabled={!selAgregar.length || loadingEdit}
                    onClick={agregarSeleccionados}>
                    {loadingEdit ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                    Agregar seleccionados ({selAgregar.length})
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {modalPago && (
        <ModalPago liquidacion={detalle} onClose={() => setModalPago(false)}
          onPagada={() => { setModalPago(false); cargar(); mostrarToast("Pago registrado correctamente"); onCambio && onCambio(); }} />
      )}
      {modalAnular && (
        <ModalAnular liquidacion={detalle} onClose={() => setModalAnular(false)}
          onAnulada={() => { setModalAnular(false); cargar(); mostrarToast("Liquidación anulada"); onCambio && onCambio(); }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA — LIQUIDACIONES (HU3, HU4, HU5)
// ═══════════════════════════════════════════════════════════════════════════════

function TabLiquidaciones({ empleados, onVerDetalle }) {
  const [data, setData]         = useState({ items: [], total: 0, pagina: 1, por_pagina: 20 });
  const [loading, setLoading]   = useState(false);
  const [pagina, setPagina]     = useState(1);
  const [filtros, setFiltros]   = useState({ idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "", busqueda: "" });
  const [showFiltros, setShowFiltros] = useState(false);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [toast, setToast]       = useState(null);
  const debounceRef             = useRef(null);

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async (p = pagina, filtrosOverride) => {
    setLoading(true);
    const f = filtrosOverride || filtros;
    try {
      const res = await listarLiquidaciones({
        pagina: p, porPagina: 20,
        idEmpleado:  f.idEmpleado  || null,
        estado:      f.estado      || null,
        fechaInicio: f.fechaInicio ? `${f.fechaInicio}T00:00:00` : null,
        fechaFin:    f.fechaFin    ? `${f.fechaFin}T23:59:59`   : null,
        busqueda:    f.busqueda    || null,
      });
      setData(res);
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [pagina, filtros]);

  useEffect(() => { cargar(pagina); }, [pagina]);

  function setBusqueda(valor) {
    const next = { ...filtros, busqueda: valor };
    setFiltros(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPagina(1); cargar(1, next); }, 300);
  }

  function buscar() { setPagina(1); cargar(1); }
  function limpiar() {
    clearTimeout(debounceRef.current);
    const limpio = { idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "", busqueda: "" };
    setFiltros(limpio);
    setPagina(1);
    cargar(1, limpio);
  }

  const hayFiltros = filtros.idEmpleado || filtros.estado || filtros.fechaInicio || filtros.fechaFin;

  return (
    <div className="liq-tab-content">
      <Toast toast={toast} />

      {/* Barra superior */}
      <div className="liq-toolbar">
        <div className="liq-toolbar__left">
          <div className="liq-search">
            <Search size={15} />
            <input placeholder="Buscar por empleado…" value={filtros.busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()} />
          </div>
          <button className={`btn-icon-label${hayFiltros ? " btn-icon-label--active" : ""}`}
            onClick={() => setShowFiltros(v => !v)}>
            <Filter size={14} /> Filtros
            {hayFiltros && <span className="btn-icon-label__punto" />}
          </button>
          {hayFiltros && (
            <button className="btn-ghost btn-ghost--sm" onClick={limpiar}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setModalGenerar(true)}>
          <Plus size={15} /> Generar liquidación
        </button>
      </div>

      {/* Panel de filtros */}
      {showFiltros && (
        <div className="liq-filtros-panel">
          <div>
            <label className="liq-filtro__label">Empleado</label>
            <select value={filtros.idEmpleado} onChange={e => setFiltros(f => ({ ...f, idEmpleado: e.target.value }))}>
              <option value="">Todos los empleados</option>
              <OpcionesEmpleados empleados={empleados} />
            </select>
          </div>
          <div>
            <label className="liq-filtro__label">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Pagada">Pagada</option>
              <option value="Anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="liq-filtro__label">Desde</label>
            <input type="date" value={filtros.fechaInicio}
              onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))} />
          </div>
          <div>
            <label className="liq-filtro__label">Hasta</label>
            <input type="date" value={filtros.fechaFin}
              onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))} />
          </div>
          <div className="liq-filtros-panel__acciones">
            <button className="btn-primary btn-sm" onClick={buscar}>Aplicar</button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <SkeletonTabla />
      ) : data.items.length === 0 ? (
        <Vacio
          icono={FileText}
          titulo={hayFiltros || filtros.busqueda ? "Sin coincidencias" : "Sin liquidaciones"}
          texto={hayFiltros || filtros.busqueda
            ? "Ninguna liquidación coincide con los filtros aplicados."
            : "Aún no se ha generado ninguna liquidación. Empieza por «Generar liquidación»."}
        />
      ) : (
        <div className="liq-tabla-wrap">
          <table className="liq-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Empleado</th>
                <th>Período</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(liq => (
                <tr key={liq.ID_Liquidacion} className={liq.Estado === "Anulada" ? "row--voided" : ""}>
                  <td data-label="#"><span className="liq-celda-id">{liq.ID_Liquidacion}</span></td>
                  <td data-label="Empleado" className="liq-celda-fuerte">{liq.nombre_empleado}</td>
                  <td data-label="Período" className="liq-celda-tenue">
                    {fmtFecha(liq.Fecha_Inicio)} – {fmtFecha(liq.Fecha_Fin)}
                  </td>
                  <td data-label="Total"><span className="liq-monto">{fmtMoneda(liq.Total)}</span></td>
                  <td data-label="Estado"><EstadoBadge estado={liq.Estado} /></td>
                  <td data-label="Creada" className="liq-celda-tenue">{fmtFecha(liq.Fecha_Creacion)}</td>
                  <td>
                    <button className="btn-icon" title="Ver detalle" aria-label="Ver detalle"
                      onClick={() => onVerDetalle(liq.ID_Liquidacion)}>
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} total={data.total} porPagina={data.por_pagina} onCambiar={p => { setPagina(p); cargar(p); }} />

      {modalGenerar && (
        <ModalGenerarLiquidacion empleados={empleados} onClose={() => setModalGenerar(false)}
          onGenerada={(liq) => {
            setModalGenerar(false);
            mostrarToast("Liquidación generada en estado Borrador");
            onVerDetalle(liq.ID_Liquidacion);
          }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA — REGISTROS DE HORAS (HU2)
// ═══════════════════════════════════════════════════════════════════════════════

function TabRegistros({ empleados }) {
  const [data, setData]       = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina]   = useState(1);
  const [filtros, setFiltros] = useState({ idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "" });
  const [showFiltros, setShowFiltros] = useState(false);
  const [modal, setModal]     = useState(false);
  const [toast, setToast]     = useState(null);

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async (p = pagina) => {
    setLoading(true);
    try {
      const res = await listarRegistros({
        pagina: p, porPagina: 20,
        idEmpleado:  filtros.idEmpleado  || null,
        estado:      filtros.estado      || null,
        fechaInicio: filtros.fechaInicio ? `${filtros.fechaInicio}T00:00:00` : null,
        fechaFin:    filtros.fechaFin    ? `${filtros.fechaFin}T23:59:59`   : null,
      });
      setData(res);
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [pagina, filtros]);

  useEffect(() => { cargar(pagina); }, [pagina]);

  async function borrarRegistro(id) {
    if (!window.confirm("¿Eliminar este registro de horas?")) return;
    try {
      await eliminarRegistro(id);
      mostrarToast("Registro eliminado");
      cargar(pagina);
    } catch (e) { mostrarToast(e.message, "error"); }
  }

  const hayFiltros = filtros.idEmpleado || filtros.estado || filtros.fechaInicio || filtros.fechaFin;

  function limpiarFiltros() {
    setFiltros({ idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "" });
    setPagina(1);
    setTimeout(() => cargar(1), 0);
  }

  return (
    <div className="liq-tab-content">
      <Toast toast={toast} />
      <div className="liq-toolbar">
        <div className="liq-toolbar__left">
          <button className={`btn-icon-label${hayFiltros ? " btn-icon-label--active" : ""}`}
            onClick={() => setShowFiltros(v => !v)}>
            <Filter size={14} /> Filtros
            {hayFiltros && <span className="btn-icon-label__punto" />}
          </button>
          {hayFiltros && (
            <button className="btn-ghost btn-ghost--sm" onClick={limpiarFiltros}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Registrar horas
        </button>
      </div>

      {showFiltros && (
        <div className="liq-filtros-panel">
          <div>
            <label className="liq-filtro__label">Empleado</label>
            <select value={filtros.idEmpleado} onChange={e => setFiltros(f => ({ ...f, idEmpleado: e.target.value }))}>
              <option value="">Todos los empleados</option>
              <OpcionesEmpleados empleados={empleados} />
            </select>
          </div>
          <div>
            <label className="liq-filtro__label">Estado</label>
            <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_liquidacion">En liquidación</option>
              <option value="liquidado">Liquidado</option>
            </select>
          </div>
          <div>
            <label className="liq-filtro__label">Desde</label>
            <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))} />
          </div>
          <div>
            <label className="liq-filtro__label">Hasta</label>
            <input type="date" value={filtros.fechaFin} onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))} />
          </div>
          <div className="liq-filtros-panel__acciones">
            <button className="btn-primary btn-sm" onClick={() => { setPagina(1); cargar(1); }}>Aplicar</button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTabla />
      ) : data.items.length === 0 ? (
        <Vacio
          icono={Clock}
          titulo={hayFiltros ? "Sin coincidencias" : "Sin registros de horas"}
          texto={hayFiltros
            ? "Ningún registro coincide con los filtros aplicados."
            : "Las horas que registres aquí son las que después se agrupan en una liquidación."}
        />
      ) : (
        <div className="liq-tabla-wrap">
          <table className="liq-tabla">
            <thead>
              <tr>
                <th>#</th><th>Empleado</th><th>Fecha</th><th>Origen</th>
                <th>Horario</th><th>Horas</th><th>Estado</th><th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(r => (
                <tr key={r.ID_Registro}>
                  <td data-label="#"><span className="liq-celda-id">{r.ID_Registro}</span></td>
                  <td data-label="Empleado" className="liq-celda-fuerte">{r.nombre_empleado}</td>
                  <td data-label="Fecha">{fmtFecha(r.Fecha)}</td>
                  <td data-label="Origen">{r.origen_label}</td>
                  <td data-label="Horario" className="liq-celda-tenue">{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                  <td data-label="Horas"><span className="liq-horas">{r.Horas_Trabajadas} h</span></td>
                  <td data-label="Estado"><EstadoBadge estado={r.Estado} /></td>
                  <td>
                    {r.Estado === "pendiente" && (
                      <button className="btn-icon btn-icon--danger" title="Eliminar" aria-label="Eliminar registro"
                        onClick={() => borrarRegistro(r.ID_Registro)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacion pagina={pagina} total={data.total} porPagina={20} onCambiar={p => { setPagina(p); cargar(p); }} />

      {modal && (
        <ModalRegistrarHoras empleados={empleados} onClose={() => setModal(false)}
          onGuardado={() => { setModal(false); mostrarToast("Horas registradas"); cargar(pagina); }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESTAÑA — TARIFAS (HU1)
// ═══════════════════════════════════════════════════════════════════════════════

function TabTarifas({ empleados }) {
  const [tarifas, setTarifas]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [filtroEmp, setFiltroEmp] = useState("");
  const [modal, setModal]       = useState(false);
  const [toast, setToast]       = useState(null);

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarTarifas(filtroEmp || null);
      setTarifas(res);
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [filtroEmp]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="liq-tab-content">
      <Toast toast={toast} />
      <div className="liq-toolbar">
        <div className="liq-toolbar__left">
          <div style={{ maxWidth: 280, width: "100%" }}>
            <select value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
              <option value="">Todos los empleados</option>
              <OpcionesEmpleados empleados={empleados} />
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={15} /> Configurar tarifa
        </button>
      </div>

      {loading ? (
        <SkeletonTabla filas={4} />
      ) : tarifas.length === 0 ? (
        <Vacio
          icono={DollarSign}
          titulo="Sin tarifas configuradas"
          texto="Sin una tarifa vigente no se puede calcular el valor de las horas de un empleado."
        />
      ) : (
        <div className="liq-tabla-wrap">
          <table className="liq-tabla">
            <thead>
              <tr>
                <th>#</th><th>Empleado</th><th>Tarifa/hora</th><th>Vigente desde</th><th>Vigente hasta</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tarifas.map(t => (
                <tr key={t.ID_Tarifa}>
                  <td data-label="#"><span className="liq-celda-id">{t.ID_Tarifa}</span></td>
                  <td data-label="Empleado" className="liq-celda-fuerte">{t.nombre_empleado}</td>
                  <td data-label="Tarifa/hora"><span className="liq-monto">{fmtMoneda(t.Tarifa_Hora)}</span></td>
                  <td data-label="Vigente desde">{fmtFecha(t.Fecha_Inicio)}</td>
                  <td data-label="Vigente hasta" className="liq-celda-tenue">{t.Fecha_Fin ? fmtFecha(t.Fecha_Fin) : "—"}</td>
                  <td data-label="Estado">
                    <span className={`liq-badge ${t.vigente ? "badge--paid" : "badge--neutral"}`}>
                      {t.vigente ? "Vigente" : "Histórica"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalTarifa empleados={empleados} onClose={() => setModal(false)}
          onGuardado={() => { setModal(false); mostrarToast("Tarifa guardada"); cargar(); }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { key: "liquidaciones", label: "Liquidaciones", Icon: FileText },
  { key: "horas",         label: "Horas trabajadas", Icon: Clock },
  { key: "tarifas",       label: "Tarifas",     Icon: DollarSign },
];

export default function GestionLiquidaciones() {
  const [tab, setTab]               = useState("liquidaciones");
  const [empleados, setEmpleados]   = useState([]);
  const [empCargando, setEmpCargando] = useState(true);
  const [empError, setEmpError]     = useState(false);
  const [detalleId, setDetalleId]   = useState(null);

  useEffect(() => {
    // `empCargando` ya arranca en true y este efecto corre una sola vez.
    getEmpleadosParaLiquidaciones()
      .then(res => {
        setEmpleados(Array.isArray(res) ? res : []);
        setEmpError(false);
      })
      .catch(() => setEmpError(true))
      .finally(() => setEmpCargando(false));
  }, []);

  // El detalle también cuelga de `.liq-root`: de ahí salen las variables de
  // color y el escopado de botones, badges y modales.
  if (detalleId !== null) {
    return (
      <div className="liq-root">
        <DetalleLiquidacion
          idLiquidacion={detalleId}
          onVolver={() => setDetalleId(null)}
          onCambio={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="liq-root">
      <header className="liq-hero">
        <span className="liq-hero__icon"><DollarSign size={27} /></span>
        <div className="liq-hero__txt">
          <span className="liq-hero__eyebrow">Nómina y pagos</span>
          <h1>Gestión de Liquidaciones</h1>
          <p>Administra tarifas, registra horas y gestiona el pago de empleados.</p>
        </div>
        {empCargando ? (
          <span className="liq-hero__badge liq-hero__badge--loading">
            <Loader2 size={13} className="spin" /> Cargando empleados…
          </span>
        ) : empError ? (
          <span className="liq-hero__badge liq-hero__badge--error">
            <AlertCircle size={13} /> Sin acceso a empleados
          </span>
        ) : (
          <span className="liq-hero__badge">
            <User size={13} /> {empleados.length} empleado{empleados.length !== 1 ? "s" : ""}
          </span>
        )}
      </header>

      <div className="liq-tabs">
        {TABS.map(t => {
          const Icono = t.Icon;
          return (
            <button key={t.key} className={`liq-tab-btn ${tab === t.key ? "liq-tab-btn--active" : ""}`}
              onClick={() => setTab(t.key)}>
              <Icono size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "liquidaciones" && (
        <TabLiquidaciones empleados={empleados} onVerDetalle={id => setDetalleId(id)} />
      )}
      {tab === "horas" && <TabRegistros empleados={empleados} />}
      {tab === "tarifas" && <TabTarifas empleados={empleados} />}
    </div>
  );
}
