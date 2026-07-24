const LETRAS_RE = /[a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ]/;

// Elimina todo lo que no sea letra (incluye acentos, ñ, ü) ni espacio
export const soloLetras = (v) =>
  v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙñÑüÜ\s]/g, '');

// Elimina todo lo que no sea dígito; cap opcional
export const soloDigitos = (v, max = Infinity) =>
  v.replace(/\D/g, '').slice(0, max);

// true si el texto tiene al menos una letra (útil para validar descripciones)
export const tieneLetras = (v) => LETRAS_RE.test(v);

// Valida que una dirección tenga al menos una letra Y un dígito y mínimo 5 chars
export const esUbicacionValida = (v) => {
  const s = (v || '').trim();
  return s.length >= 5 && LETRAS_RE.test(s) && /\d/.test(s);
};
