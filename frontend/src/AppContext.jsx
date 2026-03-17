import { createContext, useContext, useState } from "react";

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES — EXISTENTES
══════════════════════════════════════════════════════════ */

const initCategoriasProductos = [
  { id: 1, nombre: "Congelados", descripcion: "Productos fríos a base de plátano",  estado: true,  fecha: "12/12/2025", icon: "🧊" },
  { id: 2, nombre: "Postres",    descripcion: "Productos dulces de plátano",         estado: true,  fecha: "12/12/2025", icon: "🍮" },
  { id: 3, nombre: "Snacks",     descripcion: "Tostones y chips de plátano",         estado: false, fecha: "01/01/2026", icon: "🍟" },
  { id: 4, nombre: "Harinas",    descripcion: "Harinas y mezclas de plátano verde",  estado: true,  fecha: "20/02/2026", icon: "🌾" },
  { id: 5, nombre: "Orgánicos",  descripcion: "Línea orgánica certificada",          estado: false, fecha: "28/02/2026", icon: "🌿" },
];

const initCategoriasInsumos = [
  { id: 1, nombre: "Vegetales",      icon: "🥬", descripcion: "Ingredientes frescos.",               insumos: ["Plátano", "Cebolla", "Tomate", "Pimentón", "Ajo"],          estado: true, fecha: "12/12/2025" },
  { id: 2, nombre: "Proteínas",      icon: "🥩", descripcion: "Para rellenos o acompañamientos.",   insumos: ["Carne molida", "Pollo", "Jamón", "Tocineta"],                estado: true, fecha: "12/12/2025" },
  { id: 3, nombre: "Lácteos",        icon: "🧀", descripcion: "Muy usados en lasañas o rellenos.",  insumos: ["Queso", "Crema de leche", "Mantequilla"],                    estado: true, fecha: "12/12/2025" },
  { id: 4, nombre: "Harinas y masas",icon: "🌾", descripcion: "Para empanadas u otros productos.",  insumos: ["Harina", "Masa para empanadas", "Láminas de lasaña"],        estado: true, fecha: "12/12/2025" },
  { id: 5, nombre: "Condimentos",    icon: "🧂", descripcion: "Para saborizar los productos.",      insumos: ["Sal", "Pimienta", "Comino", "Sazonadores"],                  estado: true, fecha: "12/12/2025" },
  { id: 6, nombre: "Aceites",        icon: "🛢️", descripcion: "Para freír.",                        insumos: ["Aceite vegetal"],                                            estado: true, fecha: "12/12/2025" },
  { id: 7, nombre: "Salsas",         icon: "🥫", descripcion: "Para preparación o acompañamiento.",insumos: ["Salsa de tomate", "Mayonesa", "Salsa de ajo", "Hogao"],     estado: true, fecha: "12/12/2025" },
  { id: 8, nombre: "Empaques",       icon: "📦", descripcion: "Para vender los productos.",         insumos: ["Cajas", "Bolsas", "Servilletas", "Vasos"],                  estado: true, fecha: "12/12/2025" },
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
  { id: 1,  nombre: "Plátano verde",       idCategoria: 1, idUnidad: 1, stockActual: 120, stockMinimo: 30,  lote: { id: "L-001", fechaVenc: "2026-05-10", cantInicial: 200 }, estado: true },
  { id: 2,  nombre: "Cebolla",             idCategoria: 1, idUnidad: 1, stockActual: 15,  stockMinimo: 20,  lote: { id: "L-002", fechaVenc: "2026-04-01", cantInicial: 50  }, estado: true },
  { id: 3,  nombre: "Tomate",              idCategoria: 1, idUnidad: 1, stockActual: 0,   stockMinimo: 10,  lote: { id: "L-003", fechaVenc: "2026-03-20", cantInicial: 40  }, estado: true },
  { id: 4,  nombre: "Carne molida",        idCategoria: 2, idUnidad: 1, stockActual: 50,  stockMinimo: 15,  lote: { id: "L-004", fechaVenc: "2026-04-15", cantInicial: 80  }, estado: true },
  { id: 5,  nombre: "Queso",               idCategoria: 3, idUnidad: 1, stockActual: 30,  stockMinimo: 10,  lote: { id: "L-005", fechaVenc: "2026-06-01", cantInicial: 60  }, estado: true },
  { id: 6,  nombre: "Harina",              idCategoria: 4, idUnidad: 1, stockActual: 200, stockMinimo: 50,  lote: { id: "L-006", fechaVenc: "2026-08-20", cantInicial: 300 }, estado: true },
  { id: 7,  nombre: "Sal",                 idCategoria: 5, idUnidad: 1, stockActual: 8,   stockMinimo: 10,  lote: { id: "L-007", fechaVenc: "2027-01-01", cantInicial: 20  }, estado: true },
  { id: 8,  nombre: "Aceite vegetal",      idCategoria: 6, idUnidad: 3, stockActual: 45,  stockMinimo: 10,  lote: { id: "L-008", fechaVenc: "2026-09-15", cantInicial: 60  }, estado: true },
  { id: 9,  nombre: "Salsa de tomate",     idCategoria: 7, idUnidad: 5, stockActual: 0,   stockMinimo: 5,   lote: { id: "L-009", fechaVenc: "2026-07-10", cantInicial: 24  }, estado: false },
  { id: 10, nombre: "Cajas",               idCategoria: 8, idUnidad: 5, stockActual: 300, stockMinimo: 100, lote: { id: "L-010", fechaVenc: "2027-12-31", cantInicial: 500 }, estado: true },
  { id: 11, nombre: "Masa para empanadas", idCategoria: 4, idUnidad: 1, stockActual: 22,  stockMinimo: 25,  lote: { id: "L-011", fechaVenc: "2026-04-05", cantInicial: 50  }, estado: true },
  { id: 12, nombre: "Bolsas",              idCategoria: 8, idUnidad: 5, stockActual: 500, stockMinimo: 200, lote: { id: "L-012", fechaVenc: "2027-12-31", cantInicial: 1000}, estado: true },
];

