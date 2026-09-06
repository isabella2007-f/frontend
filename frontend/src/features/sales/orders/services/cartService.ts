export interface CartItem {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagenPreview: string | null;
  stock?: number;
  pedidoProgramado?: boolean;
  requiereProduccion?: boolean;
}

const CART_KEY = "toston_app_cart";

/** Lo que pasó al intentar agregar algo al carrito. */
export interface ResultadoAgregar {
  /** Cuántas unidades entraron de verdad. */
  agregado: number;
  /** Cuántas se quedaron afuera por falta de stock. */
  rechazado: number;
  /** Cuántas quedaron en el carrito. */
  total: number;
  /** El tope que lo limitó (el stock), o null si no había tope. */
  tope: number | null;
}

/**
 * Cuántas unidades de esto se pueden llevar.
 *
 * Lo que la panadería fabrica no tiene tope: el faltante se hornea. Lo que no,
 * se limita al stock — incluido el caso de stock 0, que antes se colaba como
 * "sin límite" en las tres funciones que tocaban cantidades y terminaba en un
 * pedido que el servidor rechaza al crearlo.
 */
const topeDe = (item: { stock?: number; requiereProduccion?: boolean;
                        pedidoProgramado?: boolean }): number =>
  (item.requiereProduccion || item.pedidoProgramado)
    ? Infinity
    : (item.stock ?? 0);

export const getCart = (): CartItem[] => {
  const cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
};

export const saveCart = (cart: CartItem[]): void => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addToCart = (product: any): ResultadoAgregar =>
  addToCartWithQty(product, 1);

/**
 * Saca del carrito lo que ya no se vende.
 *
 * El carrito guarda una copia del producto en localStorage, así que un producto
 * que el admin desactiva de la tienda seguía ahí: sumaba al total, contaba en
 * el badge y viajaba dentro del pedido, aunque en el catálogo ya no apareciera.
 * Quien tiene la lista de lo que se puede comprar es el catálogo, así que al
 * cargarse limpia el carrito.
 *
 * Con la lista vacía no hace nada: eso pasa mientras los productos cargan o si
 * la petición falla, y no prueba que el carrito sobre.
 */
export const sanitizeCart = (idsVendibles: number[]): void => {
  if (!idsVendibles.length) return;
  const permitidos = new Set(idsVendibles.map(Number));
  const cart = getCart();
  const limpio = cart.filter((item) => permitidos.has(Number(item.id)));
  if (limpio.length === cart.length) return;
  saveCart(limpio);
  window.dispatchEvent(new Event('cart-updated'));
};

export const removeFromCart = (productId: number): void => {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  window.dispatchEvent(new Event('cart-updated'));
};

export const updateQuantity = (productId: number, quantity: number): void => {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) {
    // `stock || Infinity` dejaba sin tope justo lo que tiene stock 0.
    item.cantidad = Math.max(1, Math.min(quantity, topeDe(item)));
    saveCart(cart);
    window.dispatchEvent(new Event('cart-updated'));
  }
};

export const clearCart = (): void => {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cart-updated'));
};

export const getTotal = (): number => {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
};

export const getCartCount = (): number => {
  const cart = getCart();
  return cart.reduce((acc, item) => acc + item.cantidad, 0);
};

/**
 * Agrega `qty` unidades y devuelve qué pasó.
 *
 * El tope se mide contra lo que YA hay en el carrito, no contra lo que se está
 * agregando: comprobar solo lo segundo era lo que dejaba sumar de a uno sin
 * fin con el carrito ya lleno hasta el stock.
 */
export const addToCartWithQty = (
  product: any,
  qty: number,
  pedidoProgramado = false,
): ResultadoAgregar => {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  const referencia = existing ?? {
    stock:              product.stock ?? 0,
    requiereProduccion: product.requiereProduccion ?? false,
    pedidoProgramado,
  };
  // El pedido programado llega desde afuera: puede convertir en ilimitado algo
  // que ya estaba en el carrito con tope.
  const tope = topeDe({ ...referencia, pedidoProgramado:
    pedidoProgramado || (referencia as any).pedidoProgramado });

  const yaHay = existing?.cantidad ?? 0;
  const cabe  = Math.max(0, tope - yaHay);
  const entran = Math.max(0, Math.min(qty, cabe));

  if (entran > 0) {
    if (existing) {
      existing.cantidad += entran;
      if (pedidoProgramado) existing.pedidoProgramado = true;
    } else {
      cart.push({
        id:                 product.id,
        nombre:             product.nombre,
        precio:             product.precio,
        cantidad:           entran,
        imagenPreview:      product.imagenPreview || product.imagen || null,
        stock:              product.stock ?? 0,
        pedidoProgramado,
        requiereProduccion: product.requiereProduccion ?? false,
      });
    }
    saveCart(cart);
    window.dispatchEvent(new Event('cart-updated'));
  }

  return {
    agregado:  entran,
    rechazado: Math.max(0, qty - entran),
    total:     yaHay + entran,
    tope:      Number.isFinite(tope) ? tope : null,
  };
};