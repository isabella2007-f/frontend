import { useState, useEffect } from 'react';
import { deliveryService } from './services/deliveryService';
import DeliveryStatus from './components/DeliveryStatus';
import DeliveryDetails from './components/DeliveryDetails';
import DeliveryTimeline from './components/DeliveryTimeline';
import './Delivery.css';

const DeliveryPage = () => {
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar pedido al montar
  useEffect(() => {
    const orders = deliveryService.getOrders();
    const currentOrder = orders.find(o => o.id === 'PED-001') || orders[0];
    setOrder(currentOrder);
    setLoading(false);
  }, []);

  // Simulación de cambios de estado cada 15 segundos
  useEffect(() => {
    if (!order || order.status === 'Entregado') return;

    const timer = setInterval(() => {
      setOrder(prevOrder => {
        if (!prevOrder) return null;

        let nextStatus = prevOrder.status;
        let description = '';

        if (prevOrder.status === 'Pendiente') {
          nextStatus  = 'En tránsito';
          description = 'El repartidor ha recogido su pedido y va en camino.';
        } else if (prevOrder.status === 'En tránsito') {
          nextStatus  = 'Entregado';
          description = '¡Buen provecho! Su pedido ha sido entregado.';
        }

        if (nextStatus !== prevOrder.status) {
          return deliveryService.updateOrderStatus(prevOrder.id, nextStatus, description);
        }

        return prevOrder;
      });
    }, 15000);

    return () => clearInterval(timer);
  }, [order]);

  const handleDownloadReceipt = () => {
    if (!order) return;

    const content = `
========================================
    TOSTÓN APP - COMPROBANTE DE PAGO
========================================
Número de Pedido: ${order.id}
Fecha: ${order.date}
Entregado: ${new Date().toLocaleString()}
----------------------------------------
Productos:
${order.items.map(i => `- ${i.name} (x${i.quantity}): $${(i.price * i.quantity).toLocaleString()}`).join('\n')}
----------------------------------------
TOTAL: $${order.total.toLocaleString()}
========================================
¡Gracias por preferir Tostón App!
========================================
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `Comprobante_${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="delivery-container">Cargando seguimiento...</div>;
  if (!order)  return <div className="delivery-container">Pedido no encontrado.</div>;

  return (
    <div className="delivery-container">
      <div className="delivery-header">
        <h2>Seguimiento de Pedido</h2>
        <p style={{ color: '#666' }}>Consulta el estado de tu domicilio en tiempo real.</p>
      </div>

      <div className="simulation-banner">
        🕒 <b>Modo Simulación:</b> El estado se actualizará automáticamente cada 15 segundos para propósitos de demostración.
      </div>

      <div className="delivery-grid">
        <div>
          <DeliveryStatus status={order.status} />
          <DeliveryDetails order={order} onDownload={handleDownloadReceipt} />
        </div>
        <div>
          <DeliveryTimeline history={order.history} />
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;