import { apiFetch } from "../utils/api";
import { API_URL } from "../config/api";

export const login = async (correo, contrasena) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasena }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    let mensaje = "Correo o contraseña incorrectos";
    if (typeof error.detail === "string") mensaje = error.detail;
    else if (Array.isArray(error.detail)) mensaje = error.detail.map(e => e.msg).join(", ");
    throw new Error(mensaje);
  }

  const data = await res.json();

  try {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("usuario", JSON.stringify({
      id:        data.cedula,
      nombre:    data.nombre,
      apellidos: data.apellidos,
      tipo:      data.tipo,
      rol:       data.rol,
      // El encabezado la muestra al lado del nombre. Antes solo aparecía si
      // se entraba al perfil, porque la escribía esa página; al cerrar sesión
      // se perdía y volvía la inicial.
      fotoPerfil: data.foto_perfil || null,
    }));
  } catch {
    throw new Error("No se pudo guardar la sesión. Intenta en modo de navegación normal.");
  }

  // Avisar a todos los componentes que la sesión cambió
  window.dispatchEvent(new CustomEvent("session-changed"));

  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.dispatchEvent(new CustomEvent("session-changed"));
  window.location.href = "/login";
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("usuario"));
  } catch {
    return null;
  }
};

/**
 * Reconcilia la sesión guardada con el estado real del backend (`/auth/me`).
 *
 * El `tipo`/`rol` se guardan en localStorage al iniciar sesión; si un admin le
 * cambia el rol a este usuario, esa copia queda obsoleta hasta el siguiente
 * login. Esto la actualiza (y avisa con `session-changed`) sin re-login.
 * Si no hay red, conserva lo que haya. En 401 cierra sesión.
 */
export const refreshUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  let data;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { logout(); return null; }
    if (!res.ok) return getUser();
    data = await res.json();
  } catch {
    return getUser(); // sin conexión: no tocar la sesión local
  }

  const prev = getUser();
  const next = {
    ...(prev || {}),
    id:        data.id,
    nombre:    data.nombre,
    apellidos: data.apellidos,
    tipo:      data.tipo,
    rol:       data.rol,
  };

  const cambio =
    !prev ||
    prev.tipo !== next.tipo ||
    prev.rol  !== next.rol  ||
    String(prev.id) !== String(next.id);

  if (cambio) {
    try {
      localStorage.setItem("usuario", JSON.stringify(next));
    } catch { /* almacenamiento no disponible */ }
    window.dispatchEvent(new CustomEvent("session-changed"));
  }
  return next;
};

export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const hasRole = (rol) => {
  const user = getUser();
  return user?.rol === rol;
};

export const recuperarContrasena = async (correo) => {
  // Render free tier cold start: 30-60s + SMTP send ~10s. Use 75s to survive worst case.
  return apiFetch("/auth/recuperar-contrasena", {
    method: "POST",
    body: JSON.stringify({ correo }),
    timeout: 75000,
  });
};

export const verificarCodigo = async (correo, codigo) => {
  return apiFetch("/auth/verificar-codigo", {
    method: "POST",
    body: JSON.stringify({ correo, codigo }),
  });
};

export const resetearContrasena = async (token, nuevaContrasena) => {
  return apiFetch("/auth/resetear-contrasena", {
    method: "POST",
    body: JSON.stringify({ token, nueva_contrasena: nuevaContrasena }),
  });
};