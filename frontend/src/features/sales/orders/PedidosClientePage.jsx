import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPedidos, getMisVentas } from '../../../services/pedidosService';
import { fmtFecha } from '../../../utils/dateUtils.js';
import { getCurrentUser } from '../../client/profile/services/profileService.js';
import { descargarFacturaPedido } from '../../../utils/facturaGenerator.js';
import {
  Package, Calendar, MapPin, DollarSign, Leaf, Search,
  ChevronRight, Clock, CheckCircle2, Truck, AlertCircle,
  XCircle, ShoppingBag
} from 'lucide-react';
import '../../../styles/Client.css';

/* ── Stepper de seguimiento ───────────────────────────── */
const PASOS_DOMICILIO = [
  { key: 'Pendiente',     label: 'Recibido',      emoji: '📥' },
  { key: 'En producción', label: 'Preparación',   emoji: '👨‍🍳' },
  { key: 'Confirmado',    label: 'Listo',         emoji: '✅' },
  { key: 'En camino',     label: 'En camino',     emoji: '🛵' },
  { key: 'Entregado',     label: 'Entregado',     emoji: '🎉' },
];
const PASOS_TIENDA = [
  { key: 'Pendiente',     label: 'Recibido',      emoji: '📥' },
  { key: 'En producción', label: 'Preparando',    emoji: '👨‍🍳' },
  { key: 'Confirmado',    label: 'Listo en\ntienda', emoji: '🏪' },
  { key: 'Entregado',     label: 'Recogido',      emoji: '✅' },
];

