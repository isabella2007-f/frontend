import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Calendar, Trash2, Plus, Minus, ShoppingBag, LogIn, Sparkles, ChevronRight, ShoppingCart } from 'lucide-react';
import { CartItem, removeFromCart, updateQuantity, clearCart, getCart } from '../services/cartService';
import { isAuthenticated } from '../../../../services/authService';
import { DEPARTAMENTOS, getCiudades } from '../../../../utils/departamentosYCiudades';

interface CartAsideProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (details: { address: string; date: string; departamento: string; municipio: string }) => void;
  onLoginRequired: () => void;
  cartUpdateToggle?: boolean;
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const CartAside: React.FC<CartAsideProps> = ({ isOpen, onClose, onCheckout, onLoginRequired }) => {
  // ✅ Inicialización inmediata desde localStorage para evitar el bug de "vacío al abrir"
  const [cart, setCart] = useState<CartItem[]>(() => getCart());
  const [address, setAddress] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [date, setDate] = useState('');
  const [total, setTotal] = useState(() => 
    getCart().reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  );

  // Sincroniza con el evento cart-updated del cartService
  const syncCart = useCallback(() => {
    const c = getCart();
    setCart(c);
    setTotal(c.reduce((acc, i) => acc + i.precio * i.cantidad, 0));
  }, []);

  useEffect(() => { syncCart(); }, [isOpen, syncCart]);
  useEffect(() => {
    window.addEventListener('cart-updated', syncCart);
    return () => window.removeEventListener('cart-updated', syncCart);
  }, [syncCart]);

  const handleQty = (id: number, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const newQty = item.cantidad + delta;
    if (newQty > 0) updateQuantity(id, newQty);
    else removeFromCart(id);
  };

  const handleCheckout = () => {
    if (cart.length === 0)   return alert('El carrito está vacío');
    if (!address)            return alert('Ingresa una dirección de entrega');
    if (!departamento)       return alert('Selecciona un departamento');
    if (!municipio)          return alert('Selecciona un municipio');
    if (!date)               return alert('Selecciona una fecha de entrega');
    
    // Validar fecha mínima (hoy o futuro)
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const seleccionada = new Date(date);
    if (seleccionada < hoy) {
      return alert('La fecha de entrega no puede ser en el pasado');
    }

    if (!isAuthenticated()) { onClose(); onLoginRequired(); return; }
    onCheckout({ address, departamento, municipio, date });
  };

  if (!isOpen) return null;
  const loggedIn = isAuthenticated();
  const ciudadesDisponibles = departamento ? getCiudades(departamento) : [];

  return (
    <div className="fixed inset-0 z-[9000] overflow-hidden">
      {/* Backdrop con blur progresivo */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-500 animate-in fade-in"
        onClick={onClose} 
      />

      {/* ✅ Ajuste de tamaño: max-w-sm para hacerlo más compacto y elegante */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-emerald-100">
        
        {/* Header Premium - Usando variables de marca */}
        <div className="text-white p-5 shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 50%, var(--green-700) 100%)' }}>
          <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-xl p-2.5 rounded-2xl border border-white/20 shadow-inner">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight leading-none mb-1">Tu Carrito</h2>
                <p className="text-[9px] text-emerald-100 font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all text-white/70 hover:text-white border border-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Formulario de Entrega Refinado - Compacto */}
          <div className="space-y-2.5 relative z-10 bg-black/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Información de entrega</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 relative group">
                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-white transition-colors" />
                <input
                  type="text"
                  placeholder="Dirección (Ej: Calle 10 #20-30)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs placeholder:text-white/40 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              
              <div className="relative group">
                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-2 text-xs appearance-none focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium text-white"
                  value={departamento}
                  onChange={(e) => {
                    setDepartamento(e.target.value);
                    setMunicipio('');
                  }}
                >
                  <option value="" className="text-gray-900">Departamento</option>
                  {DEPARTAMENTOS.map(d => (
                    <option key={d} value={d} className="text-gray-900">{d}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-2 text-xs appearance-none focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium text-white disabled:opacity-50"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  disabled={!departamento}
                >
                  <option value="" className="text-gray-900">Municipio</option>
                  {ciudadesDisponibles.map(c => (
                    <option key={c} value={c} className="text-gray-900">{c}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 relative group">
                <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium [color-scheme:dark]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            {!loggedIn && (
              <div className="flex items-center gap-2 mt-1 py-1.5 px-3 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                <LogIn size={10} className="text-amber-400" />
                <p className="text-[9px] font-bold text-amber-100">Inicia sesión para comprar</p>
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo del Carrito - Padding reducido */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 custom-scrollbar relative">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center relative border border-emerald-50">
                  <ShoppingCart size={32} className="text-emerald-200" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-800 mb-1">Carrito vacío</h3>
                <p className="text-gray-400 text-xs max-w-[200px] leading-relaxed font-medium">
                  Explora nuestro menú y elige algo delicioso.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '12px' }}
              >
                Ver Productos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Resumen</span>
                <button 
                  onClick={() => { if(confirm('¿Vaciar todo el carrito?')) clearCart() }}
                  className="group flex items-center gap-1 text-[9px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                >
                  <Trash2 size={10} />
                  Vaciar
                </button>
              </div>
              
              <div className="grid gap-3">
                {cart.map((item) => (
                  <div 
                    key={item.id} 
                    className="group bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all duration-300 relative overflow-hidden animate-in fade-in slide-in-from-bottom-1"
                  >
                    <div className="flex gap-3 relative z-10">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-100">
                        {item.imagenPreview || item.imagen ? (
                          <img 
                            src={item.imagenPreview || item.imagen} 
                            alt={item.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-xl">
                            📦
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                          <h4 className="font-black text-gray-800 text-xs mb-0.5 truncate">{item.nombre}</h4>
                          <p className="font-black text-[10px]" style={{ color: 'var(--green-700)' }}>{COP(item.precio)}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <button 
                              onClick={() => handleQty(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:text-red-500 transition-all text-gray-400"
                            >
                              <Minus size={10} strokeWidth={3} />
                            </button>
                            <span className="w-7 text-center text-[11px] font-black text-gray-800">{item.cantidad}</span>
                            <button 
                              onClick={() => handleQty(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white hover:text-emerald-600 transition-all text-gray-400"
                            >
                              <Plus size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <p className="text-xs font-black text-gray-900">{COP(item.precio * item.cantidad)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2 right-2 p-1 text-gray-200 hover:text-red-500 rounded-full transition-all"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Persistente - Padding reducido de p-8 a p-5 */}
        <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] relative z-20">
          <div className="space-y-2.5 mb-5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold">Productos</span>
              <span className="text-gray-800 font-black">{COP(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold">Envío</span>
              <span className="font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100" style={{ color: 'var(--green-700)' }}>
                ¡Gratis!
              </span>
            </div>
            
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-gray-100"></div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total a pagar</span>
                <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{COP(total)}</span>
              </div>
              <div className="text-amber-500">
                <Sparkles size={20} className="animate-spin-slow" />
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-base transition-all duration-500 shadow-xl ${
              cart.length === 0 
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200 shadow-none' 
                : 'btn-primary shadow-emerald-200/50'
            }`}
            style={cart.length > 0 ? { background: 'linear-gradient(135deg, var(--green-700) 0%, var(--green-600) 100%)' } : {}}
          >
            {/* Efecto Brillo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            
            {loggedIn ? (
              <>
                Confirmar Pedido 
                <ChevronRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                <LogIn size={18} />
                Iniciar Sesión
              </>
            )}
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
        .animate-spin-slow {
          animation: spin 6s linear infinite;
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

export default CartAside;