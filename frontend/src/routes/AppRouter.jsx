import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

// Vistas principales
import Dashboard from "../features/dashboard/Dashboard";

// Configuración
import GestionUsuarios from "../features/configuracion/Usuarios/GestionUsuarios";
import Empleados from "../features/configuracion/empleados/Empleados";
import Roles from "../features/configuracion/roles/Roles";
import AccessManagement from "../features/configuracion/control_acceso/AccessManagement";

// Producción
import CategoriaProductos from "../features/produccion/categoria_productos/Categoriaproductos";
import Productos from "../features/produccion/Productos/Productos";
import GestionOrdenesProduccion from "../features/produccion/orden_produccion/GestionOrdenesProduccion";

// Ventas
import GestionClientes from "../features/ventas/clientes/GestionClientes";
import GestionPedidos from "../features/ventas/pedidos/GestionPedidos";
import GestionDevoluciones from "../features/ventas/devoluciones/GestionDevoluciones";
import GestionDomicilios from "../features/ventas/domicilios/Gestiondomicilios";

// Compras
import CategoriaInsumos from "../features/compras/categoriainsumos/CategoriaInsumos";
import GestionInsumos from "../features/compras/insumos/GestionInsumos";
import GestionCompras from "../features/compras/gestioncompras/GestionCompras";
import Proveedores from "../features/compras/proveedores/Proveedores";

// Auth
import Login from "../pages/Login";
import Register from "../pages/Register";
import ProtectedRoute from "../components/ProtectedRoute";
import { initUsers } from "../services/userService";

// Inicializar usuarios
initUsers();

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= RUTAS PÚBLICAS ================= */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ================= ADMIN ================= */}
        <Route element={<ProtectedRoute allowedRoles={["administrador"]} />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/admin" replace />} />
            
            <Route path="admin" element={<Dashboard />} />
            <Route path="usuarios" element={<GestionUsuarios />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="roles" element={<Roles />} />
            <Route path="control-acceso" element={<AccessManagement />} />

            <Route path="categorias_productos" element={<CategoriaProductos />} />
            <Route path="products" element={<Productos />} />
            <Route path="ordenes-produccion" element={<GestionOrdenesProduccion />} />
            <Route path="domicilios" element={<GestionDomicilios />} />

            <Route path="clientes" element={<GestionClientes />} />
            <Route path="pedidos" element={<GestionPedidos/>} />
            <Route path="devoluciones" element={<GestionDevoluciones />} />

            <Route path="categorias_insumos" element={<CategoriaInsumos />} />
            <Route path="gestion-insumos" element={<GestionInsumos />} />
            <Route path="compras" element={<GestionCompras />} />
            <Route path="proveedores" element={<Proveedores />} />
          </Route>
        </Route>

        {/* ================= CLIENTE ================= */}
        <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
          <Route path="/cliente" element={<MainLayout />}>
            <Route index element={<Navigate to="pedidos" replace />} />
            <Route path="pedidos" element={<h1>Mis Pedidos (En construcción)</h1>} />
            <Route path="perfil" element={<h1>Mi Perfil (En construcción)</h1>} />
          </Route>
        </Route>

        {/* ================= 404 ================= */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;