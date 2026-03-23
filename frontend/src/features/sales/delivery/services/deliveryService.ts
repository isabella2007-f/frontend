export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface StatusEvent {
  status: 'Pendiente' | 'En tránsito' | 'Entregado';
  date: string;
  description: string;
}

export interface Order {
  id: string;
  date: string;
  estimatedDelivery: string;
  status: 'Pendiente' | 'En tránsito' | 'Entregado';
  address: string;
  deliveryPerson: string;
  items: OrderItem[];
  total: number;
  history: StatusEvent[];
}

const STORAGE_KEY = 'toston_delivery_orders';

const initialOrders: Order[] = [
  {
    id: 'PED-001',
    date: '2026-03-20 14:30',
    estimatedDelivery: '2026-03-20 15:30',
    status: 'Pendiente',
    address: 'Calle 10 #23-45, Barrio Centro',
    deliveryPerson: 'Juan Pérez',
    items: [
      { name: 'Tostón Tradicional', price: 15000, quantity: 2 },
      { name: 'Gaseosa 500ml', price: 3500, quantity: 1 }
    ],
    total: 33500,
    history: [
      { status: 'Pendiente', date: '2026-03-20 14:30', description: 'Pedido creado exitosamente.' }
    ]
  },
  {
    id: 'PED-002',
    date: '2026-03-21 11:00',
    estimatedDelivery: '2026-03-21 12:00',
    status: 'Entregado',
    address: 'Carrera 45 #89-12, Conjunto Las Flores',
    deliveryPerson: 'María López',
    items: [
      { name: 'Combo Familiar', price: 45000, quantity: 1 }
    ],
    total: 45000,
    history: [
      { status: 'Pendiente', date: '2026-03-21 11:00', description: 'Pedido creado exitosamente.' },
      { status: 'En tránsito', date: '2026-03-21 11:30', description: 'El repartidor ha recogido su pedido.' },
      { status: 'Entregado', date: '2026-03-21 11:55', description: 'Pedido entregado en la dirección indicada.' }
    ]
  }
];

export const deliveryService = {
  getOrders: (): Order[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialOrders));
      return initialOrders;
    }
    return JSON.parse(data);
  },

  getOrderById: (id: string): Order | undefined => {
    const orders = deliveryService.getOrders();
    return orders.find(o => o.id === id);
  },

  updateOrderStatus: (id: string, newStatus: Order['status'], description: string): Order | null => {
    const orders = deliveryService.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const order = orders[index];
    if (order.status === newStatus) return order;

    const newHistory: StatusEvent = {
      status: newStatus,
      date: new Date().toLocaleString(),
      description
    };

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      history: [...order.history, newHistory]
    };

    orders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return updatedOrder;
  },

  getOrderHistory: (id: string): StatusEvent[] => {
    const order = deliveryService.getOrderById(id);
    return order ? order.history : [];
  }
};
