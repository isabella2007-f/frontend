import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../../AppContext.jsx";
import { 
  Package, ClipboardList, User, Calendar, 
  DollarSign, FileText, ChevronRight, ArrowRight,
  CheckCircle2, X, AlertCircle, Info, History
} from 'lucide-react';
import "./OrdenesProduccion.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n ?? 0);

const PER_PAGE = 5;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_CONFIG = {
  "Pendiente":  { bg: "bg-amber-50",  color: "text-amber-700", border: "border-amber-200",  dot: "#f9a825", desc: "Esperando inicio de fabricación" },
  "En proceso": { bg: "bg-blue-50",   color: "text-blue-700",  border: "border-blue-200",   dot: "#1976d2", desc: "Actualmente en fabricación" },
  "Pausada":    { bg: "bg-purple-50", color: "text-purple-700",border: "border-purple-200", dot: "#8e24aa", desc: "Temporalmente detenida" },
  "Completada": { bg: "bg-green-50",  color: "text-green-700", border: "border-green-200",  dot: "#43a047", desc: "Fabricación finalizada — stock actualizado" },
  "Cancelada":  { bg: "bg-red-50",    color: "text-red-700",   border: "border-red-200",    dot: "#e53935", desc: "Orden cancelada" },
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const urgenciaFecha = (fechaISO) => {
  if (!fechaISO) return "normal";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(fechaISO + "T00:00:00") - hoy) / 86_400_000);
  if (dias < 0)  return "vencida";
  if (dias <= 1) return "urgente";
  if (dias <= 3) return "pronto";
  return "normal";
};

/* ─── Componentes ────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const c   = ESTADO_CONFIG[estado] || { bg: "bg-gray-50", color: "text-gray-700", border: "border-gray-200", dot: "#bdbdbd" };
  const cls = `estado-badge ${c.bg} ${c.color} border ${c.border} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5`;
  return (
    <span className={cls}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {estado}
    </span>
  );
}

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
   MODAL VER DETALLES
   ═══════════════════════════════════════════════════════════ */
