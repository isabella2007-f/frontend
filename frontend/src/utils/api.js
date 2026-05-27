// src/utils/api.js
import { API_URL } from "../config/api";

function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const hasBody = options.body !== undefined;
  const { timeout: timeoutMs = 15000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
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
  } catch (err) {
    if (
      err.name === "AbortError" ||
      (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))
    ) {
      throw new Error(
        "No se pudo conectar con el servidor. " +
        "Si es la primera solicitud del día, el servidor puede estar iniciando (espera ~60 seg). " +
        "Intenta de nuevo en un momento."
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}