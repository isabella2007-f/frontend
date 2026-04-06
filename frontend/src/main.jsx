import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./routes/AppRouter";
import { AppProvider, useApp } from "./AppContext.jsx";
import { NotificacionesProvider } from "./features/notificaciones/context/NotificacionesContext";
import "./shared/index.css";

// ── Wrapper intermedio: ya tiene acceso a AppContext ──────
// DEBE estar dentro de <AppProvider> para poder usar useApp()
function NotificacionesWrapper({ children }) {
  const { insumos, lotes, compras, pedidos } = useApp();
  return (
    <NotificacionesProvider
      insumos={insumos}
      lotes={lotes}
      compras={compras}
      pedidos={pedidos}
    >
      {children}
    </NotificacionesProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>                        {/* 1° AppProvider — expone insumos, lotes, etc. */}
      <NotificacionesWrapper>            {/* 2° lee esos datos y los pasa al provider */}
        <AppRouter />
      </NotificacionesWrapper>
    </AppProvider>
  </React.StrictMode>
);