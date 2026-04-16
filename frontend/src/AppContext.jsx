import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

/* ══════════════════════════════════════════════════════════
   UTILIDADES DE FECHAS
══════════════════════════════════════════════════════════ */

export const diasHasta = (fechaISO) => {
  if (!fechaISO) return Infinity;
  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
  const target = new Date(fechaISO + "T00:00:00");
  return Math.round((target - hoy) / 86_400_000);
};

export const estadoLote = (lote) => {
  if (lote.cantidadActual <= 0)      return "agotado";
  const dias = diasHasta(lote.fechaVencimiento);
  if (dias < 0)                      return "vencido";
  if (dias <= 7)                     return "por-vencer";
  return "activo";
};

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fechaHoy = () => new Date().toISOString().split("T")[0];

export const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(dias));
  return d.toISOString().split("T")[0];
};

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES
══════════════════════════════════════════════════════════ */

const initCategoriasProductos = [
  { id: 1, nombre: "Congelados", descripcion: "Productos fríos a base de plátano",  estado: true,  fecha: "12/12/2025", icon: "🧊" },
  { id: 2, nombre: "Postres",    descripcion: "Productos dulces de plátano",         estado: true,  fecha: "12/12/2025", icon: "🍮" },
  { id: 3, nombre: "Snacks",     descripcion: "Tostones y chips de plátano",         estado: true,  fecha: "01/01/2026", icon: "🍟" },
  { id: 4, nombre: "Harinas",    descripcion: "Harinas y mezclas de plátano verde",  estado: true,  fecha: "20/02/2026", icon: "🌾" },
  { id: 5, nombre: "Orgánicos",  descripcion: "Línea orgánica certificada",          estado: true,  fecha: "28/02/2026", icon: "🌿" },
];

const initCategoriasInsumos = [
  { id: 1, nombre: "Vegetales",       icon: "🥬", descripcion: "Ingredientes frescos.",               estado: true, fecha: "12/12/2025" },
  { id: 2, nombre: "Proteínas",       icon: "🥩", descripcion: "Para rellenos o acompañamientos.",   estado: true, fecha: "12/12/2025" },
  { id: 3, nombre: "Lácteos",         icon: "🧀", descripcion: "Muy usados en lasañas o rellenos.",  estado: true, fecha: "12/12/2025" },
  { id: 4, nombre: "Harinas y masas", icon: "🌾", descripcion: "Para empanadas u otros productos.",  estado: true, fecha: "12/12/2025" },
  { id: 5, nombre: "Condimentos",     icon: "🧂", descripcion: "Para saborizar los productos.",      estado: true, fecha: "12/12/2025" },
  { id: 6, nombre: "Aceites",         icon: "🛢️", descripcion: "Para freír.",                        estado: true, fecha: "12/12/2025" },
  { id: 7, nombre: "Salsas",          icon: "🥫", descripcion: "Para preparación o acompañamiento.", estado: true, fecha: "12/12/2025" },
  { id: 8, nombre: "Empaques",        icon: "📦", descripcion: "Para vender los productos.",         estado: true, fecha: "12/12/2025" },
];

export const UNIDADES_MEDIDA = [
  { id: 1, simbolo: "kg",  nombre: "Kilogramo" },
  { id: 2, simbolo: "g",   nombre: "Gramo"     },
  { id: 3, simbolo: "l",   nombre: "Litro"     },
  { id: 4, simbolo: "ml",  nombre: "Mililitro" },
  { id: 5, simbolo: "und", nombre: "Unidad"    },
  { id: 6, simbolo: "cja", nombre: "Caja"      },
  { id: 7, simbolo: "bol", nombre: "Bolsa"     },
];

const initInsumos = [
  { id: 1,  nombre: "Plátano verde",       idCategoria: 1, idUnidad: 1, stockActual: 120, stockMinimo: 30,  estado: true },
  { id: 2,  nombre: "Cebolla",             idCategoria: 1, idUnidad: 1, stockActual: 15,  stockMinimo: 20,  estado: true },
  { id: 3,  nombre: "Tomate",              idCategoria: 1, idUnidad: 1, stockActual: 0,   stockMinimo: 10,  estado: true },
  { id: 4,  nombre: "Carne molida",        idCategoria: 2, idUnidad: 1, stockActual: 50,  stockMinimo: 15,  estado: true },
  { id: 5,  nombre: "Queso",               idCategoria: 3, idUnidad: 1, stockActual: 30,  stockMinimo: 10,  estado: true },
  { id: 6,  nombre: "Harina",              idCategoria: 4, idUnidad: 1, stockActual: 200, stockMinimo: 50,  estado: true },
  { id: 7,  nombre: "Sal",                 idCategoria: 5, idUnidad: 1, stockActual: 8,   stockMinimo: 10,  estado: true },
  { id: 8,  nombre: "Aceite vegetal",      idCategoria: 6, idUnidad: 3, stockActual: 45,  stockMinimo: 10,  estado: true },
  { id: 9,  nombre: "Salsa de tomate",     idCategoria: 7, idUnidad: 5, stockActual: 0,   stockMinimo: 5,   estado: false },
  { id: 10, nombre: "Cajas",               idCategoria: 8, idUnidad: 5, stockActual: 300, stockMinimo: 100, estado: true },
  { id: 11, nombre: "Masa para empanadas", idCategoria: 4, idUnidad: 1, stockActual: 22,  stockMinimo: 25,  estado: true },
  { id: 12, nombre: "Bolsas",              idCategoria: 8, idUnidad: 5, stockActual: 500, stockMinimo: 200, estado: true },
];

const initLotes = [
  { id: "LC-001", idInsumo: 6, idCompra: "C-001", idDetalleRef: "C-001-D1", cantidadInicial: 10, cantidadActual: 8,  fechaVencimiento: "2026-08-20", fechaIngreso: "2026-03-10" },
  { id: "LC-002", idInsumo: 7, idCompra: "C-001", idDetalleRef: "C-001-D2", cantidadInicial: 5,  cantidadActual: 3,  fechaVencimiento: "2027-01-01", fechaIngreso: "2026-03-10" },
  { id: "LC-003", idInsumo: 7, idCompra: "C-002", idDetalleRef: "C-002-D1", cantidadInicial: 3,  cantidadActual: 3,  fechaVencimiento: "2027-01-01", fechaIngreso: "2026-03-02" },
  { id: "LC-004", idInsumo: 2, idCompra: "C-001", idDetalleRef: "C-001-D3", cantidadInicial: 20, cantidadActual: 12, fechaVencimiento: "2026-03-22", fechaIngreso: "2026-02-01" },
  { id: "LC-005", idInsumo: 3, idCompra: "C-001", idDetalleRef: "C-001-D4", cantidadInicial: 15, cantidadActual: 5,  fechaVencimiento: "2026-03-10", fechaIngreso: "2026-01-15" },
];

const initSalidas = [];

const initProductos = [
  { id: 1, nombre: "Muffin de plátano",      idCategoria: 2, precio: 10000, stock: 50, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 2, nombre: "Palito de queso",         idCategoria: 1, precio: 5000,  stock: 20, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 3, nombre: "Chips de plátano verde",  idCategoria: 3, precio: 3500,  stock: 7,  stockMinimo: 15, imagen: null, imagenPreview: null, fecha: "01/01/2026", ficha: null },
  { id: 4, nombre: "Harina de plátano 500g",  idCategoria: 4, precio: 12000, stock: 80, stockMinimo: 20, imagen: null, imagenPreview: null, fecha: "20/02/2026", ficha: null },
  { id: 5, nombre: "Tostones orgánicos",       idCategoria: 5, precio: 7500,  stock: 15, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "28/02/2026", ficha: null },
];

const initLotesProductos      = {};
const initSalidasProductos    = {};

const initProveedores = [
  { id: "PROV0001", responsable: "Juan Morales",   direccion: "Cra 45 # 10-20, Medellín",     celular: "300 123 4567", correo: "juan.morales@prov.com",   ciudad: "Medellín",     estado: true },
  { id: "PROV0002", responsable: "Sandra López",   direccion: "Calle 80 # 23-15, Bogotá",     celular: "312 456 7890", correo: "sandra.lopez@prov.com",   ciudad: "Bogotá",       estado: true },
  { id: "PROV0003", responsable: "Pedro Ríos",     direccion: "Av. 6N # 12-50, Cali",         celular: "315 789 0123", correo: "pedro.rios@prov.com",     ciudad: "Cali",         estado: true },
  { id: "PROV0004", responsable: "Marcela Gómez",  direccion: "Cl. 50 # 40-30, Barranquilla", celular: "318 012 3456", correo: "marcela.gomez@prov.com",  ciudad: "Barranquilla", estado: true },
  { id: "PROV0005", responsable: "Andrés Herrera", direccion: "Cra 15 # 68-10, Bucaramanga",  celular: "321 345 6789", correo: "andres.herrera@prov.com", ciudad: "Bucaramanga",  estado: true },
];

