import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../AppContext.jsx';
import { getCurrentUser } from '../profile/services/profileService.js';
import { Package, Clock, CheckCircle, UserCircle, Leaf } from 'lucide-react';
import '../../../styles/Client.css';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);


const InicioPage = () => {
  const { productos, pedidos, categoriasProductos } = useApp();
  const [user, setUser] = useState(null);
  const [userPedidos, setUserPedidos] = useState([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      const filteredPedidos = pedidos.filter(p => p.idCliente === currentUser.cedula);
      setUserPedidos(filteredPedidos);
    }
  }, [pedidos]);

  const getCategoriaNombre = (idCategoria) => {
    const cat = categoriasProductos.find(c => c.id === idCategoria);
    return cat ? cat.nombre : 'Sin categoría';
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Entregado': return { bg: 'var(--green-100)', color: 'var(--green-800)' };
      case 'En camino': return { bg: 'var(--blue-100)', color: 'var(--blue-800)' };
      case 'En producción': return { bg: 'var(--yellow-100)', color: 'var(--yellow-800)' };
      default: return { bg: 'var(--gray-100)', color: 'var(--gray-800)' };
    }
  };

  if (!user) return <div className="toston-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>⌛</div>
      <p>Cargando...</p>
    </div>
  </div>;

  return (
    <div className="toston-page">

      {/* Hero */}
      <header className="page-hero">
        <div className="page-hero__inner">
          <div>
            <span className="page-hero__label">
              <Leaf size={11} /> Tostón App
            </span>
            <h1 className="page-hero__title">
              ¡Hola, <em>{user.nombre}</em>!
            </h1>
            <p className="page-hero__sub">
              Bienvenido de vuelta. Explora nuestros productos y revisa tus pedidos.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="page-hero__badge">
              <span className="page-hero__badge-icon">
                <UserCircle size={18} color="white" />
              </span>
              {user.nombre} {user.apellidos}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="page-content">
        <div style={{ display: 'grid', gap: 32 }}>

          {/* Estadísticas rápidas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Package size={32} color="var(--green-600)" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--gray-900)' }}>{userPedidos.length}</p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-500)' }}>Pedidos realizados</p>
            </div>

            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <Clock size={32} color="var(--blue-600)" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--gray-900)' }}>
                {userPedidos.filter(p => p.estado === 'En producción' || p.estado === 'Pendiente').length}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-500)' }}>Pedidos activos</p>
            </div>

            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <CheckCircle size={32} color="var(--green-600)" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--gray-900)' }}>
                {userPedidos.filter(p => p.estado === 'Entregado').length}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-500)' }}>Pedidos completados</p>
            </div>
          </div>

          {/* Productos disponibles */}
          <section>
            <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>
              Productos disponibles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {productos.filter(p => p.stock > 0).map(producto => (
                <div key={producto.id} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ width: '100%', height: 150, background: 'var(--gray-100)', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                    🥑
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>
                    {producto.nombre}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                    {getCategoriaNombre(producto.idCategoria)}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-700)' }}>
                      ${producto.precio.toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      Stock: {producto.stock}
                    </span>
                  </div>
                  <button className="btn-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>
                    <ShoppingCart size={14} /> Agregar al carrito
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Pedidos recientes */}
          <section>
            <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 700, color: 'var(--gray-900)' }}>
              Tus pedidos recientes
            </h2>
            {userPedidos.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <Package size={48} color="var(--gray-300)" style={{ marginBottom: 16 }} />
                <p style={{ margin: 0, color: 'var(--gray-500)' }}>No tienes pedidos aún</p>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--gray-400)' }}>
                  ¡Explora nuestros productos y haz tu primer pedido!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {userPedidos.slice(0, 5).map(pedido => {
                  const estadoStyle = getEstadoColor(pedido.estado);
                  return (
                    <div key={pedido.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gray-900)' }}>
                            {pedido.numero}
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>
                            {pedido.fecha_pedido} • {pedido.productosItems.length} producto{pedido.productosItems.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: estadoStyle.bg, color: estadoStyle.color
                        }}>
                          {pedido.estado}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>
                          Total: ${pedido.total.toLocaleString()}
                        </span>
                        <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default InicioPage;