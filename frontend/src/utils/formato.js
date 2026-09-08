// Formato de dinero para toda la app.
//
// Pesos colombianos sin decimales y con apóstrofe como separador de miles
// ($100'000). Un único helper para que el formato sea igual en la web, el panel
// y la factura.

/** Entero → cadena con apóstrofe cada 3 dígitos ("100'000", "-5'000"). */
export const milesConApostrofe = (n) => {
  const num = Math.round(Number(n) || 0);
  const s = Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (num < 0 ? "-" : "") + s;
};

/** Monto → "$100'000" (sin decimales). */
export const formatCOP = (n) => `$${milesConApostrofe(n)}`;

/** Lee un número desde una cadena que puede traer $, apóstrofes o espacios. */
export const parseMiles = (s) => {
  const n = Number(String(s ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
