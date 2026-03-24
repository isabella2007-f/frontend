import { useState } from 'react';
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

const ReturnForm = ({ onSuccess }) => {
  const { productos } = useApp();

  const [form,  setForm]  = useState({
    idVenta:   '',
    productId: '',
    motivo:    '',
    evidencia: '',
    comentario: '',
  });
  const [error, setError] = useState('');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.idVenta.trim() || !form.productId || !form.motivo) {
      setError('Completa los campos obligatorios: N° de venta, producto y motivo.');
      return;
    }

    const selectedProduct = productos.find(p => String(p.id) === String(form.productId));

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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'var(--gray-100)',
    border: '1.5px solid transparent',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--gray-900)',
    outline: 'none',
    transition: 'all .2s',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--gray-700)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    fontFamily: 'var(--font-body)',
    marginBottom: 6,
  };

  const fieldWrap = { marginBottom: 18 };

  return (
    <form onSubmit={handleSubmit}>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fee2e2', border: '1px solid #fca5a5',
          color: '#991b1b', borderRadius: 'var(--radius-md)',
          padding: '10px 14px', marginBottom: 18,
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* N° de Venta */}
      <div style={fieldWrap}>
        <label style={labelStyle}>
          <Hash size={12} /> N° de Venta <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <input
          style={inputStyle}
          type="text"
          placeholder="Ej: VTA-001"
          value={form.idVenta}
          onChange={e => set('idVenta', e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--green-600)'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; }}
          onBlur={e  => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
        />
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
          Encuéntralo en tu historial de pedidos.
        </p>
      </div>

      {/* Producto */}
      <div style={fieldWrap}>
        <label style={labelStyle}>
          <PackageMinus size={12} /> Producto <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <select
          style={inputStyle}
          value={form.productId}
          onChange={e => set('productId', e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--green-600)'; }}
          onBlur={e  => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; }}
        >
          <option value="">— Seleccionar producto —</option>
          {(productos || []).map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {/* Motivo */}
      <div style={fieldWrap}>
        <label style={labelStyle}>
          <FileText size={12} /> Motivo <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <select
          style={inputStyle}
          value={form.motivo}
          onChange={e => set('motivo', e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--green-600)'; }}
          onBlur={e  => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; }}
        >
          <option value="">— Seleccionar motivo —</option>
          {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Evidencia (URL / descripción) */}
      <div style={fieldWrap}>
        <label style={labelStyle}>
          <Image size={12} /> Evidencia
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray-500)', textTransform: 'none', letterSpacing: 0 }}>
            (opcional)
          </span>
        </label>
        <input
          style={inputStyle}
          type="text"
          placeholder="URL de foto o descripción del daño"
          value={form.evidencia}
          onChange={e => set('evidencia', e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--green-600)'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; }}
          onBlur={e  => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Comentario adicional */}
      <div style={fieldWrap}>
        <label style={labelStyle}>
          <FileText size={12} /> Comentario adicional
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray-500)', textTransform: 'none', letterSpacing: 0 }}>
            (opcional)
          </span>
        </label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          placeholder="Cualquier detalle adicional que nos ayude a procesar tu solicitud..."
          value={form.comentario}
          onChange={e => set('comentario', e.target.value)}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = 'var(--green-600)'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; }}
          onBlur={e  => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
        <PackageMinus size={16} />
        Registrar Devolución
      </button>
    </form>
  );
};

export default ReturnForm;