const initProductos = [
  { id: 1, nombre: "Muffin de plátano",      idCategoria: 2, precio: 10000, stock: 50, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 2, nombre: "Palito de queso",         idCategoria: 1, precio: 5000,  stock: 0,  stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "12/12/2025", ficha: null },
  { id: 3, nombre: "Chips de plátano verde",  idCategoria: 3, precio: 3500,  stock: 7,  stockMinimo: 15, imagen: null, imagenPreview: null, fecha: "01/01/2026", ficha: null },
  { id: 4, nombre: "Harina de plátano 500g",  idCategoria: 4, precio: 12000, stock: 80, stockMinimo: 20, imagen: null, imagenPreview: null, fecha: "20/02/2026", ficha: null },
  { id: 5, nombre: "Tostones orgánicos",       idCategoria: 5, precio: 7500,  stock: 15, stockMinimo: 10, imagen: null, imagenPreview: null, fecha: "28/02/2026", ficha: null },
];

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES — ROLES
══════════════════════════════════════════════════════════ */

const initRoles = [
  {
    id: 1,
    nombre: "Admin",
    icono: "👑",
    iconoPreview: null,
    estado: true,
    fecha: "12/12/2025",
    esAdmin: true,       // rol protegido: no se puede editar ni eliminar
    permisos: [],
  },
  {
    id: 2,
    nombre: "Empleado",
    icono: "👷",
    iconoPreview: null,
    estado: true,
    fecha: "12/12/2025",
    esAdmin: false,
    permisos: [],
  },
  {
    id: 3,
    nombre: "Cliente",
    icono: "👤",
    iconoPreview: null,
    estado: true,
    fecha: "01/01/2026",
    esAdmin: false,
    permisos: [],
  },
];

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES — USUARIOS
══════════════════════════════════════════════════════════ */

