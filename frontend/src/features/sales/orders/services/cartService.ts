
export interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagenPreview: string | null;
}

const CART_KEY = "toston_app_cart";

export const getCart = (): CartItem[] => {
  const cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
};

export const saveCart = (cart: CartItem[]): void => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addToCart = (product: any): void => {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      cantidad: 1,
      imagenPreview: product.imagenPreview,
    });
  }
  saveCart(cart);
};

export const removeFromCart = (productId: number): void => {
  const cart = getCart();
  const filtered = cart.filter((item) => item.id !== productId);
  saveCart(filtered);
};

export const updateQuantity = (productId: number, quantity: number): void => {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.cantidad = Math.max(1, quantity);
    saveCart(cart);
  }
};

export const clearCart = (): void => {
  localStorage.removeItem(CART_KEY);
};

export const getTotal = (): number => {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
};

export const getCartCount = (): number => {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.cantidad, 0);
};
