import { useState, useEffect, useCallback } from "react";
import {
  FileText, Clock, DollarSign, Plus, Search, Filter, X, Check,
  ChevronLeft, ChevronRight, Eye, Pencil, Ban, CreditCard,
  AlertCircle, Loader2, Trash2, ArrowLeft, RefreshCw,
} from "lucide-react";
import {
  listarLiquidaciones, generarLiquidacion, obtenerLiquidacion,
  editarLiquidacion, pagarLiquidacion, anularLiquidacion,
  listarRegistros, crearRegistro, eliminarRegistro,
  listarTarifas, crearTarifa,
} from "../../../services/liquidacionesService";
import { getUsuarios } from "../../../services/usuariosService";
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
function toIso(localDateStr) {
  // "2024-06-01" → "2024-06-01T00:00:00"
  return localDateStr ? `${localDateStr}T00:00:00` : null;
}
function toIsoEnd(localDateStr) {
  return localDateStr ? `${localDateStr}T23:59:59` : null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`liq-toast ${toast.type === "success" ? "liq-toast--ok" : "liq-toast--err"}`}>
      {toast.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
      {toast.msg}
    </div>
  );
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const cfg = {
    Borrador: { cls: "badge--draft",   label: "Borrador" },
    Pagada:   { cls: "badge--paid",    label: "Pagada" },
    Anulada:  { cls: "badge--voided",  label: "Anulada" },
    pendiente:       { cls: "badge--pending",  label: "Pendiente" },
    en_liquidacion:  { cls: "badge--draft",    label: "En liquidación" },
    liquidado:       { cls: "badge--paid",     label: "Liquidado" },
  }[estado] || { cls: "badge--neutral", label: estado };
  return <span className={`liq-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Paginación ───────────────────────────────────────────────────────────────

function Paginacion({ pagina, total, porPagina, onCambiar }) {
  const totalPags = Math.ceil(total / porPagina);
  if (totalPags <= 1) return null;
  return (
    <div className="liq-paginacion">
      <button disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
        <ChevronLeft size={14} />
      </button>
      <span>{pagina} / {totalPags}</span>
      <button disabled={pagina >= totalPags} onClick={() => onCambiar(pagina + 1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Modal genérico ───────────────────────────────────────────────────────────

function Modal({ titulo, onClose, children, ancho = "500px" }) {
  return (
    <div className="liq-overlay" onClick={onClose}>
      <div className="liq-modal" style={{ maxWidth: ancho }} onClick={e => e.stopPropagation()}>
        <div className="liq-modal__header">
          <h3>{titulo}</h3>
          <button className="liq-modal__close" onClick={onClose}><X size={18} /></button>
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
    <Modal titulo="Configurar tarifa por hora" onClose={onClose}>
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: e.target.value }))}>
          <option value="">Seleccionar…</option>
          {empleados.map(e => (
            <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
              {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
            </option>
          ))}
        </select>
        <label>Tarifa por hora (COP) *</label>
        <input type="number" min="0.01" step="0.01" placeholder="Ej: 15000"
          value={form.tarifaHora} onChange={e => setForm(f => ({ ...f, tarifaHora: e.target.value }))} />
        <label>Fecha de vigencia *</label>
        <input type="date" value={form.fechaInicio}
          onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
        {err && <p className="liq-form__error">{err}</p>}
        <div className="liq-form__actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : null} Guardar tarifa
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
    <Modal titulo="Registrar horas trabajadas" onClose={onClose} ancho="540px">
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => handleChange("idEmpleado", e.target.value)}>
          <option value="">Seleccionar…</option>
          {empleados.map(e => (
            <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
              {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
            </option>
          ))}
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
            <Clock size={13} /> Horas calculadas: <strong>{horas} h</strong>
          </p>
        )}
        {err && <p className="liq-form__error">{err}</p>}
        <div className="liq-form__actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : null} Guardar registro
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
    <Modal titulo="Generar liquidación" onClose={onClose}>
      <div className="liq-form">
        <label>Empleado *</label>
        <select value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: e.target.value }))}>
          <option value="">Seleccionar…</option>
          {empleados.map(e => (
            <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
              {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
            </option>
          ))}
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
        {err && <p className="liq-form__error">{err}</p>}
        <div className="liq-form__actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={generar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : null} Generar
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
  const [form, setForm]   = useState({ metodoPago: "", fechaPago: hoy });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  async function pagar() {
    if (!form.metodoPago) return setErr("El método de pago es obligatorio");
    if (!form.fechaPago) return setErr("La fecha de pago es obligatoria");
    if (form.fechaPago > hoy) return setErr("La fecha de pago no puede ser futura");
    setErr(""); setLoading(true);
    try {
      await pagarLiquidacion(liquidacion.ID_Liquidacion, {
        metodoPago: form.metodoPago,
        fechaPago:  `${form.fechaPago}T12:00:00`,
      });
      onPagada();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal titulo="Registrar pago" onClose={onClose}>
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
        <label>Fecha de pago *</label>
        <input type="date" max={hoy} value={form.fechaPago}
          onChange={e => setForm(f => ({ ...f, fechaPago: e.target.value }))} />
        {err && <p className="liq-form__error">{err}</p>}
        <div className="liq-form__actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={pagar} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : null} Confirmar pago
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
    <Modal titulo="Anular liquidación" onClose={onClose}>
      <p className="liq-modal__desc liq-modal__desc--warn">
        <AlertCircle size={15} /> Esta acción es irreversible. La liquidación quedará anulada
        y sus horas volverán a estar disponibles.
      </p>
      <div className="liq-form">
        <label>Motivo de anulación * (mínimo 10 caracteres)</label>
        <textarea rows={4} value={motivo} onChange={e => setMotivo(e.target.value)}
          placeholder="Describe el motivo de la anulación…" />
        {err && <p className="liq-form__error">{err}</p>}
        <div className="liq-form__actions">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={anular} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : null} Anular liquidación
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

  if (loading) return <div className="liq-loading"><Loader2 className="spin" size={28} /> Cargando detalle…</div>;
  if (err) return <div className="liq-error"><AlertCircle size={18} /> {err}</div>;
  if (!detalle) return null;

  const esBorrador = detalle.Estado === "Borrador";
  const esAnulada  = detalle.Estado === "Anulada";

  return (
    <div className="liq-detalle">
      <Toast toast={toast} />
      <div className="liq-detalle__back">
        <button className="btn-ghost" onClick={onVolver}><ArrowLeft size={15} /> Volver al listado</button>
      </div>

      {/* Cabecera */}
      <div className="liq-detalle__card">
        <div className="liq-detalle__card-header">
          <div>
            <h2>Liquidación #{detalle.ID_Liquidacion}</h2>
            <p className="liq-detalle__empleado">{detalle.nombre_empleado}</p>
            <p className="liq-detalle__periodo">
              Período: {fmtFecha(detalle.Fecha_Inicio)} – {fmtFecha(detalle.Fecha_Fin)}
            </p>
            <p className="liq-detalle__creacion">Creada: {fmtFechaHora(detalle.Fecha_Creacion)}</p>
          </div>
          <div className="liq-detalle__card-right">
            <EstadoBadge estado={detalle.Estado} />
            <p className="liq-detalle__total">{fmtMoneda(detalle.Total)}</p>
            {detalle.Metodo_Pago && (
              <p className="liq-detalle__pago-info">
                {detalle.Metodo_Pago} — {fmtFecha(detalle.Fecha_Pago)}
              </p>
            )}
          </div>
        </div>

        {esAnulada && (
          <div className="liq-detalle__anulacion-info">
            <Ban size={14} />
            <span><strong>Motivo de anulación:</strong> {detalle.Motivo_Anulacion}</span>
            <span className="liq-detalle__anulacion-fecha">({fmtFechaHora(detalle.Fecha_Anulacion)})</span>
          </div>
        )}

        {/* Acciones de estado */}
        {esBorrador && (
          <div className="liq-detalle__acciones">
            <button className="btn-secondary" onClick={() => { setModoEdicion(true); cargarPendientes(); }}>
              <Pencil size={13} /> Editar registros
            </button>
            <button className="btn-primary" onClick={() => setModalPago(true)}>
              <CreditCard size={13} /> Registrar pago
            </button>
            <button className="btn-danger-outline" onClick={() => setModalAnular(true)}>
              <Ban size={13} /> Anular
            </button>
          </div>
        )}
      </div>

      {/* Tabla de registros */}
      <div className="liq-detalle__tabla-card">
        <div className="liq-detalle__tabla-header">
          <h3>Desglose de horas</h3>
          {modoEdicion && esBorrador && (
            <button className="btn-ghost" onClick={() => setModoEdicion(false)}>
              <X size={13} /> Cerrar edición
            </button>
          )}
        </div>

        {detalle.registros && detalle.registros.length > 0 ? (
          <table className="liq-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Origen</th>
                <th>Horario</th>
                <th>Horas</th>
                <th>Tarifa/h</th>
                <th>Subtotal</th>
                {modoEdicion && esBorrador && <th>Quitar</th>}
              </tr>
            </thead>
            <tbody>
              {detalle.registros.map(r => (
                <tr key={r.ID_Registro}>
                  <td>{fmtFecha(r.Fecha)}</td>
                  <td>{r.origen_label}</td>
                  <td>{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                  <td>{r.Horas_Trabajadas} h</td>
                  <td>{fmtMoneda(r.tarifa_aplicada)}</td>
                  <td><strong>{fmtMoneda(r.subtotal)}</strong></td>
                  {modoEdicion && esBorrador && (
                    <td>
                      <button className="btn-icon btn-icon--danger" disabled={loadingEdit}
                        onClick={() => quitarRegistro(r.ID_Registro)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="liq-tabla__total-row">
                <td colSpan={modoEdicion && esBorrador ? 5 : 5}><strong>TOTAL</strong></td>
                <td><strong>{fmtMoneda(detalle.Total)}</strong></td>
                {modoEdicion && esBorrador && <td />}
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="liq-empty">Esta liquidación no tiene registros de horas.</p>
        )}

        {/* Panel para agregar registros */}
        {modoEdicion && esBorrador && (
          <div className="liq-edicion-agregar">
            <h4>Registros pendientes disponibles para agregar</h4>
            {pendientes.length === 0 ? (
              <p className="liq-empty">No hay registros pendientes para este empleado.</p>
            ) : (
              <>
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
                            onChange={() => toggleAgregar(r.ID_Registro)} />
                        </td>
                        <td>{fmtFecha(r.Fecha)}</td>
                        <td>{r.origen_label}</td>
                        <td>{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                        <td>{r.Horas_Trabajadas} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="liq-form__actions" style={{ marginTop: "12px" }}>
                  <button className="btn-primary" disabled={!selAgregar.length || loadingEdit}
                    onClick={agregarSeleccionados}>
                    {loadingEdit ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
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

  const mostrarToast = (msg, type = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const cargar = useCallback(async (p = pagina) => {
    setLoading(true);
    try {
      const res = await listarLiquidaciones({
        pagina: p, porPagina: 20,
        idEmpleado:  filtros.idEmpleado  || null,
        estado:      filtros.estado      || null,
        fechaInicio: filtros.fechaInicio ? `${filtros.fechaInicio}T00:00:00` : null,
        fechaFin:    filtros.fechaFin    ? `${filtros.fechaFin}T23:59:59`   : null,
        busqueda:    filtros.busqueda    || null,
      });
      setData(res);
    } catch (e) { mostrarToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [pagina, filtros]);

  useEffect(() => { cargar(pagina); }, [pagina]);

  function buscar() { setPagina(1); cargar(1); }
  function limpiar() {
    setFiltros({ idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "", busqueda: "" });
    setPagina(1);
    setTimeout(() => cargar(1), 0);
  }

  return (
    <div className="liq-tab-content">
      <Toast toast={toast} />

      {/* Barra superior */}
      <div className="liq-toolbar">
        <div className="liq-toolbar__left">
          <div className="liq-search">
            <Search size={14} />
            <input placeholder="Buscar por empleado…" value={filtros.busqueda}
              onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && buscar()} />
          </div>
          <button className="btn-icon-label" onClick={() => setShowFiltros(v => !v)}>
            <Filter size={14} /> Filtros
          </button>
          {(filtros.idEmpleado || filtros.estado || filtros.fechaInicio || filtros.fechaFin) && (
            <button className="btn-ghost btn-ghost--sm" onClick={limpiar}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setModalGenerar(true)}>
          <Plus size={14} /> Generar liquidación
        </button>
      </div>

      {/* Panel de filtros */}
      {showFiltros && (
        <div className="liq-filtros-panel">
          <select value={filtros.idEmpleado} onChange={e => setFiltros(f => ({ ...f, idEmpleado: e.target.value }))}>
            <option value="">Todos los empleados</option>
            {empleados.map(e => (
              <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
                {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
              </option>
            ))}
          </select>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
            <option value="">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Pagada">Pagada</option>
            <option value="Anulada">Anulada</option>
          </select>
          <input type="date" value={filtros.fechaInicio}
            onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))} />
          <input type="date" value={filtros.fechaFin}
            onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))} />
          <button className="btn-primary btn-sm" onClick={buscar}>Aplicar</button>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="liq-loading"><Loader2 className="spin" size={22} /> Cargando…</div>
      ) : data.items.length === 0 ? (
        <div className="liq-empty-state">
          <FileText size={36} />
          <p>No hay liquidaciones{Object.values(filtros).some(Boolean) ? " que coincidan con los filtros" : " registradas"}.</p>
        </div>
      ) : (
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
                <td>{liq.ID_Liquidacion}</td>
                <td>{liq.nombre_empleado}</td>
                <td>{fmtFecha(liq.Fecha_Inicio)} – {fmtFecha(liq.Fecha_Fin)}</td>
                <td><strong>{fmtMoneda(liq.Total)}</strong></td>
                <td><EstadoBadge estado={liq.Estado} /></td>
                <td>{fmtFecha(liq.Fecha_Creacion)}</td>
                <td>
                  <button className="btn-icon" title="Ver detalle" onClick={() => onVerDetalle(liq.ID_Liquidacion)}>
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  return (
    <div className="liq-tab-content">
      <Toast toast={toast} />
      <div className="liq-toolbar">
        <div className="liq-toolbar__left">
          <select value={filtros.idEmpleado} onChange={e => setFiltros(f => ({ ...f, idEmpleado: e.target.value }))}>
            <option value="">Todos los empleados</option>
            {empleados.map(e => (
              <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
                {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
              </option>
            ))}
          </select>
          <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_liquidacion">En liquidación</option>
            <option value="liquidado">Liquidado</option>
          </select>
          <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))} />
          <input type="date" value={filtros.fechaFin} onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))} />
          <button className="btn-sm btn-primary" onClick={() => { setPagina(1); cargar(1); }}>Filtrar</button>
          <button className="btn-ghost btn-ghost--sm" onClick={() => { setFiltros({ idEmpleado: "", estado: "", fechaInicio: "", fechaFin: "" }); setPagina(1); setTimeout(() => cargar(1), 0); }}>
            <RefreshCw size={12} />
          </button>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={14} /> Registrar horas
        </button>
      </div>

      {loading ? (
        <div className="liq-loading"><Loader2 className="spin" size={22} /></div>
      ) : data.items.length === 0 ? (
        <div className="liq-empty-state"><Clock size={36} /><p>No hay registros de horas.</p></div>
      ) : (
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
                <td>{r.ID_Registro}</td>
                <td>{r.nombre_empleado}</td>
                <td>{fmtFecha(r.Fecha)}</td>
                <td>{r.origen_label}</td>
                <td>{fmtHora(r.Hora_Inicio)} – {fmtHora(r.Hora_Fin)}</td>
                <td>{r.Horas_Trabajadas} h</td>
                <td><EstadoBadge estado={r.Estado} /></td>
                <td>
                  {r.Estado === "pendiente" && (
                    <button className="btn-icon btn-icon--danger" title="Eliminar" onClick={() => borrarRegistro(r.ID_Registro)}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <select value={filtroEmp} onChange={e => setFiltroEmp(e.target.value)}>
            <option value="">Todos los empleados</option>
            {empleados.map(e => (
              <option key={e.ID_Usuario || e.id} value={e.ID_Usuario || e.id}>
                {e.Nombre || e.nombre} {e.Apellidos || e.apellidos}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={14} /> Configurar tarifa
        </button>
      </div>

      {loading ? (
        <div className="liq-loading"><Loader2 className="spin" size={22} /></div>
      ) : tarifas.length === 0 ? (
        <div className="liq-empty-state"><DollarSign size={36} /><p>No hay tarifas configuradas.</p></div>
      ) : (
        <table className="liq-tabla">
          <thead>
            <tr>
              <th>#</th><th>Empleado</th><th>Tarifa/hora</th><th>Vigente desde</th><th>Vigente hasta</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map(t => (
              <tr key={t.ID_Tarifa}>
                <td>{t.ID_Tarifa}</td>
                <td>{t.nombre_empleado}</td>
                <td><strong>{fmtMoneda(t.Tarifa_Hora)}</strong></td>
                <td>{fmtFecha(t.Fecha_Inicio)}</td>
                <td>{t.Fecha_Fin ? fmtFecha(t.Fecha_Fin) : "—"}</td>
                <td><span className={`liq-badge ${t.vigente ? "badge--paid" : "badge--neutral"}`}>{t.vigente ? "Vigente" : "Histórica"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [tab, setTab]           = useState("liquidaciones");
  const [empleados, setEmpleados] = useState([]);
  const [detalleId, setDetalleId] = useState(null);

  useEffect(() => {
    getUsuarios({ porPagina: 200 })
      .then(res => {
        const lista = Array.isArray(res) ? res : (res.items || res.usuarios || []);
        // Solo empleados activos (no clientes ni domiciliarios)
        setEmpleados(lista.filter(u => {
          const rol = (u.rol || u.Rol || "").toLowerCase();
          return !rol.includes("cliente") && u.estado !== false && u.estado !== 0;
        }));
      })
      .catch(() => {});
  }, []);

  if (detalleId !== null) {
    return (
      <DetalleLiquidacion
        idLiquidacion={detalleId}
        onVolver={() => setDetalleId(null)}
        onCambio={() => {}}
      />
    );
  }

  return (
    <div className="liq-root">
      <div className="liq-header">
        <h1>Gestión de liquidaciones</h1>
        <p className="liq-header__sub">Administra tarifas, registra horas y gestiona el pago de empleados</p>
      </div>

      <div className="liq-tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} className={`liq-tab-btn ${tab === key ? "liq-tab-btn--active" : ""}`}
            onClick={() => setTab(key)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "liquidaciones" && (
        <TabLiquidaciones empleados={empleados} onVerDetalle={id => setDetalleId(id)} />
      )}
      {tab === "horas" && <TabRegistros empleados={empleados} />}
      {tab === "tarifas" && <TabTarifas empleados={empleados} />}
    </div>
  );
}
