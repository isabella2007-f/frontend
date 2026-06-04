import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getPedidos, confirmarPedido, cancelarPedido, crearPedido, editarPedido, eliminarPedido } from "../../../services/pedidosService.js";
import { getUsuarios } from "../../../services/usuariosService.js";
import CrearPedido from "./CrearPedido.jsx";
import EditarPedido from "./EditarPedido.jsx";
import {
  Trash2, Truck, Package,
  RotateCcw, X, AlertCircle,
  CheckCircle2, ArrowRight, MapPin, Search
} from 'lucide-react';
import "./Pedidos.css";

/* ─── Datos de transferencia ─────────────────────────────── */
// Actualiza estos datos con la información real de la cuenta
const CUENTA_TRANSFERENCIA = {
  banco:   "Nequi / Bancolombia",
  titular: "TostonApp S.A.S",
  tipo:    "Ahorros",
  numero:  "300 000 0000",
  qrUrl:   "", // Reemplaza con la URL real del QR de pago
};

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

const PER_PAGE = 5;

// GestionPedidos solo gestiona órdenes activas (Pendiente y En producción).
// La única acción de avance es Confirmar → Estado=4 (Confirmado), que mueve
// el pedido a GestionVentas. Los estados "Listo", "En camino", "Entregado"
// se gestionan en Domicilios / GestionVentas, no aquí.
const ESTADOS_ACTIVOS_PEDIDO = ["Pendiente", "En producción"];

const ESTADO_CONFIG = {
  "Pendiente":      { bg: "bg-amber-50",   color: "text-amber-700",  border: "border-amber-200",  dot: "#f9a825" },
  "En producción":  { bg: "bg-blue-50",    color: "text-blue-700",   border: "border-blue-200",   dot: "#1976d2" },
  "Confirmado":     { bg: "bg-green-50",   color: "text-green-700",  border: "border-green-200",  dot: "#43a047" },
  "Cancelado":      { bg: "bg-red-50",     color: "text-red-700",    border: "border-red-200",    dot: "#e53935" },
  "Entregado":      { bg: "bg-teal-50",    color: "text-teal-700",   border: "border-teal-200",   dot: "#009688" },
  "En camino":      { bg: "bg-purple-50",  color: "text-purple-700", border: "border-purple-200", dot: "#8e24aa" },
};

/* ─── EstadoBadge ────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const c   = ESTADO_CONFIG[estado] || { bg: "bg-gray-50", color: "text-gray-700", border: "border-gray-200", dot: "#bdbdbd" };
  return (
    <span className={`estado-badge ${c.bg} ${c.color} border ${c.border} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "bg-red-600" : toast.type === "warn" ? "bg-orange-600" : "bg-green-600";
  return (
    <div className={`fixed bottom-8 right-8 ${bg} text-white px-6 py-3 rounded-xl shadow-2xl z-[30000] flex items-center gap-3 animate-in slide-in-from-right`}>
      {toast.type === "error" ? <X size={18} /> : toast.type === "warn" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span className="font-bold text-sm">{toast.message}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — CAMBIAR ESTADO (Confirmación)
   ═══════════════════════════════════════════════════════════ */
function ModalConfirmarEstado({ pedido, nuevoEstado, onClose, onConfirm }) {
  if (!pedido || !nuevoEstado) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box relative bg-white shadow-2xl overflow-hidden flex flex-col border-none" style={{ borderRadius: '28px', maxWidth: '420px' }}>
        
        {/* Cabecera */}
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)', padding: '20px 24px' }}>
          <div>
            <h2 className="text-lg font-black text-white leading-none">Confirmar Cambio</h2>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mt-1">Pedido #{pedido.numero}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>

        <div className="modal-body p-6 text-center">
          <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600">
              <RotateCcw size={28} />
            </div>
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">¿Actualizar estado del pedido?</h3>
            <p className="text-xs text-amber-700/80 mt-2 font-medium">Estás a punto de avanzar este pedido en el flujo de ventas.</p>
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden mb-6">
            <div className="text-center flex-1">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Actual</p>
              <EstadoBadge estado={pedido.estado} />
            </div>
            <div className="px-4 text-gray-300 animate-pulse">
              <ArrowRight size={20} strokeWidth={3} />
            </div>
            <div className="text-center flex-1">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Nuevo</p>
              <EstadoBadge estado={nuevoEstado} />
            </div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => onConfirm(pedido.id, nuevoEstado)}
              className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--green-700) 0%, var(--green-600) 100%)' }}
            >
              Confirmar y Actualizar
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — VER DETALLE
   ═══════════════════════════════════════════════════════════ */
