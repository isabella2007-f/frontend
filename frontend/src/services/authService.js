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

  localStorage.setItem("token", data.access_token);
  localStorage.setItem("usuario", JSON.stringify({
    id:        data.cedula,
    nombre:    data.nombre,
    apellidos: data.apellidos,
    tipo:      data.tipo,
    rol:       data.rol,
  }));

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

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
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

export const resetearContrasena = async (correo, codigo, nuevaContrasena) => {
  return apiFetch("/auth/resetear-contrasena", {
    method: "POST",
    body: JSON.stringify({ correo, codigo, nueva_contrasena: nuevaContrasena }),
  });
};