const initUsuarios = [
  {
    id: 1,
    nombre: "Carlos",
    apellidos: "Pérez Ruiz",
    correo: "carlos.perez@email.com",
    cedula: "80456789",
    telefono: "310 987 6543",
    direccion: "Carrera 15 # 8-30",
    departamento: "Cundinamarca",
    municipio: "Bogotá",
    rol: "Admin",
    estado: true,
    foto: null,
    fechaCreacion: "12/12/2025",
    esAdmin: true,       // usuario protegido: no se puede eliminar
  },
  {
    id: 2,
    nombre: "Ana",
    apellidos: "García López",
    correo: "ana.garcia@email.com",
    cedula: "1012345678",
    telefono: "300 123 4567",
    direccion: "Calle 50 # 40-20",
    departamento: "Antioquia",
    municipio: "Medellín",
    rol: "Empleado",
    estado: true,
    foto: null,
    fechaCreacion: "15/01/2026",
  },
  {
    id: 3,
    nombre: "Lucía",
    apellidos: "Martínez Vega",
    correo: "lucia.mv@email.com",
    cedula: "1234567890",
    telefono: "315 456 7890",
    direccion: "Av. 6N # 23-10",
    departamento: "Valle del Cauca",
    municipio: "Cali",
    rol: "Empleado",
    estado: false,
    foto: null,
    fechaCreacion: "01/02/2026",
  },
  {
    id: 4,
    nombre: "Jorge",
    apellidos: "Torres Suárez",
    correo: "jorge.torres@email.com",
    cedula: "72654321",
    telefono: "320 321 0987",
    direccion: "Calle 72 # 45-55",
    departamento: "Atlántico",
    municipio: "Barranquilla",
    rol: "Cliente",
    estado: true,
    foto: null,
    fechaCreacion: "20/02/2026",
  },
  {
    id: 5,
    nombre: "María",
    apellidos: "López Castillo",
    correo: "maria.lc@email.com",
    cedula: "1234567891",
    telefono: "317 654 3210",
    direccion: "Diagonal 30 # 12-5",
    departamento: "Santander",
    municipio: "Bucaramanga",
    rol: "Cliente",
    estado: true,
    foto: null,
    fechaCreacion: "28/02/2026",
  },
];

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */

const AppContext = createContext(null);

