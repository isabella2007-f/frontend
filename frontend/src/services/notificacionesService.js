import { apiFetch } from "../utils/api";

export const getNotificacionesAdmin = () =>
  apiFetch("/notificaciones/");

export const marcarLeidaAPI = (id) =>
  apiFetch(`/notificaciones/${id}/leer`, { method: "PATCH" });

export const eliminarNotificacionAPI = (id) =>
  apiFetch(`/notificaciones/${id}`, { method: "DELETE" });

export const limpiarLeidasAPI = () =>
  apiFetch("/notificaciones/limpiar", { method: "DELETE" });

export const getMisNotificacionesCliente = () =>
  apiFetch("/notificaciones/mis-notificaciones");
