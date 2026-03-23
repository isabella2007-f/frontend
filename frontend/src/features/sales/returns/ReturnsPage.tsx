import React, { useState, useEffect } from 'react';
import ReturnForm from './components/ReturnForm';
import ReturnList from './components/ReturnList';
import ReturnDetailModal from './components/ReturnDetailModal';
import { getReturns, ReturnRequest } from './services/returnService';
import './Returns.css';

const ReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const loadReturns = () => {
    setReturns(getReturns());
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleSuccess = () => {
    loadReturns();
    setToast({ message: '✅ Solicitud registrada con éxito', show: true });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleViewDetails = (request: ReturnRequest) => {
    setSelectedReturn(request);
    setShowModal(true);
  };

  return (
    <div className="container-fluid px-4 py-3 returns-dashboard">
      {/* Toast Sencillo */}
      {toast.show && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-4" style={{ zIndex: 1100 }}>
          <div className="alert alert-success shadow border-0 px-4 py-2 fw-bold" style={{ borderRadius: '10px', backgroundColor: '#1a5c2a', color: 'white' }}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Header Compacto */}
      <div className="returns-header">
        <div className="d-flex align-items-center gap-3">
          <span className="fs-3">🔄</span>
          <div>
            <h3 className="fw-bold mb-0" style={{ color: '#1a5c2a' }}>Gestión de Devoluciones</h3>
            <p className="text-muted small mb-0">Portal de atención para solicitudes de clientes</p>
          </div>
        </div>
      </div>

      {/* Cuerpo del Dashboard */}
      <div className="returns-content">
        <div className="form-column shadow-sm">
          <ReturnForm onSuccess={handleSuccess} />
        </div>
        
        <div className="list-column shadow-sm p-4 bg-white rounded-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0">📦 Solicitudes Registradas</h5>
            <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-bold">
              {returns.length} En total
            </span>
          </div>
          <ReturnList returns={returns} onViewDetails={handleViewDetails} />
        </div>
      </div>

      <ReturnDetailModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        request={selectedReturn} 
      />
    </div>
  );
};

export default ReturnsPage;
