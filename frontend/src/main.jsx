import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";
import { AppProvider } from "./AppContext.jsx";
import { NotificacionesProvider } from "./features/notificaciones/context/NotificacionesContext";
import { PrivilegiosProvider } from "./context/PrivilegiosContext.jsx";
import { getUser } from "./services/authService.js";
import { getInsumos } from "./services/insumosService.js";
import { getCompras } from "./services/comprasService.js";
import { updateActivity, isInactive, isNearlyInactive, clearSession } from "./utils/api.js";
import "./shared/index.css";

function ModalSesionExpira({ onContinuar }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '36px 32px',
        maxWidth: 380, width: '90%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⏱️</div>
        <h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#1b5e20' }}>
          Sesión por cerrar
        </h3>
        <p style={{ margin: '0 0 24px', color: '#616161', fontSize: 14, lineHeight: 1.6 }}>
          Tu sesión cerrará en unos minutos por inactividad.
          ¿Deseas continuar navegando?
        </p>
        <button
          onClick={onContinuar}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
            color: '#fff', fontWeight: 800, fontSize: 15, border: 'none',
            cursor: 'pointer', letterSpacing: '0.02em',
          }}
        >
          Continuar sesión
        </button>
      </div>
    </div>
  );
}

function InactivityGuard({ children }) {
  const [avisoVisible, setAvisoVisible] = useState(false);

  useEffect(() => {
    const onActivity = () => {
      updateActivity();
      setAvisoVisible(false);
    };
    ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(ev =>
      document.addEventListener(ev, onActivity, { passive: true })
    );

    const interval = setInterval(() => {
      if (!localStorage.getItem("token")) { setAvisoVisible(false); return; }
      if (isInactive()) {
        clearSession();
        window.location.href = "/login";
      } else if (isNearlyInactive()) {
        setAvisoVisible(true);
      }
    }, 30_000);

    return () => {
      ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(ev =>
        document.removeEventListener(ev, onActivity)
      );
      clearInterval(interval);
    };
  }, []);

  const continuar = () => { updateActivity(); setAvisoVisible(false); };

  return (
    <>
      {children}
      {avisoVisible && <ModalSesionExpira onContinuar={continuar} />}
    </>
  );
}

// Carga datos reales de la API para alimentar las notificaciones automáticas.
// Solo carga si hay sesión de empleado/admin activa.
function NotificacionesWrapper({ children }) {
  const [notifData, setNotifData] = useState({ insumos: [], lotes: [], compras: [] });

  const cargar = async () => {
    const user = getUser();
    if (!user || user.tipo !== "empleado") {
      setNotifData({ insumos: [], lotes: [], compras: [] });
      return;
    }

    const [insumosResult, comprasResult] = await Promise.allSettled([
      getInsumos({ porPagina: 100 }),
      getCompras({ porPagina: 100 }),
    ]);

    let insumos = [], lotes = [], compras = [];

    if (insumosResult.status === "fulfilled") {
      const raw = insumosResult.value.insumos || [];
      insumos = raw.map(i => ({
        id:          i.ID_Insumo,
        nombre:      i.Nombre,
        stockActual: i.Stock_Actual,
        stockMinimo: i.Stock_Minimo,
        unidad:      i.simbolo_unidad || "und",
      }));
      lotes = raw
        .filter(i => i.lote && i.Stock_Actual > 0)
        .map(i => ({
          id:               i.lote.ID_Lote_Compra,
          idInsumo:         i.ID_Insumo,
          cantidadActual:   i.Stock_Actual,
          fechaVencimiento: i.lote.Fecha_Vencimiento
            ? i.lote.Fecha_Vencimiento.split("T")[0]
            : null,
        }));
    }

    if (comprasResult.status === "fulfilled") {
      compras = comprasResult.value.compras || [];
    }

    setNotifData({ insumos, lotes, compras });
  };

  useEffect(() => {
    cargar();
    // Reintento a los 10s por si el backend (Render free tier) estaba durmiendo
    const retry = setTimeout(cargar, 10000);
    window.addEventListener("session-changed", cargar);
    window.addEventListener("notif-reload", cargar);
    return () => {
      clearTimeout(retry);
      window.removeEventListener("session-changed", cargar);
      window.removeEventListener("notif-reload", cargar);
    };
  }, []);

  return (
    <NotificacionesProvider
      insumos={notifData.insumos}
      lotes={notifData.lotes}
      compras={notifData.compras}
      pedidos={[]}
    >
      {children}
    </NotificacionesProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrivilegiosProvider>
      <AppProvider>
        <InactivityGuard>
          <NotificacionesWrapper>
            <AppRouter />
          </NotificacionesWrapper>
        </InactivityGuard>
      </AppProvider>
    </PrivilegiosProvider>
  </React.StrictMode>
);
