import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../shared/components/Navbar";
import Sidebar from "../shared/components/Sidebar";
import "../App.css";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-layout">
      {/* Navbar superior con toggle */}
      <Navbar onToggleSidebar={toggleSidebar} />

      {/* Contenedor principal */}
      <div className="app-body">
        {/* Sidebar con estado de apertura */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Contenido principal se adapta */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
