import { createContext, useContext, useState } from "react";

/* ══════════════════════════════════════════════════════════
   UTILIDADES DE FECHAS
══════════════════════════════════════════════════════════ */

/** Días que faltan desde hoy hasta una fecha ISO "YYYY-MM-DD" */
export const diasHasta = (fechaISO) => {
  if (!fechaISO) return Infinity;
  const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
  const target = new Date(fechaISO + "T00:00:00");
  return Math.round((target - hoy) / 86_400_000);
};

/** Estado visual de un lote según días restantes y stock */
export const estadoLote = (lote) => {
  if (lote.cantidadActual <= 0)      return "agotado";
  const dias = diasHasta(lote.fechaVencimiento);
  if (dias < 0)                      return "vencido";
  if (dias <= 7)                     return "por-vencer";
  return "activo";
};

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

/* Insumos — stockActual es derivado de lotes, pero lo mantenemos
   para compatibilidad con módulos que aún no usan lotes */
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

/*
  LOTES — cada lote es un batch físico recibido de una compra.
  Campos:
    id               → "LC-001"
    idInsumo         → qué insumo
    idCompra         → de qué compra proviene
    idDetalleRef     → ID del detalle de compra que lo originó
    cantidadInicial  → cuánto llegó
    cantidadActual   → cuánto queda (se descuenta al producir, FIFO)
    fechaVencimiento → "YYYY-MM-DD"
    fechaIngreso     → "YYYY-MM-DD"
*/
const initLotes = [
  // C-001 completada (Harina y Sal)
  { id: "LC-001", idInsumo: 6,  idCompra: "C-001", idDetalleRef: "C-001-D1", cantidadInicial: 10, cantidadActual: 8,  fechaVencimiento: "2026-08-20", fechaIngreso: "2026-03-10" },
  { id: "LC-002", idInsumo: 7,  idCompra: "C-001", idDetalleRef: "C-001-D2", cantidadInicial: 5,  cantidadActual: 3,  fechaVencimiento: "2027-01-01", fechaIngreso: "2026-03-10" },
  // C-002 completada (Sal — segundo lote)
  { id: "LC-003", idInsumo: 7,  idCompra: "C-002", idDetalleRef: "C-002-D1", cantidadInicial: 3,  cantidadActual: 3,  fechaVencimiento: "2027-01-01", fechaIngreso: "2026-03-02" },
  // Demo: lote próximo a vencer (Cebolla, vence en 4 días desde hoy)
  { id: "LC-004", idInsumo: 2,  idCompra: "C-001", idDetalleRef: "C-001-D3", cantidadInicial: 20, cantidadActual: 12, fechaVencimiento: "2026-03-22", fechaIngreso: "2026-02-01" },
  // Demo: lote vencido (Tomate)
  { id: "LC-005", idInsumo: 3,  idCompra: "C-001", idDetalleRef: "C-001-D4", cantidadInicial: 15, cantidadActual: 5,  fechaVencimiento: "2026-03-10", fechaIngreso: "2026-01-15" },
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

/*
  COMPRAS — cada detalle ahora lleva fechaVencimiento para el lote.
  stockAplicado = true → los lotes ya fueron creados y el stock ya subió.
*/
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

const initUsuarios = [
  { id: 1, nombre: "Carlos", apellidos: "Pérez Ruiz",     correo: "carlos.perez@email.com", cedula: "80456789",   telefono: "310 987 6543", direccion: "Carrera 15 # 8-30",  departamento: "Cundinamarca",    municipio: "Bogotá",       rol: "Admin",    estado: true,  foto: null, fechaCreacion: "12/12/2025", esAdmin: true },
  { id: 2, nombre: "Ana",    apellidos: "García López",   correo: "ana.garcia@email.com",   cedula: "1012345678", telefono: "300 123 4567", direccion: "Calle 50 # 40-20",   departamento: "Antioquia",       municipio: "Medellín",     rol: "Empleado", estado: true,  foto: null, fechaCreacion: "15/01/2026" },
  { id: 3, nombre: "Lucía",  apellidos: "Martínez Vega",  correo: "lucia.mv@email.com",     cedula: "1234567890", telefono: "315 456 7890", direccion: "Av. 6N # 23-10",     departamento: "Valle del Cauca", municipio: "Cali",         rol: "Empleado", estado: false, foto: null, fechaCreacion: "01/02/2026" },
  { id: 4, nombre: "Jorge",  apellidos: "Torres Suárez",  correo: "jorge.torres@email.com", cedula: "72654321",   telefono: "320 321 0987", direccion: "Calle 72 # 45-55",   departamento: "Atlántico",       municipio: "Barranquilla", rol: "Cliente",  estado: true,  foto: null, fechaCreacion: "20/02/2026" },
  { id: 5, nombre: "María",  apellidos: "López Castillo", correo: "maria.lc@email.com",     cedula: "1234567891", telefono: "317 654 3210", direccion: "Diagonal 30 # 12-5", departamento: "Santander",       municipio: "Bucaramanga",  rol: "Cliente",  estado: true,  foto: null, fechaCreacion: "28/02/2026" },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */

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
  const [proveedores,         setProveedores]         = useState(initProveedores);
  const [compras,             setCompras]             = useState(initCompras);

  /* ── Derivados ──────────────────────────────────────── */

  const categoriasProductosActivas = categoriasProductos.filter(c => c.estado);
  const categoriasInsumosActivas   = categoriasInsumos.filter(c => c.estado);
  const insumosActivos             = insumos.filter(i => i.estado);
  const rolesActivos               = roles.filter(r => r.estado).map(r => r.nombre);

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

  /**
   * Todos los lotes de un insumo, ordenados por fecha de vencimiento (FIFO).
   */
  const getLotesDeInsumo = (idInsumo) =>
    lotes
      .filter(l => l.idInsumo === Number(idInsumo))
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  /**
   * Stock real = suma de cantidadActual de lotes no vencidos y no agotados.
   */
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

  /* ── CRUD — existentes ──────────────────────────────── */

  const crearCatProducto    = f  => setCategoriasProductos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatProducto   = f  => setCategoriasProductos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatProducto   = id => setCategoriasProductos(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCatProducto = id => setCategoriasProductos(p => p.filter(c => c.id !== id));

  const crearCatInsumo    = f  => setCategoriasInsumos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarCatInsumo   = f  => setCategoriasInsumos(p => p.map(c => c.id === f.id ? f : c));
  const toggleCatInsumo   = id => setCategoriasInsumos(p => p.map(c => c.id === id ? { ...c, estado: !c.estado } : c));
  const eliminarCatInsumo = id => setCategoriasInsumos(p => p.filter(c => c.id !== id));

  const crearInsumo    = f  => setInsumos(p => [{ ...f, id: Date.now() }, ...p]);
  const editarInsumo   = f  => setInsumos(p => p.map(i => i.id === f.id ? f : i));
  const toggleInsumo   = id => setInsumos(p => p.map(i => i.id === id ? { ...i, estado: !i.estado } : i));
  const eliminarInsumo = id => setInsumos(p => p.filter(i => i.id !== id));

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

  /* ── CRUD — usuarios ────────────────────────────────── */

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

  /**
   * Genera los objetos de lote a partir de los detalles de una compra.
   * Recibe el array de lotes actual para calcular el siguiente ID.
   */
  const _buildLotes = (compraId, detalles, lotesActuales) => {
    const nuevos = [];
    let ref = [...lotesActuales];
    detalles.forEach(d => {
      const id = nextLoteId([...ref, ...nuevos]);
      const lote = {
        id,
        idInsumo:         Number(d.idInsumo),
        idCompra:         compraId,
        idDetalleRef:     d.id,
        cantidadInicial:  Number(d.cantidad),
        cantidadActual:   Number(d.cantidad),
        fechaVencimiento: d.fechaVencimiento,
        fechaIngreso:     new Date().toISOString().split("T")[0],
      };
      nuevos.push(lote);
      ref.push(lote);
    });
    return nuevos;
  };

  /** Sube stockActual de los insumos afectados */
  const _subirStock = (detalles) => {
    setInsumos(prev => prev.map(ins => {
      const suma = detalles
        .filter(d => Number(d.idInsumo) === ins.id)
        .reduce((acc, d) => acc + Number(d.cantidad), 0);
      return suma > 0 ? { ...ins, stockActual: ins.stockActual + suma } : ins;
    }));
  };

  /**
   * CREAR COMPRA
   * Si se crea como completada → genera lotes y sube stock al instante.
   */
  const crearCompra = (form) => {
    const id = nextCompraId(compras);
    const detalles = form.detalles.map((d, i) => ({ ...d, id: `${id}-D${i + 1}` }));
    const stockAplicado = form.estado === "completada";
    const nueva = { ...form, id, detalles, stockAplicado };

    setCompras(p => [nueva, ...p]);

    if (stockAplicado) {
      setLotes(prev => [...prev, ..._buildLotes(id, detalles, prev)]);
      _subirStock(detalles);
    }

    return id;
  };

  /**
   * EDITAR COMPRA
   * - Completada → solo cambia notas y metodoPago (lotes intocables).
   * - Pendiente → Completada: genera lotes + sube stock.
   * - Pendiente → Pendiente: actualiza todo libremente.
   */
  const editarCompra = (form) => {
    setCompras(p => p.map(c => {
      if (c.id !== form.id) return c;

      if (c.stockAplicado) {
        // Solo campos no-stock
        return { ...c, notas: form.notas, metodoPago: form.metodoPago };
      }

      if (form.estado === "completada") {
        // Pendiente → Completada
        const detallesConId = form.detalles.map((d, i) => ({
          ...d,
          id: d.id || `${c.id}-D${i + 1}`,
        }));
        setLotes(prev => [...prev, ..._buildLotes(c.id, detallesConId, prev)]);
        _subirStock(detallesConId);
        return { ...form, detalles: detallesConId, stockAplicado: true };
      }

      // Pendiente → Pendiente
      return { ...form, stockAplicado: false };
    }));
  };

  /** ELIMINAR COMPRA — solo pendientes */
  const eliminarCompra = (id) => {
    const check = canDeleteCompra(id);
    if (!check.ok) return check;
    setCompras(p => p.filter(c => c.id !== id));
    return { ok: true };
  };

  /**
   * DESCONTAR STOCK POR LOTE — FIFO
   * Descuenta del lote más próximo a vencer primero.
   * Útil para el módulo de producción.
   * Retorna { ok, faltante }
   */
  const descontarStockFIFO = (idInsumo, cantidadNecesaria) => {
    const lotesDisp = lotes
      .filter(l => l.idInsumo === Number(idInsumo) && l.cantidadActual > 0)
      .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

    let restante = cantidadNecesaria;
    const cambios = [];

    for (const lote of lotesDisp) {
      if (restante <= 0) break;
      const descontar = Math.min(lote.cantidadActual, restante);
      cambios.push({ id: lote.id, nueva: lote.cantidadActual - descontar });
      restante -= descontar;
    }

    if (restante > 0) return { ok: false, faltante: restante };

    setLotes(prev => prev.map(l => {
      const cambio = cambios.find(c => c.id === l.id);
      return cambio ? { ...l, cantidadActual: cambio.nueva } : l;
    }));
    setInsumos(prev => prev.map(ins =>
      ins.id === Number(idInsumo)
        ? { ...ins, stockActual: Math.max(0, ins.stockActual - cantidadNecesaria) }
        : ins
    ));

    return { ok: true, faltante: 0 };
  };

  /* ══════════════════════════════════════════════════════
     PROVIDER
  ══════════════════════════════════════════════════════ */

  return (
    <AppContext.Provider value={{
      /* Estado raw */
      categoriasProductos, categoriasInsumos, insumos, lotes, productos,
      roles, usuarios, proveedores, compras,

      /* Derivados */
      categoriasProductosActivas, categoriasInsumosActivas,
      insumosPorCategoriaId, insumosPorCategoriaNombre,
      unidades: UNIDADES_MEDIDA,
      rolesActivos, usuariosPorRol, insumosActivos,

      /* Lookups */
      getCatProducto, getCatInsumo, getUnidad, getRol,
      getProveedor, getInsumo,
      getLotesDeInsumo, getStockRealInsumo,

      /* Validaciones */
      canDeleteCatProducto, canDeleteCatInsumo,
      canDeleteInsumo, canDeleteProducto,
      canDeleteRol, canDeleteUsuario,
      canDeleteProveedor, canDeleteCompra,

      /* CRUD */
      crearCatProducto, editarCatProducto, toggleCatProducto, eliminarCatProducto,
      crearCatInsumo,   editarCatInsumo,   toggleCatInsumo,   eliminarCatInsumo,
      crearInsumo,      editarInsumo,      toggleInsumo,      eliminarInsumo,
      crearProducto,    editarProducto,    eliminarProducto,  guardarFicha,
      crearRol,         editarRol,         toggleRol,         eliminarRol,
      crearUsuario,     editarUsuario,     toggleUsuario,     eliminarUsuario,
      crearProveedor,   editarProveedor,   eliminarProveedor,
      crearCompra,      editarCompra,      eliminarCompra,
      descontarStockFIFO,

      /* Utilidades exportadas */
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