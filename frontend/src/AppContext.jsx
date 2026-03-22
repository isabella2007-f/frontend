import { createContext, useContext, useState } from "react";

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

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES
══════════════════════════════════════════════════════════ */

const initCategoriasProductos = [
  { id: 1, nombre: "Congelados", descripcion: "Productos fríos a base de plátano",  estado: true,  fecha: "12/12/2025", icon: "🧊" },
  { id: 2, nombre: "Postres",    descripcion: "Productos dulces de plátano",         estado: true,  fecha: "12/12/2025", icon: "🍮" },
  { id: 3, nombre: "Snacks",     descripcion: "Tostones y chips de plátano",         estado: false, fecha: "01/01/2026", icon: "🍟" },
  { id: 4, nombre: "Harinas",    descripcion: "Harinas y mezclas de plátano verde",  estado: true,  fecha: "20/02/2026", icon: "🌾" },
  { id: 5, nombre: "Orgánicos",  descripcion: "Línea orgánica certificada",          estado: false, fecha: "28/02/2026", icon: "🌿" },
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

const initProductos = [
  { id: 1, nombre: "Muffin de plátano",      idCategoria: 2, precio: 10000, stock: 50, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 2, nombre: "Palito de queso",         idCategoria: 1, precio: 5000,  stock: 0,  stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 3, nombre: "Chips de plátano verde",  idCategoria: 3, precio: 3500,  stock: 7,  stockMinimo: 15, imagen: null, imagenPreview: null, fecha: "01/01/2026", ficha: null },
  { id: 4, nombre: "Harina de plátano 500g",  idCategoria: 4, precio: 12000, stock: 80, stockMinimo: 20, imagen: null, imagenPreview: null, fecha: "20/02/2026", ficha: null },
  { id: 5, nombre: "Tostones orgánicos",       idCategoria: 5, precio: 7500,  stock: 15, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "28/02/2026", ficha: null },
];

const initProveedores = [
  { id: "PROV0001", responsable: "Juan Morales",   direccion: "Cra 45 # 10-20, Medellín",     celular: "300 123 4567", correo: "juan.morales@prov.com",   ciudad: "Medellín"     },
  { id: "PROV0002", responsable: "Sandra López",   direccion: "Calle 80 # 23-15, Bogotá",     celular: "312 456 7890", correo: "sandra.lopez@prov.com",   ciudad: "Bogotá"       },
  { id: "PROV0003", responsable: "Pedro Ríos",     direccion: "Av. 6N # 12-50, Cali",         celular: "315 789 0123", correo: "pedro.rios@prov.com",     ciudad: "Cali"         },
  { id: "PROV0004", responsable: "Marcela Gómez",  direccion: "Cl. 50 # 40-30, Barranquilla", celular: "318 012 3456", correo: "marcela.gomez@prov.com",  ciudad: "Barranquilla" },
  { id: "PROV0005", responsable: "Andrés Herrera", direccion: "Cra 15 # 68-10, Bucaramanga",  celular: "321 345 6789", correo: "andres.herrera@prov.com", ciudad: "Bucaramanga"  },
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

const initRoles = [
  { id: 1, nombre: "Admin",    icono: "👑", iconoPreview: null, estado: true,  fecha: "12/12/2025", esAdmin: true,  permisos: [] },
  { id: 2, nombre: "Empleado", icono: "👷", iconoPreview: null, estado: true,  fecha: "12/12/2025", esAdmin: false, permisos: [] },
  { id: 3, nombre: "Cliente",  icono: "👤", iconoPreview: null, estado: true,  fecha: "01/01/2026", esAdmin: false, permisos: [] },
];

/* Usuarios internos — solo Admin y Empleado */
const initUsuarios = [
  { id: 1, nombre: "Carlos", apellidos: "Pérez Ruiz",   correo: "carlos.perez@email.com", cedula: "80456789",   telefono: "310 987 6543", direccion: "Carrera 15 # 8-30", departamento: "Cundinamarca", municipio: "Bogotá",   rol: "Admin",    estado: true,  foto: null, fechaCreacion: "12/12/2025", esAdmin: true },
  { id: 2, nombre: "Ana",    apellidos: "García López", correo: "ana.garcia@email.com",   cedula: "1012345678", telefono: "300 123 4567", direccion: "Calle 50 # 40-20",  departamento: "Antioquia",    municipio: "Medellín", rol: "Empleado", estado: true,  foto: null, fechaCreacion: "15/01/2026" },
  { id: 3, nombre: "Lucía",  apellidos: "Martínez Vega",correo: "lucia.mv@email.com",     cedula: "1234567890", telefono: "315 456 7890", direccion: "Av. 6N # 23-10",    departamento: "Valle del Cauca", municipio: "Cali",  rol: "Empleado", estado: false, foto: null, fechaCreacion: "01/02/2026" },
];

/* ══════════════════════════════════════════════════════════
   CLIENTES — entidad propia, misma estructura que GestionClientes
   Estos son los que ve CrearPedido / EditarPedido
══════════════════════════════════════════════════════════ */
const initClientes = [
  { id: uid(), tipoDoc: "CC", numDoc: "1012345678", nombre: "Ana",    apellidos: "García López",   correo: "ana.garcia@email.com",   telefono: "300 123 4567", direccion: "Calle 50 # 40-20",   departamento: "Antioquia",    municipio: "Medellín",    estado: true,  fotoPreview: null, fechaCreacion: "12/12/2025" },
  { id: uid(), tipoDoc: "CC", numDoc: "80456789",   nombre: "Carlos", apellidos: "Pérez Ruiz",     correo: "carlos.perez@email.com", telefono: "310 987 6543", direccion: "Carrera 15 # 8-30",  departamento: "Cundinamarca", municipio: "Bogotá",      estado: true,  fotoPreview: null, fechaCreacion: "15/01/2026" },
  { id: uid(), tipoDoc: "CE", numDoc: "E-1234567",  nombre: "Lucía",  apellidos: "Martínez Vega",  correo: "lucia.mv@email.com",     telefono: "315 456 7890", direccion: "Av. 6N # 23-10",     departamento: "Valle",        municipio: "Cali",        estado: false, fotoPreview: null, fechaCreacion: "01/02/2026" },
  { id: uid(), tipoDoc: "CC", numDoc: "72654321",   nombre: "Jorge",  apellidos: "Torres Suárez",  correo: "jorge.torres@email.com", telefono: "320 321 0987", direccion: "Calle 72 # 45-55",   departamento: "Atlántico",    municipio: "Barranquilla", estado: true,  fotoPreview: null, fechaCreacion: "20/02/2026" },
  { id: uid(), tipoDoc: "TI", numDoc: "1234567890", nombre: "María",  apellidos: "López Castillo", correo: "maria.lc@email.com",     telefono: "317 654 3210", direccion: "Diagonal 30 # 12-5", departamento: "Santander",    municipio: "Bucaramanga", estado: true,  fotoPreview: null, fechaCreacion: "28/02/2026" },
];

/* ══════════════════════════════════════════════════════════
   PEDIDOS
══════════════════════════════════════════════════════════ */
const initPedidos = [
  {
    id: 1,
    numero: "PED-001",
    idCliente: null, /* se llena con el id real del cliente al crear */
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
    id: 2,
    numero: "PED-002",
    idCliente: null,
    cliente: { nombre: "María López Castillo", correo: "maria.lc@email.com", telefono: "317 654 3210" },
    productosItems: [
      { idProducto: 2, nombre: "Palito de queso",        precio: 5000,  cantidad: 4, stockActual: 0,  stockOk: false },
      { idProducto: 4, nombre: "Harina de plátano 500g", precio: 12000, cantidad: 1, stockActual: 80, stockOk: true  },
    ],
    subtotal: 32000, descuento: 0, total: 32000,
    metodo_pago: "Transferencia", domicilio: true,
    direccion_entrega: "Diagonal 30 # 12-5, Bucaramanga",
    idEmpleado: null, notas: "Sin sal extra por favor",
    estado: "En producción", orden_produccion: true, fecha_pedido: "2026-03-19",
  },
  {
    id: 3,
    numero: "PED-003",
    idCliente: null,
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
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   ÓRDENES DE PRODUCCIÓN
══════════════════════════════════════════════════════════ */

const initOrdenes = [
  {
    id: "OP-001",
    idPedido: 2,
    numeroPedido: "PED-002",
    productos: [
      { idProducto: 2, nombre: "Palito de queso", cantidad: 4, precio: 5000 },
    ],
    insumos: [
      { idInsumo: 1, nombre: "Plátano verde",  cantidad: 2,   unidad: "kg", stockOk: true  },
      { idInsumo: 5, nombre: "Queso",          cantidad: 1,   unidad: "kg", stockOk: true  },
      { idInsumo: 8, nombre: "Aceite vegetal", cantidad: 0.5, unidad: "l",  stockOk: true  },
      { idInsumo: 7, nombre: "Sal",            cantidad: 0.1, unidad: "kg", stockOk: false },
    ],
    idEmpleado:   2,
    estado:       "En proceso",
    fechaInicio:  "2026-03-19",
    fechaEntrega: "2026-03-22",
    fechaCierre:  null,
    costo:        18500,
    notas:        "Sin sal extra por favor",
  },
];

/* ══════════════════════════════════════════════════════════
   DEVOLUCIONES
   estado: "Pendiente" → "Aprobada" → "Reembolsada"
                       → "Rechazada"
══════════════════════════════════════════════════════════ */

const initDevoluciones = [
  {
    id: "DEV-001",
    numero: "DEV-001",
    idPedido: 2,
    numeroPedido: "PED-002",
    idCliente: null,
    cliente: { nombre: "María López Castillo", correo: "maria.lc@email.com", telefono: "317 654 3210" },
    motivo: "Producto en mal estado",
    comentario: "El palito de queso llegó con moho.",
    productos: [
      { idProducto: 2, nombre: "Palito de queso", cantidad: 2, precioUnitario: 5000, subtotal: 10000 },
    ],
    totalDevuelto:  10000,
    estado:         "Pendiente",
    fechaSolicitud: "2026-03-20",
    fechaAprobacion: null,
    fechaReembolso:  null,
    motivoRechazo:   null,
  },
];

/* Créditos por cliente: { [idCliente]: saldo } */
const initCreditosClientes = {};

export const calcularTotal = (detalles) =>
  detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0) * (Number(d.precioUnd) || 0), 0);

const nextCompraId = (compras) => {
  const nums = compras.map(c => parseInt(c.id.replace("C-", "")) || 0);
  return `C-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

const nextLoteId = (lotesArr) => {
  const nums = lotesArr.map(l => parseInt(l.id.replace("LC-", "")) || 0);
  return `LC-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

const nextPedidoNumero = (pedidos) => {
  const nums = pedidos.map(p => parseInt(p.numero.replace("PED-", "")) || 0);
  return `PED-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

const nextOrdenId = (ordenes) => {
  const nums = ordenes.map(o => parseInt(o.id.replace("OP-", "")) || 0);
  return `OP-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

const nextDevolucionNumero = (devoluciones) => {
  const nums = devoluciones.map(d => parseInt(d.numero.replace("DEV-", "")) || 0);
  return `DEV-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
};

const fechaHoy = () => new Date().toISOString().split("T")[0];

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */

const AppContext = createContext(null);

export function AppProvider({ children }) {

  const [categoriasProductos, setCategoriasProductos] = useState(initCategoriasProductos);
  const [categoriasInsumos,   setCategoriasInsumos]   = useState(initCategoriasInsumos);
  const [insumos,             setInsumos]             = useState(initInsumos);
  const [lotes,               setLotes]               = useState(initLotes);
  const [productos,           setProductos]           = useState(initProductos);
  const [roles,               setRoles]               = useState(initRoles);
  const [usuarios,            setUsuarios]            = useState(initUsuarios);
  const [clientes,            setClientes]            = useState(initClientes);
  const [proveedores,         setProveedores]         = useState(initProveedores);
  const [compras,             setCompras]             = useState(initCompras);
  const [pedidos,             setPedidos]             = useState(initPedidos);
  const [ordenes,             setOrdenes]             = useState(initOrdenes);
  const [devoluciones,        setDevoluciones]        = useState(initDevoluciones);
  const [creditosClientes,    setCreditosClientes]    = useState(initCreditosClientes);

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

  /* ── Helpers de lotes ───────────────────────────────── */

  const getLotesDeInsumo = (idInsumo) =>
    lotes
      .filter(l => l.idInsumo === Number(idInsumo))
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const getStockRealInsumo = (idInsumo) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return lotes
      .filter(l =>
        l.idInsumo === Number(idInsumo) &&
        l.cantidadActual > 0 &&
        new Date(l.fechaVencimiento + "T00:00:00") >= hoy
      )
      .reduce((acc, l) => acc + l.cantidadActual, 0);
  };

  /* ── Lookups ────────────────────────────────────────── */

  const getCatProducto = id     => categoriasProductos.find(c => c.id === id) || { nombre: "—", icon: "📦" };
  const getCatInsumo   = id     => categoriasInsumos.find(c => c.id === id)   || { nombre: "—", icon: "📦" };
  const getUnidad      = id     => UNIDADES_MEDIDA.find(u => u.id === id)     || { simbolo: "—", nombre: "—" };
  const getRol         = nombre => roles.find(r => r.nombre === nombre)       || null;
  const getProveedor   = id     => proveedores.find(p => p.id === id)         || null;
  const getInsumo      = id     => insumos.find(i => i.id === Number(id))     || null;
  const getCliente     = id     => clientes.find(c => c.id === id)            || null;

  /* ── Validaciones ───────────────────────────────────── */

  const canDeleteCatProducto = (catId) => {
    const enUso = productos.filter(p => p.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Tiene ${enUso.length} producto${enUso.length > 1 ? "s" : ""} asociado${enUso.length > 1 ? "s" : ""}. Elimínalos o cámbiales la categoría primero.` };
  };

  const canDeleteCatInsumo = (catId) => {
    const enUso = insumos.filter(i => i.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Tiene ${enUso.length} insumo${enUso.length > 1 ? "s" : ""} registrado${enUso.length > 1 ? "s" : ""}. Elimínalos o cámbiales la categoría primero.` };
  };

  const canDeleteInsumo = (insumoId) => {
    const ins = insumos.find(i => i.id === insumoId);
    if (!ins) return { ok: true };
    const fichasAfectadas = productos.filter(p => p.ficha?.insumos?.some(fi => fi.nombre === ins.nombre));
    if (!fichasAfectadas.length) return { ok: true };
    return { ok: false, razon: `"${ins.nombre}" está en ${fichasAfectadas.length} ficha${fichasAfectadas.length > 1 ? "s" : ""} técnica${fichasAfectadas.length > 1 ? "s" : ""}. Retíralo de esas fichas primero.` };
  };

  const canDeleteProducto = (productoId) => {
    const enPedidosActivos = pedidos.filter(ped =>
      !["Entregado", "Cancelado"].includes(ped.estado) &&
      (ped.productosItems || []).some(pi => pi.idProducto === productoId)
    );
    if (enPedidosActivos.length)
      return { ok: false, razon: `Este producto está en ${enPedidosActivos.length} pedido${enPedidosActivos.length > 1 ? "s" : ""} activo${enPedidosActivos.length > 1 ? "s" : ""}. Finalízalos primero.` };
    const p = productos.find(x => x.id === productoId);
    if (p?.ficha) return { ok: true, advertencia: "Este producto tiene una ficha técnica que también se eliminará." };
    return { ok: true };
  };

  const canDeleteRol = (rolId) => {
    const rol = roles.find(r => r.id === rolId);
    if (!rol) return { ok: true };
    if (rol.esAdmin) return { ok: false, razon: `El rol "${rol.nombre}" está protegido.` };
    const asignados = usuarios.filter(u => u.rol === rol.nombre);
    if (asignados.length) return { ok: false, razon: `El rol "${rol.nombre}" tiene ${asignados.length} usuario${asignados.length > 1 ? "s" : ""} asignado${asignados.length > 1 ? "s" : ""}. Reasígnalos primero.` };
    return { ok: true };
  };

  const canDeleteUsuario = (usuarioId) => {
    const user = usuarios.find(u => u.id === usuarioId);
    if (!user) return { ok: true };
    if (user.esAdmin) return { ok: false, razon: `El usuario "${user.nombre} ${user.apellidos}" es administrador principal.` };
    return { ok: true };
  };

  const canDeleteCliente = (clienteId) => {
    const enPedidos = pedidos.filter(p =>
      p.idCliente === clienteId &&
      !["Entregado", "Cancelado"].includes(p.estado)
    );
    if (enPedidos.length)
      return { ok: false, razon: `Este cliente tiene ${enPedidos.length} pedido${enPedidos.length > 1 ? "s" : ""} activo${enPedidos.length > 1 ? "s" : ""}. Finalízalos primero.` };
    return { ok: true };
  };

  const canDeleteProveedor = (proveedorId) => {
    const qty = compras.filter(c => c.idProveedor === proveedorId).length;
    if (!qty) return { ok: true };
    return { ok: false, razon: `Este proveedor tiene ${qty} compra${qty > 1 ? "s" : ""} registrada${qty > 1 ? "s" : ""}. Elimínalas primero.` };
  };

  const canDeleteCompra = (compraId) => {
    const c = compras.find(x => x.id === compraId);
    if (!c) return { ok: true };
    if (c.stockAplicado) return { ok: false, razon: "No se puede eliminar una compra completada. Sus lotes ya fueron aplicados al inventario." };
    return { ok: true };
  };

  const canDeletePedido = (pedidoId) => {
    const ped = pedidos.find(p => p.id === pedidoId);
    if (!ped) return { ok: true };
    if (ped.estado === "Entregado") return { ok: false, razon: "Los pedidos entregados no se pueden eliminar." };
    return { ok: true };
  };

  /* ── CRUD — categorías productos ────────────────────── */

  const crearCatProducto    = f  => setCategoriasProductos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatProducto   = f  => setCategoriasProductos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatProducto   = id => setCategoriasProductos(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCatProducto = id => setCategoriasProductos(p => p.filter(c => c.id !== id));

  /* ── CRUD — categorías insumos ──────────────────────── */

  const crearCatInsumo    = f  => setCategoriasInsumos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatInsumo   = f  => setCategoriasInsumos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatInsumo   = id => setCategoriasInsumos(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCatInsumo = id => setCategoriasInsumos(p => p.filter(c => c.id !== id));

  /* ── CRUD — insumos ─────────────────────────────────── */

  const crearInsumo    = f  => setInsumos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarInsumo   = f  => setInsumos(p => p.map(i => i.id === f.id ? f : i));
  const toggleInsumo   = id => setInsumos(p => p.map(i => i.id === id ? { ...i, estado: !i.estado } : i));
  const eliminarInsumo = id => setInsumos(p => p.filter(i => i.id !== id));

  /* ── CRUD — productos ───────────────────────────────── */

  const crearProducto    = f            => setProductos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarProducto   = f            => setProductos(p => p.map(x => x.id === f.id ? f : x));
  const eliminarProducto = id           => setProductos(p => p.filter(x => x.id !== id));
  const guardarFicha     = (pId, ficha) => setProductos(p => p.map(x => x.id === pId ? { ...x, ficha } : x));

  /* ── CRUD — roles ───────────────────────────────────── */

  const crearRol  = (form) => setRoles(p => [{ ...form, id: Date.now(), fecha: new Date().toLocaleDateString("es-CO"), esAdmin: false }, ...p]);
  const editarRol = (form) => setRoles(p => p.map(r => r.id === form.id ? { ...r, ...form } : r));
  const toggleRol = (id) => {
    const rol = roles.find(r => r.id === id);
    if (!rol) return;
    const nuevoEstado = !rol.estado;
    setRoles(p => p.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    if (!nuevoEstado) setUsuarios(p => p.map(u => u.rol === rol.nombre && !u.esAdmin ? { ...u, estado: false } : u));
  };
  const eliminarRol = (id) => {
    const check = canDeleteRol(id);
    if (!check.ok) return check;
    setRoles(p => p.filter(r => r.id !== id));
    return { ok: true };
  };

  /* ── CRUD — usuarios internos ───────────────────────── */

  const crearUsuario  = (form) => setUsuarios(p => [{ ...form, id: Date.now(), fechaCreacion: new Date().toLocaleDateString("es-CO"), esAdmin: false }, ...p]);
  const editarUsuario = (form) => setUsuarios(p => p.map(u => u.id === form.id ? { ...u, ...form } : u));
  const toggleUsuario = (id) => {
    const user = usuarios.find(u => u.id === id);
    if (!user) return;
    const rolObj = roles.find(r => r.nombre === user.rol);
    if (!user.estado && rolObj && !rolObj.estado) return;
    setUsuarios(p => p.map(u => u.id === id ? { ...u, estado: !u.estado } : u));
  };
  const eliminarUsuario = (id) => {
    const check = canDeleteUsuario(id);
    if (!check.ok) return check;
    setUsuarios(p => p.filter(u => u.id !== id));
    return { ok: true };
  };

  /* ── CRUD — clientes ────────────────────────────────── */

  const crearCliente  = (form) => {
    const nuevo = { ...form, id: uid(), fechaCreacion: form.fechaCreacion || new Date().toLocaleDateString("es-CO") };
    setClientes(p => [nuevo, ...p]);
    return nuevo.id;
  };
  const editarCliente  = (form) => setClientes(p => p.map(c => c.id === form.id ? { ...form } : c));
  const toggleCliente  = (id)   => setClientes(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCliente = (id)  => {
    const check = canDeleteCliente(id);
    if (!check.ok) return check;
    setClientes(p => p.filter(c => c.id !== id));
    return { ok: true };
  };

  /* ── CRUD — proveedores ─────────────────────────────── */

  const crearProveedor    = (form) => setProveedores(p => [{ ...form, id: `PROV${String(Date.now()).slice(-4)}` }, ...p]);
  const editarProveedor   = (form) => setProveedores(p => p.map(x => x.id === form.id ? form : x));
  const eliminarProveedor = (id)   => {
    const check = canDeleteProveedor(id);
    if (!check.ok) return check;
    setProveedores(p => p.filter(x => x.id !== id));
    return { ok: true };
  };

  /* ── CRUD — compras + lotes ─────────────────────────── */

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
    if (stockAplicado) { setLotes(prev => [...prev, ..._buildLotes(id, detalles, prev)]); _subirStock(detalles); }
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

  const eliminarCompra = (id) => {
    const check = canDeleteCompra(id);
    if (!check.ok) return check;
    setCompras(p => p.filter(c => c.id !== id));
    return { ok: true };
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
    if (restante > 0) return { ok: false, faltante: restante };
    setLotes(prev => prev.map(l => { const cambio = cambios.find(c => c.id === l.id); return cambio ? { ...l, cantidadActual: cambio.nueva } : l; }));
    setInsumos(prev => prev.map(ins => ins.id === Number(idInsumo) ? { ...ins, stockActual: Math.max(0, ins.stockActual - cantidadNecesaria) } : ins));
    return { ok: true, faltante: 0 };
  };

  /* ── Helper interno: construir objeto de orden desde un pedido ── */
  const _buildOrden = (pedido, { fechaEntrega, notas }, prevOrdenes, productosActuales, insumosActuales) => {
    const id = nextOrdenId(prevOrdenes);
    const productoresSinStock = (pedido.productosItems || []).filter(p => !p.stockOk);

    /* Insumos desde ficha técnica */
    const insumosOrden = [];
    productoresSinStock.forEach(item => {
      const prod  = productosActuales.find(p => p.id === item.idProducto);
      const ficha = prod?.ficha;
      if (ficha?.insumos?.length) {
        ficha.insumos.forEach(fi => {
          const ins = insumosActuales.find(i => i.nombre === fi.nombre || i.id === fi.idInsumo);
          if (!ins) return;
          const cantTotal = (Number(fi.cantidad) || 0) * item.cantidad;
          insumosOrden.push({
            idInsumo: ins.id,
            nombre:   ins.nombre,
            cantidad: cantTotal,
            unidad:   UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und",
            stockOk:  (ins.stockActual || 0) >= cantTotal,
          });
        });
      }
    });

    const costoEst = productoresSinStock.reduce(
      (acc, p) => acc + (p.precio || 0) * p.cantidad, 0
    );

    return {
      id,
      idPedido:     pedido.id,
      numeroPedido: pedido.numero,
      productos:    productoresSinStock.map(p => ({
        idProducto: p.idProducto,
        nombre:     p.nombre,
        cantidad:   p.cantidad,
        precio:     p.precio,
      })),
      insumos:      insumosOrden,
      idEmpleado:   null,
      estado:       "Pendiente",
      fechaInicio:  fechaHoy(),
      fechaEntrega: fechaEntrega || null,
      fechaCierre:  null,
      costo:        costoEst,
      notas:        notas || "",
    };
  };

  /* ── CRUD — pedidos ─────────────────────────────────── */

  const crearPedido = (payload) => {
    const numero   = nextPedidoNumero(pedidos);
    const estadoInicial = payload.orden_produccion ? "En producción" : "Pendiente";
    const nuevo    = {
      ...payload,
      id:              Date.now(),
      numero,
      estado:          estadoInicial,
      orden_produccion: payload.orden_produccion || false,
      fecha_pedido:    fechaHoy(),
      idEmpleado:      null,
    };

    setPedidos(prev => [nuevo, ...prev]);

    /* Descontar stock de productos disponibles */
    setProductos(prev => prev.map(prod => {
      const item = payload.productosItems.find(p => p.idProducto === prod.id && p.stockOk);
      if (!item) return prod;
      return { ...prod, stock: Math.max(0, prod.stock - item.cantidad) };
    }));

    /* Si hay productos sin stock → crear orden de producción automáticamente */
    if (nuevo.orden_produccion) {
      setOrdenes(prev => {
        const orden = _buildOrden(nuevo, { fechaEntrega: null, notas: payload.notas || "" }, prev, productos, insumos);
        return [orden, ...prev];
      });
    }

    return numero;
  };

  const editarPedido = (payload) => {
    setPedidos(prev => prev.map(p => {
      if (p.id !== payload.id) return p;
      if (["Entregado", "Cancelado"].includes(p.estado)) {
        /* En estados finales solo permitir obs_domicilio y fecha_entrega_real */
        const patch = {};
        if (payload.obs_domicilio    !== undefined) patch.obs_domicilio    = payload.obs_domicilio;
        if (payload.fecha_entrega_real !== undefined) patch.fecha_entrega_real = payload.fecha_entrega_real;
        return { ...p, ...patch };
      }
      return { ...p, ...payload, estado: p.estado, numero: p.numero, fecha_pedido: p.fecha_pedido, idEmpleado: p.idEmpleado };
    }));
  };

  const eliminarPedido = (id) => {
    const ped = pedidos.find(p => p.id === id);
    if (!ped) return { ok: true };
    if (ped.estado === "Entregado") return { ok: false, razon: "Los pedidos entregados no se pueden eliminar." };
    if (!["Cancelado"].includes(ped.estado)) {
      setProductos(prev => prev.map(prod => {
        const item = (ped.productosItems || []).find(p => p.idProducto === prod.id && p.stockOk);
        if (!item) return prod;
        return { ...prod, stock: prod.stock + item.cantidad };
      }));
    }
    setPedidos(prev => prev.filter(p => p.id !== id));
    return { ok: true };
  };

  const cambiarEstadoPedido = (id, nuevoEstado) => {
    setPedidos(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (nuevoEstado === "Cancelado" && p.estado !== "Cancelado") {
        setProductos(prods => prods.map(prod => {
          const item = (p.productosItems || []).find(pi => pi.idProducto === prod.id && pi.stockOk);
          if (!item) return prod;
          return { ...prod, stock: prod.stock + item.cantidad };
        }));
      }
      return { ...p, estado: nuevoEstado };
    }));
  };

  const asignarDomiciliario = (pedidoId, empleadoId) => {
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, idEmpleado: empleadoId } : p));
  };

  const generarOrdenProduccion = (pedidoId, { fechaEntrega, notas }) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    /* Marcar pedido */
    setPedidos(prev => prev.map(p =>
      p.id !== pedidoId ? p : {
        ...p,
        orden_produccion:   true,
        estado:             "En producción",
        fecha_entrega_prod: fechaEntrega,
        notas_produccion:   notas,
      }
    ));

    /* Crear entidad orden usando el helper con estado actual */
    setOrdenes(prev => {
      const orden = _buildOrden(pedido, { fechaEntrega, notas }, prev, productos, insumos);
      return [orden, ...prev];
    });
  };

  /* ── CRUD — órdenes de producción ──────────────────────── */

  const cambiarEstadoOrden = (ordenId, nuevoEstado) => {
    setOrdenes(prev => prev.map(o => {
      if (o.id !== ordenId) return o;
      const fechaCierre = nuevoEstado === "Completada" ? fechaHoy() : o.fechaCierre;

      /* Si se completa la orden → actualizar stock del producto y estado del pedido */
      if (nuevoEstado === "Completada" && o.estado !== "Completada") {
        setProductos(prods => prods.map(prod => {
          const item = (o.productos || []).find(p => p.idProducto === prod.id);
          if (!item) return prod;
          return { ...prod, stock: prod.stock + item.cantidad };
        }));
        /* Actualizar pedido relacionado a "Listo" si ya no hay más órdenes pendientes */
        if (o.idPedido) {
          setPedidos(prevP => prevP.map(p => {
            if (p.id !== o.idPedido) return p;
            return { ...p, estado: "Listo" };
          }));
        }
      }

      return { ...o, estado: nuevoEstado, fechaCierre };
    }));
  };

  const asignarEmpleadoOrden = (ordenId, empleadoId) => {
    setOrdenes(prev => prev.map(o =>
      o.id === ordenId ? { ...o, idEmpleado: empleadoId } : o
    ));
  };

  const crearDevolucion = (payload) => {
    const numero = nextDevolucionNumero(devoluciones);
    const nueva  = { ...payload, id: numero, numero, estado: "Pendiente", fechaSolicitud: fechaHoy(), fechaAprobacion: null, fechaReembolso: null, motivoRechazo: null };
    setDevoluciones(prev => [nueva, ...prev]);
    return numero;
  };

  const aprobarDevolucion = (id) => {
    setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Aprobada", fechaAprobacion: fechaHoy() }));
  };

  const rechazarDevolucion = (id, motivoRechazo) => {
    setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Rechazada", fechaAprobacion: fechaHoy(), motivoRechazo }));
  };

  const reembolsarDevolucion = (id) => {
    const dev = devoluciones.find(d => d.id === id);
    if (!dev || dev.estado !== "Aprobada") return;
    setDevoluciones(prev => prev.map(d => d.id !== id ? d : { ...d, estado: "Reembolsada", fechaReembolso: fechaHoy() }));
    if (dev.idCliente) {
      setCreditosClientes(prev => ({ ...prev, [dev.idCliente]: (prev[dev.idCliente] || 0) + dev.totalDevuelto }));
    }
  };

  const eliminarDevolucion = (id) => {
    const dev = devoluciones.find(d => d.id === id);
    if (!dev || dev.estado === "Reembolsada") return { ok: false };
    setDevoluciones(prev => prev.filter(d => d.id !== id));
    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     PROVIDER
  ══════════════════════════════════════════════════════ */
  return (
    <AppContext.Provider value={{
      /* Estado raw */
      categoriasProductos, categoriasInsumos, insumos, lotes, productos,
      roles, usuarios, clientes, proveedores, compras, pedidos, ordenes, devoluciones, creditosClientes,

      /* Derivados */
      categoriasProductosActivas, categoriasInsumosActivas,
      insumosPorCategoriaId, insumosPorCategoriaNombre,
      unidades: UNIDADES_MEDIDA,
      rolesActivos, usuariosPorRol, insumosActivos,
      clientesActivos,

      /* Lookups */
      getCatProducto, getCatInsumo, getUnidad, getRol,
      getProveedor, getInsumo, getCliente,
      getLotesDeInsumo, getStockRealInsumo,

      /* Validaciones */
      canDeleteCatProducto, canDeleteCatInsumo,
      canDeleteInsumo, canDeleteProducto,
      canDeleteRol, canDeleteUsuario,
      canDeleteCliente,
      canDeleteProveedor, canDeleteCompra,
      canDeletePedido,

      /* CRUD */
      crearCatProducto, editarCatProducto, toggleCatProducto, eliminarCatProducto,
      crearCatInsumo,   editarCatInsumo,   toggleCatInsumo,   eliminarCatInsumo,
      crearInsumo,      editarInsumo,      toggleInsumo,      eliminarInsumo,
      crearProducto,    editarProducto,    eliminarProducto,  guardarFicha,
      crearRol,         editarRol,         toggleRol,         eliminarRol,
      crearUsuario,     editarUsuario,     toggleUsuario,     eliminarUsuario,
      crearCliente,     editarCliente,     toggleCliente,     eliminarCliente,
      crearProveedor,   editarProveedor,   eliminarProveedor,
      crearCompra,      editarCompra,      eliminarCompra,
      descontarStockFIFO,
      crearPedido,      editarPedido,      eliminarPedido,
      cambiarEstadoPedido, asignarDomiciliario, generarOrdenProduccion,
      cambiarEstadoOrden, asignarEmpleadoOrden,
      crearDevolucion, aprobarDevolucion, rechazarDevolucion, reembolsarDevolucion, eliminarDevolucion,

      /* Utilidades */
      calcularTotal, diasHasta, estadoLote,
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