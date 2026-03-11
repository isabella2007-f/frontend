import { Outlet } from "react-router-dom";
import Navbar from "../shared/components/Navbar";
import Sidebar from "../shared/components/Sidebar";
import "../App.css";

const MainLayout = () => {
  return (
    <div className="app-layout">
      {/* Navbar superior */}
      <Navbar />

      {/* Contenedor principal: fila */}
      <div className="app-body">
        {/* Sidebar a la izquierda */}
        <Sidebar />

        {/* Contenido principal */}
        <main className="main-content">
          <Outlet /> {/* Aquí se renderiza DashboardPage, Usuarios, etc */}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;