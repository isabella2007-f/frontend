import { useState, useEffect } from 'react';
import { useApp } from '../../../AppContext';
import { addToCart } from './services/cartService';
import ProductCard from './components/ProductCard';
import { Search, SlidersHorizontal, ShoppingBag, Leaf } from 'lucide-react';
import '../../../styles/client.css';

const OrdersPage = () => {
  const { productos, categoriasProductosActivas } = useApp();

  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeProducts,   setActiveProducts]   = useState([]);
  const [cartUpdateToggle, setCartUpdateToggle] = useState(false);

  useEffect(() => {
    const activeCatIds = new Set(
      (categoriasProductosActivas || []).map(c => Number(c.id))
    );

    const filtered = (productos || []).filter(p => {
      const categoryId = Number(p.idCategoria);
      return (
        activeCatIds.has(categoryId) &&
        (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedCategory === 'all' || categoryId === Number(selectedCategory)) &&
        (p.stock || 0) > 0
      );
    });

    setActiveProducts(filtered);
  }, [productos, categoriasProductosActivas, searchTerm, selectedCategory]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setCartUpdateToggle(!cartUpdateToggle);
    window.dispatchEvent(new Event('cart-updated'));
  };

  return (
    <div className="toston-page">

      {/* ── Hero ── */}
      <header className="page-hero">
        <div className="page-hero__inner">
          <div>
            <span className="page-hero__label">
              <Leaf size={11} /> Tostón App
            </span>
            <h1 className="page-hero__title">
              Realiza tu <em>Pedido</em>
            </h1>
            <p className="page-hero__sub">
              Plátano fresco, delicioso y artesanal — directo a la puerta de tu casa.
            </p>
          </div>

          <div className="page-hero__badge">
            <span className="page-hero__badge-icon">
              <ShoppingBag size={18} color="white" />
            </span>
            {activeProducts.length} producto{activeProducts.length !== 1 ? 's' : ''} disponible{activeProducts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="page-content">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={16} />
            <input
              className="search-input"
              type="text"
              placeholder="Buscar por nombre de producto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="chips">
            <button
              className={`chip ${selectedCategory === 'all' ? 'chip--active' : 'chip--default'}`}
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </button>

            {(categoriasProductosActivas || []).map(cat => (
              <button
                key={cat.id}
                className={`chip ${selectedCategory === cat.id ? 'chip--active' : 'chip--default'}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                {cat.nombre}
              </button>
            ))}
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '12px 14px' }}
            title="Filtros avanzados"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Grid de productos */}
        {activeProducts.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '24px',
          }}>
            {activeProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <Search size={32} />
            </div>
            <h3 className="empty-state__title">No encontramos productos</h3>
            <p className="empty-state__text">
              Intenta con otra búsqueda o selecciona una categoría diferente.
            </p>
            <button
              className="btn-primary"
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
            >
              Ver todos los productos
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;