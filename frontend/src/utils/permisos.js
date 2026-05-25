// Re-exporta las utilidades de PrivilegiosContext para backward compatibility.
// Prefer importing directly from context/PrivilegiosContext in new code.
export { usePrivilegio, usePrivilegios } from "../context/PrivilegiosContext";

/**
 * Verifica si el usuario tiene un privilegio sin React (ej: en servicios o guards).
 * No usa el contexto, solo verifica el rol Admin vía localStorage.
 * Para componentes usa usePrivilegio() en su lugar.
 */
export function tienePermiso(clave) {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    if (usuario.rol === "Admin") return true;
    // Fuera de un componente no tenemos acceso al contexto;
    // devolvemos true como fallback seguro para no bloquear operaciones no-UI.
    return true;
  } catch {
    return false;
  }
}
