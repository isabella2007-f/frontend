import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../AppContext.jsx";
import { 
  Eye, Edit3, Trash2, Truck, Package, 
  RotateCcw, ChevronRight, X, AlertCircle, 
  CheckCircle2, Info, ArrowRight, User, 
  Mail, Phone, CreditCard, MapPin, Calendar, ClipboardList, DollarSign, Search
} from 'lucide-react';
import CrearPedido from "./CrearPedido.jsx";
import EditarPedido from "./EditarPedido.jsx";
import "./Pedidos.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

const PER_PAGE = 5;

const ESTADOS_FLUJO = ["Pendiente", "En producción", "Listo", "En camino", "Entregado"];

const ESTADO_CONFIG = {
  "Pendiente":      { bg: "bg-amber-50",  color: "text-amber-700", border: "border-amber-200",  dot: "#f9a825" },
  "En producción":  { bg: "bg-blue-50",   color: "text-blue-700",  border: "border-blue-200",   dot: "#1976d2" },
  "Listo":          { bg: "bg-green-50",  color: "text-green-700", border: "border-green-200",  dot: "#43a047" },
  "En camino":      { bg: "bg-purple-50", color: "text-purple-700",border: "border-purple-200", dot: "#8e24aa" },
  "Entregado":      { bg: "bg-teal-50",   color: "text-teal-700",  border: "border-teal-200",   dot: "#009688" },
  "Cancelado":      { bg: "bg-red-50",    color: "text-red-700",   border: "border-red-200",    dot: "#e53935" },
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
   MODAL — VER DETALLE (Rediseñado)
   ═══════════════════════════════════════════════════════════ */
function ModalVerPedido({ pedido, empleados, onClose, onEdit }) {
  const navigate = useNavigate();
  const emp = empleados.find(e => e.id === pedido.idEmpleado);
  
  if (!pedido) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box--wide shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-none" style={{ borderRadius: '32px' }}>

        {/* Header Premium */}
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)', padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20">
              <ClipboardList size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-none mb-1 text-white">{pedido.numero}</h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Resumen de Venta</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={pedido.estado} />
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Información del Cliente</h4>
              <div className="bg-gray-50/50 p-5 rounded-[24px] border border-gray-100 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-700 shadow-sm border border-gray-100">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Nombre</p>
                    <p className="text-sm font-bold text-gray-800">{pedido.cliente?.nombre || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 shadow-sm border border-gray-100">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Correo</p>
                    <p className="text-sm font-bold text-gray-800">{pedido.cliente?.correo || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-700 shadow-sm border border-gray-100">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Teléfono</p>
                    <p className="text-sm font-bold text-gray-800">{pedido.cliente?.telefono || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Entrega y Pago */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Entrega y Pago</h4>
              <div className="bg-gray-50/50 p-5 rounded-[24px] border border-gray-100 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-700 shadow-sm border border-gray-100">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Método de Pago</p>
                    <p className="text-sm font-bold text-gray-800">{pedido.metodo_pago}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-700 shadow-sm border border-gray-100 shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dirección</p>
                    <p className="text-sm font-bold text-gray-800 leading-tight">{pedido.direccion_entrega || "Recogida en tienda"}</p>
                  </div>
                </div>
                {pedido.domicilio && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-700 shadow-sm border border-gray-100">
                      <Truck size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Domiciliario</p>
                      <p className="text-sm font-bold text-gray-800">{emp ? `${emp.nombre} ${emp.apellidos}` : "Sin asignar"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Productos Table */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Productos del Pedido</h4>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Cant.</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Precio</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(pedido.productosItems || []).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-700 text-xs">📦</div>
                          <span className="text-xs font-black text-gray-800">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600">x{p.cantidad}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-gray-500">{fmt(p.precio)}</td>
                      <td className="px-6 py-4 text-right text-xs font-black text-green-700">{fmt(p.precio * p.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               {/* Orden producción */}
               {pedido.orden_produccion && (
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-[24px] flex items-center justify-between group hover:bg-blue-100 transition-all cursor-pointer" 
                     onClick={() => { onClose(); navigate(`/admin/ordenes-produccion?search=${pedido.numero}`); }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-tight">Producción Activa</p>
                      <p className="text-xs text-blue-600 font-medium">Ver detalles de fabricación</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
              
              <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Fecha Pedido</p>
                  <p className="text-sm font-bold text-gray-800">{pedido.fecha_pedido}</p>
                </div>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
               <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
               <div className="relative z-10 space-y-3">
                 <div className="flex justify-between items-center text-xs opacity-60">
                   <span className="font-bold">Subtotal</span>
                   <span className="font-black">{fmt(pedido.subtotal)}</span>
                 </div>
                 {pedido.descuento > 0 && (
                   <div className="flex justify-between items-center text-xs text-red-400">
                     <span className="font-bold">Descuento</span>
                     <span className="font-black">− {fmt(pedido.descuento)}</span>
                   </div>
                 )}
                 <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Final</p>
                     <p className="text-3xl font-black tracking-tighter leading-none">{fmt(pedido.total)}</p>
                   </div>
                   <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <DollarSign size={20} />
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {pedido.notas && (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-[24px] flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                <Info size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Notas del Pedido</p>
                <p className="text-xs text-amber-700 italic font-medium leading-relaxed">"{pedido.notas}"</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer p-6 bg-gray-50/50 border-t border-gray-100 shrink-0 flex gap-3">
          <button className="btn-secondary flex-1 py-4 text-xs font-black uppercase tracking-widest" onClick={onClose}>Cerrar</button>
          {!["Entregado","Cancelado"].includes(pedido.estado) && (
            <button className="btn-primary flex-1 py-4 text-xs font-black uppercase tracking-widest shadow-lg" style={{ background: 'var(--green-600)' }} onClick={() => { onClose(); onEdit(pedido); }}>
              ✎ Editar Pedido
            </button>
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
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionPedidos() {
  const {
    pedidos, crearPedido, editarPedido, eliminarPedido,
    cambiarEstadoPedido, asignarDomiciliario,
    usuarios,
  } = useApp();

  const navigate = useNavigate();
  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterTipo,   setFilterTipo]   = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = pedidos.filter(p => {
    const q      = search.toLowerCase();
    const matchQ = [p.numero, p.cliente?.nombre, p.cliente?.correo, p.metodo_pago, p.estado]
      .filter(Boolean).some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || p.estado === filterEstado;
    const matchT =
      filterTipo === "todos"       ? true :
      filterTipo === "domicilio"   ? p.domicilio :
      filterTipo === "tienda"      ? !p.domicilio :
      filterTipo === "produccion"  ? p.orden_produccion : true;
    return matchQ && matchE && matchT;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  useEffect(() => setPage(1), [search, filterEstado, filterTipo]);

  const hasFilter = filterEstado !== "todos" || filterTipo !== "todos";

  const handleSave = (payload) => {
    if (payload.id) {
      editarPedido(payload);
      showToast(`Pedido ${payload.numero} actualizado`);
      setModal(null);
    } else {
      const res = crearPedido(payload);
      if (res && res.error) {
        showToast(res.error, "error");
      } else {
        showToast(`Pedido ${res.numero} creado`);
        setModal(null);
      }
    }
  };

  const handleCambiarEstadoDirecto = (ped) => {
    const actualIdx = ESTADOS_FLUJO.indexOf(ped.estado);
    if (actualIdx === -1) {
      if (ped.estado === "Cancelado") {
        showToast("Un pedido cancelado no puede ser reactivado", "warn");
      } else {
        showToast("Estado no reconocido", "error");
      }
      return;
    }
    
    if (actualIdx >= ESTADOS_FLUJO.length - 1) {
      showToast(`El pedido ya está en su estado final: ${ped.estado}`, "info");
      return;
    }

    const nuevoEstado = ESTADOS_FLUJO[actualIdx + 1];
    setModal({ type: "confirmarEstado", pedido: ped, nuevoEstado });
  };

  const handleConfirmarCambioEstado = (id, nuevoEstado) => {
    const ped = pedidos.find(p => p.id === id);
    if (!ped) return;

    let finalEstado = nuevoEstado;
    if (nuevoEstado === "En camino" && !ped.domicilio) {
      finalEstado = "Entregado";
      showToast(`Pedido ${ped.numero} marcado como Entregado (Tienda)`);
    } else {
      showToast(`Pedido ${ped.numero} actualizado a: ${nuevoEstado}`);
    }

    cambiarEstadoPedido(id, finalEstado);
    setModal(null);
  };

  const handleEliminar = (id) => {
    eliminarPedido(id);
    showToast("Pedido eliminado", "error");
    setModal(null);
  };

  const handleAsignarDomiciliario = (pedidoId, empleadoId) => {
    asignarDomiciliario(pedidoId, empleadoId);
    const empleado = empleados.find(e => e.id === empleadoId);
    showToast(`Pedido asignado a ${empleado?.nombre} ${empleado?.apellidos}`);
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
                      {[{ val: "todos", label: "Todos", dot: "#bdbdbd" }, ...ESTADOS_FLUJO.map(e => ({ val: e, label: e, dot: ESTADO_CONFIG[e]?.dot }))].map(f => (
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
            Nuevo pedido <span>+</span>
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
                {paged.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><div className="empty-state__icon">📦</div><p className="empty-state__text">Sin pedidos.</p></div></td></tr>
                ) : paged.map((ped, idx) => {
                  const emp = empleados.find(e => e.id === ped.idEmpleado);
                  const canAdvance = ESTADOS_FLUJO.indexOf(ped.estado) < ESTADOS_FLUJO.length - 1;
                  return (
                    <tr key={ped.id} className="tbl-row group hover:bg-green-50/30 transition-colors">
                      <td><span className="row-num">{String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                      <td>
                        <div className="pedido-num font-black text-green-800">{ped.numero}</div>
                        {(ped.comprobante || ped.comprobantePreview) && (
                          <div className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Pago Adjunto
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
                      <td><EstadoBadge estado={ped.estado} /></td>
                      <td>
                        <div className="actions-cell flex items-center gap-1">
                          <button className="act-btn act-btn--view bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all p-1.5 rounded-lg border border-green-100" onClick={() => setModal({ type: "ver", pedido: ped })}>👁</button>
                          {canAdvance && <button className="act-btn act-btn--success bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all p-1.5 rounded-lg border border-blue-100" onClick={() => handleCambiarEstadoDirecto(ped)}>🔄</button>}
                          <button className="act-btn act-btn--edit bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all p-1.5 rounded-lg border border-amber-100" onClick={() => setModal({ type: "editar", pedido: ped })}>✎</button>
                          {ped.domicilio && <button className="act-btn act-btn--domicilio bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all p-1.5 rounded-lg border border-purple-100" onClick={() => setModal({ type: "domicilio", pedido: ped })}>🛵</button>}
                          <button className="act-btn act-btn--delete bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all p-1.5 rounded-lg border border-red-100" onClick={() => setModal({ type: "eliminar", pedido: ped })}>🗑️</button>
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

      {modal?.type === "crear" && <CrearPedido onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "editar" && <EditarPedido pedido={modal.pedido} onClose={() => setModal(null)} onSave={handleSave} />}
      {modal?.type === "ver" && <ModalVerPedido pedido={modal.pedido} empleados={empleados} onClose={() => setModal(null)} onEdit={ped => setModal({ type: "editar", pedido: ped })} />}
      {modal?.type === "eliminar" && <ModalEliminarPedido pedido={modal.pedido} onClose={() => setModal(null)} onConfirm={handleEliminar} />}
      {modal?.type === "confirmarEstado" && <ModalConfirmarEstado pedido={modal.pedido} nuevoEstado={modal.nuevoEstado} onClose={() => setModal(null)} onConfirm={handleConfirmarCambioEstado} />}
      {modal?.type === "domicilio" && <ModalAsignarDomiciliario pedido={modal.pedido} empleados={empleados} onClose={() => setModal(null)} onConfirm={handleAsignarDomiciliario} />}

      <Toast toast={toast} />
    </div>
  );
}