import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, ArrowRight, Leaf, Utensils, Sparkles,
  Plus, Minus, ShoppingCart, CheckCircle2,
  ChevronRight, Zap, Edit3, Save, X as CloseIcon
} from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { getUser } from '../services/authService.js';
import { useNotificaciones, TIPOS } from '../features/notificaciones/context/NotificacionesContext.jsx';
import Navbar from '../shared/components/Navbar.jsx';

// Importar componentes centralizados y servicio
import CartAside from '../features/sales/orders/components/CartAside';
import CheckoutModal from '../features/sales/orders/components/CheckoutModal';
import { 
  addToCart as addToCartService, 
  getCart, 
  getCartCount, 
  clearCart 
} from '../features/sales/orders/services/cartService';

const DEFAULT_CONTENT = {
  heroBadge: "SABOR NATURAL 100%",
  heroTitle: "El poder del Plátano",
  heroDescription: "Descubre tostones, chips y delicias artesanales que redefinen el sabor de nuestra tierra. Crujientes, frescos y recolectados con amor.",
  historyTitle: "Desde el campo hasta tu mesa",
  historyDescription: "En Tostón App celebramos la tierra. Cada plátano es seleccionado para garantizar una experiencia épica y natural.",
  ctaTitle: "Únete a la Revolución",
  ctaDescription: "Estamos transformando la forma en que el mundo ve al plátano."
};