function ModalDetallesOrden({ orden, empleados, onClose }) {
  const [activeTab, setActiveTab] = useState("general");
  const navigate = useNavigate();
  if (!orden) return null;
  
  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));

  const totalUnidades = (orden.productos || []).reduce((acc, x) => acc + (x.cantidad || 0), 0);

  const goToFicha = (productId) => {
    navigate('/admin/products', { state: { openFicha: productId } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box--wide shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-none" style={{ borderRadius: '32px' }}>
        
        {/* Header */}
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)', padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20">
              <ClipboardList size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-none mb-1 text-white">Orden {orden.id}</h2>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Resumen Detallado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={orden.estado} />
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/70">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 px-6">
          {[
            { id: "general", label: "General", icon: <Info size={14} /> },
            { id: "productos", label: "Productos", icon: <Package size={14} /> },
            { id: "insumos", label: "Insumos", icon: <FileText size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'border-green-600 text-green-700 bg-white' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">

          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Unidades</p>
                  <p className="text-2xl font-black text-green-900 leading-none">{totalUnidades}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Productos</p>
                  <p className="text-2xl font-black text-blue-900 leading-none">{(orden.productos || []).length}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Insumos</p>
                  <p className="text-2xl font-black text-emerald-900 leading-none">{(orden.insumos || []).length}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Costo</p>
                  <p className="text-2xl font-black text-amber-900 leading-none">{fmt(orden.costo)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Información de Gestión</h4>
                  <div className="bg-gray-50/50 p-5 rounded-[24px] border border-gray-100 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-700 shadow-sm border border-gray-100">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Responsable</p>
                        <p className="text-sm font-bold text-gray-800">{empleado ? `${empleado.nombre} ${empleado.apellidos || ""}` : "Sin asignar"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-700 shadow-sm border border-gray-100">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Entrega Prometida</p>
                        <p className="text-sm font-bold text-gray-800">{orden.fechaEntrega ? fmtFecha(orden.fechaEntrega) : "—"}</p>
                      </div>
                    </div>
                    {orden.numeroPedido && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-700 shadow-sm border border-gray-100">
                          <ClipboardList size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pedido Venta</p>
                          <p className="text-sm font-bold text-indigo-700">#{orden.numeroPedido}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Notas e Instrucciones</h4>
                  <div className="bg-gray-50/50 p-5 rounded-[24px] border border-gray-100 h-full">
                    {orden.notas ? (
                      <p className="text-xs text-gray-600 leading-relaxed italic">"{orden.notas}"</p>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-300 italic text-xs">Sin notas adicionales</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "productos" && (
            <div className="space-y-4">
               {orden.productos.map((p, i) => (
                 <div key={i} className="group bg-gray-50/50 hover:bg-white p-4 rounded-2xl border border-gray-100 hover:border-green-200 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-700 shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                        <Package size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-800">{p.nombre}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo unit: {fmt(p.precio)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Cantidad</p>
                        <p className="text-lg font-black text-green-700">×{p.cantidad}</p>
                      </div>
                      <button 
                        onClick={() => goToFicha(p.idProducto)}
                        className="p-2.5 bg-white hover:bg-green-600 text-green-600 hover:text-white rounded-xl shadow-sm border border-gray-100 hover:border-green-600 transition-all"
                        title="Ver Ficha Técnica"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === "insumos" && (
            <div className="space-y-6">
              {orden.missingFicha && orden.missingFicha.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-[11px] font-black text-orange-900 uppercase tracking-tight">Advertencia: Fichas Faltantes</p>
                    <p className="text-xs text-orange-700 mt-1">Los productos <span className="font-bold">[{orden.missingFicha.join(", ")}]</span> no tienen ficha técnica. Los cálculos pueden estar incompletos.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Insumo</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Requerido</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orden.insumos.map((ins, i) => (
                      <tr key={i} className="hover:bg-gray-50/30">
                        <td className="px-6 py-4 text-xs font-bold text-gray-800">{ins.nombre}</td>
                        <td className="px-6 py-4 text-center text-xs font-black text-gray-600">{ins.cantidad} {ins.unidad}</td>
                        <td className="px-6 py-4 text-center">
                          {ins.stockOk ? (
                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">OK</span>
                          ) : (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">Stock Insuficiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {orden.insumosDescontados && (
                <div className="bg-green-600 p-4 rounded-2xl flex items-center justify-center gap-3 text-white shadow-lg shadow-green-200/50">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Inventario actualizado con éxito</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer p-6 bg-gray-50/50 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="btn-secondary w-full py-4 text-xs font-black uppercase tracking-widest">Cerrar Detalle</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CAMBIAR ESTADO
   ═══════════════════════════════════════════════════════════ */
function ModalCambiarEstado({ orden, onClose, onConfirm }) {
  const [estadoSel, setEstadoSel] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);

  if (!orden) return null;

  const handleInitialClick = (est) => {
    if (est === orden.estado) return;
    setEstadoSel(est);
    setConfirmStep(true);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box relative bg-white shadow-2xl overflow-hidden flex flex-col border-none" style={{ borderRadius: '28px' }}>
        
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)', padding: '20px 24px' }}>
          <div>
            <h2 className="text-lg font-black text-white leading-none">Cambiar Estado</h2>
            <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mt-1">Orden #{orden.id}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
        </div>

        <div className="modal-body p-6">
          {!confirmStep ? (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Selecciona el nuevo estado</p>
              <div className="grid gap-2">
                {ESTADOS_ORDEN.map(est => {
                  const cfg = ESTADO_CONFIG[est] || {};
                  const isCurrent = est === orden.estado;
                  return (
                    <button
                      key={est}
                      onClick={() => handleInitialClick(est)}
                      disabled={isCurrent}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                        isCurrent 
                          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-default' 
                          : 'border-white bg-white hover:border-green-200 hover:bg-green-50 shadow-sm'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot || '#ccc' }} />
                      <div className="flex-1">
                        <p className={`text-xs font-black ${isCurrent ? 'text-gray-400' : 'text-gray-800'}`}>{est}</p>
                        {isCurrent && <span className="text-[9px] font-bold uppercase text-green-600">Estado Actual</span>}
                      </div>
                      {!isCurrent && <ChevronRight size={14} className="text-gray-300" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
               <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600">
                    <AlertCircle size={28} />
                  </div>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">¿Confirmar Cambio de Estado?</h3>
                  <p className="text-xs text-amber-700/80 mt-2 font-medium">Estás a punto de mover esta orden a un nuevo estado en el flujo de producción.</p>
               </div>

               <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden">
                  <div className="text-center flex-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Actual</p>
                    <EstadoBadge estado={orden.estado} />
                  </div>
                  <div className="px-4 text-gray-300 animate-pulse">
                    <ArrowRight size={20} strokeWidth={3} />
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Nuevo</p>
                    <EstadoBadge estado={estadoSel} />
                  </div>
               </div>

               <div className="space-y-2">
                 <button 
                  onClick={() => onConfirm(orden.id, estadoSel)}
                  className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-green-200"
                 >
                   Confirmar y Aplicar
                 </button>
                 <button 
                  onClick={() => setConfirmStep(false)}
                  className="w-full py-3 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
                 >
                   Regresar
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL CONFIRMAR ELIMINACIÓN
   ═══════════════════════════════════════════════════════════ */
function ModalEliminarOrden({ orden, onClose, onConfirm }) {
  if (!orden) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Confirmar eliminación</p>
            <h2 className="modal-header__title" style={{ color: "#c62828" }}>Eliminar orden</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{
            background: "#ffebee",
            border: "1px solid #ef9a9a",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}>
            <p style={{ fontWeight: 700, color: "#c62828", marginBottom: 6, fontSize: 14 }}>
              ¿Eliminar la orden <strong>{orden.id}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#e57373", margin: 0, lineHeight: 1.5 }}>
              Esta acción es irreversible. Se perderán todos los datos de esta orden de producción.
            </p>
          </div>

          <div style={{ fontSize: 13, color: "#616161", lineHeight: 2 }}>
            <div><strong>Productos:</strong> {(orden.productos || []).map(p => `${p.nombre} ×${p.cantidad}`).join(", ") || "—"}</div>
            <div><strong>Estado actual:</strong> <EstadoBadge estado={orden.estado} /></div>
            <div><strong>Costo estimado:</strong> {fmt(orden.costo)}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-save"
            style={{ background: "#c62828" }}
            onClick={() => onConfirm(orden.id)}
          >
            Sí, eliminar orden
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL FORMULARIO — CREAR / EDITAR ORDEN
   ═══════════════════════════════════════════════════════════ */
const STEPS_WIZ = ["Datos Generales", "Productos e Insumos"];

function StepsBarWiz({ current }) {
  return (
    <div className="wizard-steps-bar">
      {STEPS_WIZ.map((label, i) => {
        const idx    = i + 1;
        const done   = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="wizard-step-item">
            <div className={`wizard-step-circle${done ? " done" : active ? " active" : ""}`}>
              {done ? "✓" : idx}
            </div>
            <span className={`wizard-step-label${active ? " active" : done ? " done" : ""}`}>
              {label}
            </span>
            {i < STEPS_WIZ.length - 1 && (
              <div className={`wizard-step-line${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModalFormOrden({ orden, onClose, onSave }) {
  const {
    productos   = [],
    usuarios    = [],
    insumos: allInsumos = [],
    UNIDADES_MEDIDA = [],
    calcularCostoProduccion,
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [form, setForm] = useState(() => ({
    idEmpleado:   orden?.idEmpleado   ?? "",
    fechaEntrega: orden?.fechaEntrega ?? "",
    notas:        orden?.notas        ?? "",
    estado:       orden?.estado       ?? "Pendiente",
    productos:    orden?.productos    ?? [],
    insumos:      orden?.insumos      ?? [],
    costo:        orden?.costo        ?? 0,
  }));

  const [errors, setErrors] = useState({});
  const [step,   setStep]   = useState(1);

  useEffect(() => {
    if (!form.productos.length) {
      setForm(p => ({ ...p, insumos: [], costo: 0 }));
      return;
    }

    const insumosMap = {};
    let totalCosto   = 0;

    form.productos.forEach(item => {
      const prod = productos.find(p => p.id === item.idProducto);
      if (!prod) return;

      totalCosto += calcularCostoProduccion(prod, item.cantidad);

      (prod.ficha?.insumos || []).forEach(fi => {
        const ins = allInsumos.find(i => i.id === fi.idInsumo || i.nombre === fi.nombre);
        if (!ins) return;

        const cantNecesaria = (Number(fi.cantidad) || 0) * item.cantidad;

        if (insumosMap[ins.id]) {
          insumosMap[ins.id].cantidad += cantNecesaria;
        } else {
          const unidad = UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und";
          insumosMap[ins.id] = {
            idInsumo: ins.id,
            nombre:   ins.nombre,
            cantidad: cantNecesaria,
            unidad,
            stockOk:  false,
          };
        }
      });
    });

    const insumosArray = Object.values(insumosMap).map(ins => {
      const real = allInsumos.find(i => i.id === ins.idInsumo);
      return { ...ins, stockOk: (real?.stockActual || 0) >= ins.cantidad };
    });

    setForm(p => ({ ...p, insumos: insumosArray, costo: totalCosto }));
  }, [form.productos, productos, allInsumos, UNIDADES_MEDIDA, calcularCostoProduccion]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const addProducto = (idStr) => {
    const id = Number(idStr); if (!id) return;
    const prod = productos.find(x => x.id === id); if (!prod) return;
    if (form.productos.some(x => x.idProducto === id)) return;
    
    if (!prod.ficha) {
      alert(`⚠️ El producto "${prod.nombre}" no tiene una ficha técnica vinculada. No se podrán calcular los insumos necesarios para su fabricación.`);
    }

    setForm(f => ({
      ...f,
      productos: [...f.productos, { idProducto: prod.id, nombre: prod.nombre, cantidad: 1, precio: prod.precio || 0 }],
    }));
  };

  const updateCant = (idProducto, cant) => {
    const val = Math.max(1, Number(cant) || 1);
    setForm(f => ({ ...f, productos: f.productos.map(x => x.idProducto === idProducto ? { ...x, cantidad: val } : x) }));
  };

  const removeProd = (idProducto) => {
    setForm(f => ({ ...f, productos: f.productos.filter(x => x.idProducto !== idProducto) }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.fechaEntrega) e.fecha = "Requerido";
    }
    if (s === 2) {
      if (form.productos.length === 0) e.productos = "Agrega productos";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(s => s + 1);
  };

  const handleSave = () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: orden?.id });
  };

  return (
    /* ✅ CORREGIDO: modal-overlay + modal-box en lugar de overlay + modal-card */
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Producción</p>
            <h2 className="modal-header__title">{orden ? `Editar Orden ${orden.id}` : "Nueva Orden"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "16px 24px 0" }}>
          <StepsBarWiz current={step} />
        </div>

        <div className="modal-body" style={{ minHeight: 280 }}>
          {step === 1 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Datos Generales</p>
              <div className="form-group">
                <label className="form-label">Responsable</label>
                <select className="field-input" value={form.idEmpleado} onChange={e => setForm(f => ({ ...f, idEmpleado: Number(e.target.value) }))}>
                  <option value="">— Sin asignar —</option>
                  {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellidos}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Entrega <span className="required">*</span></label>
                  <input type="date" className={`field-input${errors.fecha ? " error" : ""}`} value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} />
                  {errors.fecha && <p className="field-error">{errors.fecha}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="field-input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    {ESTADOS_ORDEN.map(est => <option key={est} value={est}>{est}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="field-input" rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Instrucciones..." />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
              <select className="field-input" onChange={e => { addProducto(e.target.value); e.target.value = ""; }}>
                <option value="">+ Agregar producto...</option>
                {productos.filter(p => p.activo !== false).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {errors.productos && <p className="field-error">{errors.productos}</p>}
              <div className="prod-list-mini" style={{ maxHeight: 120, overflowY: "auto", marginTop: 10 }}>
                {form.productos.map(p => (
                  <div key={p.idProducto} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.nombre}</span>
                    <input type="number" className="qty-input" value={p.cantidad} onChange={e => updateCant(p.idProducto, e.target.value)} style={{ width: 50 }} />
                    <button onClick={() => removeProd(p.idProducto)} className="btn-ghost" style={{ padding: "2px 6px" }}>✕</button>
                  </div>
                ))}
              </div>
              <p className="section-label">Insumos necesarios</p>
              <div className="insumos-grid-mini" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 100, overflowY: "auto" }}>
                {form.insumos.map(ins => (
                  <div key={ins.idInsumo} style={{ fontSize: 11, padding: 4, background: ins.stockOk ? "#f1f8f1" : "#fff5f5", borderRadius: 6 }}>
                    {ins.nombre}: <strong>{ins.cantidad} {ins.unidad}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {step > 1
            ? <button className="btn-ghost" onClick={() => setStep(1)}>← Atrás</button>
            : <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          }
          <div style={{ display: "flex", gap: 10 }}>
            {step < 2
              ? <button className="btn-save" onClick={handleNext}>Siguiente →</button>
              : <button className="btn-save" onClick={handleSave}>{orden ? "Guardar cambios" : "Crear orden"}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionOrdenesProduccion() {
  const {
    ordenes            = [],
    cambiarEstadoOrden,
    crearOrdenProduccion,
    editarOrdenProduccion,
    eliminarOrdenProduccion,
    usuarios           = [],
    pedidos            = [],
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get("search") || "";

  const [search,       setSearch]       = useState(initialSearch);
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase();
    const matchQ = [
      String(o.id ?? ""),
      String(o.numeroPedido ?? ""),
      ...(o.productos || []).map(p => p.nombre || ""),
      empleados.find(e => e.id === o.idEmpleado)?.nombre || "",
    ].some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || o.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleSaveOrder = (data) => {
    if (data.id) {
      editarOrdenProduccion(data);
      showToast("Orden actualizada correctamente");
    } else {
      crearOrdenProduccion(data);
      showToast("Nueva orden creada");
    }
    setModal(null);
  };

  const handleCambiarEstado = (idOrden, nuevoEstado) => {
    cambiarEstadoOrden(idOrden, nuevoEstado);
    showToast(`Estado cambiado a "${nuevoEstado}"`);
    setModal(null);
  };

  const handleEliminar = (idOrden) => {
    if (eliminarOrdenProduccion) {
      eliminarOrdenProduccion(idOrden);
    }
    showToast("Orden eliminada", "warn");
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Órdenes de Producción</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* ── Toolbar ── */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar orden, producto, empleado..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`filter-icon-btn${filterEstado !== "todos" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}
            >▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 180 }}>
                <p className="filter-section-title">Estado</p>
                {["todos", ...ESTADOS_ORDEN].map(f => (
                  <button
                    key={f}
                    className={`filter-option${filterEstado === f ? " active" : ""}`}
                    onClick={() => { setFilterEstado(f); setPage(1); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: ESTADO_CONFIG[f]?.dot || "#bdbdbd" }} />
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "form" })}>
            Agregar Orden <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Orden</th>
                  <th>Productos</th>
                  <th>Responsable</th>
                  <th>Fecha entrega</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <p className="empty-state__text">No se encontraron órdenes.</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((orden, idx) => {
                  const empleado = empleados.find(e => String(e.id) === String(orden.idEmpleado));
                  return (
                    <tr key={orden.id} className="tbl-row">
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="orden-num">{orden.id}</div>
                        {orden.numeroPedido && (
                          <div style={{ fontSize: 10, color: "#1565c0", fontWeight: 700 }}>
                            {orden.numeroPedido}
                          </div>
                        )}
                        {orden.missingFicha && orden.missingFicha.length > 0 && (
                          <div style={{ 
                            fontSize: 9, 
                            color: "#e65100", 
                            fontWeight: 900, 
                            background: "#fff3e0", 
                            padding: "2px 4px", 
                            borderRadius: 4, 
                            display: "inline-block",
                            marginTop: 4,
                            border: "1px solid #ffcc02"
                          }}>
                            ⚠️ FICHA FALTANTE
                          </div>
                        )}
                      </td>
                      <td>
                        {(orden.productos || []).map((p, i) => (
                          <div key={i} className="prod-name">
                            {p.nombre} <span className="prod-qty">×{p.cantidad}</span>
                          </div>
                        ))}
                      </td>
                      <td>
                        {empleado
                          ? <span className="emp-cell">{empleado.nombre}</span>
                          : <span className="emp-cell--none">Sin asignar</span>
                        }
                      </td>
                      <td>
                        <span className={`date-badge ${urgenciaFecha(orden.fechaEntrega)}`}>
                          {fmtFecha(orden.fechaEntrega)}
                        </span>
                      </td>
                      <td>{fmt(orden.costo)}</td>
                      <td><EstadoBadge estado={orden.estado} /></td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="act-btn act-btn--view"
                            title="Ver detalles"
                            onClick={() => setModal({ type: "detalles", orden })}
                          >👁</button>
                          <button
                            className="act-btn act-btn--edit"
                            title="Editar orden"
                            onClick={() => setModal({ type: "form", orden })}
                          >✎</button>
                          <button
                            className="act-btn act-btn--status"
                            title="Cambiar estado"
                            onClick={() => setModal({ type: "estado", orden })}
                          >🔄</button>
                          <button
                            className="act-btn act-btn--delete"
                            title="Eliminar orden"
                            onClick={() => setModal({ type: "eliminar", orden })}
                          >🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-count">
                {filtered.length} órdenes · página {safePage} de {totalPages}
              </span>
              <div className="pagination-btns">
                <button
                  className="pg-btn-arrow"
                  disabled={safePage === 1}
                  onClick={() => setPage(p => p - 1)}
                >‹</button>
                <span className="pg-pill">{safePage}</span>
                <button
                  className="pg-btn-arrow"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      {modal?.type === "form" && (
        <ModalFormOrden
          orden={modal.orden}
          onClose={() => setModal(null)}
          onSave={handleSaveOrder}
        />
      )}
      {modal?.type === "detalles" && (
        <ModalDetallesOrden
          orden={modal.orden}
          empleados={empleados}
          onClose={() => setModal(null)}
          onEdit={(orden) => setModal({ type: "form", orden })}
        />
      )}
      {modal?.type === "estado" && (
        <ModalCambiarEstado
          orden={modal.orden}
          onClose={() => setModal(null)}
          onConfirm={handleCambiarEstado}
        />
      )}
      {modal?.type === "eliminar" && (
        <ModalEliminarOrden
          orden={modal.orden}
          onClose={() => setModal(null)}
          onConfirm={handleEliminar}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}