export function AppProvider({ children }) {

  /* ── Estado existente ────────────────────────────────── */
  const [categoriasProductos, setCategoriasProductos] = useState(initCategoriasProductos);
  const [categoriasInsumos,   setCategoriasInsumos]   = useState(initCategoriasInsumos);
  const [insumos,             setInsumos]             = useState(initInsumos);
  const [productos,           setProductos]           = useState(initProductos);

  /* ── Estado nuevo ────────────────────────────────────── */
  const [roles,    setRoles]    = useState(initRoles);
  const [usuarios, setUsuarios] = useState(initUsuarios);

  /* ══════════════════════════════════════════════════════
     DATOS DERIVADOS — EXISTENTES
  ══════════════════════════════════════════════════════ */

  const categoriasProductosActivas = categoriasProductos.filter(c => c.estado);
  const categoriasInsumosActivas   = categoriasInsumos.filter(c => c.estado);

  const insumosPorCategoriaId = categoriasInsumos.reduce((acc, cat) => {
    acc[cat.id] = insumos.filter(i => i.idCategoria === cat.id && i.estado).map(i => i.nombre);
    return acc;
  }, {});

  const insumosPorCategoriaNombre = categoriasInsumos.reduce((acc, cat) => {
    acc[cat.nombre] = insumos.filter(i => i.idCategoria === cat.id && i.estado).map(i => i.nombre);
    return acc;
  }, {});

  /* ══════════════════════════════════════════════════════
     DATOS DERIVADOS — ROLES / USUARIOS
  ══════════════════════════════════════════════════════ */

  // Lista de nombres de roles activos (para el select de CrearUsuario)
  const rolesActivos = roles.filter(r => r.estado).map(r => r.nombre);

  // Cuántos usuarios tiene cada rol
  const usuariosPorRol = roles.reduce((acc, r) => {
    acc[r.nombre] = usuarios.filter(u => u.rol === r.nombre).length;
    return acc;
  }, {});

  /* ══════════════════════════════════════════════════════
     HELPERS LOOKUP — EXISTENTES
  ══════════════════════════════════════════════════════ */

  const getCatProducto = id => categoriasProductos.find(c => c.id === id) || { nombre: "—", icon: "📦" };
  const getCatInsumo   = id => categoriasInsumos.find(c => c.id === id)   || { nombre: "—", icon: "📦" };
  const getUnidad      = id => UNIDADES_MEDIDA.find(u => u.id === id)     || { simbolo: "—", nombre: "—" };
  const getRol         = nombre => roles.find(r => r.nombre === nombre)   || null;

  /* ══════════════════════════════════════════════════════
     VALIDACIONES ELIMINACIÓN — EXISTENTES
  ══════════════════════════════════════════════════════ */

  const canDeleteCatProducto = (catId) => {
    const enUso = productos.filter(p => p.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Tiene ${enUso.length} producto${enUso.length > 1 ? "s" : ""} asociado${enUso.length > 1 ? "s" : ""}: ${enUso.map(p => `"${p.nombre}"`).join(", ")}. Elimínalos o cámbiales la categoría primero.` };
  };

  const canDeleteCatInsumo = (catId) => {
    const enUso = insumos.filter(i => i.idCategoria === catId);
    if (!enUso.length) return { ok: true };
    return { ok: false, razon: `Tiene ${enUso.length} insumo${enUso.length > 1 ? "s" : ""} registrado${enUso.length > 1 ? "s" : ""}: ${enUso.map(i => `"${i.nombre}"`).join(", ")}. Elimínalos o cámbiales la categoría primero.` };
  };

  const canDeleteInsumo = (insumoId) => {
    const ins = insumos.find(i => i.id === insumoId);
    if (!ins) return { ok: true };
    const fichasAfectadas = productos.filter(p =>
      p.ficha?.insumos?.some(fi => fi.nombre === ins.nombre)
    );
    if (!fichasAfectadas.length) return { ok: true };
    return { ok: false, razon: `"${ins.nombre}" está en ${fichasAfectadas.length} ficha${fichasAfectadas.length > 1 ? "s" : ""} técnica${fichasAfectadas.length > 1 ? "s" : ""}: ${fichasAfectadas.map(p => `"${p.nombre}"`).join(", ")}. Retíralo de esas fichas primero.` };
  };

  const canDeleteProducto = (productoId) => {
    const p = productos.find(x => x.id === productoId);
    if (p?.ficha) return { ok: true, advertencia: "Este producto tiene una ficha técnica que también se eliminará." };
    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     VALIDACIONES ELIMINACIÓN — ROLES
  ══════════════════════════════════════════════════════ */

  const canDeleteRol = (rolId) => {
    const rol = roles.find(r => r.id === rolId);
    if (!rol) return { ok: true };

    // Roles protegidos nunca se pueden eliminar
    if (rol.esAdmin) {
      return { ok: false, razon: `El rol "${rol.nombre}" está protegido y no puede eliminarse.` };
    }

    // Si tiene usuarios asignados, bloquear
    const asignados = usuarios.filter(u => u.rol === rol.nombre);
    if (asignados.length) {
      return {
        ok: false,
        razon: `El rol "${rol.nombre}" tiene ${asignados.length} usuario${asignados.length > 1 ? "s" : ""} asignado${asignados.length > 1 ? "s" : ""}: ${asignados.map(u => `"${u.nombre} ${u.apellidos}"`).join(", ")}. Reasígnalos antes de eliminar el rol.`,
      };
    }

    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     VALIDACIONES ELIMINACIÓN — USUARIOS
  ══════════════════════════════════════════════════════ */

  const canDeleteUsuario = (usuarioId) => {
    const user = usuarios.find(u => u.id === usuarioId);
    if (!user) return { ok: true };

    // El Admin principal no se puede eliminar
    if (user.esAdmin) {
      return { ok: false, razon: `El usuario "${user.nombre} ${user.apellidos}" es administrador principal y no puede eliminarse.` };
    }

    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     CRUD — EXISTENTES
  ══════════════════════════════════════════════════════ */

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

  /* ══════════════════════════════════════════════════════
     CRUD — ROLES
  ══════════════════════════════════════════════════════ */

  const crearRol = (form) =>
    setRoles(p => [{
      ...form,
      id: Date.now(),
      fecha: new Date().toLocaleDateString("es-CO"),
      esAdmin: false,
    }, ...p]);

  const editarRol = (form) =>
    setRoles(p => p.map(r => r.id === form.id ? { ...r, ...form } : r));

  const toggleRol = (id) => {
    const rol = roles.find(r => r.id === id);
    if (!rol) return;
    const nuevoEstado = !rol.estado;
    setRoles(p => p.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
    // Si se desactiva el rol → desactivar todos sus usuarios (excepto admin)
    // Si se reactiva → no se tocan los usuarios (quedan como estaban)
    if (!nuevoEstado) {
      setUsuarios(p => p.map(u =>
        u.rol === rol.nombre && !u.esAdmin ? { ...u, estado: false } : u
      ));
    }
  };

  // Retorna true si se eliminó, false si no se pudo
  const eliminarRol = (id) => {
    const check = canDeleteRol(id);
    if (!check.ok) return check;
    setRoles(p => p.filter(r => r.id !== id));
    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     CRUD — USUARIOS
  ══════════════════════════════════════════════════════ */

  const crearUsuario = (form) =>
    setUsuarios(p => [{
      ...form,
      id: Date.now(),
      fechaCreacion: new Date().toLocaleDateString("es-CO"),
      esAdmin: false,
    }, ...p]);

  const editarUsuario = (form) =>
    setUsuarios(p => p.map(u => u.id === form.id ? { ...u, ...form } : u));

  const toggleUsuario = (id) => {
    const user = usuarios.find(u => u.id === id);
    if (!user) return;
    // Bloquear activación si el rol del usuario está desactivado
    const rolObj = roles.find(r => r.nombre === user.rol);
    if (!user.estado && rolObj && !rolObj.estado) return;
    setUsuarios(p => p.map(u => u.id === id ? { ...u, estado: !u.estado } : u));
  };

  // Retorna { ok, razon? } para que el componente decida qué modal mostrar
  const eliminarUsuario = (id) => {
    const check = canDeleteUsuario(id);
    if (!check.ok) return check;
    setUsuarios(p => p.filter(u => u.id !== id));
    return { ok: true };
  };

  /* ══════════════════════════════════════════════════════
     PROVIDER
  ══════════════════════════════════════════════════════ */

  return (
    <AppContext.Provider value={{
      /* ── Estado raw ── */
      categoriasProductos, categoriasInsumos, insumos, productos,
      roles, usuarios,

      /* ── Derivados ── */
      categoriasProductosActivas,
      categoriasInsumosActivas,
      insumosPorCategoriaId,
      insumosPorCategoriaNombre,
      unidades: UNIDADES_MEDIDA,
      rolesActivos,
      usuariosPorRol,

      /* ── Helpers ── */
      getCatProducto, getCatInsumo, getUnidad, getRol,

      /* ── Validaciones ── */
      canDeleteCatProducto, canDeleteCatInsumo,
      canDeleteInsumo,      canDeleteProducto,
      canDeleteRol,         canDeleteUsuario,

      /* ── CRUD existente ── */
      crearCatProducto, editarCatProducto, toggleCatProducto, eliminarCatProducto,
      crearCatInsumo,   editarCatInsumo,   toggleCatInsumo,   eliminarCatInsumo,
      crearInsumo,      editarInsumo,      toggleInsumo,      eliminarInsumo,
      crearProducto,    editarProducto,    eliminarProducto,  guardarFicha,

      /* ── CRUD roles ── */
      crearRol, editarRol, toggleRol, eliminarRol,

      /* ── CRUD usuarios ── */
      crearUsuario, editarUsuario, toggleUsuario, eliminarUsuario,
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