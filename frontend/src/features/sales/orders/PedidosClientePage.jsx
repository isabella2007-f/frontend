import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../AppContext';
import { getCurrentUser } from '../../client/profile/services/profileService.js';
import { 
  Package, Calendar, MapPin, DollarSign, Leaf, Search, 
  ChevronRight, Clock, CheckCircle2, Truck, AlertCircle, 
  XCircle, Filter, ShoppingBag
} from 'lucide-react';
import '../../../styles/client.css';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);

const ESTADO_CONFIG = {
  'Pendiente': { 
    color: 'amber',
    icon: Clock,
    label: 'Pendiente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700'
  },
  'En producción': { 
    color: 'blue',
    icon: Package,
    label: 'En producción',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700'
  },
  'Listo': { 
    color: 'emerald',
    icon: CheckCircle2,
    label: 'Listo',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  'En camino': { 
    color: 'purple',
    icon: Truck,
    label: 'En camino',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700'
  },
  'Entregado': { 
    color: 'teal',
    icon: CheckCircle2,
    label: 'Entregado',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-700'
  },
  'Cancelado': { 
    color: 'red',
    icon: XCircle,
    label: 'Cancelado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700'
  },
};

const PedidosClientePage = () => {
  const { pedidos } = useApp();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [filterEstado, setFilterEstado] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const userPedidos = user
    ? pedidos.filter(p => p.idCliente === user.cedula)
    : [];

  const filteredPedidos = userPedidos.filter(p => {
    const matchSearch =
      p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cliente?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
    return matchSearch && matchEstado;
  }).sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));

  const handleRequestReturn = (pedido) => {
    navigate('/cliente/devoluciones', {
      state: { orderNumber: pedido.numero, productId: pedido.productosItems[0]?.idProducto },
    });
  };

  if (!user)
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50/50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Clock className="text-green-600" size={32} />
          </div>
          <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Cargando tus pedidos...</p>
        </div>
      </div>
    );

  return (
    <div className="toston-page min-h-screen bg-gray-50/30">
      {/* ── Hero Refinado ── */}
      <header className="page-hero">
        <div className="page-hero__inner">
          <div className="relative z-10">
            <span className="page-hero__label inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10 mb-4">
              <Leaf size={12} className="text-white" /> Tostón App
            </span>
            <h1 className="page-hero__title text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
              Mis <em className="not-italic text-white opacity-90">Pedidos</em>
            </h1>
            <p className="page-hero__sub text-white/70 max-w-lg font-medium">
              Sigue el progreso de tus antojos en tiempo real.
            </p>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="page-hero__badge relative bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingBag size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">Total pedidos</p>
                <p className="text-2xl font-black text-white leading-none">{userPedidos.length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="page-content max-w-6xl mx-auto px-4 py-8">
        {/* Toolbar Moderna */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar por número de pedido..."
              className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-green-500 outline-none shadow-sm hover:shadow-md transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-gray-100 shadow-sm">
              <button
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterEstado === 'todos' 
                    ? 'bg-green-700 text-white shadow-lg shadow-green-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setFilterEstado('todos')}
              >
                Todos
              </button>
              {['Pendiente', 'En camino', 'Entregado'].map(estado => (
                <button
                  key={estado}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterEstado === estado 
                      ? 'bg-green-700 text-white shadow-lg shadow-green-200' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setFilterEstado(estado)}
                >
                  {estado}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de Pedidos */}
        {filteredPedidos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPedidos.map(pedido => {
              const config = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG['Pendiente'];
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={pedido.id}
                  className="group bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className={`p-6 ${config.bg} border-b border-gray-100/50 flex justify-between items-start`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido</span>
                        <span className="px-2 py-0.5 bg-white/60 backdrop-blur-sm rounded-lg text-[11px] font-black text-gray-800 border border-white">
                          #{pedido.numero}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Calendar size={12} />
                        <span className="text-[11px] font-bold">
                          {new Date(pedido.fecha_pedido).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${config.badge} border border-white shadow-sm`}>
                      <StatusIcon size={12} strokeWidth={3} />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{config.label}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Total Pagado</p>
                        <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{COP(pedido.total)}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Productos</p>
                        <div className="flex -space-x-2">
                           {pedido.productosItems.slice(0, 3).map((_, i) => (
                             <div key={i} className="w-6 h-6 rounded-full bg-green-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-green-600">
                               📦
                             </div>
                           ))}
                           {pedido.productosItems.length > 3 && (
                             <div className="w-6 h-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400">
                               +{pedido.productosItems.length - 3}
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-gray-400 mb-4">
                        <MapPin size={14} style={{ color: 'var(--green-600)' }} />
                        <span className="text-[10px] font-bold truncate max-w-[200px]">
                          {pedido.direccion_entrega || 'Recogida en local'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setSelectedPedido(pedido)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-green-700 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group/btn shadow-sm"
                      >
                        Ver Detalle Completo
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[40px] p-12 text-center border border-gray-100 shadow-xl max-w-lg mx-auto">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={48} className="text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">No hay pedidos</h3>
            <p className="text-gray-400 font-medium mb-8">
              {searchTerm || filterEstado !== 'todos'
                ? 'No encontramos pedidos con estos filtros.'
                : 'Aún no has realizado pedidos deliciosos.'}
            </p>
            <button
              className="btn-primary"
              style={{ padding: '16px 32px' }}
              onClick={() => { setSearchTerm(''); setFilterEstado('todos'); }}
            >
              Ver todos los pedidos
            </button>
          </div>
        )}
      </main>

      {/* ── Modal Detalle Refinado ── */}
      {selectedPedido && (
        <div className="modal-overlay">
          <div className="modal-box relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col border-none">
            {/* Modal Header */}
            <div className="modal-header p-8 flex justify-between items-center shrink-0 border-none" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
                    Pedido #{selectedPedido.numero}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight leading-none text-white">Detalle de Compra</h2>
              </div>
              <button 
                onClick={() => setSelectedPedido(null)}
                className="p-3 hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 space-y-8">
              {/* Status Banner */}
              <div className={`p-4 rounded-[24px] ${ESTADO_CONFIG[selectedPedido.estado]?.bg} border border-white flex items-center gap-4 shadow-sm`}>
                <div className={`w-12 h-12 rounded-2xl ${ESTADO_CONFIG[selectedPedido.estado]?.badge} flex items-center justify-center shadow-inner`}>
                   {(() => {
                     const Icon = ESTADO_CONFIG[selectedPedido.estado]?.icon || AlertCircle;
                     return <Icon size={24} strokeWidth={2.5} />;
                   })()}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Estado actual</p>
                  <p className={`text-lg font-black ${ESTADO_CONFIG[selectedPedido.estado]?.text}`}>{selectedPedido.estado}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Información General</h4>
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Fecha</p>
                          <p className="text-sm font-bold text-gray-800">{new Date(selectedPedido.fecha_pedido).toLocaleString('es-CO')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Método de pago</p>
                          <p className="text-sm font-bold text-gray-800">{selectedPedido.metodo_pago}</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Entrega</h4>
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 h-full">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shrink-0" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Dirección de entrega</p>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">
                          {selectedPedido.direccion_entrega || 'Recogida en local comercial'}
                        </p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Resumen de productos</h4>
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                   <table className="w-full">
                      <thead className="bg-gray-50/50">
                        <tr className="border-b border-gray-100">
                          <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Cant.</th>
                          <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Precio</th>
                          <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                         {selectedPedido.productosItems.map((item, idx) => (
                           <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-xs font-black text-gray-800">{item.nombre}</p>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600">x{item.cantidad}</span>
                              </td>
                              <td className="px-6 py-4 text-right text-xs font-bold text-gray-500">{COP(item.precio)}</td>
                              <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--green-700)' }}>{COP(item.precio * item.cantidad)}</td>
                           </tr>
                         ))}
                      </tbody>
                      <tfoot className="bg-green-50/30" style={{ background: 'var(--green-50)' }}>
                         <tr>
                            <td colSpan={3} className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total a pagar</td>
                            <td className="px-6 py-4 text-right text-lg font-black text-green-800" style={{ color: 'var(--green-800)' }}>{COP(selectedPedido.total)}</td>
                         </tr>
                      </tfoot>
                   </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer p-8 bg-white border-t border-gray-100 shrink-0 flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setSelectedPedido(null)}
              >
                Cerrar
              </button>
              {selectedPedido.estado === 'Entregado' && (
                <button
                  className="btn-primary flex-1"
                  onClick={() => handleRequestReturn(selectedPedido)}
                >
                  Solicitar devolución
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosClientePage;