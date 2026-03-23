
import React from 'react';
import { ShoppingCart, Plus } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: number;
    nombre: string;
    descripcion?: string;
    precio: number;
    imagenPreview: string | null;
  };
  onAddToCart: (product: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col group">
      <div className="relative h-48 overflow-hidden">
        {product.imagenPreview ? (
          <img
            src={product.imagenPreview}
            alt={product.nombre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-5xl">
            🍌
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
            Disponible
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{product.nombre}</h3>
          <p className="text-gray-500 text-sm line-clamp-2 h-10 mt-1">
            {product.descripcion || "Delicioso producto de plátano preparado con los mejores ingredientes."}
          </p>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-medium">Precio</span>
            <span className="text-xl font-extrabold text-emerald-700">
              ${product.precio.toLocaleString('es-CO')}
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-colors shadow-sm shadow-emerald-200 flex items-center gap-2 group/btn"
            title="Añadir al carrito"
          >
            <span className="hidden group-hover/btn:block text-sm font-semibold pl-1">Añadir</span>
            <div className="relative">
              <ShoppingCart size={20} className="group-hover/btn:scale-110 transition-transform" />
              <Plus size={10} className="absolute -top-1 -right-1 stroke-[4px]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
