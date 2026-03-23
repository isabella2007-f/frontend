import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  Leaf,
  Utensils,
  Clock,
  ChevronDown,
  Sparkles,
  Zap
} from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { getUser } from '../services/authService';
import Navbar from '../shared/components/Navbar';

const LandingPage = ({ hideNavbar = false }: { hideNavbar?: boolean }) => {
  const navigate = useNavigate();
  const { productos, getCatProducto } = useApp();
  const [activeTab, setActiveTab] = useState('Todos');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Filter active products
  const activeProducts = productos.filter(p => p.stock > 0);
  
  const categories = ['Todos', ...new Set(activeProducts.map(p => getCatProducto(p.idCategoria).nombre))];
  
  const filteredProducts = activeTab === 'Todos' 
    ? activeProducts.slice(0, 6)
    : activeProducts.filter(p => getCatProducto(p.idCategoria).nombre === activeTab).slice(0, 6);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#1b5e20] font-sans overflow-x-hidden">
      {!hideNavbar && <Navbar isLanding={true} />}

      {/* ─── HERO SECTION ─── */}
      <section id="inicio" className={`relative ${hideNavbar ? 'pt-10' : 'pt-32'} pb-20 lg:pt-48 lg:pb-32 overflow-hidden`}>
        {/* Animated Background Orbs */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-[#4caf50]/10 to-transparent rounded-l-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 -z-10 w-96 h-96 bg-[#81c784]/10 rounded-full blur-3xl animate-blob"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f5e9] text-[#1b5e20] rounded-full text-xs font-black tracking-widest shadow-sm border border-[#c8e6c9]">
                <Sparkles className="w-4 h-4 text-[#4caf50]" />
                SABOR NATURAL 100%
              </div>
              
              <h1 className="text-6xl lg:text-8xl font-black text-[#1b5e20] leading-tight tracking-tighter">
                El poder del <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1b5e20] via-[#4caf50] to-[#1b5e20] bg-[length:200%_auto] animate-gradient">Plátano</span>
              </h1>
              
              <p className="text-xl text-[#388e3c] leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Descubre tostones, chips y delicias artesanales que redefine el sabor de nuestra tierra. 
                Crujientes, frescos y recolectados con amor.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
                <button 
                  onClick={() => scrollToSection('productos')}
                  className="group relative flex items-center gap-3 px-10 py-5 bg-[#1b5e20] text-white font-black rounded-2xl hover:bg-[#0d3300] shadow-[0_10px_30px_rgba(27,94,32,0.3)] transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  Explorar menú
                  <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </button>
                
                <button 
                  onClick={() => scrollToSection('nosotros')}
                  className="flex items-center gap-2 px-10 py-5 bg-white text-[#1b5e20] font-bold rounded-2xl border-2 border-[#e8f5e9] hover:border-[#1b5e20] transition-all w-full sm:w-auto justify-center"
                >
                  Nuestra historia
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative animate-fade-in">
              <div className="relative z-10 w-full aspect-square max-w-[550px] mx-auto">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#a5d6a7] rounded-3xl rotate-12 -z-10 animate-bounce-slow opacity-40"></div>
                
                <div className="w-full h-full bg-gradient-to-br from-[#1b5e20] to-[#4caf50] rounded-[60px] p-1 shadow-[0_30px_60px_rgba(27,94,32,0.2)] rotate-2 hover:rotate-0 transition-transform duration-700 overflow-hidden group">
                  <div className="w-full h-full bg-white rounded-[58px] overflow-hidden flex flex-col items-center justify-center p-12 relative">
                    <Utensils className="w-32 h-32 text-[#e8f5e9] mb-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="text-center space-y-2">
                      <h4 className="text-2xl font-black text-[#1b5e20]">TOSTÓN APP</h4>
                      <p className="text-[#4caf50] font-bold tracking-[0.2em] text-xs uppercase">Sabor de Origen</p>
                    </div>
                    
                    <div className="absolute top-1/2 -right-12 translate-y-12 bg-white p-5 rounded-3xl shadow-2xl border border-[#f1f8f1] flex items-center gap-4 animate-float">
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

      {/* ─── PRODUCTOS SECTION ─── */}
      <section id="productos" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-[#4caf50] font-black tracking-[0.3em] uppercase text-sm">Nuestro Menú</h2>
            <h3 className="text-5xl lg:text-6xl font-black text-[#1b5e20]">Selección Premium</h3>
            <div className="w-24 h-2 bg-[#1b5e20] mx-auto rounded-full"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-8 py-3 rounded-2xl font-bold transition-all ${
                  activeTab === cat 
                  ? 'bg-[#1b5e20] text-white shadow-lg shadow-[#1b5e20]/20 scale-105' 
                  : 'bg-[#f1f8f1] text-[#1b5e20] hover:bg-[#e8f5e9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredProducts.map((p, idx) => {
              const cat = getCatProducto(p.idCategoria);
              return (
                <div 
                  key={p.id} 
                  className="group bg-white rounded-[40px] overflow-hidden border border-[#f1f8f1] hover:border-[#c8e6c9] hover:shadow-[0_30px_60px_rgba(27,94,32,0.1)] transition-all duration-500 flex flex-col"
                >
                  <div className="relative h-72 overflow-hidden">
                    {p.imagenPreview ? (
                      <img src={p.imagenPreview} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-[#f7faf8] flex items-center justify-center">
                        <span className="text-7xl group-hover:scale-125 transition-transform duration-500">{cat.icon || '🍌'}</span>
                      </div>
                    )}
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-2xl font-black text-[#1b5e20] shadow-lg">
                      ${p.precio?.toLocaleString('es-CO')}
                    </div>
                  </div>
                  
                  <div className="p-10 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-2xl font-black text-[#1b5e20] group-hover:text-[#388e3c] transition-colors">{p.nombre}</h4>
                      <span className="px-3 py-1 bg-[#e8f5e9] text-[#1b5e20] rounded-lg text-[10px] font-black uppercase tracking-widest">{cat.nombre}</span>
                    </div>
                    <p className="text-[#555] font-medium text-sm mb-8 flex-1 leading-relaxed">
                      {cat.descripcion || 'Sabor auténtico y natural en cada bocado.'}
                    </p>
                    <button 
                      onClick={() => navigate('/login')}
                      className="w-full flex items-center justify-center gap-3 py-5 bg-[#f1f8f1] text-[#1b5e20] font-black rounded-2xl group-hover:bg-[#1b5e20] group-hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      Comprar ahora
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
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
                  Desde el campo <br />
                  hasta tu <span className="text-[#a5d6a7]">mesa</span>
                </h3>
              </div>
              <p className="text-xl text-[#c8e6c9] leading-relaxed font-medium">
                En Tostón App celebramos la tierra. Cada plátano es seleccionado para 
                garantizar una experiencia épica y natural.
              </p>
            </div>

            <div className="flex-1">
               <div className="bg-[#0d3300]/30 rounded-[60px] p-20 text-center border-2 border-[#1b5e20] shadow-2xl relative backdrop-blur-sm">
                  <Leaf className="w-24 h-24 text-[#81c784] mx-auto mb-8 animate-pulse" />
                  <h4 className="text-3xl font-black mb-4">Únete a la Revolución</h4>
                  <p className="text-[#c8e6c9] mb-10">Estamos transformando la forma en que el mundo ve al plátano.</p>
                  
                  {/* BOTÓN CONDICIONAL: Solo si NO hay usuario */}
                  {!user && (
                    <button 
                      onClick={() => navigate('/register')}
                      className="w-full py-5 bg-white text-[#1b5e20] font-black rounded-3xl hover:bg-[#e8f5e9] transition-all shadow-xl"
                    >
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
              <p className="text-[#388e3c] font-medium leading-relaxed">
                Calidad premium y frescura garantizada para los amantes del buen sabor.
              </p>
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
