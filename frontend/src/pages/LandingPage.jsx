import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, ArrowRight, Leaf, Utensils, Sparkles, Zap,
  Plus, Minus, Trash2, X, ShoppingCart, CheckCircle2,
  MapPin, User, CreditCard, Smartphone, Banknote,
  Upload, ChevronRight, Package, Receipt,
  AlertCircle, Loader2
} from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { getUser } from '../services/authService.js';
import Navbar from '../shared/components/Navbar.jsx';

/* ═══════════════════════════════════════════
   MODAL SHELL
═══════════════════════════════════════════ */
const ModalShell = ({ children, onClose, title }) => (
  <>
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-lg bg-white rounded-t-[40px] sm:rounded-[32px] shadow-2xl animate-slide-up">
      <div className="flex justify-center pt-3 sm:hidden">
        <div className="w-10 h-1.5 bg-[#e8f5e9] rounded-full" />
      </div>
      <div className="px-6 pb-8 pt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#1b5e20]" />
            </div>
            {title && <h2 className="text-xl font-black text-[#1b5e20]">{title}</h2>}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-[#f7faf8] rounded-xl flex items-center justify-center hover:bg-[#e8f5e9] transition-colors"
          >
            <X className="w-5 h-5 text-[#1b5e20]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  </>
);

/* ═══════════════════════════════════════════
   CHECKOUT MODAL
═══════════════════════════════════════════ */
const CheckoutModal = ({ cart, onClose, onSuccess, user }) => {
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success' | 'receipt'
  const [payMethod, setPayMethod] = useState('digital');
  const [aliasName, setAliasName] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const total = cart.reduce((s, i) => s + i.product.precio * i.quantity, 0);
  const canPay = aliasName.trim().length > 0;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setReceiptFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handlePay = async () => {
    setLoading(true);
    setStep('processing');
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    if (payMethod === 'efectivo') {
      setStep('success_cash');
    } else {
      setStep('receipt');
    }
  };

  /* ── Efectivo: éxito directo ── */
  if (step === 'success_cash') {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-12 gap-6">
          <div className="relative">
            <div className="w-28 h-28 bg-[#e8f5e9] rounded-full flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-14 h-14 text-[#1b5e20]" strokeWidth={1.5} />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-[#4caf50] animate-ping opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-[#1b5e20]">¡Pedido Confirmado!</h3>
            <p className="text-[#81c784] font-semibold">Tu pedido está siendo preparado 🍌</p>
            <p className="text-sm text-[#388e3c] mt-2">Pagarás <span className="font-black">${total.toLocaleString('es-CO')} COP</span> al recibir</p>
          </div>
          <button
            onClick={() => { onSuccess(); onClose(); }}
            className="mt-2 px-10 py-4 bg-[#1b5e20] text-white font-black rounded-2xl hover:bg-[#0d3300] transition-all shadow-lg shadow-[#1b5e20]/20"
          >
            ¡Perfecto!
          </button>
        </div>
      </ModalShell>
    );
  }

  /* ── Processing spinner ── */
  if (step === 'processing') {
    return (
      <ModalShell onClose={() => {}}>
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div className="w-24 h-24 bg-[#e8f5e9] rounded-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-[#1b5e20] animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-black text-[#1b5e20] text-lg">Procesando pedido…</p>
            <p className="text-sm text-[#81c784] mt-1">Un momento por favor</p>
          </div>
        </div>
      </ModalShell>
    );
  }

  /* ── Digital: subir comprobante ── */
  if (step === 'receipt') {
    return (
      <ModalShell onClose={onClose} title="Comprobante">
        <div className="space-y-5">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-[#e8f5e9] rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-[#1b5e20] flex-shrink-0" />
            <div>
              <p className="font-black text-[#1b5e20] text-sm">¡Pedido registrado!</p>
              <p className="text-xs text-[#388e3c]">Adjunta tu comprobante de pago digital</p>
            </div>
          </div>

          <p className="text-xs text-[#81c784] text-center font-semibold leading-relaxed">
            En caso de que el método de pago sea digital, adjunta el comprobante para confirmar tu pedido.
          </p>

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 py-8
              ${receiptPreview
                ? 'border-[#4caf50] bg-[#f1f8f1]'
                : 'border-[#c8e6c9] bg-[#f7faf8] hover:border-[#4caf50] hover:bg-[#f1f8f1]'
              }`}
          >
            {receiptPreview ? (
              <>
                <img src={receiptPreview} alt="comprobante" className="w-full max-h-44 object-contain rounded-2xl" />
                <p className="text-xs text-[#81c784] font-bold truncate max-w-[80%]">{receiptFile?.name}</p>
                <p className="text-[10px] text-[#4caf50] font-black uppercase tracking-wide">✓ Archivo listo</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-[#e8f5e9] rounded-2xl flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[#1b5e20]" />
                </div>
                <p className="font-black text-[#1b5e20] text-sm">Subir comprobante</p>
                <p className="text-xs text-[#81c784]">PNG, JPG o PDF · máx 5MB</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="flex-1 py-4 text-[#388e3c] font-bold rounded-2xl border-2 border-[#e8f5e9] hover:border-[#1b5e20] transition-all text-sm"
            >
              Enviar después
            </button>
            <button
              onClick={() => { onSuccess(); onClose(); }}
              disabled={!receiptFile}
              className={`flex-1 py-4 font-black rounded-2xl transition-all text-sm flex items-center justify-center gap-2
                ${receiptFile
                  ? 'bg-[#1b5e20] text-white hover:bg-[#0d3300] shadow-lg shadow-[#1b5e20]/20'
                  : 'bg-[#e8f5e9] text-[#81c784] cursor-not-allowed'
                }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  /* ── Formulario principal ── */
  return (
    <ModalShell onClose={onClose} title="Confirmar Pedido">
      <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">

        {/* Datos del cliente */}
        <div className="bg-[#f7faf8] rounded-3xl p-5 space-y-3 border border-[#e8f5e9]">
          <p className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-1">Datos del Cliente</p>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e8f5e9] rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#1b5e20]" />
            </div>
            <div>
              <p className="text-[10px] text-[#81c784] font-bold uppercase">Nombre</p>
              <p className="font-black text-[#1b5e20] text-sm">{user?.nombre || user?.name || 'Cliente'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e8f5e9] rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#1b5e20]" />
            </div>
            <div>
              <p className="text-[10px] text-[#81c784] font-bold uppercase">Dirección</p>
              <p className="font-black text-[#1b5e20] text-sm">{user?.direccion || user?.address || 'No registrada'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e8f5e9] rounded-xl flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-[#1b5e20]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[#81c784] font-bold uppercase mb-1">A nombre de</p>
              <input
                type="text"
                value={aliasName}
                onChange={e => setAliasName(e.target.value)}
                placeholder="Nombre para el pedido"
                className="w-full bg-white border border-[#e8f5e9] rounded-xl px-3 py-2 text-sm font-bold text-[#1b5e20] placeholder-[#c8e6c9] focus:outline-none focus:border-[#4caf50] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-[#f7faf8] rounded-3xl p-5 border border-[#e8f5e9]">
          <p className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-4">Productos</p>
          <div className="space-y-2.5">
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4caf50] flex-shrink-0" />
                <span className="flex-1 text-sm font-bold text-[#1b5e20] truncate">{product.nombre}</span>
                <span className="text-xs text-[#81c784] font-bold whitespace-nowrap">${product.precio?.toLocaleString('es-CO')} ud.</span>
                <span className="text-xs font-black text-[#1b5e20] bg-[#e8f5e9] px-2 py-1 rounded-lg">×{quantity}</span>
                <span className="text-sm font-black text-[#1b5e20] w-24 text-right whitespace-nowrap">${(product.precio * quantity).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#e8f5e9] flex justify-between items-center">
            <span className="text-sm text-[#388e3c] font-bold">Total a Pagar</span>
            <span className="text-xl font-black text-[#1b5e20]">${total.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="bg-[#f7faf8] rounded-3xl p-5 border border-[#e8f5e9]">
          <p className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-4">Método de Pago</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'digital', label: 'Digital', sub: 'Nequi / Bancolombia', icon: Smartphone },
              { id: 'efectivo', label: 'Efectivo', sub: 'Pago al recibir', icon: Banknote },
            ].map(({ id, label, sub, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPayMethod(id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200
                  ${payMethod === id
                    ? 'border-[#1b5e20] bg-[#1b5e20] text-white shadow-lg shadow-[#1b5e20]/20'
                    : 'border-[#e8f5e9] bg-white text-[#1b5e20] hover:border-[#c8e6c9]'
                  }`}
              >
                {payMethod === id && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#1b5e20] rounded-full" />
                  </div>
                )}
                <Icon className="w-6 h-6" />
                <div className="text-center">
                  <p className="font-black text-sm">{label}</p>
                  <p className={`text-[10px] font-semibold ${payMethod === id ? 'text-[#a5d6a7]' : 'text-[#81c784]'}`}>{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-5 space-y-3">
        {!canPay && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-bold">Ingresa el nombre para el pedido</p>
          </div>
        )}
        <button
          onClick={handlePay}
          disabled={!canPay}
          className={`w-full flex items-center justify-center gap-3 py-5 font-black rounded-2xl transition-all text-base relative overflow-hidden
            ${canPay
              ? 'bg-[#1b5e20] text-white hover:bg-[#0d3300] shadow-[0_10px_30px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 active:scale-95'
              : 'bg-[#e8f5e9] text-[#81c784] cursor-not-allowed'
            }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
          Pagar — ${total.toLocaleString('es-CO')} COP
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </ModalShell>
  );
};


/* ═══════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════ */
const LandingPage = ({ hideNavbar = false }) => {
  const navigate = useNavigate();
  const { productos, getCatProducto } = useApp();
  const [activeTab, setActiveTab] = useState('Todos');
  const [user, setUser] = useState(null);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  const getQty = (id) => quantities[id] || 1;
  const setQty = (id, v) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));

  const addToCart = (product) => {
    const qty = getQty(product.id);
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product, quantity: qty }];
    });
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    setCartOpen(true);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.product.id !== id));
  const updateCartQty = (id, delta) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0));

  const cartTotal = cart.reduce((s, i) => s + i.product.precio * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  /* 🔑 VALIDACIÓN: si no hay sesión → login, si hay → modal checkout */
  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleOrderSuccess = () => {
    setCart([]);
    setOrderDone(true);
    setTimeout(() => setOrderDone(false), 4000);
  };

  const activeProducts = productos.filter(p => p.stock > 0);
  const categories = ['Todos', ...new Set(activeProducts.map(p => getCatProducto(p.idCategoria).nombre))];
  const filteredProducts = activeTab === 'Todos'
    ? activeProducts.slice(0, 6)
    : activeProducts.filter(p => getCatProducto(p.idCategoria).nombre === activeTab).slice(0, 6);

  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#1b5e20] font-sans overflow-x-hidden">
      {!hideNavbar && <Navbar isLanding={true} />}

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down-toast {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.4); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.45s cubic-bezier(0.32,0.72,0,1) both; }
        .animate-slide-down-toast { animation: slide-down-toast 0.4s ease both; }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* ── Toast de éxito ── */}
      {orderDone && (
        <div className="fixed top-6 left-1/2 z-[60] flex items-center gap-3 px-6 py-4 bg-[#1b5e20] text-white rounded-2xl shadow-2xl animate-slide-down-toast">
          <CheckCircle2 className="w-5 h-5 text-[#81c784]" />
          <span className="font-black">¡Pedido registrado con éxito!</span>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-6 py-4 bg-[#1b5e20] text-white font-black rounded-2xl shadow-[0_10px_40px_rgba(27,94,32,0.4)] hover:bg-[#0d3300] transition-all hover:-translate-y-1 active:scale-95"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>{cartCount} {cartCount === 1 ? 'producto' : 'productos'}</span>
          <span className="bg-white text-[#1b5e20] px-3 py-1 rounded-xl text-sm font-black">
            ${cartTotal.toLocaleString('es-CO')}
          </span>
        </button>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#e8f5e9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e8f5e9] rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#1b5e20]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#1b5e20]">Tu Carrito</h2>
                  <p className="text-xs text-[#81c784] font-bold">{cartCount} producto{cartCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-10 h-10 bg-[#f7faf8] rounded-xl flex items-center justify-center hover:bg-[#e8f5e9] transition-colors">
                <X className="w-5 h-5 text-[#1b5e20]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-[#81c784]">
                  <ShoppingBag className="w-16 h-16 opacity-30" />
                  <p className="font-bold text-lg">Tu carrito está vacío</p>
                  <button onClick={() => { setCartOpen(false); scrollToSection('productos'); }} className="px-6 py-3 bg-[#e8f5e9] text-[#1b5e20] font-black rounded-2xl hover:bg-[#c8e6c9] transition-colors">
                    Ver productos
                  </button>
                </div>
              ) : (
                cart.map(({ product, quantity }) => {
                  const cat = getCatProducto(product.idCategoria);
                  return (
                    <div key={product.id} className="flex gap-4 p-4 bg-[#f7faf8] rounded-2xl border border-[#e8f5e9]">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#e8f5e9] flex items-center justify-center">
                        {product.imagenPreview
                          ? <img src={product.imagenPreview} alt={product.nombre} className="w-full h-full object-cover" />
                          : <span className="text-3xl">{cat.icon || '🍌'}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#1b5e20] truncate">{product.nombre}</p>
                        <p className="text-xs text-[#81c784] font-bold mb-3">{cat.nombre}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e8f5e9] p-1">
                            <button onClick={() => updateCartQty(product.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#e8f5e9] transition-colors">
                              <Minus className="w-3 h-3 text-[#1b5e20]" />
                            </button>
                            <span className="w-6 text-center font-black text-sm text-[#1b5e20]">{quantity}</span>
                            <button onClick={() => updateCartQty(product.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#e8f5e9] transition-colors">
                              <Plus className="w-3 h-3 text-[#1b5e20]" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#1b5e20]">${(product.precio * quantity).toLocaleString('es-CO')}</span>
                            <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-[#e8f5e9] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#388e3c] font-bold">Total</span>
                  <span className="text-2xl font-black text-[#1b5e20]">${cartTotal.toLocaleString('es-CO')} COP</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="group w-full flex items-center justify-center gap-3 py-5 bg-[#1b5e20] text-white font-black rounded-2xl hover:bg-[#0d3300] shadow-[0_10px_30px_rgba(27,94,32,0.3)] transition-all hover:-translate-y-0.5 active:scale-95 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  Pagar ahora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setCartOpen(false)} className="w-full py-3 text-[#388e3c] font-bold hover:text-[#1b5e20] transition-colors text-sm">
                  Seguir comprando
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── HERO ─── */}
      <section id="inicio" className={`relative ${hideNavbar ? 'pt-10' : 'pt-32'} pb-20 lg:pt-48 lg:pb-32 overflow-hidden`}>
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-[#4caf50]/10 to-transparent rounded-l-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 -z-10 w-96 h-96 bg-[#81c784]/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f5e9] text-[#1b5e20] rounded-full text-xs font-black tracking-widest shadow-sm border border-[#c8e6c9]">
                <Sparkles className="w-4 h-4 text-[#4caf50]" />
                SABOR NATURAL 100%
              </div>
              <h1 className="text-6xl lg:text-8xl font-black text-[#1b5e20] leading-tight tracking-tighter">
                El poder del <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1b5e20] via-[#4caf50] to-[#1b5e20]">Plátano</span>
              </h1>
              <p className="text-xl text-[#388e3c] leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Descubre tostones, chips y delicias artesanales que redefinen el sabor de nuestra tierra. Crujientes, frescos y recolectados con amor.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
                <button onClick={() => scrollToSection('productos')} className="group relative flex items-center gap-3 px-10 py-5 bg-[#1b5e20] text-white font-black rounded-2xl hover:bg-[#0d3300] shadow-[0_10px_30px_rgba(27,94,32,0.3)] transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  Explorar menú
                  <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </button>
                <button onClick={() => scrollToSection('nosotros')} className="flex items-center gap-2 px-10 py-5 bg-white text-[#1b5e20] font-bold rounded-2xl border-2 border-[#e8f5e9] hover:border-[#1b5e20] transition-all w-full sm:w-auto justify-center">
                  Nuestra historia
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 w-full aspect-square max-w-[550px] mx-auto">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#a5d6a7] rounded-3xl rotate-12 -z-10 opacity-40" />
                <div className="w-full h-full bg-gradient-to-br from-[#1b5e20] to-[#4caf50] rounded-[60px] p-1 shadow-[0_30px_60px_rgba(27,94,32,0.2)] rotate-2 hover:rotate-0 transition-transform duration-700 overflow-hidden group">
                  <div className="w-full h-full bg-white rounded-[58px] overflow-hidden flex flex-col items-center justify-center p-12 relative">
                    <Utensils className="w-32 h-32 text-[#e8f5e9] mb-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="text-center space-y-2">
                      <h4 className="text-2xl font-black text-[#1b5e20]">TOSTÓN APP</h4>
                      <p className="text-[#4caf50] font-bold tracking-[0.2em] text-xs uppercase">Sabor de Origen</p>
                    </div>
                    <div className="absolute top-1/2 -right-12 translate-y-12 bg-white p-5 rounded-3xl shadow-2xl border border-[#f1f8f1] flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#e8f5e9] rounded-2xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-[#1b5e20]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#4caf50] uppercase">Entrega en</p>
                        <p className="text-lg font-black text-[#1b5e20]">25 Min</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRODUCTOS ─── */}
      <section id="productos" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-[#4caf50] font-black tracking-[0.3em] uppercase text-sm">Nuestro Menú</h2>
            <h3 className="text-5xl lg:text-6xl font-black text-[#1b5e20]">Selección Premium</h3>
            <div className="w-24 h-2 bg-[#1b5e20] mx-auto rounded-full" />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveTab(cat)}
                className={`px-8 py-3 rounded-2xl font-bold transition-all ${activeTab === cat ? 'bg-[#1b5e20] text-white shadow-lg scale-105' : 'bg-[#f1f8f1] text-[#1b5e20] hover:bg-[#e8f5e9]'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredProducts.map((p) => {
              const cat = getCatProducto(p.idCategoria);
              const qty = getQty(p.id);
              const inCart = cart.find(i => i.product.id === p.id);
              return (
                <div key={p.id} className="group bg-white rounded-[40px] overflow-hidden border border-[#f1f8f1] hover:border-[#c8e6c9] hover:shadow-[0_30px_60px_rgba(27,94,32,0.1)] transition-all duration-500 flex flex-col">
                  <div className="relative h-72 overflow-hidden">
                    {p.imagenPreview
                      ? <img src={p.imagenPreview} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      : <div className="w-full h-full bg-[#f7faf8] flex items-center justify-center"><span className="text-7xl group-hover:scale-125 transition-transform duration-500">{cat.icon || '🍌'}</span></div>
                    }
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-2xl font-black text-[#1b5e20] shadow-lg">
                      ${p.precio?.toLocaleString('es-CO')}
                    </div>
                    {inCart && (
                      <div className="absolute top-6 left-6 bg-[#1b5e20] text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
                        <ShoppingCart className="w-3 h-3" />
                        {inCart.quantity} en carrito
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-2xl font-black text-[#1b5e20] group-hover:text-[#388e3c] transition-colors">{p.nombre}</h4>
                      <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b5e20] rounded-lg text-[10px] font-black uppercase tracking-widest">{cat.nombre}</span>
                    </div>
                    <p className="text-[#555] font-medium text-sm mb-6 flex-1 leading-relaxed">{cat.descripcion || 'Sabor auténtico y natural en cada bocado.'}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-[#f7faf8] rounded-2xl border border-[#e8f5e9] p-1.5">
                        <button onClick={() => setQty(p.id, qty - 1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#e8f5e9] transition-colors active:scale-90">
                          <Minus className="w-3.5 h-3.5 text-[#1b5e20]" />
                        </button>
                        <span className="w-8 text-center font-black text-[#1b5e20] text-sm">{qty}</span>
                        <button onClick={() => setQty(p.id, qty + 1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#e8f5e9] transition-colors active:scale-90">
                          <Plus className="w-3.5 h-3.5 text-[#1b5e20]" />
                        </button>
                      </div>
                      <button onClick={() => addToCart(p)} className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#f1f8f1] text-[#1b5e20] font-black rounded-2xl group-hover:bg-[#1b5e20] group-hover:text-white transition-all active:scale-95 shadow-sm">
                        <ShoppingCart className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── NOSOTROS ─── */}
      <section id="nosotros" className="py-32 bg-[#1b5e20] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-24">
            <div className="flex-1 space-y-10">
              <div className="space-y-4">
                <h2 className="text-[#81c784] font-black tracking-[0.4em] uppercase text-sm">El origen</h2>
                <h3 className="text-5xl lg:text-7xl font-black leading-tight tracking-tighter">
                  Desde el campo <br />hasta tu <span className="text-[#a5d6a7]">mesa</span>
                </h3>
              </div>
              <p className="text-xl text-[#c8e6c9] leading-relaxed font-medium">
                En Tostón App celebramos la tierra. Cada plátano es seleccionado para garantizar una experiencia épica y natural.
              </p>
            </div>
            <div className="flex-1">
              <div className="bg-[#0d3300]/30 rounded-[60px] p-20 text-center border-2 border-[#1b5e20] shadow-2xl backdrop-blur-sm">
                <Leaf className="w-24 h-24 text-[#81c784] mx-auto mb-8 animate-pulse" />
                <h4 className="text-3xl font-black mb-4">Únete a la Revolución</h4>
                <p className="text-[#c8e6c9] mb-10">Estamos transformando la forma en que el mundo ve al plátano.</p>
                {!user && (
                  <button onClick={() => navigate('/register')} className="w-full py-5 bg-white text-[#1b5e20] font-black rounded-3xl hover:bg-[#e8f5e9] transition-all shadow-xl">
                    Crear mi cuenta gratis
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white text-[#1b5e20] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-20 mb-20">
            <div className="max-w-md space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1b5e20] rounded-2xl flex items-center justify-center shadow-lg">
                  <Leaf className="text-white w-7 h-7" />
                </div>
                <span className="text-3xl font-black tracking-tighter">Tostón App</span>
              </div>
              <p className="text-[#388e3c] font-medium leading-relaxed">Calidad premium y frescura garantizada para los amantes del buen sabor.</p>
            </div>
          </div>
          <div className="pt-12 border-t border-[#e8f5e9] text-center">
            <p className="font-bold text-sm text-[#81c784]">© 2026 Tostón App — Hecho con Pasión.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;