/* ═══════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════ */
const LandingPage = ({ hideNavbar = false }) => {
  const navigate = useNavigate();
  const { productos, getCatProducto, crearPedido } = useApp();
  const { agregarNotificacion } = useNotificaciones();
  const [activeTab, setActiveTab] = useState('Todos');
  const [user, setUser] = useState(null);

  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderDone, setOrderDone] = useState(false);

  // ── Edición Landing (Admin) ──
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('landing_content');
    return saved ? JSON.parse(saved) : DEFAULT_CONTENT;
  });

  const handleSaveContent = () => {
    localStorage.setItem('landing_content', JSON.stringify(content));
    setIsEditing(false);
    alert('Contenido guardado correctamente.');
  };

  const updateContent = (key, val) => {
    setContent(prev => ({ ...prev, [key]: val }));
  };

  // Sincronizar contador del carrito
  const syncCartInfo = useCallback(() => {
    setCartCount(getCartCount());
  }, []);

  useEffect(() => { 
    setUser(getUser()); 
    syncCartInfo();
    window.addEventListener('cart-updated', syncCartInfo);
    return () => window.removeEventListener('cart-updated', syncCartInfo);
  }, [syncCartInfo]);

  /* ── Auto-scroll si hay hash en la URL ── */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 600);
    }
  }, []);

  const getQty = (id) => quantities[id] || 1;
  const setQty = (id, v) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, v) }));

  const handleAddToCart = (product) => {
    const qty = getQty(product.id);
    // Agregamos la cantidad seleccionada
    for(let i=0; i<qty; i++) {
      addToCartService(product);
    }
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    setCartOpen(true);
  };

  /* 🔑 Manejo de Checkout */
  const handleStartCheckout = (details) => {
    const currentUser = getUser();
    setOrderDetails({
      ...details,
      clientName: currentUser?.nombre || '',
      items: getCart(),
      total: getCart().reduce((a, i) => a + i.precio * i.cantidad, 0),
    });
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleConfirmOrder = (paymentMethod, onBehalfOf, comprobante) => {
    const currentUser = getUser();
    const currentCart = getCart();
    const total = currentCart.reduce((s, i) => s + i.precio * i.cantidad, 0);

    const pedido = {
      idCliente: currentUser?.cedula || '',
      cliente: {
        nombre:   currentUser ? `${currentUser.nombre} ${currentUser.apellidos || ''}`.trim() : onBehalfOf,
        correo:   currentUser?.correo   || '',
        telefono: currentUser?.telefono || '',
      },
      productosItems: currentCart.map(item => ({
        idProducto:   item.id,
        nombre:       item.nombre,
        precio:       item.precio,
        cantidad:     item.cantidad,
        stockOk:      true,
      })),
      subtotal:          total,
      descuento:         0,
      total:             total,
      metodo_pago:       paymentMethod === 'digital' ? 'Transferencia' : 'Efectivo',
      domicilio:         true,
      direccion_entrega: orderDetails.address,
      notas:             '',
      estado:            'Pendiente',
      orden_produccion:  false,
      comprobante:       comprobante ? true : false,
    };

    const res = crearPedido(pedido);
    if (res && res.error) {
       alert(res.error);
       return;
    }

    clearCart();
    setCheckoutOpen(false);
    setOrderDone(true);
    
    agregarNotificacion({
      tipo: TIPOS.PEDIDO_NUEVO,
      titulo: "¡Pedido registrado!",
      mensaje: `Hemos recibido tu orden ${res.numero} correctamente.`,
    });

    setTimeout(() => setOrderDone(false), 4000);
  };

  const activeProducts = productos.filter(p => p.stock > 0);
  const categories = ['Todos', ...new Set(activeProducts.map(p => getCatProducto(p.idCategoria).nombre))];
  const filteredProducts = activeTab === 'Todos'
    ? activeProducts.slice(0, 6)
    : activeProducts.filter(p => getCatProducto(p.idCategoria).nombre === activeTab).slice(0, 6);

  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const isAdmin = user?.rol === 'administrador';

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#1b5e20] font-sans overflow-x-hidden">
      {!hideNavbar && <Navbar isLanding={true} />}

      {/* ── Admin Toolbar ── */}
      {isAdmin && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-[#c8e6c9]">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b5e20] text-white rounded-xl font-bold text-sm hover:bg-[#0d3300] transition-all"
            >
              <Edit3 size={16} /> Editar Contenido
            </button>
          ) : (
            <>
              <button 
                onClick={handleSaveContent}
                className="flex items-center gap-2 px-4 py-2 bg-[#4caf50] text-white rounded-xl font-bold text-sm hover:bg-[#388e3c] transition-all"
              >
                <Save size={16} /> Guardar Cambios
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  const saved = localStorage.getItem('landing_content');
                  setContent(saved ? JSON.parse(saved) : DEFAULT_CONTENT);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all"
              >
                <CloseIcon size={16} /> Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes slide-down-toast {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .animate-slide-down-toast { animation: slide-down-toast 0.4s ease both; }
        
        .editable-focus:focus {
          outline: 2px dashed #4caf50;
          outline-offset: 4px;
          background: rgba(76, 175, 80, 0.05);
          border-radius: 8px;
        }
      `}</style>

      {/* ── Toast de éxito ── */}
      {orderDone && (
        <div className="fixed top-6 left-1/2 z-[10000] flex items-center gap-3 px-6 py-4 bg-[#1b5e20] text-white rounded-2xl shadow-2xl animate-slide-down-toast">
          <CheckCircle2 className="w-5 h-5 text-[#81c784]" />
          <span className="font-black">¡Pedido registrado con éxito! 🎉</span>
        </div>
      )}

      {/* ── Checkout Modal Premium ── */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        orderDetails={orderDetails}
        onConfirm={handleConfirmOrder}
      />

      {/* ── Cart Drawer Premium ── */}
      <CartAside
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleStartCheckout}
        onLoginRequired={() => navigate('/login')}
      />

      {/* ── Floating Cart Button ── */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-6 py-4 bg-[#1b5e20] text-white font-black rounded-2xl shadow-[0_10px_40px_rgba(27,94,32,0.4)] hover:bg-[#0d3300] transition-all hover:-translate-y-1 active:scale-95 group"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#1b5e20]">
              {cartCount}
            </span>
          </div>
          <span>Ver Carrito</span>
          <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-xl text-sm font-black border border-white/20">
            ${getCart().reduce((s, i) => s + i.precio * i.cantidad, 0).toLocaleString('es-CO')}
          </span>
        </button>
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
                <span 
                  contentEditable={isEditing} 
                  onBlur={(e) => updateContent('heroBadge', e.target.innerText)}
                  className={isEditing ? 'editable-focus' : ''}
                >
                  {content.heroBadge}
                </span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-black text-[#1b5e20] leading-tight tracking-tighter">
                <span 
                  contentEditable={isEditing} 
                  onBlur={(e) => updateContent('heroTitle', e.target.innerText)}
                  className={isEditing ? 'editable-focus block' : 'block'}
                >
                  {content.heroTitle}
                </span>
              </h1>
              <p className="text-xl text-[#388e3c] leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                <span 
                  contentEditable={isEditing} 
                  onBlur={(e) => updateContent('heroDescription', e.target.innerText)}
                  className={isEditing ? 'editable-focus block' : 'block'}
                >
                  {content.heroDescription}
                </span>
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
              const inCartItem = getCart().find(i => i.id === p.id);
              return (
                <div key={p.id} className="group bg-white rounded-[40px] overflow-hidden border border-[#f1f8f1] hover:border-[#c8e6c9] hover:shadow-[0_30px_60px_rgba(27,94,32,0.1)] transition-all duration-500 flex flex-col">
                  <div className="relative h-72 overflow-hidden">
                    {p.imagenPreview || p.imagen
                      ? <img src={p.imagenPreview || p.imagen} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      : <div className="w-full h-full bg-[#f7faf8] flex items-center justify-center"><span className="text-7xl group-hover:scale-125 transition-transform duration-500">{cat.icon || '🍌'}</span></div>
                    }
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-2xl font-black text-[#1b5e20] shadow-lg">
                      ${p.precio?.toLocaleString('es-CO')}
                    </div>
                    {inCartItem && (
                      <div className="absolute top-6 left-6 bg-[#1b5e20] text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg border border-white/20">
                        <ShoppingCart className="w-3 h-3" />
                        {inCartItem.cantidad} en carrito
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
                      <button onClick={() => handleAddToCart(p)} className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#f1f8f1] text-[#1b5e20] font-black rounded-2xl group-hover:bg-[#1b5e20] group-hover:text-white transition-all active:scale-95 shadow-sm">
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
                  <span 
                    contentEditable={isEditing} 
                    onBlur={(e) => updateContent('historyTitle', e.target.innerText)}
                    className={isEditing ? 'editable-focus block' : 'block'}
                  >
                    {content.historyTitle}
                  </span>
                </h3>
              </div>
              <p className="text-xl text-[#c8e6c9] leading-relaxed font-medium">
                <span 
                  contentEditable={isEditing} 
                  onBlur={(e) => updateContent('historyDescription', e.target.innerText)}
                  className={isEditing ? 'editable-focus block' : 'block'}
                >
                  {content.historyDescription}
                </span>
              </p>
            </div>
            <div className="flex-1">
              <div className="bg-[#0d3300]/30 rounded-[60px] p-20 text-center border-2 border-[#1b5e20] shadow-2xl backdrop-blur-sm">
                <Leaf className="w-24 h-24 text-[#81c784] mx-auto mb-8 animate-pulse" />
                <h4 className="text-3xl font-black mb-4">
                  <span 
                    contentEditable={isEditing} 
                    onBlur={(e) => updateContent('ctaTitle', e.target.innerText)}
                    className={isEditing ? 'editable-focus block' : 'block'}
                  >
                    {content.ctaTitle}
                  </span>
                </h4>
                <p className="text-[#c8e6c9] mb-10">
                  <span 
                    contentEditable={isEditing} 
                    onBlur={(e) => updateContent('ctaDescription', e.target.innerText)}
                    className={isEditing ? 'editable-focus block' : 'block'}
                  >
                    {content.ctaDescription}
                  </span>
                </p>
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