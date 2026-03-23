import { createContext, useContext, useState, useEffect } from "react";

/* ══════════════════════════════════════════════════════════
   UTILIDADES
══════════════════════════════════════════════════════════ */

export const diasHasta = (fechaISO) => {
  if (!fechaISO) return Infinity;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const target = new Date(fechaISO + "T00:00:00");
  return Math.round((target - hoy) / 86_400_000);
};

export const estadoLote = (lote) => {
  if (lote.cantidadActual <= 0) return "agotado";
  const dias = diasHasta(lote.fechaVencimiento);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "por-vencer";
  return "activo";
};

export const calcularTotal = (detalles) =>
  detalles.reduce((acc, d) => acc + (Number(d.cantidad) || 0) * (Number(d.precioUnd) || 0), 0);

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/* ══════════════════════════════════════════════════════════
   LOCAL STORAGE
══════════════════════════════════════════════════════════ */

const loadFromLS = (key, defaultValue) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

/* ══════════════════════════════════════════════════════════
   DATOS INICIALES (RESUMIDOS)
   ⚠️ (Para no hacer esto gigantesco, mantén los tuyos originales aquí)
══════════════════════════════════════════════════════════ */

const initCategoriasProductos = [/* ← deja los tuyos */];
const initCategoriasInsumos = [/* ← deja los tuyos */];
const initInsumos = [/* ← deja los tuyos */];
const initLotes = [/* ← deja los tuyos */];
const initProductos = [/* ← deja los tuyos */];
const initRoles = [/* ← deja los tuyos */];
const initUsuarios = [/* ← deja los tuyos */];
const initClientes = [/* ← deja los tuyos */];
const initProveedores = [/* ← deja los tuyos */];
const initCompras = [/* ← deja los tuyos */];
const initPedidos = [/* ← deja los tuyos */];
const initOrdenes = [/* ← deja los tuyos */];
const initDevoluciones = [/* ← deja los tuyos */];
const initCreditosClientes = {};

export const UNIDADES_MEDIDA = [
  { id: 1, simbolo: "kg", nombre: "Kilogramo" },
  { id: 2, simbolo: "g", nombre: "Gramo" },
  { id: 3, simbolo: "l", nombre: "Litro" },
  { id: 4, simbolo: "ml", nombre: "Mililitro" },
  { id: 5, simbolo: "und", nombre: "Unidad" },
];

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */

const AppContext = createContext(null);

export function AppProvider({ children }) {

  /* ── STATES CON PERSISTENCIA ───────────────────────── */

  const [categoriasProductos, setCategoriasProductos] = useState(() => loadFromLS("categoriasProductos", initCategoriasProductos));
  const [categoriasInsumos, setCategoriasInsumos] = useState(() => loadFromLS("categoriasInsumos", initCategoriasInsumos));
  const [insumos, setInsumos] = useState(() => loadFromLS("insumos", initInsumos));
  const [lotes, setLotes] = useState(() => loadFromLS("lotes", initLotes));
  const [productos, setProductos] = useState(() => loadFromLS("productos", initProductos));
  const [roles, setRoles] = useState(() => loadFromLS("roles", initRoles));
  const [usuarios, setUsuarios] = useState(() => loadFromLS("usuarios", initUsuarios));
  const [clientes, setClientes] = useState(() => loadFromLS("clientes", initClientes));
  const [proveedores, setProveedores] = useState(() => loadFromLS("proveedores", initProveedores));
  const [compras, setCompras] = useState(() => loadFromLS("compras", initCompras));
  const [pedidos, setPedidos] = useState(() => loadFromLS("pedidos", initPedidos));
  const [ordenes, setOrdenes] = useState(() => loadFromLS("ordenes", initOrdenes));
  const [devoluciones, setDevoluciones] = useState(() => loadFromLS("devoluciones", initDevoluciones));
  const [creditosClientes, setCreditosClientes] = useState(() => loadFromLS("creditosClientes", initCreditosClientes));

  /* ── GUARDADO AUTOMÁTICO ───────────────────────────── */

  useEffect(() => localStorage.setItem("categoriasProductos", JSON.stringify(categoriasProductos)), [categoriasProductos]);
  useEffect(() => localStorage.setItem("categoriasInsumos", JSON.stringify(categoriasInsumos)), [categoriasInsumos]);
  useEffect(() => localStorage.setItem("insumos", JSON.stringify(insumos)), [insumos]);
  useEffect(() => localStorage.setItem("lotes", JSON.stringify(lotes)), [lotes]);
  useEffect(() => localStorage.setItem("productos", JSON.stringify(productos)), [productos]);
  useEffect(() => localStorage.setItem("roles", JSON.stringify(roles)), [roles]);
  useEffect(() => localStorage.setItem("usuarios", JSON.stringify(usuarios)), [usuarios]);
  useEffect(() => localStorage.setItem("clientes", JSON.stringify(clientes)), [clientes]);
  useEffect(() => localStorage.setItem("proveedores", JSON.stringify(proveedores)), [proveedores]);
  useEffect(() => localStorage.setItem("compras", JSON.stringify(compras)), [compras]);
  useEffect(() => localStorage.setItem("pedidos", JSON.stringify(pedidos)), [pedidos]);
  useEffect(() => localStorage.setItem("ordenes", JSON.stringify(ordenes)), [ordenes]);
  useEffect(() => localStorage.setItem("devoluciones", JSON.stringify(devoluciones)), [devoluciones]);
  useEffect(() => localStorage.setItem("creditosClientes", JSON.stringify(creditosClientes)), [creditosClientes]);

  /* ── DERIVADOS ─────────────────────────────────────── */

  const categoriasProductosActivas = categoriasProductos.filter(c => c.estado);
  const categoriasInsumosActivas = categoriasInsumos.filter(c => c.estado);
  const insumosActivos = insumos.filter(i => i.estado);
  const clientesActivos = clientes.filter(c => c.estado);

  /* ── EJEMPLO CRUD (LOS DEMÁS IGUAL QUE TU CÓDIGO 1) ─── */

  const crearProducto = (f) =>
    setProductos(p => [{ ...f, id: Date.now() }, ...p]);

  const editarProducto = (f) =>
    setProductos(p => p.map(x => x.id === f.id ? f : x));

  const eliminarProducto = (id) =>
    setProductos(p => p.filter(x => x.id !== id));

  /* ── EJEMPLO PEDIDOS ───────────────────────────────── */

  const crearPedido = (payload) => {
    const nuevo = {
      ...payload,
      id: Date.now(),
      fecha_pedido: new Date().toISOString().split("T")[0],
    };
    setPedidos(p => [nuevo, ...p]);
  };

  /* ── PROVIDER ─────────────────────────────────────── */

  return (
    <AppContext.Provider value={{
      categoriasProductos, categoriasInsumos, insumos, lotes, productos,
      roles, usuarios, clientes, proveedores, compras, pedidos, ordenes,
      devoluciones, creditosClientes,

      categoriasProductosActivas, categoriasInsumosActivas,
      insumosActivos, clientesActivos,

      crearProducto, editarProducto, eliminarProducto,
      crearPedido,

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