import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, User, MapPin, ShoppingBag, CheckCircle2, Sparkles, ShieldCheck, UploadCloud, ChevronRight, Gift } from 'lucide-react';
import { CartItem } from '../services/cartService';
import { getUser } from '../../../../services/authService';
import { getMiCredito } from '../../../../services/pedidosService';
import './CheckoutModal.css';

// Datos de la cuenta bancaria — actualiza en GestionPedidos.jsx también
const CUENTA = {
  banco:   'Nequi / Bancolombia',
  numero:  '316 453 7890',
  tipo:    'Cuenta de ahorros',
  titular: 'TostonApp S.A.S',
};

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: {
    address: string;
    municipio?: string;
    departamento?: string;
    date?: string;
    clientName: string;
    items: CartItem[];
    total: number;
    observaciones?: string;
    tieneDomicilio?: boolean;
  } | null;
  onConfirm: (paymentMethod: string, onBehalfOf: string, comprobante?: File | null, usarCredito?: boolean) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, orderDetails, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('digital');
  const [onBehalfOf,    setOnBehalfOf]    = useState('');
  const [comprobante,   setComprobante]   = useState<File | null>(null);
  const [isConfirming,  setIsConfirming]  = useState(false);
  const [credito,       setCredito]       = useState(0);
  const [usarCredito,   setUsarCredito]   = useState(false);

  useEffect(() => {
    if (!isOpen || !orderDetails) return;
    const user = getUser();
    setOnBehalfOf(user?.nombre || orderDetails.clientName || '');
    getMiCredito()
      .then((data: any) => setCredito(data?.saldo || 0))
      .catch(() => setCredito(0));
  }, [isOpen]);

  if (!isOpen || !orderDetails) return null;

  const user = getUser();
  const displayAddress = orderDetails.address
    ? `${orderDetails.address}${orderDetails.municipio ? ', ' + orderDetails.municipio : ''}${orderDetails.departamento ? ', ' + orderDetails.departamento : ''}`
    : user?.direccion || 'Recogida en tienda';

  const creditoAplicar  = usarCredito ? Math.min(credito, orderDetails.total) : 0;
  const totalFinal      = Math.max(0, orderDetails.total - creditoAplicar);

  const handleFinalConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      onConfirm(paymentMethod, onBehalfOf, comprobante, usarCredito);
      setIsConfirming(false);
    }, 800);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box relative shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-none" style={{ maxWidth: '480px', borderRadius: '28px' }}>

        {/* Header */}
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)', padding: '20px' }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white z-10">
            <X size={16} />
          </button>
          <div className="relative flex items-center gap-3.5">
            <div className="bg-white/10 backdrop-blur-xl p-2.5 rounded-xl border border-white/20">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none mb-0.5 text-white">Confirmar Pedido</h2>
              <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={10} /> Pago 100% Seguro
              </p>
            </div>
          </div>
        </div>

        <div className="modal-body p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/20">

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">Quién recibe</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <User size={12} />
                </div>
                <p className="text-[11px] font-black text-gray-800 truncate">{user?.nombre} {user?.apellidos}</p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">A nombre de</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <Sparkles size={12} />
                </div>
                <input
                  type="text"
                  value={onBehalfOf}
                  onChange={(e) => setOnBehalfOf(e.target.value)}
                  placeholder="Nombre"
                  className="w-full bg-transparent text-[11px] font-bold text-gray-800 outline-none placeholder:text-gray-300 border-none p-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="col-span-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">
                {orderDetails.tieneDomicilio ? 'Dirección de entrega' : 'Modalidad'}
              </label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <MapPin size={12} />
                </div>
                <p className="text-[10px] font-bold text-gray-700 leading-snug">
                  {orderDetails.tieneDomicilio ? displayAddress : '🏪 Recogida en tienda'}
                </p>
              </div>
            </div>

            {orderDetails.observaciones && (
              <div className="col-span-2 bg-amber-50 p-2.5 rounded-xl border border-amber-100 shadow-sm">
                <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 block px-1">Observaciones</label>
                <p className="text-[10px] font-medium text-amber-800 italic">"{orderDetails.observaciones}"</p>
              </div>
            )}
          </div>

          {/* Crédito — siempre visible */}
          {credito > 0 ? (
            <div
              onClick={() => setUsarCredito(!usarCredito)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${usarCredito ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white hover:border-green-200'}`}
            >
              <div className="p-2 rounded-lg" style={{ background: usarCredito ? 'var(--green-600)' : 'var(--green-50)', color: usarCredito ? 'white' : 'var(--green-700)' }}>
                <Gift size={14} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-700">Usar crédito disponible</p>
                <p className="text-[9px] font-bold" style={{ color: 'var(--green-700)' }}>Tienes <strong>{COP(credito)}</strong> en créditos</p>
              </div>
              {usarCredito && (
                <span className="text-[10px] font-black" style={{ color: 'var(--green-700)' }}>−{COP(creditoAplicar)}</span>
              )}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${usarCredito ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                {usarCredito && <CheckCircle2 size={10} className="text-white" />}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="p-2 rounded-lg bg-gray-100">
                <Gift size={14} className="text-gray-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400">Sin crédito disponible</p>
                <p className="text-[9px] font-bold text-gray-300">Los créditos se generan con devoluciones aprobadas</p>
              </div>
            </div>
          )}

          {/* Resumen productos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Resumen del pedido</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                {orderDetails.items.length} items
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto custom-scrollbar px-3 py-1.5">
              <table className="w-full">
                <tbody className="divide-y divide-gray-50">
                  {orderDetails.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-[11px] font-bold text-gray-700">{item.nombre}</td>
                      <td className="py-1.5 text-[10px] font-black text-gray-400 text-center">x{item.cantidad}</td>
                      <td className="py-1.5 text-[11px] font-black text-gray-900 text-right">{COP(item.precio * item.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-2.5">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Método de pago</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'digital',   icon: <CreditCard size={14} />, label: 'Transferencia' },
                { id: 'efectivo',  icon: <Banknote size={14} />,   label: 'Efectivo' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all duration-300 ${paymentMethod === m.id ? 'shadow-md' : 'border-white bg-white text-gray-400 hover:border-green-100 shadow-sm'}`}
                  style={paymentMethod === m.id ? { borderColor: 'var(--green-600)', background: 'var(--green-50)', color: 'var(--green-800)' } : {}}
                >
                  <div className="p-1.5 rounded-lg" style={paymentMethod === m.id ? { background: 'var(--green-600)', color: 'white' } : { background: '#f9fafb' }}>
                    {m.icon}
                  </div>
                  <span className="text-[10px] font-black tracking-tight">{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'digital' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                {/* Datos bancarios */}
                <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-blue-50 flex items-center gap-1.5" style={{ background: '#eff6ff' }}>
                    <CreditCard size={10} className="text-blue-500" />
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Datos para transferencia</span>
                  </div>
                  <div className="flex gap-3 p-3">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-blue-200 flex flex-col items-center justify-center bg-blue-50 text-blue-400">
                      <span style={{ fontSize: 28, lineHeight: 1 }}>📱</span>
                      <span className="text-[7px] font-black uppercase tracking-wide mt-0.5">QR Nequi</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[
                        { label: 'Banco',   value: CUENTA.banco },
                        { label: 'Número',  value: CUENTA.numero },
                        { label: 'Tipo',    value: CUENTA.tipo },
                        { label: 'Titular', value: CUENTA.titular },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-baseline gap-1.5">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider w-12 shrink-0">{label}</span>
                          <span className="text-[10px] font-black text-gray-800 leading-tight">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Comprobante */}
                <div className="relative group">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setComprobante(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="border-2 border-dashed border-emerald-200 bg-white group-hover:bg-emerald-50 transition-all rounded-xl p-3 text-center">
                    {comprobante ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <p className="text-[9px] font-black text-emerald-700 truncate max-w-[150px]">{comprobante.name}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <UploadCloud size={16} className="text-emerald-300" />
                        <p className="text-[9px] font-black text-gray-500">Sube tu comprobante de pago</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer p-5 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="w-full mb-4 space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500 font-bold">
              <span>Subtotal</span><span>{COP(orderDetails.total)}</span>
            </div>
            {usarCredito && creditoAplicar > 0 && (
              <div className="flex justify-between text-[10px] font-bold" style={{ color: 'var(--green-700)' }}>
                <span>Crédito aplicado</span><span>−{COP(creditoAplicar)}</span>
              </div>
            )}
            <div className="flex items-end justify-between pt-1 border-t border-gray-100">
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total a pagar</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-black text-xs" style={{ color: 'var(--green-700)' }}>$</span>
                  <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">{totalFinal.toLocaleString('es-CO')}</span>
                </div>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-amber-500"><Sparkles size={16} /></div>
            </div>
          </div>

          <button
            onClick={handleFinalConfirm}
            disabled={isConfirming}
            className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-xl font-black text-sm transition-all duration-300 shadow-lg active:scale-[0.98] ${isConfirming ? 'bg-emerald-800 text-white' : 'btn-primary shadow-emerald-200/50 hover:shadow-xl hover:-translate-y-0.5'}`}
            style={!isConfirming ? { background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)' } : {}}
          >
            {isConfirming ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Procesando...</>
            ) : (
              <>Confirmar Compra <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CheckoutModal;