function ModalVerPedido({ pedido, empleados, onClose, onEdit }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("resumen");
  const emp = empleados.find(e => e.id === pedido.idEmpleado);
  if (!pedido) return null;

  const esTransferencia = pedido.metodo_pago === "Transferencia";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-box--wide"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Pedido</p>
            <h2 className="modal-header__title">{pedido.numero}</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <EstadoBadge estado={pedido.estado} />
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="ver-ped-tabs">
          <button className={`ver-ped-tab${tab === "resumen"   ? " ver-ped-tab--active" : ""}`} onClick={() => setTab("resumen")}>📋 Resumen</button>
          <button className={`ver-ped-tab${tab === "productos" ? " ver-ped-tab--active" : ""}`} onClick={() => setTab("productos")}>📦 Productos</button>
          <button className={`ver-ped-tab${tab === "pago"      ? " ver-ped-tab--active" : ""}`} onClick={() => setTab("pago")}>
            💳 Pago {esTransferencia && <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, background: "#e3f2fd", color: "#1565c0", border: "1px solid #90caf9", borderRadius: 4, padding: "1px 5px" }}>Transferencia</span>}
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Tab Resumen ── */}
          {tab === "resumen" && (
            <div className="form-grid-2" style={{ gap: 24 }}>
              {/* Cliente */}
              <div>
                <p className="section-label">Información del Cliente</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Nombre",   value: pedido.cliente?.nombre },
                    { label: "Correo",   value: pedido.cliente?.correo },
                    { label: "Teléfono", value: pedido.cliente?.telefono },
                  ].map(({ label, value }) => (
                    <div key={label} className="ver-ped-field">
                      <span className="ver-ped-field__label">{label}</span>
                      <span className="ver-ped-field__value">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entrega */}
              <div>
                <p className="section-label">Entrega</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="ver-ped-field">
                    <span className="ver-ped-field__label">Tipo</span>
                    <span className="ver-ped-field__value">{pedido.domicilio ? "🛵 Domicilio" : "🏪 Recogida en tienda"}</span>
                  </div>
                  {pedido.domicilio && (
                    <>
                      <div className="ver-ped-field">
                        <span className="ver-ped-field__label">Dirección</span>
                        <span className="ver-ped-field__value">{pedido.direccion_entrega || "—"}</span>
                      </div>
                      <div className="ver-ped-field">
                        <span className="ver-ped-field__label">Domiciliario</span>
                        <span className="ver-ped-field__value">{emp ? `${emp.nombre} ${emp.apellidos}` : "Sin asignar"}</span>
                      </div>
                    </>
                  )}
                  <div className="ver-ped-field">
                    <span className="ver-ped-field__label">Fecha del pedido</span>
                    <span className="ver-ped-field__value">📅 {pedido.fecha_pedido}</span>
                  </div>
                </div>
              </div>

              {/* Notas (ancho completo) */}
              {pedido.notas && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="info-box info-box--warn">
                    <span className="info-box__icon">📝</span>
                    <div>
                      <span className="info-box__label">Notas del pedido</span>
                      <span className="info-box__text" style={{ display: "block" }}>{pedido.notas}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Enlace producción (ancho completo) */}
              {pedido.orden_produccion && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <button
                    className="info-box info-box--info"
                    style={{ width: "100%", cursor: "pointer", textAlign: "left", border: "1px solid #90caf9" }}
                    onClick={() => { onClose(); navigate(`/admin/ordenes-produccion?search=${pedido.numero}`); }}
                  >
                    <span className="info-box__icon">📦</span>
                    <div>
                      <span className="info-box__label">Producción activa</span>
                      <span className="info-box__text" style={{ display: "block" }}>Ver detalles de fabricación →</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Tab Productos ── */}
          {tab === "productos" && (
            <div>
              <table className="ver-productos-table" style={{ marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: "center" }}>Cant.</th>
                    <th style={{ textAlign: "right" }}>Precio</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(pedido.productosItems || []).map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>📦 {p.nombre}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ background: "#f1f8f1", border: "1px solid #c8e6c9", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, color: "#2e7d32" }}>×{p.cantidad}</span>
                      </td>
                      <td style={{ textAlign: "right", color: "#757575" }}>{fmt(p.precio)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#2e7d32" }}>{fmt(p.precio * p.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="totales-box">
                <div className="totales-row">
                  <span>Subtotal</span>
                  <span>{fmt(pedido.subtotal)}</span>
                </div>
                {pedido.descuento > 0 && (
                  <div className="totales-row totales-row--descuento">
                    <span>Descuento</span>
                    <span>− {fmt(pedido.descuento)}</span>
                  </div>
                )}
                <div className="totales-row totales-row--total">
                  <span>Total a pagar</span>
                  <span>{fmt(pedido.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab Pago ── */}
          {tab === "pago" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="ver-ped-field">
                <span className="ver-ped-field__label">Método de pago</span>
                <span className="ver-ped-field__value" style={{ fontSize: 15 }}>
                  {esTransferencia ? "🏦 Transferencia bancaria" : "💵 Efectivo"}
                </span>
              </div>

              {esTransferencia ? (
                <>
                  <p className="section-label" style={{ marginTop: 4 }}>Datos para realizar la transferencia</p>
                  <div className="cuenta-card">
                    <div className="cuenta-card__rows">
                      {[
                        { label: "Banco / Billetera", value: CUENTA_TRANSFERENCIA.banco },
                        { label: "Titular",           value: CUENTA_TRANSFERENCIA.titular },
                        { label: "Tipo de cuenta",    value: CUENTA_TRANSFERENCIA.tipo },
                        { label: "Número",            value: CUENTA_TRANSFERENCIA.numero },
                      ].map(({ label, value }) => (
                        <div key={label} className="cuenta-card__row">
                          <span className="cuenta-card__label">{label}</span>
                          <span className="cuenta-card__value">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className={`cuenta-card__qr${CUENTA_TRANSFERENCIA.qrUrl ? "" : " cuenta-card__qr--empty"}`}>
                      {CUENTA_TRANSFERENCIA.qrUrl ? (
                        <img src={CUENTA_TRANSFERENCIA.qrUrl} alt="QR de pago" />
                      ) : (
                        <>
                          <span style={{ fontSize: 26 }}>📷</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#9e9e9e", textAlign: "center", lineHeight: 1.3, padding: "0 6px" }}>Agrega el QR en el código</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="info-box info-box--warn" style={{ marginTop: 0 }}>
                    <span className="info-box__icon">ℹ️</span>
                    <span className="info-box__text">Recuerda adjuntar el comprobante de pago al confirmar el pedido.</span>
                  </div>

                  {pedido.comprobante ? (
                    <div className="info-box info-box--success">
                      <span className="info-box__icon">✅</span>
                      <span className="info-box__text">El cliente adjuntó comprobante de pago.</span>
                      <a href={pedido.comprobante} target="_blank" rel="noopener noreferrer"
                        style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#2e7d32", flexShrink: 0 }}>
                        Ver comprobante →
                      </a>
                    </div>
                  ) : (
                    <div className="info-box info-box--danger" style={{ background: "#ffebee", borderColor: "#ef9a9a", color: "#c62828" }}>
                      <span className="info-box__icon">⚠️</span>
                      <span className="info-box__text">Aún no se ha adjuntado comprobante de pago.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="info-box info-box--success">
                  <span className="info-box__icon">💵</span>
                  <span className="info-box__text">Pago en efectivo al momento de la entrega. No se requiere comprobante.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          {!["Entregado", "Cancelado"].includes(pedido.estado) && (
            <button className="btn-save" onClick={() => { onClose(); onEdit(pedido); }}>✎ Editar Pedido</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — ELIMINAR PEDIDO
   ═══════════════════════════════════════════════════════════ */
function ModalEliminarPedido({ pedido, onClose, onConfirm }) {
  const [done, setDone] = useState(false);

  if (["Entregado"].includes(pedido.estado)) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box modal-box--sm shadow-2xl overflow-hidden flex flex-col border-none text-center p-8" style={{ borderRadius: '32px' }}>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
              <X size={32} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">No se puede eliminar</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8">
              Los pedidos entregados forman parte del historial financiero y no pueden ser eliminados.
            </p>
            <button className="btn-secondary w-full py-4 text-xs font-black uppercase" onClick={onClose}>Entendido</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm shadow-2xl overflow-hidden flex flex-col border-none text-center p-8" style={{ borderRadius: '32px' }}>
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100 shadow-inner">
            <Trash2 size={32} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">Eliminar pedido</h3>
          <p className="text-sm font-bold text-gray-600 mb-1">
            ¿Confirmas la eliminación de <strong>"{pedido.numero}"</strong>?
          </p>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-8">Esta acción es irreversible.</p>
          
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 py-4 text-xs font-black uppercase" onClick={onClose}>Cancelar</button>
            <button className="btn-danger flex-1 py-4 text-xs font-black uppercase shadow-lg shadow-red-200" disabled={done} onClick={() => { setDone(true); setTimeout(() => onConfirm(pedido.id), 800); }}>
              {done ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
      </div>
    </div>
  );
}

function ModalErrorEstadoPedido({ mensaje, onClose }) {
  if (!mensaje) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-box--sm shadow-2xl overflow-hidden flex flex-col border-none text-center p-8"
        style={{ borderRadius: "32px" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600 border border-amber-100">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-2">
          No se pudo avanzar
        </h3>
        <p className="text-sm font-medium text-gray-600 leading-relaxed mb-8">
          {mensaje}
        </p>
        <button
          className="btn-secondary w-full py-4 text-xs font-black uppercase"
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function ModalAsignarDomiciliario({ pedido, empleados, onClose, onConfirm }) {
  const [empId, setEmpId] = useState(pedido.idEmpleado || "");
  const [error, setError] = useState("");
  const empActual = empleados.find(e => e.id === pedido.idEmpleado);

  const handleSubmit = () => {
    if (!empId) {
      setError("Selecciona un domiciliario");
      return;
    }
    const id = parseInt(empId, 10);
    if (pedido.idEmpleado && pedido.idEmpleado === id) {
      setError("El pedido ya tiene asignado este domiciliario");
      return;
    }
    onConfirm(pedido.id, id);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box shadow-2xl overflow-hidden flex flex-col border-none" style={{ borderRadius: '32px', maxWidth: '440px' }}>

        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)', padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20">
              <Truck size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-none mb-1 text-white">Asignar Repartidor</h2>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Pedido #{pedido.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body p-6 space-y-5">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm border border-indigo-100">
              <MapPin size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Lugar de Entrega</p>
              <p className="text-xs font-bold text-gray-700 leading-tight">{pedido.direccion_entrega || "Recogida en tienda"}</p>
            </div>
          </div>

          {empActual && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
              <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm border border-amber-100">
                <Truck size={18} />
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Repartidor Actual</p>
                <p className="text-xs font-black text-amber-800">{empActual.nombre} {empActual.apellidos}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Seleccionar Nuevo Repartidor <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-4 text-sm font-bold text-gray-700 outline-none transition-all appearance-none ${
                  error ? "border-red-500 bg-red-50" : "border-transparent focus:border-green-600 focus:bg-white"
                }`}
                value={empId}
                onChange={e => { setEmpId(e.target.value); setError(""); }}
              >
                <option value="">— Elegir de la lista —</option>
                {empleados.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.apellidos}{e.id === pedido.idEmpleado ? " (actual)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-[10px] font-bold text-red-500 px-2 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
          </div>
        </div>

        <div className="modal-footer p-6 bg-gray-50/50 border-t border-gray-100 shrink-0 flex gap-3">
          <button className="btn-secondary flex-1 py-4 text-xs font-black uppercase" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1 py-4 text-xs font-black uppercase shadow-lg" style={{ background: 'var(--green-600)' }} onClick={handleSubmit}>Asignar Ahora</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */
function SkeletonRows({ cols = 8, rows = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j}><div className="skeleton-cell" /></td>
      ))}
    </tr>
  ));
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionPedidos() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const empleados = (usuarios || []).filter(u =>
    u.tipo === "empleado" && u.estado && (
      u.idRol === 1 || u.idRol === 3 ||
      ["admin", "administrador", "domiciliario"].includes((u.rol || "").toLowerCase())
    )
  );

  const [pedidos,      setPedidos]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [actionSaving, setActionSaving] = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterTipo,   setFilterTipo]   = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await getPedidos({ porPagina: 100 });
      setPedidos(data.pedidos);
    } catch (err) {
      showToast(err.message || "Error al cargar pedidos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    getUsuarios({ porPagina: 100 }).then(setUsuarios).catch(() => {});
  }, []);

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = pedidos.filter(p => {
    const q      = search.toLowerCase();
    const matchQ = [p.numero, p.cliente?.nombre, p.cliente?.correo, p.metodo_pago, p.estado]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || p.estado === filterEstado;
    const matchT =
      filterTipo === "todos"      ? true :
      filterTipo === "domicilio"  ? p.domicilio :
      filterTipo === "tienda"     ? !p.domicilio :
      filterTipo === "produccion" ? p.orden_produccion : true;
    return matchQ && matchE && matchT;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => setPage(1), [search, filterEstado, filterTipo]);

  const hasFilter = filterEstado !== "todos" || filterTipo !== "todos";

  const handleCambiarEstadoDirecto = (ped) => {
    // La única acción de avance en este módulo es confirmar el pedido.
    // Después de confirmar, el pedido pasa a Gestión de Ventas (Estado=4).
    setModal({ type: "confirmarEstado", pedido: ped, nuevoEstado: "Confirmado" });
  };

  const handleCancelarPedido = (ped) => {
    setModal({ type: "confirmarEstado", pedido: ped, nuevoEstado: "Cancelado" });
  };

  const handleConfirmarCambioEstado = async (id, nuevoEstado) => {
    const ped = pedidos.find(p => p.id === id);
    if (!ped) return;
    setActionSaving(true);
    try {
      if (nuevoEstado === "Cancelado") {
        await cancelarPedido(id);
      } else {
        await confirmarPedido(id);
      }
      await cargarDatos();
      showToast(nuevoEstado === "Cancelado"
        ? `Pedido ${ped.numero} cancelado`
        : `Pedido ${ped.numero} confirmado exitosamente`
      );
      setModal(null);
    } catch (err) {
      const errorMsg = err.message || "No se pudo cambiar el estado del pedido.";
      setModal({ type: "errorEstado", mensaje: errorMsg });
    } finally {
      setActionSaving(false);
    }
  };

  const handleCrearPedido = async (formData) => {
    try {
      const metodoPago = (formData.metodo_pago || "").split(" ")[0]; // strip emoji
      const payload = {
        ID_Usuario: Number(formData.idCliente),
        Metodo_Pago: metodoPago,
        productos: (formData.productosItems || []).map(p => ({
          ID_Producto: Number(p.idProducto),
          Cantidad:    Number(p.cantidad),
        })),
        domicilio: formData.domicilio
          ? {
              Direccion_entrega:    formData.direccion_entrega || "",
              Municipio_entrega:    formData.municipio         || "",
              Departamento_entrega: formData.departamento      || "",
              Observaciones:        formData.notas             || null,
            }
          : null,
      };
      await crearPedido(payload);
      await cargarDatos();
      showToast("Pedido creado correctamente");
      setModal(null);
    } catch (err) {
      showToast(err.message || "Error al crear pedido", "error");
    }
  };

  const handleEditarPedido = async (formData) => {
    try {
      const payload = {
        Metodo_Pago:          (formData.metodo_pago || "").split(" ")[0] || null,
        Domicilio:            formData.domicilio,
        Direccion_Entrega:    formData.direccion_entrega    || null,
        Municipio_entrega:    formData.municipio            || null,
        Departamento_entrega: formData.departamento         || null,
        Subtotal:             formData.subtotal,
        Descuento:            formData.descuento,
        Total:                formData.total,
        Notas:                formData.notas || null,
      };
      await editarPedido(formData.id, payload);
      await cargarDatos();
      showToast("Pedido actualizado");
      setModal(null);
    } catch (err) {
      showToast(err.message || "Error al actualizar pedido", "error");
    }
  };

  const handleEliminarPedido = async (id) => {
    try {
      await eliminarPedido(id);
      await cargarDatos();
      showToast("Pedido eliminado", "warn");
    } catch (err) {
      showToast(err.message || "Error al eliminar", "error");
    }
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Pedidos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar pedido, cliente, estado…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`} onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown filter-dropdown--wide" style={{ minWidth: 340 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p className="filter-section-title">Estado</p>
                    <div style={{ display: "grid", gap: 2 }}>
                      {[
                        { val: "todos",         label: "Todos",          dot: "#bdbdbd" },
                        { val: "Pendiente",     label: "Pendiente",      dot: ESTADO_CONFIG["Pendiente"]?.dot },
                        { val: "En producción", label: "En producción",  dot: ESTADO_CONFIG["En producción"]?.dot },
                        { val: "Confirmado",    label: "Confirmado",     dot: ESTADO_CONFIG["Confirmado"]?.dot },
                        { val: "Cancelado",     label: "Cancelado",      dot: ESTADO_CONFIG["Cancelado"]?.dot },
                      ].map(f => (
                        <button key={f.val} className={`filter-option${filterEstado === f.val ? " active" : ""}`} onClick={() => setFilterEstado(f.val)}>
                          <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderLeft: "1px solid #f0f0f0", paddingLeft: 12 }}>
                    <p className="filter-section-title">Tipo</p>
                    <div style={{ display: "grid", gap: 2 }}>
                      {[
                        { val: "todos",      label: "Todos",           dot: "#bdbdbd" },
                        { val: "domicilio",  label: "Con domicilio",   dot: "#8e24aa" },
                        { val: "tienda",     label: "Retiro en tienda",dot: "#1976d2" },
                        { val: "produccion", label: "En producción",   dot: "#1565c0" },
                      ].map(f => (
                        <button key={f.val} className={`filter-option${filterTipo === f.val ? " active" : ""}`} onClick={() => { setFilterTipo(f.val); setShowFilter(false); }}>
                          <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {hasFilter && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
                    <button onClick={() => { setFilterEstado("todos"); setFilterTipo("todos"); setShowFilter(false); }} style={{ fontSize: 11, fontWeight: 700, color: "#c62828", background: "none", border: "none", cursor: "pointer" }}>Limpiar filtros</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
            Nuevo pedido <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Entrega</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={8} rows={5} />
                ) : paged.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><div className="empty-state__icon">📦</div><p className="empty-state__text">Sin pedidos.</p></div></td></tr>
                ) : paged.map((ped, idx) => {
                  const emp = empleados.find(e => e.id === ped.idEmpleado);
                  // Solo Pendiente puede confirmarse; En producción espera que las órdenes terminen
                  const canAdvance = ped.estado === "Pendiente";
                  const canCancel  = ["Pendiente", "En producción", "Confirmado"].includes(ped.estado);
                  return (
                    <tr key={ped.id} className="tbl-row group hover:bg-green-50/30 transition-colors">
                      <td><span className="row-num">{String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                      <td>
                        <div className="pedido-num font-black text-green-800">{ped.numero}</div>
                        {ped.comprobante && (
                          <div className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Pago Adjunto
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="client-name font-bold text-gray-800">{ped.cliente?.nombre || "—"}</div>
                        <div className="client-email text-[11px] text-gray-400 font-medium">{ped.cliente?.correo || ""}</div>
                      </td>
                      <td><div className="date-badge inline-block px-2 py-1 bg-gray-100 rounded-lg text-[11px] font-bold text-gray-600 border border-gray-200">{ped.fecha_pedido}</div></td>
                      <td>
                        <div className="total-amount font-black text-gray-900">{fmt(ped.total)}</div>
                        <div className="total-method text-[10px] font-black uppercase text-green-600/70">{ped.metodo_pago}</div>
                      </td>
                      <td>
                        {ped.domicilio ? (
                          <div className="flex flex-col">
                            <div className="tipo-domicilio text-[11px] font-black text-purple-600 flex items-center gap-1">🛵 Domicilio</div>
                            <div className="tipo-sub text-[10px] font-bold text-gray-400 italic">{emp ? `${emp.nombre} ${emp.apellidos.split(" ")[0]}` : "Sin asignar"}</div>
                          </div>
                        ) : (
                          <div className="tipo-tienda text-[11px] font-black text-blue-600 flex items-center gap-1">🏪 Tienda</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                          <EstadoBadge estado={ped.estado} />
                          {ped.estado === "En producción" && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#1976d2", letterSpacing: 0.3 }}>
                              ⏳ Esperando producción
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell flex items-center gap-1">
                          <button className="act-btn act-btn--view bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all p-1.5 rounded-lg border border-green-100" onClick={() => setModal({ type: "ver", pedido: ped })}>👁</button>
                          {!["Confirmado","Cancelado"].includes(ped.estado) && <button className="act-btn act-btn--edit bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all p-1.5 rounded-lg border border-amber-100" onClick={() => setModal({ type: "editar", pedido: ped })}>✎</button>}
                          {canAdvance && <button className="act-btn act-btn--success bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all p-1.5 rounded-lg border border-blue-100" disabled={actionSaving} onClick={() => handleCambiarEstadoDirecto(ped)} title="Confirmar pedido">✔</button>}
                          {canCancel && <button className="act-btn act-btn--delete bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all p-1.5 rounded-lg border border-red-100" disabled={actionSaving} onClick={() => handleCancelarPedido(ped)} title="Cancelar pedido">✕</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} pedidos</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(1)} disabled={safePage === 1}>‹‹</button>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              <button className="pg-btn-arrow" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>››</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "ver" && <ModalVerPedido pedido={modal.pedido} empleados={empleados} onClose={() => setModal(null)} onEdit={(ped) => setModal({ type: "editar", pedido: ped })} />}
      {modal?.type === "confirmarEstado" && <ModalConfirmarEstado pedido={modal.pedido} nuevoEstado={modal.nuevoEstado} onClose={() => setModal(null)} onConfirm={handleConfirmarCambioEstado} />}
      {modal?.type === "crear" && <CrearPedido onClose={() => setModal(null)} onSave={handleCrearPedido} />}
      {modal?.type === "editar" && <EditarPedido pedido={modal.pedido} onClose={() => setModal(null)} onSave={handleEditarPedido} />}
      {modal?.type === "eliminar" && <ModalEliminarPedido pedido={modal.pedido} onClose={() => setModal(null)} onConfirm={handleEliminarPedido} />}
      {modal?.type === "errorEstado" && <ModalErrorEstadoPedido mensaje={modal.mensaje} onClose={() => setModal(null)} />}

      <Toast toast={toast} />
    </div>
  );
}