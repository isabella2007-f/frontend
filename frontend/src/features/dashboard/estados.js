/* Estados reales de un pedido (tabla Estados) usados por el flujo de ventas.
   El orden define el apilado de la barra, de abajo hacia arriba. */
export const ESTADOS_FLUJO = [
  { key: "completada",      label: "Completada",      color: "#43a047" },
  { key: "entregado",       label: "Entregado",       color: "#2e7d32" },
  { key: "en_camino",       label: "En camino",       color: "#26c6da" },
  { key: "en_proceso",      label: "En proceso",      color: "#fb8c00" },
  { key: "confirmado",      label: "Confirmado",      color: "#5c6bc0" },
  { key: "fecha_propuesta", label: "Fecha propuesta", color: "#ab47bc" },
  { key: "pendiente",       label: "Pendiente",       color: "#bdbdbd" },
  { key: "cancelado",       label: "Cancelado",       color: "#e53935" },
];

export const ESTADO_ID_KEY = {
  1: "pendiente", 4: "confirmado", 5: "cancelado", 8: "entregado",
  9: "en_camino", 11: "completada", 13: "en_proceso", 16: "fecha_propuesta",
};

export const ESTADO_KEY_LABEL = Object.fromEntries(
  ESTADOS_FLUJO.map(e => [e.key, e.label])
);
export const ESTADO_KEY_COLOR = Object.fromEntries(
  ESTADOS_FLUJO.map(e => [e.key, e.color])
);

/* Estados que cuentan como pedido "Completado" para el resto de tarjetas. */
export const ESTADOS_COMPLETADO_ID = [8, 11];
