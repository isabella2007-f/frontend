import { useState, useEffect } from 'react';
import { useApp } from '../../../AppContext';
import { addToCart } from './services/cartService';
import ProductCard from './components/ProductCard';
import { Search, SlidersHorizontal, ShoppingBag } from 'lucide-react';

const OrdersPage = () => {
  const { productos, categoriasProductosActivas } = useApp();

  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeProducts, setActiveProducts]   = useState([]);
  const [cartUpdateToggle, setCartUpdateToggle] = useState(false);

  useEffect(() => {
    const activeCatIds = new Set(
      (categoriasProductosActivas || []).map(c => Number(c.id))
    );

    const filtered = (productos || []).filter(p => {
      const categoryId = Number(p.idCategoria);

      const isFromActiveCategory = activeCatIds.has(categoryId);

      const matchesSearch = (p.nombre || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || categoryId === Number(selectedCategory);

      const hasStock = (p.stock || 0) > 0;

      return isFromActiveCategory && matchesSearch && matchesCategory && hasStock;
    });

    setActiveProducts(filtered);
  }, [productos, categoriasProductosActivas, searchTerm, selectedCategory]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setCartUpdateToggle(!cartUpdateToggle);
    window.dispatchEvent(new Event('cart-updated'));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Header */}
      <div className="bg-emerald-600 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-emerald-700 rounded-full blur-3xl opacity-30"></div>

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Realiza tu Pedido</h1>
              <p className="text-emerald-100 text-lg font-medium max-w-xl">
                Selecciona tus productos favoritos de plátano y recíbelos en la puerta de tu casa.
                Fresco, delicioso y artesanal.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl flex items-center gap-2 border border-white/20">
              <div className="bg-white text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg">
                <ShoppingBag size={20} className="stroke-[2.5px]" />
                <span className="font-bold">
                  Productos Disponibles: {activeProducts.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
        {/* Toolbar */}
        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-emerald-900/5 border border-emerald-50 mb-10">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre de producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium text-gray-700"
              />
            </div>

            {/* Categorías */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                }`}
              >
                Todos
              </button>

              {(categoriasProductosActivas || []).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.nombre}
                </button>
              ))}
            </div>

            <button className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center justify-center hover:bg-emerald-100 transition-colors">
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Productos */}
        {activeProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {activeProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-emerald-100">
            <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-emerald-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No encontramos productos
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Intenta con otra búsqueda o selecciona una categoría diferente.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="mt-8 text-emerald-600 font-bold hover:underline"
            >
              Ver todos los productos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;