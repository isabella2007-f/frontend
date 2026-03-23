import React from 'react';
import { ReturnRequest } from '../services/returnService';

interface ReturnListProps {
  returns: ReturnRequest[];
  onViewDetails: (request: ReturnRequest) => void;
}

const ReturnList: React.FC<ReturnListProps> = ({ returns, onViewDetails }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendiente': return <span className="badge badge-status bg-warning text-dark">Pendiente</span>;
      case 'Aprobado': return <span className="badge badge-status bg-success text-white">Aprobado</span>;
      case 'Rechazado': return <span className="badge badge-status bg-danger text-white">Rechazado</span>;
      default: return <span className="badge badge-status bg-secondary text-white">{status}</span>;
    }
  };

  if (returns.length === 0) {
    return (
      <div className="text-center p-5 border rounded-4 bg-light">
        <div className="mb-2 fs-2">📭</div>
        <p className="text-muted mb-0">No hay solicitudes registradas aún.</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-2">
      {returns.map((item) => (
        <div key={item.id} className="compact-card shadow-sm">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-light rounded-3 p-2 fw-bold text-success" style={{ minWidth: '40px', textAlign: 'center' }}>
                #
              </div>
              <div>
                <h6 className="fw-bold mb-0 text-dark">{item.productName}</h6>
                <span className="text-muted" style={{ fontSize: '11px' }}>{item.date}</span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              {getStatusBadge(item.status)}
              <button 
                className="btn btn-outline-success btn-sm fw-bold px-3 border-2" 
                style={{ borderRadius: '8px' }}
                onClick={() => onViewDetails(item)}
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReturnList;
