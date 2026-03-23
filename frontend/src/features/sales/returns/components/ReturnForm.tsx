import React, { useState } from 'react';
import { addReturn } from '../services/returnService';
import { useApp } from '../../../../AppContext.jsx';

interface ReturnFormProps {
  onSuccess: () => void;
}

const ReturnForm: React.FC<ReturnFormProps> = ({ onSuccess }) => {
  const { productos } = useApp();
  const [productId, setProductId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !reason.trim()) {
      setError('⚠️ Completa todos los campos');
      return;
    }

    const selectedProduct = productos.find((p: any) => p.id === productId);
    
    addReturn({
      productId,
      productName: selectedProduct ? selectedProduct.nombre : 'Producto desconocido',
      reason
    });

    setProductId('');
    setReason('');
    setError('');
    onSuccess();
  };

  return (
    <div className="h-100 d-flex flex-direction-column">
      <h5 className="fw-bold mb-3" style={{ color: '#1a5c2a' }}>Nueva Solicitud</h5>
      <p className="text-muted small mb-4">Completa los datos para iniciar el proceso de devolución.</p>
      
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
      
      <form onSubmit={handleSubmit} className="flex-grow-1">
        <div className="mb-3">
          <label className="form-label small fw-bold">Producto</label>
          <select 
            className="form-select input-clean" 
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">-- Seleccionar --</option>
            {productos.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="form-label small fw-bold">Motivo</label>
          <textarea 
            className="form-control input-clean" 
            rows={5} 
            placeholder="Describe el inconveniente..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          ></textarea>
        </div>
        <button 
          type="submit" 
          className="btn btn-green w-100 py-2 shadow-sm mt-auto" 
        >
          Registrar Devolución
        </button>
      </form>
    </div>
  );
};

export default ReturnForm;