const initRolesData = [
  { id: 1, nombre: "Admin",    icono: "👑", iconoPreview: null, estado: true,  fecha: "12/12/2025", esAdmin: true,  permisos: [] },
  { id: 2, nombre: "Empleado", icono: "👷", iconoPreview: null, estado: true,  fecha: "12/12/2025", esAdmin: false, permisos: [] },
  { id: 3, nombre: "Cliente",  icono: "👤", iconoPreview: null, estado: true,  fecha: "01/01/2026", esAdmin: false, permisos: [] },
];

const initUsuariosData = [
  { id: 1, nombre: "Carlos", apellidos: "Pérez Ruiz",    correo: "carlos.perez@email.com", cedula: "80456789",   telefono: "310 987 6543", direccion: "Carrera 15 # 8-30",  departamento: "Cundinamarca",    municipio: "Bogotá",       rol: "Admin",    estado: true,  foto: null, fechaCreacion: "12/12/2025", esAdmin: true },
  { id: 2, nombre: "Ana",    apellidos: "García López",  correo: "ana.garcia@email.com",   cedula: "1012345678", telefono: "300 123 4567", direccion: "Calle 50 # 40-20",   departamento: "Antioquia",       municipio: "Medellín",     rol: "Empleado", estado: true,  foto: null, fechaCreacion: "15/01/2026" },
  { id: 3, nombre: "Lucía",  apellidos: "Martínez Vega", correo: "lucia.mv@email.com",     cedula: "1234567890", telefono: "315 456 7890", direccion: "Av. 6N # 23-10",     departamento: "Valle del Cauca", municipio: "Cali",         rol: "Empleado", estado: false, foto: null, fechaCreacion: "01/02/2026" },
  { id: 4, nombre: "Jorge",  apellidos: "Torres Suárez", correo: "jorge.torres@email.com", cedula: "72654321",   telefono: "320 321 0987", direccion: "Calle 72 # 45-55",   departamento: "Atlántico",       municipio: "Barranquilla", rol: "Cliente",  estado: true,  foto: null, fechaCreacion: "20/02/2026" },
];

const initClientes = [
  { id: uid(), tipoDoc: "CC", numDoc: "1012345678", nombre: "Ana",    apellidos: "García López",   correo: "ana.garcia@email.com",   telefono: "300 123 4567", direccion: "Calle 50 # 40-20",   departamento: "Antioquia",    municipio: "Medellín",    estado: true,  fotoPreview: null, fechaCreacion: "12/12/2025" },
  { id: uid(), tipoDoc: "CC", numDoc: "80456789",   nombre: "Carlos", apellidos: "Pérez Ruiz",     correo: "carlos.perez@email.com", telefono: "310 987 6543", direccion: "Carrera 15 # 8-30",  departamento: "Cundinamarca", municipio: "Bogotá",      estado: true,  fotoPreview: null, fechaCreacion: "15/01/2026" },
  { id: uid(), tipoDoc: "CE", numDoc: "E-1234567",  nombre: "Lucía",  apellidos: "Martínez Vega",  correo: "lucia.mv@email.com",     telefono: "315 456 7890", direccion: "Av. 6N # 23-10",     departamento: "Valle",        municipio: "Cali",        estado: false, fotoPreview: null, fechaCreacion: "01/02/2026" },
  { id: uid(), tipoDoc: "CC", numDoc: "72654321",   nombre: "Jorge",  apellidos: "Torres Suárez",  correo: "jorge.torres@email.com", telefono: "320 321 0987", direccion: "Calle 72 # 45-55",   departamento: "Atlántico",    municipio: "Barranquilla", estado: true,  fotoPreview: null, fechaCreacion: "20/02/2026" },
  { id: uid(), tipoDoc: "TI", numDoc: "1234567890", nombre: "María",  apellidos: "López Castillo", correo: "maria.lc@email.com",     telefono: "317 654 3210", direccion: "Diagonal 30 # 12-5", departamento: "Santander",    municipio: "Bucaramanga", estado: true,  fotoPreview: null, fechaCreacion: "28/02/2026" },
];

const initPedidos = [
  {
    id: 1, numero: "PED-001", idCliente: null,
    cliente: { nombre: "Jorge Torres Suárez",  correo: "jorge.torres@email.com", telefono: "320 321 0987" },
    productosItems: [
      { idProducto: 1, nombre: "Muffin de plátano",     precio: 10000, cantidad: 3, stockActual: 50, stockOk: true },
      { idProducto: 3, nombre: "Chips de plátano verde", precio: 3500,  cantidad: 2, stockActual: 7,  stockOk: true },
    ],
    subtotal: 37000, descuento: 0, total: 37000,
    metodo_pago: "Efectivo", domicilio: false, direccion_entrega: null,
    idEmpleado: null, notas: "", estado: "Pendiente",
    orden_produccion: false, fecha_pedido: "2026-03-18",
  },
  {
    id: 2, numero: "PED-002", idCliente: null,
    cliente: { nombre: "María López Castillo", correo: "maria.lc@email.com", telefono: "317 654 3210" },
    productosItems: [
      { idProducto: 2, nombre: "Palito de queso",        precio: 5000,  cantidad: 4, stockActual: 20, stockOk: true },
      { idProducto: 4, nombre: "Harina de plátano 500g", precio: 12000, cantidad: 1, stockActual: 80, stockOk: true },
    ],
    subtotal: 32000, descuento: 0, total: 32000,
    metodo_pago: "Transferencia", domicilio: true,
    direccion_entrega: "Diagonal 30 # 12-5, Bucaramanga",
    idEmpleado: null, notas: "Sin sal extra por favor",
    estado: "En producción", orden_produccion: true, fecha_pedido: "2026-03-19",
  },
  {
    id: 3, numero: "PED-003", idCliente: null,
    cliente: { nombre: "Jorge Torres Suárez", correo: "jorge.torres@email.com", telefono: "320 321 0987" },
    productosItems: [
      { idProducto: 5, nombre: "Tostones orgánicos", precio: 7500, cantidad: 2, stockActual: 15, stockOk: true },
    ],
    subtotal: 15000, descuento: 1500, total: 13500,
    metodo_pago: "Nequi", domicilio: true,
    direccion_entrega: "Calle 72 # 45-55, Barranquilla",
    idEmpleado: 2, notas: "", estado: "En camino",
    orden_produccion: false, fecha_pedido: "2026-03-20",
  },
  {
    id: 4, numero: "PED-004", idCliente: null,
    cliente: { nombre: "Ana García López", correo: "ana.garcia@email.com", telefono: "300 123 4567" },
    productosItems: [
      { idProducto: 1, nombre: "Muffin de plátano", precio: 10000, cantidad: 5, stockActual: 47, stockOk: true },
    ],
    subtotal: 50000, descuento: 5000, total: 45000,
    metodo_pago: "Efectivo", domicilio: false,
    idEmpleado: 2, notas: "", estado: "Entregado",
    orden_produccion: false, fecha_pedido: "2026-03-15",
  },
];

const initCompras = [
  {
    id: "C-001", idProveedor: "PROV0001", fecha: "2026-03-10",
    estado: "completada", metodoPago: "transferencia",
    notas: "Pedido mensual de harinas y sal", stockAplicado: true,
    detalles: [
      { id: "C-001-D1", idInsumo: 6, cantidad: 10, precioUnd: 45000, notas: "Bultos x 50kg", fechaVencimiento: "2026-08-20" },
      { id: "C-001-D2", idInsumo: 7, cantidad: 5,  precioUnd: 32000, notas: "Bultos x 25kg", fechaVencimiento: "2027-01-01" },
    ],
  },
  {
    id: "C-002", idProveedor: "PROV0001", fecha: "2026-03-02",
    estado: "completada", metodoPago: "efectivo",
    notas: "", stockAplicado: true,
    detalles: [
      { id: "C-002-D1", idInsumo: 7, cantidad: 3, precioUnd: 12000, notas: "", fechaVencimiento: "2027-01-01" },
    ],
  },
  {
    id: "C-003", idProveedor: "PROV0002", fecha: "2026-03-08",
    estado: "pendiente", metodoPago: "crédito",
    notas: "Esperar confirmación de entrega", stockAplicado: false,
    detalles: [
      { id: "C-003-D1", idInsumo: 8, cantidad: 8, precioUnd: 80000, notas: "Bidones x 20L", fechaVencimiento: "2026-09-15" },
    ],
  },
  {
    id: "C-004", idProveedor: "PROV0003", fecha: "2026-03-15",
    estado: "pendiente", metodoPago: "transferencia",
    notas: "", stockAplicado: false,
    detalles: [
      { id: "C-004-D1", idInsumo: 1, cantidad: 50, precioUnd: 3500,  notas: "",            fechaVencimiento: "2026-05-10" },
      { id: "C-004-D2", idInsumo: 4, cantidad: 20, precioUnd: 25000, notas: "Refrigerado", fechaVencimiento: "2026-04-15" },
    ],
  },
];

