import { apiFetch } from "../utils/api";

export const login = async (correo, contrasena) => {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, contrasena }),
  });

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