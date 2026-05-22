export function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch {
    return null;
  }
}

export function estaAutenticado() {
  return !!localStorage.getItem('token');
}

export function esEmpleadoOAdmin(usuario) {
  return usuario?.tipo === 'empleado';
}

export function esCliente(usuario) {
  return usuario?.tipo === 'usuario';
}