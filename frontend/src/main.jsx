import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";
import { AppProvider } from "./AppContext.jsx";
import { NotificacionesProvider } from "./features/notificaciones/context/NotificacionesContext";
import { PrivilegiosProvider } from "./context/PrivilegiosContext.jsx";
import { getUser } from "./services/authService.js";
import { getInsumos } from "./services/insumosService.js";
import { getCompras } from "./services/comprasService.js";
import { updateActivity, isInactive, clearSession } from "./utils/api.js";
import "./shared/index.css";

function InactivityGuard({ children }) {
  useEffect(() => {
    const update = () => updateActivity();
    ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(ev =>
      document.addEventListener(ev, update, { passive: true })
    );

    const interval = setInterval(() => {
      if (localStorage.getItem("token") && isInactive()) {
        clearSession();
        window.location.href = "/login";
      }
    }, 60_000);

    return () => {
      ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach(ev =>
        document.removeEventListener(ev, update)
      );
      clearInterval(interval);
    };
  }, []);

  return children;
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
