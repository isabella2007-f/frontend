import React from 'react';
import { StatusEvent } from '../services/deliveryService';

interface DeliveryTimelineProps {
  history: StatusEvent[];
}

const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({ history }) => {
  return (
    <div className="delivery-card">
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a5c2a' }}>
        Historial de Estados
      </h3>
      <ul className="timeline">
        {history.map((event, index) => (
          <li key={index} className="timeline-item">
            <div className="timeline-dot">
              {event.status === 'Entregado' ? '✅' : 
               event.status === 'En tránsito' ? '🚚' : '📦'}
            </div>
            <div className="timeline-content">
              <h4>{event.status}</h4>
              <span className="date">{event.date}</span>
              <p>{event.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeliveryTimeline;
