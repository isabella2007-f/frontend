import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, User, MapPin, ShoppingBag, CheckCircle2, Sparkles, ShieldCheck, UploadCloud, ChevronRight } from 'lucide-react';
import { CartItem } from '../services/cartService';
import { getUser } from '../../../../services/authService';
import './CheckoutModal.css';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: {
    address: string;
    municipio?: string;
    departamento?: string;
    date: string;
    clientName: string;
    items: CartItem[];
    total: number;
  } | null; // ✅ Se acepta null explícitamente
  onConfirm: (paymentMethod: string, onBehalfOf: string, comprobante?: File | null) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, orderDetails, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('digital');
  const [onBehalfOf, setOnBehalfOf] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && orderDetails) {
      const user = getUser();
      setOnBehalfOf(user?.nombre || orderDetails.clientName || '');
    }
  }, [isOpen, orderDetails]);

  if (!isOpen || !orderDetails) return null;

  const user = getUser();
  
  const displayAddress = orderDetails.address
    ? `${orderDetails.address}${orderDetails.municipio ? ', ' + orderDetails.municipio : ''}${orderDetails.departamento ? ', ' + orderDetails.departamento : ''}`
    : user?.direccion || 'No registrada';

  const displayName =
    user
      ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}`
      : orderDetails.clientName || 'Cliente';

  const handleFinalConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      onConfirm(paymentMethod, onBehalfOf, comprobante);
      setIsConfirming(false);
    }, 800);
  };

  return (
    <div className="modal-overlay">
      {/* Modal - Usando clases compartidas */}
      <div className="modal-box relative shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-none" style={{ maxWidth: '480px', borderRadius: '28px' }}>

        {/* Header Compacto con Variables de Marca */}
        <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)', padding: '20px' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-all text-white/80 hover:text-white z-10"
          >
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

          {/* Grid de Información - Más compacto */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">Quién recibe</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <User size={12} strokeWidth={2.5} />
                </div>
                <p className="text-[11px] font-black text-gray-800 truncate">{displayName}</p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">A nombre de</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <Sparkles size={12} strokeWidth={2.5} />
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

            {/* Lugar de entrega - Ocupa todo el ancho */}
            <div className="col-span-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block px-1">Lugar de entrega</label>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 flex-shrink-0" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                  <MapPin size={12} strokeWidth={2.5} />
                </div>
                <p className="text-[10px] font-bold text-gray-700 leading-snug">{displayAddress}</p>
              </div>
            </div>
          </div>

          {/* Detalle del Pedido - Simplificado */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Resumen del pedido</span>
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>
                {orderDetails.items.length} Items
              </span>
            </div>
            <div className="max-h-36 overflow-y-auto custom-scrollbar px-3 py-1.5">
              <table className="w-full">
                <tbody className="divide-y divide-gray-50">
                  {orderDetails.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 text-[11px] font-bold text-gray-700">{item.nombre}</td>
                      <td className="py-1.5 text-[10px] font-black text-gray-400 text-center">x{item.cantidad}</td>
                      <td className="py-1.5 text-[11px] font-black text-gray-900 text-right">${(item.precio * item.cantidad).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Métodos de Pago - Botones más pequeños y modernos */}
          <div className="space-y-2.5">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Método de pago</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setPaymentMethod('digital')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'digital'
                    ? 'border-green-600 bg-green-50 text-green-800 shadow-md'
                    : 'border-white bg-white text-gray-400 hover:border-green-100 shadow-sm'
                }`}
                style={paymentMethod === 'digital' ? { borderColor: 'var(--green-600)', background: 'var(--green-50)', color: 'var(--green-800)' } : {}}
              >
                <div className={`p-1.5 rounded-lg ${paymentMethod === 'digital' ? 'text-white' : 'bg-gray-50'}`} style={paymentMethod === 'digital' ? { background: 'var(--green-600)' } : {}}>
                  <CreditCard size={14} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black tracking-tight">Transferencia</span>
              </button>

              <button
                onClick={() => setPaymentMethod('efectivo')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all duration-300 ${
                  paymentMethod === 'efectivo'
                    ? 'border-green-600 bg-green-50 text-green-800 shadow-md'
                    : 'border-white bg-white text-gray-400 hover:border-green-100 shadow-sm'
                }`}
                style={paymentMethod === 'efectivo' ? { borderColor: 'var(--green-600)', background: 'var(--green-50)', color: 'var(--green-800)' } : {}}
              >
                <div className={`p-1.5 rounded-lg ${paymentMethod === 'efectivo' ? 'text-white' : 'bg-gray-50'}`} style={paymentMethod === 'efectivo' ? { background: 'var(--green-600)' } : {}}>
                  <Banknote size={14} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black tracking-tight">Efectivo</span>
              </button>
            </div>

            {/* Zona de Comprobante - Compacta */}
            {paymentMethod === 'digital' && (
              <div className="relative group animate-in slide-in-from-top-2 duration-300">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
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
            )}
          </div>
        </div>

        {/* Footer Compacto */}
        <div className="modal-footer p-5 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end justify-between mb-4 w-full">
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total a pagar</p>
              <div className="flex items-baseline gap-0.5">
                <span className="font-black text-xs" style={{ color: 'var(--green-700)' }}>$</span>
                <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">
                  {orderDetails.total.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-amber-500 pb-1">
              <Sparkles size={16} />
            </div>
          </div>

          <button
            onClick={handleFinalConfirm}
            disabled={isConfirming}
            className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-xl font-black text-sm transition-all duration-300 shadow-lg active:scale-[0.98] ${
              isConfirming 
                ? 'bg-emerald-800 text-white' 
                : 'btn-primary shadow-emerald-200/50 hover:shadow-xl hover:-translate-y-0.5'
            }`}
            style={!isConfirming ? { background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)' } : {}}
          >
            {isConfirming ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>
                Confirmar Compra
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CheckoutModal;