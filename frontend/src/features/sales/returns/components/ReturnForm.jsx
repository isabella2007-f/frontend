import { useState, useEffect } from 'react';
import { addReturn }  from '../services/returnService.js';
import { useApp }     from '../../../../AppContext.jsx';
import { PackageMinus, AlertCircle, FileText, Hash, Image } from 'lucide-react';

const MOTIVOS = [
  'Producto en mal estado',
  'Producto incompleto',
  'Producto equivocado',
  'Daño durante el transporte',
  'No cumple con lo descrito',
  'Otro',
];

const ReturnForm = ({ onSuccess, defaultIdVenta = '', orderProducts = [] }) => {
  const [form,  setForm]  = useState({
    idVenta:   defaultIdVenta,
    productId: '',
    motivo:    '',
    evidencia: '',
    comentario: '',
  });

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      idVenta: defaultIdVenta || prev.idVenta,
    }));
  }, [defaultIdVenta]);

  const [error, setError] = useState('');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.idVenta.trim() || !form.productId || !form.motivo) {
      setError('Completa los campos obligatorios: Producto y motivo.');
      return;
    }

    const selectedProduct = orderProducts.find(p => String(p.idProducto || p.id) === String(form.productId));

    addReturn({
      idVenta:    form.idVenta.trim(),
      productId:  form.productId,
      productName: selectedProduct ? selectedProduct.nombre : 'Producto desconocido',
      motivo:     form.motivo,
      evidencia:  form.evidencia.trim(),
      comentario: form.comentario.trim(),
    });

    setForm({ idVenta: '', productId: '', motivo: '', evidencia: '', comentario: '' });
    setError('');
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 p-4 rounded-2xl animate-in fade-in zoom-in duration-300">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-xs font-bold text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Producto */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            <PackageMinus size={12} className="text-emerald-500" /> Producto <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none appearance-none"
            value={form.productId}
            onChange={e => set('productId', e.target.value)}
          >
            <option value="">— Elegir producto —</option>
            {orderProducts.map(p => (
              <option key={p.idProducto || p.id} value={p.idProducto || p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Motivo */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
            <FileText size={12} className="text-emerald-500" /> Motivo <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none appearance-none"
            value={form.motivo}
            onChange={e => set('motivo', e.target.value)}
          >
            <option value="">— Elegir motivo —</option>
            {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Evidencia */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <Image size={12} className="text-emerald-500" /> Evidencia
          <span className="text-[9px] font-bold text-gray-300 normal-case">(Opcional: URL de foto o descripción)</span>
        </label>
        <input
          type="text"
          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-3.5 px-4 text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
          placeholder="Ej: https://imgur.com/foto-dano"
          value={form.evidencia}
          onChange={e => set('evidencia', e.target.value)}
        />
      </div>

      {/* Comentario */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
          <FileText size={12} className="text-emerald-500" /> Descripción detallada
        </label>
        <textarea
          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 px-4 text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none resize-none"
          rows={3}
          placeholder="Explícanos brevemente qué sucedió con el producto..."
          value={form.comentario}
          onChange={e => set('comentario', e.target.value)}
        />
      </div>

      <button 
        type="submit" 
        className="w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200"
      >
        <PackageMinus size={16} strokeWidth={3} />
        Enviar Solicitud de Devolución
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
      </button>
    </form>
  );
};

export default ReturnForm;