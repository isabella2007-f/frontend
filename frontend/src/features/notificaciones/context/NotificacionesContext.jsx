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
  const [user, setLocalUser] = useState(null);

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

  // Obtener usuario actual para filtrar notificaciones automáticas
  useEffect(() => {
    const checkUser = () => {
      const session = localStorage.getItem("session");
      if (session) {
        setLocalUser(JSON.parse(session));
      } else {
        setLocalUser(null);
      }
    };
    checkUser();
    
    // Escuchar cambios en auth para actualizar el usuario local
    window.addEventListener("storage", checkUser);
    // Custom event para cambios de sesión en la misma pestaña
    window.addEventListener("session-changed", checkUser);
    
    return () => {
      window.removeEventListener("storage", checkUser);
      window.removeEventListener("session-changed", checkUser);
    };
  }, []);

  /* ── Listener para agregar notificaciones desde fuera (AppContext) ── */
  useEffect(() => {
    const handleExternalNotif = (e) => {
      if (e.detail) {
        agregarNotificacion(e.detail);
      }
    };
    window.addEventListener("toston-add-notification", handleExternalNotif);
    return () => window.removeEventListener("toston-add-notification", handleExternalNotif);
  }, [notificaciones]);

  /* ══════════════════════════════════════════════════════
     HU_01 — Generar notificaciones automáticas al detectar
             insumos bajo el nivel mínimo configurado
             (SOLO PARA ADMINISTRADORES)
  ══════════════════════════════════════════════════════ */
  const generarNotifAutomaticas = useCallback(() => {
    const rol = user?.rol?.toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';
    
    if (!autoActivo || !isAdmin) return;

    const nuevas = [];

    insumos.forEach(ins => {
      const minimo = nivelesMinimos[ins.id] !== undefined ? nivelesMinimos[ins.id] : ins.stockMinimo;
      const stock  = ins.stockActual;

      if (stock <= 0) {
        const clave = `${TIPOS.STOCK_AGOTADO}-${ins.id}`;
        const yaExiste = notificaciones.some(n => n.clave === clave && !n.leida);
        if (!yaExiste) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.STOCK_AGOTADO,
            titulo: `Stock agotado: ${ins.nombre}`,
            mensaje: `El insumo "${ins.nombre}" tiene stock en 0. Se requiere realizar una compra urgente.`,
            idReferencia: ins.id, refNombre: ins.nombre,
            fecha: fechaHoy(), leida: false,
            idDestinatario: 'admin'
          });
        }
      } else if (minimo !== undefined && stock <= minimo) {
        const clave = `${TIPOS.STOCK_MINIMO}-${ins.id}`;
        const yaExiste = notificaciones.some(n => n.clave === clave && !n.leida);
        if (!yaExiste) {
          nuevas.push({
            id: uid(), clave, tipo: TIPOS.STOCK_MINIMO,
            titulo: `Stock bajo mínimo: ${ins.nombre}`,
            mensaje: `El insumo "${ins.nombre}" tiene ${stock} ${ins.unidad || "und"} disponibles, por debajo del mínimo configurado de ${minimo}. Se requiere realizar una compra.`,
            idReferencia: ins.id, refNombre: ins.nombre,
            fecha: fechaHoy(), leida: false,
            idDestinatario: 'admin'
          });
        }
      }
    });

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
            idDestinatario: 'admin'
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
            idDestinatario: 'admin'
          });
        }
      }
    });

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
            idDestinatario: 'admin'
          });
        }
      }
    });

    if (nuevas.length > 0) {
      setNotificaciones(prev => [...nuevas, ...prev]);
    }
  }, [autoActivo, insumos, lotes, compras, nivelesMinimos, notificaciones, user]);

  useEffect(() => {
    generarNotifAutomaticas();
  }, [autoActivo, insumos.length, lotes.length, compras.length, user]);

  const marcarLeida = useCallback((id) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones(prev => prev.map(n => {
      const rol = user?.rol?.toLowerCase();
      const isAdmin = rol === 'admin' || rol === 'administrador';
      const isForCurrent = (isAdmin && n.idDestinatario === 'admin') || (n.idDestinatario === user?.cedula);
      return isForCurrent ? { ...n, leida: true } : n;
    }));
  }, [user]);

  const filtrar = useCallback(({ tipo, estado, texto }) => {
    return notificaciones.filter(n => {
      const rol = user?.rol?.toLowerCase();
      const isAdmin = rol === 'admin' || rol === 'administrador';
      const isClient = rol === 'cliente';

      const isForAdmin = isAdmin && n.idDestinatario === 'admin';
      const isForClient = isClient && n.idDestinatario === user?.cedula;
      
      if (!isForAdmin && !isForClient) return false;

      if (tipo   && n.tipo  !== tipo)                                          return false;
      if (estado === "leida"   && !n.leida)                                   return false;
      if (estado === "no_leida" && n.leida)                                   return false;
      if (texto  && !n.titulo.toLowerCase().includes(texto.toLowerCase()) &&
                    !n.mensaje.toLowerCase().includes(texto.toLowerCase()))   return false;
      return true;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [notificaciones, user]);

  const configurarNivelMinimo = useCallback((idInsumo, nivel) => {
    setNivelesMinimos(prev => ({ ...prev, [idInsumo]: Number(nivel) }));
  }, []);

  const agregarNotificacion = useCallback((datos) => {
    const destinatario = datos.idDestinatario || 'admin';
    setNotificaciones(prev => [{ id: uid(), fecha: fechaHoy(), leida: false, ...datos, idDestinatario: destinatario }, ...prev]);
  }, []);

  const eliminarNotificacion = useCallback((id) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  const notifUsuario = notificaciones.filter(n => {
    const rol = user?.rol?.toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';
    const isClient = rol === 'cliente';
    const isForAdmin = isAdmin && n.idDestinatario === 'admin';
    const isForClient = isClient && n.idDestinatario === user?.cedula;
    return isForAdmin || isForClient;
  });

  const noLeidas       = notifUsuario.filter(n => !n.leida).length;
  const criticas       = notifUsuario.filter(n => !n.leida && [TIPOS.STOCK_AGOTADO, TIPOS.LOTE_VENCIDO].includes(n.tipo));
  const notifOrdenadas = [...notifUsuario].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <NotificacionesContext.Provider value={{
      notificaciones: notifOrdenadas,
      noLeidas,
      criticas,
      autoActivo,
      nivelesMinimos,
      bannerVisto,
      setBannerVisto,
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