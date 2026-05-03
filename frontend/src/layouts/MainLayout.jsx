import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../shared/components/Navbar";
import Sidebar from "../shared/components/Sidebar";
import "../App.css";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location]);

  // Detectar si estamos en la landing page del cliente
  const isLandingPage = location.pathname === "/cliente" || location.pathname === "/cliente/inicio";

  return (
      <div className="app-layout">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} isLanding={isLandingPage} />

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="app-body">
          <Sidebar isOpen={sidebarOpen} />

          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
  );
};

export default MainLayout;