function PedidoStepper({ estado, domicilio }) {
  const pasos = domicilio ? PASOS_DOMICILIO : PASOS_TIENDA;
  const idx = pasos.findIndex(p => p.key === estado);
  const activoIdx = idx === -1 ? 0 : idx;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 16 }}>
      {pasos.map((paso, i) => {
        const done   = i < activoIdx;
        const active = i === activoIdx;
        return (
          <div key={paso.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{
                position: 'absolute', top: 14, right: '50%', width: '100%', height: 2,
                background: done || active ? '#2e7d32' : '#e0e0e0', zIndex: 0,
              }} />
            )}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', zIndex: 1, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#2e7d32' : active ? '#e8f5e9' : '#f5f5f5',
              border: `2px solid ${done ? '#2e7d32' : active ? '#2e7d32' : '#e0e0e0'}`,
              transition: 'all 0.3s',
            }}>
              {done ? <span style={{ color: '#fff', fontSize: 12 }}>✓</span> : <span style={{ fontSize: 13 }}>{paso.emoji}</span>}
            </div>
            <p style={{
              fontSize: 8, fontWeight: active ? 800 : 600, marginTop: 4, textAlign: 'center',
              color: done ? '#2e7d32' : active ? '#1a1a1a' : '#9e9e9e',
              lineHeight: 1.3, whiteSpace: 'pre-line',
            }}>{paso.label}</p>
          </div>
        );
      })}
    </div>
  );
}

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
  const [pedidos,    setPedidos]    = useState([]);
  const [user,       setUser]       = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [filterEstado, setFilterEstado] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    getMisVentas({ porPagina: 100 }).then(data => setPedidos(data.pedidos || [])).catch(() =>
      getPedidos({ porPagina: 100 }).then(data => setPedidos(data.pedidos || [])).catch(() => {})
    );
  }, []);

  const userPedidos = user
    ? pedidos.filter(p => p.cliente?.correo === user.correo || p.idCliente === user.id)
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
                          {fmtFecha(pedido.fecha_pedido)}
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
                        <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                          {COP(
                            (pedido.productosItems || []).reduce((s, p) => s + p.precio * p.cantidad, 0)
                            + (pedido.domicilio ? 5000 : 0)
                            - (pedido.descuento || 0)
                          )}
                        </p>
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
                          {pedido.domicilio
                            ? (pedido.direccion_entrega || '🛵 Domicilio')
                            : '🏪 Recogida en local'}
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

      {/* ── Modal Detalle ── */}
      {selectedPedido && (
        <div className="modal-overlay" onClick={() => setSelectedPedido(null)}>
          <div
            className="modal-box relative bg-white w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-none"
            style={{ borderRadius: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header shrink-0" style={{ background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-800) 100%)', padding: '20px 24px' }}>
              <div>
                <p className="modal-header__eyebrow">Pedido #{selectedPedido.numero}</p>
                <h2 className="modal-header__title">Detalle de Compra</h2>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="modal-close-btn">✕</button>
            </div>

            {/* Stepper de seguimiento */}
            <div style={{ padding: '16px 20px 0', background: '#fff', flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9e9e9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Seguimiento del pedido</p>
              <PedidoStepper estado={selectedPedido.estado} domicilio={selectedPedido.domicilio} />
            </div>

            {/* Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

              {/* Entrega */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f9fdf9', border: '1px solid #c8e6c9', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#9e9e9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    {selectedPedido.domicilio ? '🛵 Domicilio' : '🏪 Recogida en local'}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4 }}>
                    {selectedPedido.domicilio
                      ? (selectedPedido.direccion_entrega || 'Dirección registrada')
                      : 'Retiro en el local'}
                  </p>
                </div>
                <div style={{ background: '#f9fdf9', border: '1px solid #c8e6c9', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#9e9e9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>💳 Pago</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>{selectedPedido.metodo_pago || '—'}</p>
                  <p style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>{fmtFecha(selectedPedido.fecha_pedido)}</p>
                </div>
              </div>

              {/* Domiciliario (si aplica y está asignado) */}
              {selectedPedido.domicilio && selectedPedido.nombre_domiciliario && (
                <div style={{ background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🛵</span>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#6a1b9a', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Tu domiciliario</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{selectedPedido.nombre_domiciliario}</p>
                    <p style={{ fontSize: 11, color: '#9e9e9e', margin: 0 }}>Tiempo estimado: 30–45 min</p>
                  </div>
                </div>
              )}
              {selectedPedido.domicilio && !selectedPedido.nombre_domiciliario && selectedPedido.estado === 'Confirmado' && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#f57f17', fontWeight: 600 }}>
                  🕐 Asignando domiciliario...
                </div>
              )}

              {/* Productos */}
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9e9e9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Productos</p>
              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fdf9' }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase' }}>Producto</th>
                      <th style={{ padding: '8px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase' }}>Cant.</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#2e7d32', textTransform: 'uppercase' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.productosItems.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                          {item.nombre}
                          <span style={{ display: 'block', fontSize: 10, color: '#9e9e9e' }}>{COP(item.precio)} c/u</span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span style={{ background: '#f1f8f1', border: '1px solid #c8e6c9', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, color: '#2e7d32' }}>×{item.cantidad}</span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>{COP(item.precio * item.cantidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {selectedPedido.domicilio && (
                      <tr style={{ borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                        <td colSpan={2} style={{ padding: '8px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#9e9e9e' }}>🛵 Costo de domicilio</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#7b1fa2' }}>{COP(5000)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid #e8f5e9', background: '#f9fdf9' }}>
                      <td colSpan={2} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase' }}>Total pagado</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#2e7d32' }}>
                        {COP(
                          (selectedPedido.productosItems || []).reduce((s, p) => s + p.precio * p.cantidad, 0)
                          + (selectedPedido.domicilio ? 5000 : 0)
                          - (selectedPedido.descuento || 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setSelectedPedido(null)}>Cerrar</button>
              <button
                className="btn-cancel"
                style={{ background: '#f1f8f1', color: '#2e7d32', border: '1.5px solid #c8e6c9' }}
                onClick={() => descargarFacturaPedido(selectedPedido, user)}
              >
                📄 Descargar factura
              </button>
              {selectedPedido.domicilio && selectedPedido.id_domicilio &&
               !['Entregado', 'Cancelado'].includes(selectedPedido.estado) && (
                <button
                  className="btn-cancel"
                  onClick={() => { setSelectedPedido(null); navigate(`/cliente/chat/${selectedPedido.id_domicilio}`); }}
                >
                  💬 Chat con domiciliario
                </button>
              )}
              {selectedPedido.estado === 'Entregado' && (
                <button className="btn-save" onClick={() => handleRequestReturn(selectedPedido)}>Solicitar devolución</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosClientePage;