import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Navbar from "../shared/components/Navbar";
import Sidebar from "../shared/components/Sidebar";
import { getUser, refreshUser } from "../services/authService";
import { esRolRepartidor, esRutaDeRepartidor, INICIO_REPARTIDOR } from "../utils/roles";
import "../App.css";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const location = useLocation();

  // La sesión guardada (tipo/rol) puede estar obsoleta si un admin le cambió el
  // rol a este usuario. Reconciliar con /auth/me al entrar al panel y al volver
  // a la pestaña, para que el comportamiento siga al ROL ACTUAL, no al de login.
  const [sesion,  setSesion]  = useState(() => getUser());
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location]);

  useEffect(() => {
    let vivo = true;
    const sync = async () => {
      const u = await refreshUser();
      if (vivo) setSesion(u ?? getUser());
    };
    sync().finally(() => { if (vivo) setSyncing(false); });

    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    const onSession = () => setSesion(getUser());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("session-changed", onSession);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("session-changed", onSession);
    };
  }, []);

  // Tras reconciliar: si el rol actual ya no corresponde a esta zona, mandar a
  // su panel (ex-empleado degradado a Cliente → tienda; ex-cliente promovido →
  // panel de gestión). Mientras sincroniza se deja pasar para no parpadear.
  if (!syncing && sesion) {
    if (location.pathname.startsWith("/admin") && sesion.tipo !== "empleado") {
      return <Navigate to="/cliente" replace />;
    }
    if (location.pathname.startsWith("/cliente") && sesion.tipo !== "cliente") {
      return <Navigate to="/admin" replace />;
    }
  }

  // Un solo portero para todo /admin: el repartidor solo abre su panel. Antes
  // dependía de que a su rol no le hubieran dado los privilegios de gestión;
  // con escribir la URL a mano se colaba en pedidos o domicilios ajenos.
  if (esRolRepartidor(getUser()?.rol) && !esRutaDeRepartidor(location.pathname)) {
    return <Navigate to={INICIO_REPARTIDOR} replace />;
  }

  return (
      <div className="app-layout">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} isLanding={false} />

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="app-body">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
  );
};

export default MainLayout;
