import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../features/dashboard/Dashboard";
import GestionUsuarios from "../features/configuracion/Usuarios/GestionUsuarios";
import CategoriaProductos from "../features/produccion/CategoriaProductos/Categoriaproductos";
import Productos from "../features/produccion/Productos/Productos";
import Roles from "../features/configuracion/roles/Roles";
import GestionClientes from "../features/ventas/Clientes/GestionClientes";
import CategoriaInsumos from "../features/compras/categoriainsumos/CategoriaInsumos";
import GestionInsumos from "../features/compras/insumos/GestionInsumos";
import Proveedores from "../features/compras/proveedores/Proveedores";


const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} /> {/* Página por defecto */}
          <Route path="admin" element={<Dashboard />} />
          <Route path="usuarios" element={<GestionUsuarios />} />   
          <Route path="categorias_productos" element={<CategoriaProductos />} />
          <Route path="products" element={<Productos/>} /> 
          <Route path="roles" element={<Roles />} /> 
          <Route path="clientes" element={<GestionClientes/>} />
          <Route path="categorias_insumos" element={<CategoriaInsumos />} />
          <Route path="gestion-insumos" element={<GestionInsumos/>} />
          <Route path="proveedores" element={<Proveedores />} />
        </Route>

        {/* Ruta 404 */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
