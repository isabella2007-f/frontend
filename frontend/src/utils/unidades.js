/**
 * Unidades de medida: cómo se escriben y cómo se convierten.
 *
 * Espeja `_FAMILIA`, `_FACTOR`, `_ALIAS` y `_convertir` del módulo de órdenes
 * de producción del servidor. La receta pide gramos y el depósito guarda kilos,
 * así que cualquier pantalla que compare una ficha técnica con el stock tiene
 * que hacer la misma cuenta que hace el servidor al iniciar la orden. Si no,
 * el panel bloquea órdenes que el servidor aceptaría, o al revés.
 */

/** Familia de cada unidad: solo se convierte dentro de la misma. */
export const FAMILIA = {
  mg: "masa", g: "masa", kg: "masa", lb: "masa", t: "masa",
  ml: "volumen", l: "volumen",
  taza: "volumen", cucharada: "volumen", cucharadita: "volumen",
  unidad: "conteo",
};

/** Cuánto vale cada unidad en la base de su familia (g, ml, unidad). */
export const FACTOR = {
  mg: 0.001, g: 1, kg: 1000, lb: 500, t: 1000000,
  ml: 1, l: 1000,
  taza: 240, cucharada: 15, cucharadita: 5,
  unidad: 1,
};

/** Cómo escribe la gente las mismas unidades. */
const ALIAS = {
  gr: "g", grs: "g", gramo: "g", gramos: "g",
  kgs: "kg", kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg",
  mgs: "mg", miligramo: "mg", miligramos: "mg",
  lbs: "lb", libra: "lb", libras: "lb",
  ton: "t", tonelada: "t", toneladas: "t",
  lt: "l", lts: "l", litro: "l", litros: "l",
  mls: "ml", mililitro: "ml", mililitros: "ml",
  u: "unidad", un: "unidad", und: "unidad", unds: "unidad",
  uds: "unidad", ud: "unidad", unidades: "unidad",
  tazas: "taza",
  cucharadas: "cucharada", cda: "cucharada", cdas: "cucharada",
  cucharaditas: "cucharadita", cdta: "cucharadita", cdtas: "cucharadita",
};

/**
 * Deja el símbolo en su forma canónica: "Kg", "kilos" y "KG" son "kg".
 *
 * Sin esto, que una ficha dijera "gr" y el insumo estuviera en "Kg" bastaba
 * para que las cuentas no cuadraran.
 */
export const normalizarUnidad = (simbolo) =>
  ALIAS[(simbolo || "").trim().toLowerCase().replace(/\.+$/, "")] ??
  (simbolo || "").trim().toLowerCase().replace(/\.+$/, "");

/** Las medidas de cocina se usan para pesar: "una taza de harina". */
const MEDIDAS_DE_COCINA = new Set(["taza", "cucharada", "cucharadita"]);

/**
 * Pasa `cantidad` de una unidad a otra.
 *
 * Devuelve `{ valor, error }`: `error` trae el motivo cuando las unidades no
 * son compatibles, para poder decirlo en pantalla en vez de mostrar un número
 * inventado.
 */
export function convertir(cantidad, desde, hasta) {
  const d = normalizarUnidad(desde);
  const h = normalizarUnidad(hasta);
  if (d === h || !d || !h) return { valor: cantidad, error: null };

  const famD = FAMILIA[d];
  const famH = FAMILIA[h];
  const compatibles =
    famD && famH &&
    (famD === famH ||
      ((MEDIDAS_DE_COCINA.has(d) || MEDIDAS_DE_COCINA.has(h)) &&
        [famD, famH].every((f) => f === "masa" || f === "volumen")));

  if (!compatibles) {
    return { valor: null, error: `No se puede convertir de '${desde}' a '${hasta}'` };
  }
  return { valor: (cantidad * FACTOR[d]) / FACTOR[h], error: null };
}
