const STORAGE_KEY = 'toston_app_returns';

/**
 * Campos alineados con la tabla Devoluciones:
 * id            → ID_Devolucion   (generado localmente)
 * idVenta       → ID_Venta
 * productId     → ID_Producto (via Devolucion_Detalle)
 * productName   → nombre del producto (display)
 * motivo        → Motivo
 * evidencia     → Evidencia
 * comentario    → Comentario
 * date          → FechaDevolucion
 * status        → Estado
 */

export const getReturns = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const addReturn = ({ idVenta, productId, productName, motivo, evidencia = '', comentario = '' }) => {
  const returns = getReturns();

  const newReturn = {
    id:          Math.random().toString(36).substr(2, 9),
    idVenta,
    productId,
    productName,
    motivo,
    evidencia,
    comentario,
    date: new Date().toLocaleDateString('es-CO', {
      year:   'numeric',
      month:  'long',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    }),
    status: 'Pendiente',
  };

  const updated = [newReturn, ...returns];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReturn;
};

export const getReturnById = (id) => {
  return getReturns().find(r => r.id === id);
};

export const updateReturnStatus = (id, status) => {
  const returns = getReturns();
  const updated = returns.map(r => r.id === id ? { ...r, status } : r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.find(r => r.id === id);
};