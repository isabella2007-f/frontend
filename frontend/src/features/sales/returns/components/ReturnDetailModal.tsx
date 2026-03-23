import React from 'react';
import { ReturnRequest } from '../services/returnService';

interface ReturnDetailModalProps {
  show: boolean;
  onClose: () => void;
  request: ReturnRequest | null;
}

const ReturnDetailModal: React.FC<ReturnDetailModalProps> = ({ show, onClose, request }) => {
  if (!request) return null;

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'bg-warning text-dark';
      case 'Aprobado': return 'bg-success text-white';
      case 'Rechazado': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  };

  return (
    <div className={`modal fade modal-glamour ${show ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-2xl border-0 p-0">
          <div className="modal-header text-white p-4 border-0">
            <h5 className="modal-title fw-bold fs-4">🔎 Detalles del Proceso</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body p-4 bg-white">
            <div className="text-center mb-4">
               <span className={`badge badge-elegant ${getStatusClass(request.status)} px-4 py-2 fs-6`}>
                {request.status === 'Pendiente' ? '⌛ Pendiente' : request.status === 'Aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
              </span>
            </div>
            
            <div className="p-3 bg-light rounded-4 mb-3 border">
              <div className="d-flex align-items-center gap-3">
                <div className="fs-1">🛒</div>
                <div>
                  <p className="text-muted small mb-0 fw-bold text-uppercase">Producto</p>
                  <p className="fw-bold mb-0 text-dark fs-5">{request.productName}</p>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 p-3 bg-white rounded-4 border">
                <p className="text-muted small mb-1 fw-bold text-uppercase">📅 Fecha de Solicitud</p>
                <p className="fw-bold mb-0 text-dark">{request.date}</p>
              </div>

              <div className="col-12 p-3 bg-white rounded-4 border">
                <p className="text-muted small mb-1 fw-bold text-uppercase">💬 Motivo del Cliente</p>
                <p className="mb-0 fst-italic text-secondary">"{request.reason}"</p>
              </div>

              <div className="col-12 p-3 rounded-4" style={{ backgroundColor: '#e8f5e9', border: '1px dashed #1a5c2a' }}>
                <p className="text-success small mb-1 fw-bold text-uppercase">📣 Nota del Sistema</p>
                <p className="mb-0 small text-dark fw-medium">{request.additionalInfo || 'Procesando información...'}</p>
              </div>
            </div>
          </div>
          <div className="modal-footer border-0 p-4 pt-0 bg-white">
            <button 
              type="button" 
              className="btn btn-dazzle w-100 py-3" 
              onClick={onClose}
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailModal;
