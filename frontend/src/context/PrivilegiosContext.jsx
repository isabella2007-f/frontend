import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUser } from "../services/authService";
import { getRoles } from "../services/rolesService";

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

    try {
      const roles  = await getRoles();
      const rolObj = roles.find(r => r.nombre === user.rol);

      if (!rolObj || rolObj.esAdmin) {
        // Rol de administrador → acceso total
        setPrivilegios([]);
        setIsAdmin(true);
      } else {
        // Normalizar: el backend puede devolver strings "Modulo_accion"
        // o objetos { id, modulo, accion, estado }
        const flat = (rolObj.permisos || []).flatMap(p => {
          if (typeof p === "string") return [p];
          if (p?.id && p.estado !== false) return [p.id];
          return [];
        });
        setPrivilegios(flat);
        setIsAdmin(false);
      }
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
