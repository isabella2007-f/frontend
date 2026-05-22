// src/utils/api.js
import { API_URL } from "../config/api";

function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  // Solo agregar Content-Type si hay body (POST, PUT, PATCH)
  const hasBody = options.body !== undefined;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    let mensaje = "Error en la petición";
    if (typeof error.detail === "string") {
      mensaje = error.detail;
    } else if (Array.isArray(error.detail)) {
      mensaje = error.detail.map(e => e.msg).join(", ");
    }
    throw new Error(mensaje);
  }

  return res.json();
}