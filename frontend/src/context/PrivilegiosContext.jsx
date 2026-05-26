import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUser } from "../services/authService";
import { getMisPermisos } from "../services/rolesService";

/* ══════════════════════════════════════════════════════════
   CONTEXT
══════════════════════════════════════════════════════════ */

const PrivilegiosCtx = createContext({
  privilegios:   [],
  isAdmin:       false,
  loading:       true,
  hasPrivilegio: () => true,
  recargar:      () => {},
});

/* ══════════════════════════════════════════════════════════
   PROVIDER
══════════════════════════════════════════════════════════ */

export function PrivilegiosProvider({ children }) {
  const [privilegios, setPrivilegios] = useState([]);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [loading,     setLoading]     = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const user = getUser();

    if (!user || user.tipo !== "empleado") {
      // Clientes o no autenticados no tienen privilegios de admin
      setPrivilegios([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Admin (rol protegido, nunca renombrable) → acceso total sin llamada extra
    if (user.rol === "Admin") {
      setPrivilegios([]);
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    try {
      // /auth/mis-permisos solo requiere token válido, no ver_roles
      const claves = await getMisPermisos();
      setPrivilegios(claves);
      setIsAdmin(false);
    } catch {
      // Si falla la carga, denegar por defecto (principio de menor privilegio)
      setPrivilegios([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener("session-changed", cargar);
    return () => window.removeEventListener("session-changed", cargar);
  }, [cargar]);

  const hasPrivilegio = useCallback((clave) => {
    if (!clave) return true;          // sin restricción = visible
    if (loading) return false;        // aún cargando → no mostrar
    if (isAdmin) return true;         // admin → todo
    return privilegios.includes(clave);
  }, [privilegios, isAdmin, loading]);

  return (
    <PrivilegiosCtx.Provider value={{ privilegios, isAdmin, loading, hasPrivilegio, recargar: cargar }}>
      {children}
    </PrivilegiosCtx.Provider>
  );
}

/* ══════════════════════════════════════════════════════════
   HOOKS PÚBLICOS
══════════════════════════════════════════════════════════ */

/** Acceso completo al contexto de privilegios */
export const usePrivilegios = () => useContext(PrivilegiosCtx);

/**
 * Verifica si el usuario tiene una clave de privilegio específica.
 * @param {string} clave — ej: "GestionProductos_ver", "Roles_crear"
 * @returns {boolean}
 */
export const usePrivilegio = (clave) => useContext(PrivilegiosCtx).hasPrivilegio(clave);
