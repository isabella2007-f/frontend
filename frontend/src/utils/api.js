// src/utils/api.js
import { API_URL } from "../config/api";

const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; // 8 horas en ms

function getToken() {
  return localStorage.getItem("token");
}

export function updateActivity() {
  localStorage.setItem("last_activity", Date.now().toString());
}

export function isInactive() {
  const last = parseInt(localStorage.getItem("last_activity") || "0", 10);
  if (!last) return false;
  return Date.now() - last > INACTIVITY_LIMIT;
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("last_activity");
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

    updateActivity();

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