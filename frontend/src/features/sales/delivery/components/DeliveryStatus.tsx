import React from 'react';

interface DeliveryStatusProps {
  status: 'Pendiente' | 'En tránsito' | 'Entregado';
}

const DeliveryStatus: React.FC<DeliveryStatusProps> = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'Pendiente': return 'status-pendiente';
      case 'En tránsito': return 'status-entransito';
      case 'Entregado': return 'status-entregado';
      default: return '';
    }
  };

  return (
    <div className="delivery-card">
      <div className="detail-item">
        <span className="detail-label">Estado Actual</span>
        <div style={{ marginTop: '0.5rem' }}>
          <span className={`status-badge ${getStatusClass()}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryStatus;
