import { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════
   TIPOS DE NOTIFICACIÓN
══════════════════════════════════════════════════════════ */
export const TIPOS = {
  STOCK_MINIMO:   "stock_minimo",
  STOCK_AGOTADO:  "stock_agotado",
  LOTE_POR_VENCER:"lote_por_vencer",
  LOTE_VENCIDO:   "lote_vencido",
  PEDIDO_NUEVO:   "pedido_nuevo",
  COMPRA_PENDIENTE:"compra_pendiente",
  SISTEMA:        "sistema",
};

export const TIPO_LABELS = {
  [TIPOS.STOCK_MINIMO]:    "Stock mínimo",
  [TIPOS.STOCK_AGOTADO]:   "Stock agotado",
  [TIPOS.LOTE_POR_VENCER]: "Por vencer",
  [TIPOS.LOTE_VENCIDO]:    "Vencido",
  [TIPOS.PEDIDO_NUEVO]:    "Pedido",
  [TIPOS.COMPRA_PENDIENTE]:"Compra",
  [TIPOS.SISTEMA]:         "Sistema",
};

export const TIPO_ICONS = {
  [TIPOS.STOCK_MINIMO]:    "⚠️",
  [TIPOS.STOCK_AGOTADO]:   "🚨",
  [TIPOS.LOTE_POR_VENCER]: "⏰",
  [TIPOS.LOTE_VENCIDO]:    "❌",
  [TIPOS.PEDIDO_NUEVO]:    "🛒",
  [TIPOS.COMPRA_PENDIENTE]:"📦",
  [TIPOS.SISTEMA]:         "🔔",
};

export const TIPO_COLORS = {
  [TIPOS.STOCK_MINIMO]:    "#f57f17",
  [TIPOS.STOCK_AGOTADO]:   "#c62828",
  [TIPOS.LOTE_POR_VENCER]: "#e65100",
  [TIPOS.LOTE_VENCIDO]:    "#b71c1c",
  [TIPOS.PEDIDO_NUEVO]:    "#1565c0",
  [TIPOS.COMPRA_PENDIENTE]:"#6a1b9a",
  [TIPOS.SISTEMA]:         "#2e7d32",
};

const uid = () => `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const fechaHoy = () => new Date().toISOString();

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */
const NotificacionesContext = createContext(null);

const loadFromLS = (key, def) => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
  catch { return def; }
};

export function NotificacionesProvider({ children, insumos = [], lotes = [], pedidos = [], compras = [] }) {

  const [notificaciones, setNotificaciones] = useState(() => loadFromLS("notificaciones", []));
  // CA_01_01 — nivel mínimo configurable por insumo (idInsumo → número)
  const [nivelesMinimos, setNivelesMinimos]   = useState(() => loadFromLS("notif_nivelesMinimos", {}));
  // HU_01 — toggle del sistema de alertas automáticas
  const [autoActivo, setAutoActivo]           = useState(() => loadFromLS("notif_autoActivo", true));
  // controla si el banner de alerta de entrada fue mostrado en esta sesión
  const [bannerVisto, setBannerVisto]         = useState(false);

  /* ── Persistencia ────────────────────────────────────── */
  useEffect(() => { localStorage.setItem("notificaciones",       JSON.stringify(notificaciones)); },  [notificaciones]);
  useEffect(() => { localStorage.setItem("notif_nivelesMinimos", JSON.stringify(nivelesMinimos)); },  [nivelesMinimos]);
  useEffect(() => { localStorage.setItem("notif_autoActivo",     JSON.stringify(autoActivo)); },      [autoActivo]);

  /* ══════════════════════════════════════════════════════
     HU_01 — Generar notificaciones automáticas al detectar
             insumos bajo el nivel mínimo configurado
             CA_01_01 nivel mínimo por insumo
             CA_01_02 al alcanzar el mínimo → notificación automática
             CA_01_03 la notificación indica insumo y motivo
             CA_01_04 visible en el sistema
             CA_01_05 no se generan duplicadas si el nivel no cambia
  ══════════════════════════════════════════════════════ */
  const generarNotifAutomaticas = useCallback(() => {
    if (!autoActivo) return;

    const nuevas = [];

    insumos.forEach(ins => {
      // Nivel mínimo: primero el configurado manualmente, sino el del insumo
      const minimo = nivelesMinimos[ins.id] !== undefined ? nivelesMinimos[ins.id] : ins.stockMinimo;
      const stock  = ins.stockActual;

      if (stock <= 0) {
        // Stock agotado — CA_01_03: indica insumo y motivo
        const clave = `${TIPOS.STOCK_AGOTADO}-${ins.id}`;
        const yaExiste = notificaciones.some(n => n.clave === clave && !n.leida);
        if (!yaExiste) { // CA_01_05: no duplicar
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.STOCK_AGOTADO,
            titulo: `Stock agotado: ${ins.nombre}`,
            mensaje: `El insumo "${ins.nombre}" tiene stock en 0. Se requiere realizar una compra urgente.`,
            idReferencia: ins.id, refNombre: ins.nombre,
            fecha: fechaHoy(), leida: false,
          });
        }
      } else if (minimo !== undefined && stock <= minimo) {
        // Bajo nivel mínimo — CA_01_02
        const clave = `${TIPOS.STOCK_MINIMO}-${ins.id}`;
        const yaExiste = notificaciones.some(n => n.clave === clave && !n.leida);
        if (!yaExiste) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.STOCK_MINIMO,
            titulo: `Stock bajo mínimo: ${ins.nombre}`,
            mensaje: `El insumo "${ins.nombre}" tiene ${stock} ${ins.unidad || "und"} disponibles, por debajo del mínimo configurado de ${minimo}. Se requiere realizar una compra.`,
            idReferencia: ins.id, refNombre: ins.nombre,
            fecha: fechaHoy(), leida: false,
          });
        }
      }
    });

    // Lotes por vencer / vencidos
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    lotes.forEach(lote => {
      if (!lote.fechaVencimiento || lote.cantidadActual <= 0) return;
      const fv   = new Date(lote.fechaVencimiento + "T00:00:00");
      const dias = Math.round((fv - hoy) / 86_400_000);
      const insumo = insumos.find(i => i.id === lote.idInsumo);
      const nombre = insumo?.nombre || `Insumo #${lote.idInsumo}`;

      if (dias < 0) {
        const clave = `${TIPOS.LOTE_VENCIDO}-${lote.id}`;
        if (!notificaciones.some(n => n.clave === clave && !n.leida)) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.LOTE_VENCIDO,
            titulo: `Lote vencido: ${nombre}`,
            mensaje: `El lote ${lote.id} de "${nombre}" venció el ${lote.fechaVencimiento}. Contiene ${lote.cantidadActual} unidades. Retírelo del inventario.`,
            idReferencia: lote.id, refNombre: nombre,
            fecha: fechaHoy(), leida: false,
          });
        }
      } else if (dias <= 7) {
        const clave = `${TIPOS.LOTE_POR_VENCER}-${lote.id}`;
        if (!notificaciones.some(n => n.clave === clave && !n.leida)) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.LOTE_POR_VENCER,
            titulo: `Lote próximo a vencer: ${nombre}`,
            mensaje: `El lote ${lote.id} de "${nombre}" vence en ${dias} día${dias === 1 ? "" : "s"} (${lote.fechaVencimiento}). Contiene ${lote.cantidadActual} unidades.`,
            idReferencia: lote.id, refNombre: nombre,
            fecha: fechaHoy(), leida: false,
          });
        }
      }
    });

    // Compras pendientes antiguas (> 5 días)
    compras.forEach(compra => {
      if (compra.estado !== "pendiente") return;
      const dias = Math.round((hoy - new Date(compra.fecha + "T00:00:00")) / 86_400_000);
      if (dias >= 5) {
        const clave = `${TIPOS.COMPRA_PENDIENTE}-${compra.id}`;
        if (!notificaciones.some(n => n.clave === clave && !n.leida)) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.COMPRA_PENDIENTE,
            titulo: `Compra pendiente: ${compra.id}`,
            mensaje: `La compra ${compra.id} lleva ${dias} días en estado pendiente. Verifique su estado con el proveedor.`,
            idReferencia: compra.id, refNombre: compra.id,
            fecha: fechaHoy(), leida: false,
          });
        }
      }
    });

    if (nuevas.length > 0) {
      setNotificaciones(prev => [...nuevas, ...prev]);
    }
  }, [autoActivo, insumos, lotes, compras, nivelesMinimos, notificaciones]);

  // Ejecutar al montar y cuando cambien los datos relevantes
  useEffect(() => {
    generarNotifAutomaticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoActivo, insumos.length, lotes.length, compras.length]);

  /* ══════════════════════════════════════════════════════
     HU_05 — Marcar como leída
             CA_05_01 no elimina la notificación
             CA_05_02 actualiza lista automáticamente
  ══════════════════════════════════════════════════════ */
  const marcarLeida = useCallback((id) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  }, []);

  /* ══════════════════════════════════════════════════════
     HU_03 — Filtrar por tipo y estado
             CA_03_01 filtrar por tipo
             CA_03_02 filtrar por estado (leída/no leída)
             CA_03_03 combinar filtros
             CA_03_04 lista se actualiza según filtros
             CA_03_05 limpiar filtros
  ══════════════════════════════════════════════════════ */
  const filtrar = useCallback(({ tipo, estado, texto }) => {
    return notificaciones.filter(n => {
      if (tipo   && n.tipo  !== tipo)                                          return false;
      if (estado === "leida"   && !n.leida)                                   return false;
      if (estado === "no_leida" && n.leida)                                   return false;
      if (texto  && !n.titulo.toLowerCase().includes(texto.toLowerCase()) &&
                    !n.mensaje.toLowerCase().includes(texto.toLowerCase()))   return false;
      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // CA_02_03 ordenadas por fecha
  }, [notificaciones]);

  /* ── HU_01: configurar nivel mínimo por insumo ───────── */
  const configurarNivelMinimo = useCallback((idInsumo, nivel) => {
    setNivelesMinimos(prev => ({ ...prev, [idInsumo]: Number(nivel) }));
  }, []);

  /* ── Agregar notificación manual (sistema) ───────────── */
  const agregarNotificacion = useCallback((datos) => {
    setNotificaciones(prev => [{ id: uid(), fecha: fechaHoy(), leida: false, ...datos }, ...prev]);
  }, []);

  /* ── Eliminar notificación ───────────────────────────── */
  const eliminarNotificacion = useCallback((id) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  /* ── Derivados ───────────────────────────────────────── */
  const noLeidas       = notificaciones.filter(n => !n.leida).length;
  const criticas       = notificaciones.filter(n => !n.leida && [TIPOS.STOCK_AGOTADO, TIPOS.LOTE_VENCIDO].includes(n.tipo));
  const notifOrdenadas = [...notificaciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <NotificacionesContext.Provider value={{
      notificaciones: notifOrdenadas,
      noLeidas,
      criticas,
      autoActivo,
      nivelesMinimos,
      bannerVisto,
      setBannerVisto,

      // Acciones
      marcarLeida,
      marcarTodasLeidas,
      eliminarNotificacion,
      agregarNotificacion,
      configurarNivelMinimo,
      setAutoActivo,
      filtrar,
      generarNotifAutomaticas,
    }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de <NotificacionesProvider>");
  return ctx;
}