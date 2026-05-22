export function obtenerPermisos() {
  try {
    return JSON.parse(localStorage.getItem('permisos')) || [];
  } catch {
    return [];
  }
}

export function tienePermiso(permiso) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (usuario.rol === 'Admin') return true; // Admin ve todo
  return obtenerPermisos().includes(permiso);
}