const initOrdenes = [
  {
    id: "OP-001", idPedido: 2, numeroPedido: "PED-002",
    productos: [{ idProducto: 2, nombre: "Palito de queso", cantidad: 4, precio: 5000 }],
    insumos: [
      { idInsumo: 1, nombre: "Plátano verde",  cantidad: 2,   unidad: "kg", stockOk: true  },
      { idInsumo: 5, nombre: "Queso",          cantidad: 1,   unidad: "kg", stockOk: true  },
      { idInsumo: 8, nombre: "Aceite vegetal", cantidad: 0.5, unidad: "l",  stockOk: true  },
      { idInsumo: 7, nombre: "Sal",            cantidad: 0.1, unidad: "kg", stockOk: false },
    ],
    idEmpleado: 2, estado: "En proceso",
    fechaInicio: "2026-03-19", fechaEntrega: "2026-03-22", fechaCierre: null,
    costo: 18500, notas: "Sin sal extra por favor",
  },
];

const initDevoluciones = [
  {
    id: "DEV-001", numero: "DEV-001", idPedido: 2, numeroPedido: "PED-002", idCliente: null,
    cliente: { nombre: "María López Castillo", correo: "maria.lc@email.com", telefono: "317 654 3210" },
    motivo: "Producto en mal estado", comentario: "El palito de queso llegó con moho.",
    productos: [{ idProducto: 2, nombre: "Palito de queso", cantidad: 2, precioUnitario: 5000, subtotal: 10000 }],
    totalDevuelto: 10000, estado: "Pendiente",
    fechaSolicitud: "2026-03-20", fechaAprobacion: null, fechaReembolso: null, motivoRechazo: null,
  },
];

const initDescuentos = [
  { id: "DESC-001", nombre: "Bienvenida 10%", codigo: "BIENVENIDA", porcentaje: 10, descripcion: "Para clientes nuevos en su primer pedido", fechaInicio: "2026-01-01", fechaFin: "2026-12-31", limiteUsos: 100, activo: true },
  { id: "DESC-002", nombre: "Promo marzo",    codigo: "MARZO20",    porcentaje: 20, descripcion: "Descuento especial mes de marzo",         fechaInicio: "2026-03-01", fechaFin: "2026-03-31", limiteUsos: 50,  activo: true },
];

const initAsignacionesDescuento = {};
const initHistorialDescuentos   = [];
const initCreditosClientes      = {};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */

export const calcularTotal = (detalles) =>
  detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0) * (Number(d.precioUnd) || 0), 0);

const UNIDAD_CONVERSION = {
  kg: { to: "g",  factor: 1000 }, g:  { to: "kg", factor: 0.001 },
  l:  { to: "ml", factor: 1000 }, ml: { to: "l",  factor: 0.001 },
};

export const convertirUnidad = (cantidad, simboloUnidad) => {
  const valor = Number(cantidad);
  if (!simboloUnidad || Number.isNaN(valor)) return null;
  const cfg = UNIDAD_CONVERSION[simboloUnidad];
  if (!cfg) return null;
  const convertido = valor * cfg.factor;
  return { from: `${valor} ${simboloUnidad}`, to: `${Number.isInteger(convertido) ? convertido : convertido.toFixed(3)} ${cfg.to}` };
};

export const getVencimientoMasAntiguo = (detalles = []) => {
  const fechas = detalles.map(d => d.fechaVencimiento).filter(Boolean).map(f => new Date(`${f}T00:00:00`)).filter(d => !Number.isNaN(d.getTime()));
  if (!fechas.length) return null;
  const minFecha = new Date(Math.min(...fechas.map(d => d.getTime())));
  return `${minFecha.getFullYear()}-${String(minFecha.getMonth() + 1).padStart(2, "0")}-${String(minFecha.getDate()).padStart(2, "0")}`;
};

