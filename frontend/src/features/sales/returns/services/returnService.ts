export interface ReturnRequest {
  id: string;
  productId: string;
  productName: string;
  reason: string;
  date: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  additionalInfo?: string;
}

const STORAGE_KEY = 'toston_app_returns';

export const getReturns = (): ReturnRequest[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const addReturn = (returnData: Omit<ReturnRequest, 'id' | 'status' | 'date'>): ReturnRequest => {
  const returns = getReturns();
  const newReturn: ReturnRequest = {
    ...returnData,
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: 'Pendiente',
    additionalInfo: 'Su solicitud está siendo revisada por nuestro equipo de calidad.'
  };
  
  const updatedReturns = [newReturn, ...returns];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReturns));
  return newReturn;
};

export const getReturnById = (id: string): ReturnRequest | undefined => {
  const returns = getReturns();
  return returns.find(r => r.id === id);
};
