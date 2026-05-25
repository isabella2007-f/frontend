import { Navigate, useLocation } from "react-router-dom";
import { usePrivilegios } from "../context/PrivilegiosContext";

/**
 * Protege una ruta verificando que el usuario tenga una clave de privilegio.
 *
 * Uso:
 *   <Route path="roles" element={
 *     <PrivilegioRoute clave="Roles_ver"><Roles /></PrivilegioRoute>
 *   } />
 *
 * Si el usuario no tiene el privilegio → redirige a /sin-acceso.
 * Si aún está cargando los privilegios → no renderiza nada.
 */
export default function PrivilegioRoute({ clave, children }) {
  const { hasPrivilegio, loading } = usePrivilegios();
  const location = useLocation();

  if (loading) return null; // espera silenciosa mientras carga

  if (!hasPrivilegio(clave)) {
    return <Navigate to="/sin-acceso" state={{ from: location }} replace />;
  }

  return children;
}