const nextCompraId       = (arr) => { const nums = arr.map(c => parseInt(c.id.replace("C-", "")) || 0);    return `C-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
const nextLoteId         = (arr) => { const nums = arr.map(l => parseInt(l.id.replace("LC-", "")) || 0);   return `LC-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
const nextPedidoNumero   = (arr) => { const nums = arr.map(p => parseInt(p.numero.replace("PED-", "")) || 0); return `PED-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
const nextOrdenId        = (arr) => { const nums = arr.map(o => parseInt(o.id.replace("OP-", "")) || 0);   return `OP-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
const nextDevolucionNum  = (arr) => { const nums = arr.map(d => parseInt(d.numero.replace("DEV-", "")) || 0); return `DEV-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };
const nextDescuentoId    = (arr) => { const nums = arr.map(d => parseInt(d.id.replace("DESC-", "")) || 0); return `DESC-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`; };

/* ══════════════════════════════════════════════════════════
   NOTIFICACIONES — helpers internos
   Se usan dentro de AppContext para disparar notifs
   sin crear una dependencia circular con NotificacionesContext
══════════════════════════════════════════════════════════ */

// Tipos exportados para que otros componentes puedan usarlos
export const NOTIF_TIPOS = {
  STOCK_MINIMO:    "stock_minimo",
  STOCK_AGOTADO:   "stock_agotado",
  LOTE_POR_VENCER: "lote_por_vencer",
  LOTE_VENCIDO:    "lote_vencido",
  PEDIDO_NUEVO:    "pedido_nuevo",
  COMPRA_PENDIENTE:"compra_pendiente",
  DEVOLUCION:      "devolucion",
  SISTEMA:         "sistema",
};

const notifUID = () => `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const notifFecha = () => new Date().toISOString();

// Función pura para construir una notificación
const buildNotif = ({ tipo, titulo, mensaje, clave, idReferencia, refNombre }) => ({
  id: notifUID(),
  clave: clave || `${tipo}-${Date.now()}`,
  tipo,
  titulo,
  mensaje,
  idReferencia: idReferencia || null,
  refNombre:    refNombre    || null,
  fecha:        notifFecha(),
  leida:        false,
});

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */

const AppContext = createContext(null);

const loadFromLS = (key, defaultValue) => {
  try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : defaultValue; }
  catch { return defaultValue; }
};

export function AppProvider({ children }) {

  /* ── Estado ─────────────────────────────────────────── */
  const [categoriasProductos, setCategoriasProductos] = useState(() => loadFromLS("categoriasProductos", initCategoriasProductos));
  const [categoriasInsumos,   setCategoriasInsumos]   = useState(() => loadFromLS("categoriasInsumos",   initCategoriasInsumos));
  const [insumos,             setInsumos]             = useState(() => loadFromLS("insumos",             initInsumos));
  const [lotes,               setLotes]               = useState(() => loadFromLS("lotes",               initLotes));
  const [salidas,             setSalidas]             = useState(() => loadFromLS("salidas",             initSalidas));
  const [productos,           setProductos]           = useState(() => loadFromLS("productos",           initProductos));
  const [lotesProductos,      setLotesProductos]      = useState(() => loadFromLS("lotesProductos",      initLotesProductos));
  const [salidasProductos,    setSalidasProductos]    = useState(() => loadFromLS("salidasProductos",    initSalidasProductos));
  const [roles,               setRoles]               = useState(() => loadFromLS("roles",               initRolesData));
  const [usuarios,            setUsuarios]            = useState(() => loadFromLS("usuarios",            initUsuariosData));
  const [proveedores,         setProveedores]         = useState(() => loadFromLS("proveedores",         initProveedores));
  const [compras,             setCompras]             = useState(() => loadFromLS("compras",             initCompras));
  const [clientes,            setClientes]            = useState(() => loadFromLS("clientes",            initClientes));
  const [pedidos,             setPedidos]             = useState(() => loadFromLS("pedidos",             initPedidos));
  const [ordenes,             setOrdenes]             = useState(() => loadFromLS("ordenes",             initOrdenes));
  const [devoluciones,        setDevoluciones]        = useState(() => loadFromLS("devoluciones",        initDevoluciones));
  const [creditosClientes,    setCreditosClientes]    = useState(() => loadFromLS("creditosClientes",    initCreditosClientes));
  const [descuentos,          setDescuentos]          = useState(() => loadFromLS("descuentos",          initDescuentos));
  const [asignacionesDesc,    setAsignacionesDesc]    = useState(() => loadFromLS("asignacionesDesc",    initAsignacionesDescuento));
  const [historialDescuentos, setHistorialDescuentos] = useState(() => loadFromLS("historialDescuentos", initHistorialDescuentos));

  /* ══════════════════════════════════════════════════════
     NOTIFICACIONES — estado propio dentro de AppContext
     Así AppContext puede agregar notifs sin depender de
     NotificacionesContext (evita dependencia circular).
     NotificacionesContext lee este mismo localStorage.
  ══════════════════════════════════════════════════════ */
  const [notificaciones, setNotificaciones] = useState(() => loadFromLS("notificaciones", []));
  useEffect(() => { localStorage.setItem("notificaciones", JSON.stringify(notificaciones)); }, [notificaciones]);

  // Ref para evitar re-renders en el callback
  const notificacionesRef = useRef(notificaciones);
  useEffect(() => { notificacionesRef.current = notificaciones; }, [notificaciones]);

  /**
   * agregarNotifInterna — agrega una notificación desde AppContext.
   * Respeta CA_01_05: no genera duplicados si ya existe una con la
   * misma clave y está sin leer.
   */
  const agregarNotifInterna = useCallback((datos) => {
    setNotificaciones(prev => {
      // CA_01_05 — no duplicar si ya existe sin leer con la misma clave
      if (datos.clave && prev.some(n => n.clave === datos.clave && !n.leida)) return prev;
      return [buildNotif(datos), ...prev];
    });
  }, []);

  /* ── Persistencia ───────────────────────────────────── */
  useEffect(() => { localStorage.setItem("categoriasProductos", JSON.stringify(categoriasProductos)); }, [categoriasProductos]);
  useEffect(() => { localStorage.setItem("categoriasInsumos",   JSON.stringify(categoriasInsumos)); },   [categoriasInsumos]);
  useEffect(() => { localStorage.setItem("insumos",             JSON.stringify(insumos)); },             [insumos]);
  useEffect(() => { localStorage.setItem("lotes",               JSON.stringify(lotes)); },               [lotes]);
  useEffect(() => { localStorage.setItem("salidas",             JSON.stringify(salidas)); },             [salidas]);
  useEffect(() => { localStorage.setItem("productos",           JSON.stringify(productos)); },           [productos]);
  useEffect(() => { localStorage.setItem("lotesProductos",      JSON.stringify(lotesProductos)); },      [lotesProductos]);
  useEffect(() => { localStorage.setItem("salidasProductos",    JSON.stringify(salidasProductos)); },    [salidasProductos]);
  useEffect(() => { localStorage.setItem("roles",               JSON.stringify(roles)); },               [roles]);
  useEffect(() => { localStorage.setItem("usuarios",            JSON.stringify(usuarios)); },            [usuarios]);
  useEffect(() => { localStorage.setItem("proveedores",         JSON.stringify(proveedores)); },         [proveedores]);
  useEffect(() => { localStorage.setItem("compras",             JSON.stringify(compras)); },             [compras]);
  useEffect(() => { localStorage.setItem("clientes",            JSON.stringify(clientes)); },            [clientes]);
  useEffect(() => { localStorage.setItem("pedidos",             JSON.stringify(pedidos)); },             [pedidos]);
  useEffect(() => { localStorage.setItem("ordenes",             JSON.stringify(ordenes)); },             [ordenes]);
  useEffect(() => { localStorage.setItem("devoluciones",        JSON.stringify(devoluciones)); },        [devoluciones]);
  useEffect(() => { localStorage.setItem("creditosClientes",    JSON.stringify(creditosClientes)); },    [creditosClientes]);
  useEffect(() => { localStorage.setItem("descuentos",          JSON.stringify(descuentos)); },          [descuentos]);
  useEffect(() => { localStorage.setItem("asignacionesDesc",    JSON.stringify(asignacionesDesc)); },    [asignacionesDesc]);
  useEffect(() => { localStorage.setItem("historialDescuentos", JSON.stringify(historialDescuentos)); }, [historialDescuentos]);

  /* ── Derivados ──────────────────────────────────────── */
  const categoriasProductosActivas = categoriasProductos.filter(c => c.estado);
  const categoriasInsumosActivas   = categoriasInsumos.filter(c => c.estado);
  const insumosActivos             = insumos.filter(i => i.estado);
  const rolesActivos               = roles.filter(r => r.estado).map(r => r.nombre);
  const clientesActivos            = clientes.filter(c => c.estado);

  const insumosPorCategoriaId = categoriasInsumos.reduce((acc, cat) => {
    acc[cat.id] = insumos.filter(i => i.idCategoria === cat.id && i.estado).map(i => i.nombre);
    return acc;
  }, {});
  const insumosPorCategoriaNombre = categoriasInsumos.reduce((acc, cat) => {
    acc[cat.nombre] = insumos.filter(i => i.idCategoria === cat.id && i.estado).map(i => i.nombre);
    return acc;
  }, {});
  const usuariosPorRol = roles.reduce((acc, r) => {
    acc[r.nombre] = usuarios.filter(u => u.rol === r.nombre).length;
    return acc;
  }, {});

  /* ── Helpers lotes INSUMOS ──────────────────────────── */
  const getLotesDeInsumo = (idInsumo) =>
    lotes.filter(l => l.idInsumo === Number(idInsumo)).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const getLotesVencidos = (idInsumo) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return lotes.filter(l => l.idInsumo === Number(idInsumo) && new Date(l.fechaVencimiento + "T00:00:00") < hoy)
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  };

  const getStockRealInsumo = (idInsumo) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return lotes.filter(l => l.idInsumo === Number(idInsumo) && l.cantidadActual > 0 && new Date(l.fechaVencimiento + "T00:00:00") >= hoy)
      .reduce((acc, l) => acc + l.cantidadActual, 0);
  };

  /* ── Helpers lotes PRODUCTOS ────────────────────────── */
  const getLotesProducto = (idProducto) =>
    (lotesProductos[idProducto] || []).sort((a, b) => {
      if (!a.fechaVencimiento) return 1;
      if (!b.fechaVencimiento) return -1;
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    });

  const getLotesVencidosProducto = (idProducto) => {
    const hoy = fechaHoy();
    return (lotesProductos[idProducto] || []).filter(l => l.fechaVencimiento && l.fechaVencimiento < hoy);
  };

  const agregarLoteProducto = (idProducto, lote) => {
    setLotesProductos(prev => ({ ...prev, [idProducto]: [...(prev[idProducto] || []), lote] }));
    setProductos(prev => prev.map(p => {
      if (p.id !== idProducto) return p;
      const nuevoStock = p.stock + lote.cantidadActual;
      const minimo     = p.stockMinimo ?? 10;
      return { ...p, stock: nuevoStock, estado: nuevoStock > 0 && nuevoStock >= minimo ? "Disponible" : "No disponible" };
    }));
  };

  /* ── Salidas PRODUCTOS ──────────────────────────────── */
  const getSalidasProducto = (idProducto) => (salidasProductos[idProducto] || []);

  const registrarSalidaProducto = ({ id: idProducto, tipo, cantidad, motivo, fecha }) => {
    const producto = productos.find(p => p.id === idProducto);
    if (!producto)                 return { ok: false, razon: "Producto no encontrado" };
    if (cantidad > producto.stock) return { ok: false, razon: `Stock insuficiente. Disponible: ${producto.stock} uds.` };

    setProductos(prev => prev.map(p => {
      if (p.id !== idProducto) return p;
      const nuevoStock = Math.max(0, p.stock - cantidad);
      const minimo     = p.stockMinimo ?? 10;
      return { ...p, stock: nuevoStock, estado: nuevoStock > 0 && nuevoStock >= minimo ? "Disponible" : "No disponible" };
    }));

    setLotesProductos(prev => {
      const lotesActuales = [...(prev[idProducto] || [])].sort((a, b) => {
        if (!a.fechaVencimiento) return 1;
        if (!b.fechaVencimiento) return -1;
        return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
      });
      let restante = cantidad;
      const actualizados = lotesActuales.map(lote => {
        if (restante <= 0) return lote;
        const descontar = Math.min(lote.cantidadActual, restante);
        restante -= descontar;
        return { ...lote, cantidadActual: lote.cantidadActual - descontar };
      });
      return { ...prev, [idProducto]: actualizados };
    });

    const nuevaSalida = {
      id: `SP-${Date.now()}`, tipo: tipo || "ajuste", cantidad,
      motivo: motivo || tipo || "Salida manual",
      fecha:  fecha  || new Date().toLocaleDateString("es-CO"),
    };
    setSalidasProductos(prev => ({ ...prev, [idProducto]: [nuevaSalida, ...(prev[idProducto] || [])] }));
    return { ok: true };
  };

  /* ── Salidas INSUMOS ────────────────────────────────── */
  const getSalidasInsumo = (idInsumo) =>
    salidas.filter(s => s.idInsumo === Number(idInsumo)).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const registrarSalidaInsumo = ({ idInsumo, tipo, cantidad, motivo, usuario = "sistema", fecha = fechaHoy() }) => {
    const cantidadNum = Number(cantidad);
    if (!idInsumo || !cantidadNum || cantidadNum <= 0) return { ok: false, razon: "Cantidad inválida" };

    const insumo = insumos.find(i => i.id === Number(idInsumo));
    if (!insumo) return { ok: false, razon: "Insumo no encontrado" };

    // ── Notificación si queda bajo mínimo ──────────────
    const nuevoStock = Math.max(0, insumo.stockActual - cantidadNum);
    if (nuevoStock <= insumo.stockMinimo && nuevoStock > 0) {
      agregarNotifInterna({
        tipo:  NOTIF_TIPOS.STOCK_MINIMO,
        clave: `${NOTIF_TIPOS.STOCK_MINIMO}-${insumo.id}`,
        titulo: `Stock bajo mínimo: ${insumo.nombre}`,
        mensaje: `Tras la salida, "${insumo.nombre}" quedó con ${nuevoStock} unidades, por debajo del mínimo de ${insumo.stockMinimo}. Se recomienda realizar una compra.`,
        idReferencia: insumo.id, refNombre: insumo.nombre,
      });
    }
    if (nuevoStock <= 0) {
      agregarNotifInterna({
        tipo:  NOTIF_TIPOS.STOCK_AGOTADO,
        clave: `${NOTIF_TIPOS.STOCK_AGOTADO}-${insumo.id}`,
        titulo: `Stock agotado: ${insumo.nombre}`,
        mensaje: `El insumo "${insumo.nombre}" se agotó. Stock actual: 0 unidades. Se requiere una compra urgente.`,
        idReferencia: insumo.id, refNombre: insumo.nombre,
      });
    }

    const result = descontarStockFIFO(idInsumo, cantidadNum);

    const salida = {
      id: `S-${String(salidas.length + 1).padStart(3, "0")}`,
      idInsumo: Number(idInsumo), tipo: tipo || "ajuste",
      cantidad: cantidadNum, motivo: motivo || "Salida manual",
      fecha, usuario, origen: result.ok ? "ok" : "parcial",
      faltante: result.ok ? 0 : result.faltante,
    };
    setSalidas(prev => [salida, ...prev]);
    return { ok: result.ok, falta: result.faltante };
  };

  /* ── Lookups ────────────────────────────────────────── */
  const getCatProducto = id     => categoriasProductos.find(c => c.id === id) || { nombre: "—", icon: "📦" };
  const getCatInsumo   = id     => categoriasInsumos.find(c => c.id === id)   || { nombre: "—", icon: "📦" };
  const getUnidad      = id     => UNIDADES_MEDIDA.find(u => u.id === id)     || { simbolo: "—", nombre: "—" };
  const getRol         = nombre => roles.find(r => r.nombre === nombre)       || null;
  const getProveedor   = id     => proveedores.find(p => String(p.id) === String(id)) || null;
  const getInsumo      = id     => insumos.find(i     => String(i.id) === String(id)) || null;
  const getCliente     = id     => clientes.find(c    => String(c.id) === String(id)) || null;

  /* ── Validaciones ───────────────────────────────────── */
  const canDeleteCatProducto = (catId) => {
    const enUso = productos.filter(p => p.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Esta categoría cuenta con ${enUso.length} producto${enUso.length > 1 ? "s" : ""} vinculado${enUso.length > 1 ? "s" : ""}. Es necesario reasignarlos o eliminarlos antes de proceder.` };
  };
  const canDeleteCatInsumo = (catId) => {
    const enUso = insumos.filter(i => i.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Esta categoría tiene ${enUso.length} insumo${enUso.length > 1 ? "s" : ""} registrado${enUso.length > 1 ? "s" : ""}. Debe actualizar o eliminar dichos registros previamente.` };
  };
  const canDeleteInsumo = (insumoId) => {
    const ins = insumos.find(i => i.id === insumoId);
    if (!ins) return { ok: true };
    const fichasAfectadas = productos.filter(p => p.ficha?.insumos?.some(fi => fi.nombre === ins.nombre));
    if (!fichasAfectadas.length) return { ok: true };
    return { ok: false, razon: `El insumo "${ins.nombre}" forma parte de ${fichasAfectadas.length} ficha${fichasAfectadas.length > 1 ? "s" : ""} técnica${fichasAfectadas.length > 1 ? "s" : ""}. Por favor, retírelo de las fichas correspondientes.` };
  };
  const canDeleteProducto = (productoId) => {
    const enPedidosActivos = pedidos.filter(ped =>
      !["Entregado", "Cancelado"].includes(ped.estado) &&
      (ped.productosItems || []).some(pi => pi.idProducto === productoId)
    );
    if (enPedidosActivos.length)
      return { ok: false, razon: `Este producto está incluido en ${enPedidosActivos.length} pedido${enPedidosActivos.length > 1 ? "s" : ""} en curso. Debe finalizar o cancelar los pedidos antes de eliminar el producto.` };
    const p = productos.find(x => x.id === productoId);
    if (p?.ficha) return { ok: true, advertencia: "Este producto posee una ficha técnica vinculada que también será eliminada definitivamente." };
    return { ok: true };
  };
  const canDeleteRol = (rolId) => {
    const rol = roles.find(r => r.id === rolId);
    if (!rol) return { ok: true };
    if (rol.esAdmin) return { ok: false, razon: `El rol "${rol.nombre}" es un perfil del sistema y no puede ser eliminado.` };
    const asignados = usuarios.filter(u => u.rol === rol.nombre);
    if (asignados.length) return { ok: false, razon: `Existen ${asignados.length} usuario${asignados.length > 1 ? "s" : ""} con el rol "${rol.nombre}". Debe reasignar a los usuarios antes de eliminar el rol.` };
    return { ok: true };
  };
  const canDeleteUsuario  = (usuarioId) => {
    const user = usuarios.find(u => u.id === usuarioId);
    if (!user) return { ok: true };
    if (user.esAdmin) return { ok: false, razon: `El usuario "${user.nombre} ${user.apellidos}" posee privilegios de administrador principal y está protegido.` };
    return { ok: true };
  };
  const canDeleteCliente  = (clienteId) => {
    const enPedidos = pedidos.filter(p => p.idCliente === clienteId && !["Entregado", "Cancelado"].includes(p.estado));
    if (enPedidos.length) return { ok: false, razon: `Este cliente tiene ${enPedidos.length} pedido${enPedidos.length > 1 ? "s" : ""} activo${enPedidos.length > 1 ? "s" : ""}. Por favor, concluya las operaciones pendientes primero.` };
    return { ok: true };
  };
  const canDeleteProveedor = (proveedorId) => {
    const qty = compras.filter(c => c.idProveedor === proveedorId).length;
    if (!qty) return { ok: true };
    return { ok: false, razon: `Existen ${qty} registro${qty > 1 ? "s" : ""} de compra asociados a este proveedor. No se puede eliminar por integridad de datos.` };
  };
  const canDeleteCompra = (compraId) => {
    const c = compras.find(x => x.id === compraId);
    if (!c) return { ok: true };
    if (c.stockAplicado) return { ok: false, razon: "No es posible eliminar una compra cuyo stock ya ha sido ingresado al inventario. Considere realizar un ajuste de salida si es necesario." };
    return { ok: true };
  };
  const canDeletePedido = (pedidoId) => {
    const ped = pedidos.find(p => p.id === pedidoId);
    if (!ped) return { ok: true };
    if (ped.estado === "Entregado") return { ok: false, razon: "Los pedidos con estado 'Entregado' forman parte del historial de ventas y no pueden ser eliminados." };
    return { ok: true };
  };

  /* ── CRUD categorías ────────────────────────────────── */
  const crearCatProducto    = f  => setCategoriasProductos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatProducto   = f  => setCategoriasProductos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatProducto   = id => {
    setCategoriasProductos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const nuevoEstado = !c.estado;
      // Si se inactiva la categoría, inactivar todos los productos asociados
      if (!nuevoEstado) {
        setProductos(prods => prods.map(p => p.idCategoria === id ? { ...p, activo: false } : p));
      }
      return { ...c, estado: nuevoEstado };
    }));
  };
  const eliminarCatProducto = id => setCategoriasProductos(p => p.filter(c => c.id !== id));
  const crearCatInsumo    = f  => setCategoriasInsumos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatInsumo   = f  => setCategoriasInsumos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatInsumo   = id => {
    setCategoriasInsumos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const nuevoEstado = !c.estado;
      // Si se inactiva la categoría, inactivar todos los insumos asociados
      if (!nuevoEstado) {
        setInsumos(ins => ins.map(i => i.idCategoria === id ? { ...i, estado: false } : i));
      }
      return { ...c, estado: nuevoEstado };
    }));
  };
  const eliminarCatInsumo = id => setCategoriasInsumos(p => p.filter(c => c.id !== id));

  /* ── CRUD insumos ───────────────────────────────────── */
  const crearInsumo    = f  => setInsumos(p => [{ ...f, id: Date.now(), fechaCreacion: new Date().toLocaleDateString("es-CO") }, ...p]);
  const editarInsumo   = f  => setInsumos(p => p.map(i => i.id === f.id ? f : i));
  const toggleInsumo   = id => setInsumos(p => p.map(i => i.id === id ? { ...i, estado: !i.estado } : i));
  const eliminarInsumo = id => setInsumos(p => p.filter(i => i.id !== id));

  /* ── CRUD productos ─────────────────────────────────── */
  const crearProducto    = f            => setProductos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarProducto   = f            => setProductos(p => p.map(x => x.id === f.id ? f : x));
  const eliminarProducto = id           => setProductos(p => p.filter(x => x.id !== id));
  const guardarFicha     = (pId, ficha) => setProductos(p => p.map(x => x.id === pId ? { ...x, ficha } : x));
  const toggleActivoProducto = (id)     => setProductos(p => p.map(x => x.id === id ? { ...x, activo: !x.activo } : x));

  /* ── CRUD roles ─────────────────────────────────────── */
  const crearRol  = (form) => setRoles(p => [{ ...form, id: Date.now(), fecha: new Date().toLocaleDateString("es-CO"), esAdmin: false }, ...p]);
  const editarRol = (form) => setRoles(p => p.map(r => r.id === form.id ? { ...r, ...form } : r));
  const toggleRol = (id) => {
    const rol = roles.find(r => r.id === id); if (!rol) return;
    const nuevoEstado = !rol.estado;
    setRoles(p => p.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    if (!nuevoEstado) setUsuarios(p => p.map(u => u.rol === rol.nombre && !u.esAdmin ? { ...u, estado: false } : u));
  };
  const eliminarRol = (id) => {
    const check = canDeleteRol(id); if (!check.ok) return check;
    setRoles(p => p.filter(r => r.id !== id)); return { ok: true };
  };

  /* ── CRUD usuarios ──────────────────────────────────── */
  const crearUsuario  = (form) => setUsuarios(p => [{ ...form, id: Date.now(), fechaCreacion: new Date().toLocaleDateString("es-CO"), esAdmin: false }, ...p]);
  const editarUsuario = (form) => setUsuarios(p => p.map(u => u.id === form.id ? { ...u, ...form } : u));
  const toggleUsuario = (id) => {
    const user = usuarios.find(u => u.id === id); if (!user) return;
    const rolObj = roles.find(r => r.nombre === user.rol);
    if (!user.estado && rolObj && !rolObj.estado) return;
    setUsuarios(p => p.map(u => u.id === id ? { ...u, estado: !u.estado } : u));
  };
  const eliminarUsuario = (id) => {
    const check = canDeleteUsuario(id); if (!check.ok) return check;
    setUsuarios(p => p.filter(u => u.id !== id)); return { ok: true };
  };

  /* ── CRUD clientes ──────────────────────────────────── */
  const crearCliente = (form) => {
    const nuevo = { ...form, id: uid(), fechaCreacion: form.fechaCreacion || new Date().toLocaleDateString("es-CO") };
    setClientes(p => [nuevo, ...p]); return nuevo.id;
  };
  const editarCliente  = (form) => setClientes(p => p.map(c => c.id === form.id ? { ...form } : c));
  const toggleCliente  = (id)   => setClientes(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCliente = (id)  => {
    const check = canDeleteCliente(id); if (!check.ok) return check;
    setClientes(p => p.filter(c => c.id !== id)); return { ok: true };
  };

  /* ── CRUD proveedores ───────────────────────────────── */
  const crearProveedor    = (form) => setProveedores(p => [{ ...form, id: `PROV${String(Date.now()).slice(-4)}` }, ...p]);
  const editarProveedor   = (form) => setProveedores(p => p.map(x => x.id === form.id ? form : x));
  const toggleProveedor   = (id)   => setProveedores(p => p.map(x => x.id === id ? { ...x, estado: !x.estado } : x));
  const eliminarProveedor = (id)   => {
    const check = canDeleteProveedor(id); if (!check.ok) return check;
    setProveedores(p => p.filter(x => x.id !== id)); return { ok: true };
  };

  /* ── CRUD compras + lotes ───────────────────────────── */
  const _buildLotes = (compraId, detalles, lotesActuales) => {
    const nuevos = []; let ref = [...lotesActuales];
    detalles.forEach(d => {
      const id   = nextLoteId([...ref, ...nuevos]);
      const lote = { id, idInsumo: Number(d.idInsumo), idCompra: compraId, idDetalleRef: d.id, cantidadInicial: Number(d.cantidad), cantidadActual: Number(d.cantidad), fechaVencimiento: d.fechaVencimiento, fechaIngreso: fechaHoy() };
      nuevos.push(lote); ref.push(lote);
    });
    return nuevos;
  };
  const _subirStock = (detalles) => {
    setInsumos(prev => prev.map(ins => {
      const suma = detalles.filter(d => Number(d.idInsumo) === ins.id).reduce((acc, d) => acc + Number(d.cantidad), 0);
      return suma > 0 ? { ...ins, stockActual: ins.stockActual + suma } : ins;
    }));
  };

  const crearCompra = (form) => {
    const id            = nextCompraId(compras);
    const detalles      = form.detalles.map((d, i) => ({ ...d, id: `${id}-D${i + 1}` }));
    const stockAplicado = form.estado === "completada";
    const nueva         = { ...form, id, detalles, stockAplicado };
    setCompras(p => [nueva, ...p]);
    if (stockAplicado) {
      setLotes(prev => [...prev, ..._buildLotes(id, detalles, prev)]);
      _subirStock(detalles);
    } else {
      // ── Notif compra pendiente (HU_01 / COMPRA_PENDIENTE) ──
      agregarNotifInterna({
        tipo:  NOTIF_TIPOS.COMPRA_PENDIENTE,
        clave: `${NOTIF_TIPOS.COMPRA_PENDIENTE}-${id}`,
        titulo: `Nueva compra pendiente: ${id}`,
        mensaje: `Se registró la compra ${id} en estado pendiente con ${detalles.length} ítem${detalles.length > 1 ? "s" : ""}. Confirma la recepción cuando llegue.`,
        idReferencia: id, refNombre: id,
      });
    }
    return id;
  };

  const editarCompra = (form) => {
    setCompras(p => p.map(c => {
      if (c.id !== form.id) return c;
      if (c.stockAplicado) return { ...c, notas: form.notas, metodoPago: form.metodoPago };
      if (form.estado === "completada") {
        const detallesConId = form.detalles.map((d, i) => ({ ...d, id: d.id || `${c.id}-D${i + 1}` }));
        setLotes(prev => [...prev, ..._buildLotes(c.id, detallesConId, prev)]);
        _subirStock(detallesConId);
        return { ...form, detalles: detallesConId, stockAplicado: true };
      }
      return { ...form, stockAplicado: false };
    }));
  };

  const completarCompra = (id) => {
    setCompras(prev => prev.map(c => {
      if (c.id !== id || c.stockAplicado) return c;
      const detallesConId = c.detalles.map((d, i) => ({ ...d, id: d.id || `${c.id}-D${i + 1}` }));
      setLotes(prevL => [...prevL, ..._buildLotes(c.id, detallesConId, prevL)]);
      _subirStock(detallesConId);
      return { ...c, estado: "completada", detalles: detallesConId, stockAplicado: true };
    }));
  };

  const anularCompra = (id) => {
    const c = compras.find(x => x.id === id);
    if (!c) return { ok: false, razon: "Compra no encontrada" };
    if (c.estado === "anulada") return { ok: false, razon: "La compra ya está anulada" };

    // Si el stock ya se aplicó, hay que reversarlo mediante salidas
    if (c.stockAplicado) {
      c.detalles.forEach(d => {
        registrarSalidaInsumo({
          idInsumo: d.idInsumo,
          tipo: "ajuste",
          cantidad: d.cantidad,
          motivo: `Anulación de compra ${id}`,
          usuario: "sistema"
        });
      });
    }

    setCompras(prev => prev.map(comp => comp.id === id ? { ...comp, estado: "anulada" } : comp));
    return { ok: true };
  };

  const eliminarCompra = (id) => {
    const check = canDeleteCompra(id); if (!check.ok) return check;
    setCompras(p => p.filter(c => c.id !== id)); return { ok: true };
  };

  const descontarStockFIFO = (idInsumo, cantidadNecesaria) => {
    const lotesDisp = lotes.filter(l => l.idInsumo === Number(idInsumo) && l.cantidadActual > 0).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
    let restante = cantidadNecesaria; const cambios = [];
    for (const lote of lotesDisp) {
      if (restante <= 0) break;
      const descontar = Math.min(lote.cantidadActual, restante);
      cambios.push({ id: lote.id, nueva: lote.cantidadActual - descontar });
      restante -= descontar;
    }
    const descontadoEfectivo = cantidadNecesaria - restante;
    if (descontadoEfectivo > 0) {
      setLotes(prev => prev.map(l => { const c = cambios.find(x => x.id === l.id); return c ? { ...l, cantidadActual: c.nueva } : l; }));
      setInsumos(prev => prev.map(ins => ins.id === Number(idInsumo) ? { ...ins, stockActual: Math.max(0, ins.stockActual - descontadoEfectivo) } : ins));
    }
    return { ok: restante === 0, faltante: restante };
  };

  /* ── CRUD pedidos ───────────────────────────────────── */
  const _buildOrden = (pedido, { fechaEntrega, notas }, prevOrdenes, productosActuales, insumosActuales) => {
    const id      = nextOrdenId(prevOrdenes);
    const sinStock = (pedido.productosItems || []).filter(p => !p.stockOk);
    const insumosMap = {};
    sinStock.forEach(item => {
      const prod = productosActuales.find(p => p.id === item.idProducto);
      if (!prod?.ficha?.insumos?.length) return;
      prod.ficha.insumos.forEach(fi => {
        const ins = insumosActuales.find(i => i.nombre === fi.nombre || i.id === fi.idInsumo);
        if (!ins) return;
        const cantItem = (Number(fi.cantidad) || 0) * item.cantidad;
        if (insumosMap[ins.id]) insumosMap[ins.id].cantidad += cantItem;
        else insumosMap[ins.id] = { idInsumo: ins.id, nombre: ins.nombre, cantidad: cantItem, unidad: UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und", stockOk: false };
      });
    });
    Object.values(insumosMap).forEach(ins => { const r = insumosActuales.find(i => i.id === ins.idInsumo); ins.stockOk = (r?.stockActual || 0) >= ins.cantidad; });
    return { id, idPedido: pedido.id, numeroPedido: pedido.numero, productos: sinStock.map(p => ({ idProducto: p.idProducto, nombre: p.nombre, cantidad: p.cantidad, precio: p.precio })), insumos: Object.values(insumosMap), idEmpleado: null, estado: "Pendiente", fechaInicio: fechaHoy(), fechaEntrega: fechaEntrega || null, fechaCierre: null, costo: sinStock.reduce((acc, p) => acc + (p.precio || 0) * p.cantidad, 0), notas: notas || "" };
  };

  const crearPedido = (payload) => {
    const numero        = nextPedidoNumero(pedidos);
    const estadoInicial = payload.orden_produccion ? "En producción" : "Pendiente";
    const nuevo         = { ...payload, id: Date.now(), numero, estado: estadoInicial, orden_produccion: payload.orden_produccion || false, fecha_pedido: fechaHoy(), idEmpleado: null };
    setPedidos(prev => [nuevo, ...prev]);
    setProductos(prev => prev.map(prod => {
      const item = payload.productosItems.find(p => p.idProducto === prod.id && p.stockOk);
      if (!item) return prod;
      return { ...prod, stock: Math.max(0, prod.stock - item.cantidad) };
    }));
    if (nuevo.orden_produccion) setOrdenes(prev => { const orden = _buildOrden(nuevo, { fechaEntrega: null, notas: payload.notas || "" }, prev, productos, insumos); return [orden, ...prev]; });

    // ── Notif nuevo pedido ──────────────────────────────
    agregarNotifInterna({
      tipo:  NOTIF_TIPOS.PEDIDO_NUEVO,
      clave: `${NOTIF_TIPOS.PEDIDO_NUEVO}-${numero}`,
      titulo: `Nuevo pedido: ${numero}`,
      mensaje: `Se creó el pedido ${numero} para "${payload.cliente?.nombre || "cliente"}". Total: $${(payload.total || 0).toLocaleString("es-CO")}. Estado: ${estadoInicial}.`,
      idReferencia: numero, refNombre: numero,
    });

    return numero;
  };

  const editarPedido = (payload) => {
    setPedidos(prev => prev.map(p => {
      if (p.id !== payload.id) return p;
      if (["Entregado", "Cancelado"].includes(p.estado)) {
        const patch = {};
        if (payload.obs_domicilio      !== undefined) patch.obs_domicilio      = payload.obs_domicilio;
        if (payload.fecha_entrega_real !== undefined) patch.fecha_entrega_real = payload.fecha_entrega_real;
        return { ...p, ...patch };
      }
      return { ...p, ...payload, estado: p.estado, numero: p.numero, fecha_pedido: p.fecha_pedido, idEmpleado: p.idEmpleado };
    }));
  };

  const eliminarPedido = (id) => {
    const ped = pedidos.find(p => p.id === id); if (!ped) return { ok: true };
    if (ped.estado === "Entregado") return { ok: false, razon: "Los pedidos entregados no se pueden eliminar." };
    if (!["Cancelado"].includes(ped.estado)) {
      setProductos(prev => prev.map(prod => {
        const item = (ped.productosItems || []).find(p => p.idProducto === prod.id && p.stockOk);
        if (!item) return prod;
        return { ...prod, stock: prod.stock + item.cantidad };
      }));
    }
    setPedidos(prev => prev.filter(p => p.id !== id)); return { ok: true };
  };

  const cambiarEstadoPedido = (id, nuevoEstado) => {
    setPedidos(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (nuevoEstado === "Cancelado" && p.estado !== "Cancelado") {
        setProductos(prods => prods.map(prod => {
          const item = (p.productosItems || []).find(pi => pi.idProducto === prod.id);
          if (!item) return prod;
          
          // Si el producto fue tomado del stock inicial (stockOk) 
          // O si ya fue fabricado (el pedido estaba Listo o En camino)
          // se debe devolver al stock general al cancelar.
          const debeRetornar = item.stockOk || ["Listo", "En camino"].includes(p.estado);
          
          if (debeRetornar) {
            return { ...prod, stock: prod.stock + item.cantidad };
          }
          return prod;
        }));
      }
      // ── Notif cambio de estado relevante ───────────────
      if (["Listo", "En camino", "Entregado"].includes(nuevoEstado)) {
        agregarNotifInterna({
          tipo:  NOTIF_TIPOS.SISTEMA,
          clave: `estado-pedido-${id}-${nuevoEstado}`,
          titulo: `Pedido ${p.numero}: ${nuevoEstado}`,
          mensaje: `El pedido ${p.numero} de "${p.cliente?.nombre || "cliente"}" cambió a estado "${nuevoEstado}".`,
          idReferencia: p.numero, refNombre: p.numero,
        });
      }
      return { ...p, estado: nuevoEstado };
    }));
  };

  const asignarDomiciliario = (pedidoId, empleadoId) => setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, idEmpleado: empleadoId } : p));

  const generarOrdenProduccion = (pedidoId, { fechaEntrega, notas }) => {
    const pedido = pedidos.find(p => p.id === pedidoId); if (!pedido) return;
    setPedidos(prev => prev.map(p => p.id !== pedidoId ? p : { ...p, orden_produccion: true, estado: "En producción", fecha_entrega_prod: fechaEntrega, notas_produccion: notas }));
    setOrdenes(prev => { const orden = _buildOrden(pedido, { fechaEntrega, notas }, prev, productos, insumos); return [orden, ...prev]; });
  };

  /* ── CRUD órdenes ───────────────────────────────────── */
  const crearOrdenProduccion = (payload) => {
    const id = nextOrdenId(ordenes);
    const nueva = {
      ...payload,
      id,
      estado: payload.estado || "Pendiente",
      fechaInicio: payload.fechaInicio || fechaHoy(),
    };
    setOrdenes(prev => [nueva, ...prev]);
    return id;
  };

  const editarOrdenProduccion = (payload) => {
    setOrdenes(prev => prev.map(o => o.id === payload.id ? { ...o, ...payload } : o));
  };

  const cambiarEstadoOrden = (ordenId, nuevoEstado) => {
    setOrdenes(prev => prev.map(o => {
      if (o.id !== ordenId) return o;
      const fechaCierre = nuevoEstado === "Completada" ? fechaHoy() : o.fechaCierre;
      if (nuevoEstado === "Completada" && o.estado !== "Completada") {
        
        // Solo sumamos al stock general si la orden NO viene de un pedido (es reposición manual)
        if (!o.idPedido) {
          setProductos(prods => prods.map(prod => { 
            const item = (o.productos || []).find(p => p.idProducto === prod.id); 
            if (!item) return prod; 
            return { ...prod, stock: prod.stock + item.cantidad }; 
          }));
        }
        
        // Descontar insumos (Siempre se descuentan, sea manual o por pedido)
        (o.insumos || []).forEach(ins => {
          registrarSalidaInsumo({
            idInsumo: ins.idInsumo,
            tipo: "produccion",
            cantidad: ins.cantidad,
            motivo: `Consumo por orden de producción ${ordenId}`,
            usuario: "sistema"
          });
        });

        if (o.idPedido) setPedidos(prevP => prevP.map(p => p.id !== o.idPedido ? p : { ...p, estado: "Listo" }));
        agregarNotifInterna({
          tipo:  NOTIF_TIPOS.SISTEMA,
          clave: `orden-completada-${ordenId}`,
          titulo: `Orden de producción completada: ${ordenId}`,
          mensaje: `La orden ${ordenId} fue marcada como completada. El stock de los productos e insumos fue actualizado.`,
          idReferencia: ordenId, refNombre: ordenId,
        });
      }
      return { ...o, estado: nuevoEstado, fechaCierre };
    }));
  };

  const asignarEmpleadoOrden = (ordenId, empleadoId) => setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, idEmpleado: empleadoId } : o));

  /* ── CRUD devoluciones ──────────────────────────────── */
  const crearDevolucion = (payload) => {
    const numero = nextDevolucionNum(devoluciones);
    setDevoluciones(prev => [{ ...payload, id: numero, numero, estado: "Pendiente", fechaSolicitud: fechaHoy(), fechaAprobacion: null, fechaReembolso: null, motivoRechazo: null }, ...prev]);
    // ── Notif devolución ──────────────────────────────
    agregarNotifInterna({
      tipo:  NOTIF_TIPOS.DEVOLUCION,
      clave: `devolucion-${numero}`,
      titulo: `Nueva devolución: ${numero}`,
      mensaje: `Se solicitó la devolución ${numero} del pedido ${payload.numeroPedido}. Motivo: ${payload.motivo}.`,
      idReferencia: numero, refNombre: numero,
    });
    return numero;
  };
  const aprobarDevolucion   = (id) => setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Aprobada",    fechaAprobacion: fechaHoy() }));
  const rechazarDevolucion  = (id, motivoRechazo) => setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Rechazada",   fechaAprobacion: fechaHoy(), motivoRechazo }));
  const reembolsarDevolucion = (id) => {
    const dev = devoluciones.find(d => d.id === id); if (!dev || dev.estado !== "Aprobada") return;
    setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Reembolsada", fechaReembolso: fechaHoy() }));
    if (dev.idCliente) setCreditosClientes(prev => ({ ...prev, [dev.idCliente]: (prev[dev.idCliente] || 0) + dev.totalDevuelto }));
  };
  const eliminarDevolucion = (id) => {
    const dev = devoluciones.find(d => d.id === id); if (!dev || dev.estado === "Reembolsada") return { ok: false };
    setDevoluciones(prev => prev.filter(d => d.id !== id)); return { ok: true };
  };

  /* ── CRUD descuentos ────────────────────────────────── */
  const crearDescuento   = (payload) => setDescuentos(prev => [{ ...payload, id: nextDescuentoId(descuentos), usosCount: 0 }, ...prev]);
  const editarDescuento  = (payload) => setDescuentos(prev => prev.map(d => d.id !== payload.id ? d : { ...d, ...payload }));
  const toggleDescuento  = (id) => setDescuentos(prev => prev.map(d => d.id !== id ? d : { ...d, activo: !d.activo }));
  const eliminarDescuento = (id) => { setDescuentos(prev => prev.filter(d => d.id !== id)); setAsignacionesDesc(prev => { const next = { ...prev }; delete next[id]; return next; }); };
  const asignarDescuentoClientes = (idDescuento, idsClientes) => setAsignacionesDesc(prev => ({ ...prev, [idDescuento]: idsClientes }));
  const getClientesDescuento     = (idDescuento) => clientes.filter(c => (asignacionesDesc[idDescuento] || []).includes(c.id));
  const aplicarCodigoDescuento   = (codigo, idCliente) => {
    const hoyStr = fechaHoy(); const desc = descuentos.find(d => d.codigo === codigo.toUpperCase());
    if (!desc)                     return { ok: false, error: "Código no encontrado" };
    if (!desc.activo)              return { ok: false, error: "Este código está inactivo" };
    if (hoyStr < desc.fechaInicio) return { ok: false, error: "Este código aún no está vigente" };
    if (hoyStr > desc.fechaFin)    return { ok: false, error: "Este código ha vencido" };
    const usosActuales = historialDescuentos.filter(h => h.idDescuento === desc.id).length;
    if (desc.limiteUsos && usosActuales >= desc.limiteUsos) return { ok: false, error: "Este código ya alcanzó su límite de usos" };
    const asignados = asignacionesDesc[desc.id] || [];
    if (asignados.length > 0 && idCliente && !asignados.includes(idCliente)) return { ok: false, error: "Este código no está disponible para este cliente" };
    return { ok: true, descuento: desc };
  };
  const registrarUsoDescuento = (idDescuento, { numeroPedido, cliente, montoDescuento }) =>
    setHistorialDescuentos(prev => [{ idDescuento, numeroPedido, cliente, montoDescuento, fecha: fechaHoy() }, ...prev]);

  /* ══════════════════════════════════════════════════════
     PROVIDER
  ══════════════════════════════════════════════════════ */
  return (
    <AppContext.Provider value={{
      /* Estado raw */
      categoriasProductos, categoriasInsumos, insumos, lotes, productos,
      roles, usuarios, clientes, proveedores, compras,
      pedidos, ordenes, devoluciones, creditosClientes,
      descuentos, historialDescuentos,

      /* Derivados */
      categoriasProductosActivas, categoriasInsumosActivas,
      insumosPorCategoriaId, insumosPorCategoriaNombre,
      unidades: UNIDADES_MEDIDA,
      rolesActivos, usuariosPorRol, insumosActivos, clientesActivos,

      /* Lookups */
      getCatProducto, getCatInsumo, getUnidad, getRol,
      getProveedor, getInsumo, getCliente,
      getLotesDeInsumo, getLotesVencidos, getStockRealInsumo,
      getLotesProducto, getLotesVencidosProducto, agregarLoteProducto,
      getSalidasProducto, registrarSalidaProducto,
      getSalidasInsumo,

      /* Validaciones */
      canDeleteCatProducto, canDeleteCatInsumo,
      canDeleteInsumo, canDeleteProducto,
      canDeleteRol, canDeleteUsuario,
      canDeleteCliente, canDeleteProveedor, canDeleteCompra, canDeletePedido,

      /* CRUD */
      crearCatProducto, editarCatProducto, toggleCatProducto, eliminarCatProducto,
      crearCatInsumo,   editarCatInsumo,   toggleCatInsumo,   eliminarCatInsumo,
      crearInsumo,      editarInsumo,      toggleInsumo,      eliminarInsumo,
      crearProducto,    editarProducto,    eliminarProducto,  guardarFicha, toggleActivoProducto,
      crearRol,         editarRol,         toggleRol,         eliminarRol,
      crearUsuario,     editarUsuario,     toggleUsuario,     eliminarUsuario,
      crearCliente,     editarCliente,     toggleCliente,     eliminarCliente,
      crearProveedor,   editarProveedor,   toggleProveedor,   eliminarProveedor,
      crearCompra,      editarCompra,      eliminarCompra,
      registrarSalidaInsumo, descontarStockFIFO,
      crearPedido,      editarPedido,      eliminarPedido,
      cambiarEstadoPedido, asignarDomiciliario, generarOrdenProduccion,
      cambiarEstadoOrden,  asignarEmpleadoOrden,
      crearDevolucion, aprobarDevolucion, rechazarDevolucion, reembolsarDevolucion, eliminarDevolucion,
      crearDescuento, editarDescuento, toggleDescuento, eliminarDescuento,
      asignarDescuentoClientes, getClientesDescuento,
      aplicarCodigoDescuento, registrarUsoDescuento,

      /* Utilidades */
      calcularTotal, diasHasta, estadoLote, convertirUnidad, getVencimientoMasAntiguo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}