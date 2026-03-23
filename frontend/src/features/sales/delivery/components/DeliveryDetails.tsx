import React from 'react';
import { Order } from '../services/deliveryService';

interface DeliveryDetailsProps {
  order: Order;
  onDownload: () => void;
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({ order, onDownload }) => {
  return (
    <div className="delivery-card">
      <div className="delivery-grid">
        <div className="detail-item">
          <span className="detail-label">Número de Pedido</span>
          <span className="detail-value">{order.id}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Fecha del Pedido</span>
          <span className="detail-value">{order.date}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Estimado de Entrega</span>
          <span className="detail-value">{order.estimatedDelivery}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Dirección de Entrega</span>
          <span className="detail-value">{order.address}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Repartidor Asignado</span>
          <span className="detail-value">{order.deliveryPerson}</span>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <span className="detail-label">Productos</span>
        <table className="products-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>${item.price.toLocaleString()}</td>
                <td>${(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: 'right' }}>Total:</td>
              <td>${order.total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {order.status === 'Entregado' && (
        <button className="btn-download" onClick={onDownload}>
          <span>📄</span> Descargar comprobante
        </button>
      )}
    </div>
  );
};

export default DeliveryDetails;
