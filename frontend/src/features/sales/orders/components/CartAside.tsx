
import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { CartItem, removeFromCart, updateQuantity, clearCart, getTotal } from '../services/cartService';

interface CartAsideProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (details: { address: string; date: string }) => void;
  cartUpdateToggle: boolean;
}

const CartAside: React.FC<CartAsideProps> = ({ isOpen, onClose, onCheckout, cartUpdateToggle }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('toston_app_cart') || '[]'));
    setTotal(getTotal());
  }, [isOpen, cartUpdateToggle]);

  const handleUpdateQuantity = (id: number, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (item) {
      const newQty = item.cantidad + delta;
      if (newQty > 0) {
        updateQuantity(id, newQty);
        const newCart = cart.map(i => i.id === id ? { ...i, cantidad: newQty } : i);
        setCart(newCart);
        setTotal(newCart.reduce((acc, i) => acc + i.precio * i.cantidad, 0));
      }
    }
  };

  const handleRemove = (id: number) => {
    removeFromCart(id);
    const newCart = cart.filter(i => i.id !== id);
    setCart(newCart);
    setTotal(newCart.reduce((acc, i) => acc + i.precio * i.cantidad, 0));
  };

  const handleClear = () => {
    clearCart();
    setCart([]);
    setTotal(0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return alert('El carrito está vacío');
    if (!address) return alert('Por favor ingresa una dirección');
    if (!date) return alert('Por favor selecciona una fecha');
    onCheckout({ address, date });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background Blur Overlay */}
      <div 
        className="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="relative w-screen max-w-md pointer-events-auto">
          <div className="h-full flex flex-col bg-white shadow-2xl border-l border-emerald-100 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-emerald-50/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-xl text-white">
                    <ShoppingBag size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Tu Carrito</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-emerald-600 border border-transparent hover:border-emerald-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Delivery Info */}
              <div className="mt-6 space-y-3">
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="text"
                    placeholder="Dirección de entrega..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-emerald-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <div className="bg-gray-50 p-6 rounded-full mb-4">
                    <ShoppingBag size={48} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">El carrito está vacío</p>
                  <button 
                    onClick={onClose}
                    className="mt-4 text-emerald-600 text-sm font-bold hover:underline"
                  >
                    Volver a la tienda
                  </button>
                </div>
              ) : (
                <ul className="space-y-6">
                  {cart.map((item) => (
                    <li key={item.id} className="flex gap-4 group">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
                        {item.imagenPreview ? (
                          <img src={item.imagenPreview} alt={item.nombre} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl">🍌</div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between text-base font-bold text-gray-800">
                          <h3 className="line-clamp-1">{item.nombre}</h3>
                          <p className="ml-4 text-emerald-700">${(item.precio * item.cantidad).toLocaleString('es-CO')}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 font-medium">${item.precio.toLocaleString('es-CO')} c/u</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-emerald-100 rounded-lg overflow-hidden bg-white shadow-sm">
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-3 py-1 text-sm font-bold text-gray-700">{item.cantidad}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button 
                            onClick={() => handleRemove(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Eliminar item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Subtotal</span>
                  <span>${total.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between items-end mb-6">
                  <span className="text-base font-bold text-gray-800">Total a pagar</span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    ${total.toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleClear}
                    className="flex items-center justify-center gap-2 py-3 border border-red-100 rounded-xl text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Vaciar
                  </button>
                  <button
                    onClick={handleCheckout}
                    className="flex items-center justify-center gap-2 py-3 bg-emerald-600 rounded-xl text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    Ir a pagar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartAside;
