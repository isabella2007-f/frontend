import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

/* ─── DASHBOARD ─── */
import Dashboard from "../features/dashboard/Dashboard";

/* ─── CONFIGURACIÓN ─── */
import GestionUsuarios from "../features/configuracion/Usuarios/GestionUsuarios";
import Empleados from "../features/configuracion/empleados/Empleados";
import Roles from "../features/configuracion/roles/Roles";
import GestionSalidas from "../features/salidas/GestionSalidas.jsx";


/* ─── PRODUCCIÓN ─── */
import CategoriaProductos from "../features/produccion/categoria_productos/Categoriaproductos";
import Productos from "../features/produccion/Productos/Productos";
import GestionOrdenesProduccion from "../features/produccion/orden_produccion/GestionOrdenesProduccion";

/* ─── VENTAS ADMIN ─── */
import GestionClientes from "../features/ventas/clientes/GestionClientes";
import GestionPedidos from "../features/ventas/pedidos/GestionPedidos";
import GestionDevoluciones from "../features/ventas/devoluciones/GestionDevoluciones";
import GestionDomicilios from "../features/ventas/domicilios/Gestiondomicilios";

/* ─── CLIENTE REAL ─── */
import OrdersPage from "../features/sales/orders/OrdersPage";
import ReturnsPage from '../features/sales/returns/ReturnsPage';
import DeliveryPage from "../features/sales/delivery/DeliveryPage";
import ProfilePage from "../features/client/profile/ProfilePage";

/* ─── COMPRAS ─── */
import CategoriaInsumos from "../features/compras/categoriainsumos/CategoriaInsumos";
import GestionInsumos from "../features/compras/insumos/GestionInsumos";
import GestionCompras from "../features/compras/gestioncompras/GestionCompras";
import Proveedores from "../features/compras/proveedores/Proveedores";

/* ─── AUTH ─── */
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/Forgotpassword";
import LandingPage from "../pages/LandingPage";
import ProtectedRoute from "../components/ProtectedRoute";
import { initUsers } from "../services/userService";

/* ─── INIT ─── */
initUsers();

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ───────────── PÚBLICO ───────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recuperar" element={<ForgotPassword />} />

        {/* ───────────── ADMIN ───────────── */}
        <Route element={<ProtectedRoute allowedRoles={["administrador"]} />}>
          <Route path="/admin" element={<MainLayout />}>
            
            <Route index element={<Dashboard />} />

            {/* Configuración */}
            <Route path="usuarios" element={<GestionUsuarios />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="roles" element={<Roles />} />
            <Route path="salidas" element={<GestionSalidas />} />


            {/* Producción */}
            <Route path="categorias_productos" element={<CategoriaProductos />} />
            <Route path="products" element={<Productos />} />
            <Route path="ordenes-produccion" element={<GestionOrdenesProduccion />} />

            {/* Ventas */}
            <Route path="clientes" element={<GestionClientes />} />
            <Route path="pedidos" element={<GestionPedidos />} />
            <Route path="devoluciones" element={<GestionDevoluciones />} />
            <Route path="domicilios" element={<GestionDomicilios />} />

            {/* Compras */}
            <Route path="categorias_insumos" element={<CategoriaInsumos />} />
            <Route path="gestion-insumos" element={<GestionInsumos />} />
            <Route path="compras" element={<GestionCompras />} />
            <Route path="proveedores" element={<Proveedores />} />

          </Route>
        </Route>

        {/* ───────────── CLIENTE ───────────── */}
        <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
          <Route path="/cliente" element={<MainLayout />}>
            
            <Route index element={<Navigate to="pedidos" replace />} />

            <Route path="inicio" element={<LandingPage hideNavbar={true} />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="domicilios" element={<DeliveryPage />} />
            <Route path="devoluciones" element={<ReturnsPage />} />
            <Route path="perfil" element={<ProfilePage />} />

          </Route>
        </Route>

        {/* ───────────── 404 ───────────── */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;