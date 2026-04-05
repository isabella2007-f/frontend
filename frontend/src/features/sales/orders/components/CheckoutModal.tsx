import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, User, MapPin, ShoppingBag } from 'lucide-react';
import { CartItem } from '../services/cartService';
import { getUser } from '../../../../services/authService';
import './CheckoutModal.css';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: {
    address: string;
    date: string;
    clientName: string;
    items: CartItem[];
    total: number;
  };
  onConfirm: (paymentMethod: string, onBehalfOf: string) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, orderDetails, onConfirm }) => {
  const [paymentMethod, setPaymentMethod] = useState('digital');
  const [onBehalfOf, setOnBehalfOf] = useState('');

  // ✅ Cargar datos del usuario logueado cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      const user = getUser();
      setOnBehalfOf(user?.nombre || orderDetails.clientName || '');
    }
  }, [isOpen, orderDetails.clientName]);

  if (!isOpen) return null;

  // ✅ Tomar dirección del usuario logueado si no viene en orderDetails
  const user = getUser();
  const displayAddress =
    orderDetails.address ||
    user?.direccion ||
    'No registrada';

  const displayName =
    user
      ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}`
      : orderDetails.clientName || 'Cliente';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-emerald-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Confirmar Pedido</h2>
              <p className="text-emerald-100 text-sm">Resumen de tu compra</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre del cliente (solo lectura) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cliente</label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <User size={18} className="text-emerald-500" />
                <span className="text-sm font-semibold text-gray-700">{displayName}</span>
              </div>
            </div>

            {/* A nombre de (editable) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">A nombre de</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  value={onBehalfOf}
                  onChange={(e) => setOnBehalfOf(e.target.value)}
                  placeholder="Nombre para el pedido"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Dirección de entrega</label>
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <MapPin size={18} className="text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">{displayAddress}</span>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Productos</label>
            <div className="border border-emerald-50 rounded-2xl overflow-hidden">
              <div className="bg-emerald-50/50 px-4 py-2 border-b border-emerald-50 flex justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                <span>Producto</span>
                <span>Subtotal</span>
              </div>
              <div className="divide-y divide-emerald-50 max-h-40 overflow-y-auto">
                {orderDetails.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-md">
                        {item.cantidad}
                      </span>
                      <span className="text-sm font-medium text-gray-700 line-clamp-1">{item.nombre}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Método de pago</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('digital')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'digital'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 bg-white text-gray-400 hover:border-emerald-100'
                }`}
              >
                <CreditCard size={24} />
                <span className="text-sm font-bold">Digital</span>
              </button>
              <button
                onClick={() => setPaymentMethod('efectivo')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 bg-white text-gray-400 hover:border-emerald-100'
                }`}
              >
                <Banknote size={24} />
                <span className="text-sm font-bold">Efectivo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Total & Acción */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-bold text-gray-800">Total a pagar</span>
            <span className="text-3xl font-extrabold text-emerald-700">
              ${orderDetails.total.toLocaleString('es-CO')}
            </span>
          </div>
          <button
            onClick={() => onConfirm(paymentMethod, onBehalfOf)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Confirmar y Pagar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;