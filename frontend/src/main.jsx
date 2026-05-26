import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";
import { AppProvider } from "./AppContext.jsx";
import { NotificacionesProvider } from "./features/notificaciones/context/NotificacionesContext";
import { PrivilegiosProvider } from "./context/PrivilegiosContext.jsx";
import { getUser } from "./services/authService.js";
import { getInsumos } from "./services/insumosService.js";
import { getCompras } from "./services/comprasService.js";
import "./shared/index.css";

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
    try {
      const [insumosRes, comprasRes] = await Promise.all([
        getInsumos({ porPagina: 100 }),
        getCompras({ porPagina: 100 }),
      ]);

      const insumos = (insumosRes.insumos || []).map(i => ({
        id:          i.ID_Insumo,
        nombre:      i.Nombre,
        stockActual: i.Stock_Actual,
        stockMinimo: i.Stock_Minimo,
        unidad:      i.simbolo_unidad || "und",
      }));

      // Cada insumo trae su lote principal; lo usamos para alertas de vencimiento.
      const lotes = (insumosRes.insumos || [])
        .filter(i => i.lote && i.Stock_Actual > 0)
        .map(i => ({
          id:               i.lote.ID_Lote_Compra,
          idInsumo:         i.ID_Insumo,
          cantidadActual:   i.Stock_Actual,
          fechaVencimiento: i.lote.Fecha_Vencimiento
            ? i.lote.Fecha_Vencimiento.split("T")[0]
            : null,
        }));

      const compras = (comprasRes.compras || []);

      setNotifData({ insumos, lotes, compras });
    } catch {
      // Si falla la carga, las notificaciones quedan vacías — mejor que datos falsos
    }
  };

  useEffect(() => {
    cargar();
    window.addEventListener("session-changed", cargar);
    return () => window.removeEventListener("session-changed", cargar);
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
        <NotificacionesWrapper>
          <AppRouter />
        </NotificacionesWrapper>
      </AppProvider>
    </PrivilegiosProvider>
  </React.StrictMode>
);
