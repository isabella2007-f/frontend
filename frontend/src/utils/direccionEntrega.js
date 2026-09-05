/**
 * Una dirección de entrega, campo por campo.
 *
 * Espeja `lib/models/direccion_entrega.dart` de la app. Antes acá la dirección
 * era un renglón de texto libre ("Calle 45 # 32-10", escrito a mano y distinto
 * en cada cliente), así que no había forma de saber a qué barrio va el pedido
 * —que es justo de lo que va a depender su costo—.
 *
 * El límite que manda es la columna `Domicilios.Direccion_entrega` del
 * servidor: 50 caracteres. Ahí va la vía, que siempre cabe, y el resto
 * —barrio, complemento, indicaciones— viaja en las observaciones, que son texto
 * largo y son lo que lee quien entrega.
 */

/** El largo que aguanta la columna de dirección. */
export const LARGO_MAX_DIRECCION = 50;

/**
 * El largo que aguanta `Usuarios.Indicaciones`, donde van el barrio, el
 * complemento y las indicaciones cuando no caben en la dirección.
 */
export const LARGO_MAX_OBSERVACIONES = 255;

/**
 * Cómo empieza una dirección en Colombia.
 *
 * La abreviatura es lo que se escribe: la columna son 50 caracteres y
 * "Transversal" se come 11 de entrada.
 */
export const TIPOS_VIA = [
  { valor: 'calle',       etiqueta: 'Calle',       abreviatura: 'Cl.' },
  { valor: 'carrera',     etiqueta: 'Carrera',     abreviatura: 'Cra.' },
  { valor: 'diagonal',    etiqueta: 'Diagonal',    abreviatura: 'Dg.' },
  { valor: 'avenida',     etiqueta: 'Avenida',     abreviatura: 'Av.' },
  { valor: 'transversal', etiqueta: 'Transversal', abreviatura: 'Tv.' },
];

const porValor = (v) => TIPOS_VIA.find((t) => t.valor === v) || null;

/** Una dirección vacía, para arrancar un formulario. */
export const direccionVacia = () => ({
  departamento: 'Antioquia',
  municipio: '',
  barrio: '',
  tipoVia: '',
  numero: '',
  numeral: '',
  complemento: '',
  indicaciones: '',
});

/** La vía sola: "Cl. 69 #59-56". Es lo que va en la columna de 50. */
export const via = (d) => {
  const tipo = porValor(d?.tipoVia);
  const numero = (d?.numero || '').trim();
  if (!tipo || !numero) return '';
  const numeral = (d?.numeral || '').trim();
  const base = `${tipo.abreviatura} ${numero}`;
  return numeral ? `${base} #${numeral}` : base;
};

/** La dirección tal como se lee: "Cl. 69 #59-56, Apto 302, Manrique". */
export const direccionCompleta = (d) =>
  [via(d), (d?.complemento || '').trim(), (d?.barrio || '').trim(),
   (d?.municipio || '').trim()]
    .filter(Boolean)
    .join(', ');

const recortar = (s) =>
  s.length <= LARGO_MAX_DIRECCION
    ? s
    : s.slice(0, LARGO_MAX_DIRECCION).trimEnd();

/**
 * Lo que se guarda en la columna, sin pasarse de 50 caracteres.
 *
 * Se le agrega el barrio si cabe, porque es lo que de verdad ubica al
 * repartidor; si no cabe, queda solo la vía y el barrio va en las
 * observaciones, donde igual lo va a leer.
 */
export const lineaGuardada = (d) => {
  const v = via(d);
  const barrio = (d?.barrio || '').trim();
  if (!barrio) return recortar(v);
  const conBarrio = `${v}, ${barrio}`;
  return conBarrio.length <= LARGO_MAX_DIRECCION ? conBarrio : recortar(v);
};

/**
 * Lo que no cabe en la columna y quien entrega necesita saber.
 *
 * El barrio va primero aunque ya esté en la línea: es lo primero que mira
 * quien organiza la ruta.
 */
export const observacionesDe = (d) => {
  const partes = [];
  if ((d?.barrio || '').trim())       partes.push(`Barrio ${d.barrio.trim()}`);
  if ((d?.complemento || '').trim())  partes.push(d.complemento.trim());
  if ((d?.indicaciones || '').trim()) partes.push(d.indicaciones.trim());
  const texto = partes.join('. ');
  // La columna son 255 caracteres: pasarse hace que MySQL la corte sin
  // avisar, y el barrio va primero para que no sea lo que se pierda.
  return texto.length <= LARGO_MAX_OBSERVACIONES
    ? texto
    : texto.slice(0, LARGO_MAX_OBSERVACIONES).trimEnd();
};

/**
 * Qué falta para poder mandar a alguien a entregar, o null si está completa.
 *
 * El complemento y las indicaciones son opcionales: hay casas que no tienen
 * apartamento ni nada que aclarar.
 */
export const queFalta = (d) => {
  if (!(d?.municipio || '').trim()) return 'Elige el municipio';
  if (!(d?.barrio || '').trim())    return 'Elige el barrio';
  if (!porValor(d?.tipoVia))        return 'Elige el tipo de vía';
  if (!(d?.numero || '').trim())    return 'Falta el número de la vía';
  if (!(d?.numeral || '').trim())   return 'Falta el número después del #';
  return null;
};

export const sirveParaEntregar = (d) => queFalta(d) === null;

/** Lo que se guarda en el perfil del cliente. */
export const aPerfil = (d) => ({
  Direccion: lineaGuardada(d),
  Departamento: (d?.departamento || 'Antioquia').trim(),
  Municipio: (d?.municipio || '').trim(),
  Barrio: (d?.barrio || '').trim(),
  Indicaciones: observacionesDe(d),
});

const tipoDesdeTexto = (texto) => {
  const t = (texto || '').trim().toLowerCase();
  if (!t) return '';
  const hallado = TIPOS_VIA.find(
    (v) =>
      t === v.valor ||
      t.startsWith(v.etiqueta.toLowerCase()) ||
      t.startsWith(v.abreviatura.toLowerCase().replace(/\./g, '')),
  );
  return hallado ? hallado.valor : '';
};

/**
 * Reconstruye lo que se pueda de una dirección vieja, escrita a mano.
 *
 * Las que ya están guardadas son texto libre; se intenta separar la vía en sus
 * partes para no hacer reescribir todo. Lo que no se entienda queda vacío y el
 * cliente lo completa.
 */
export const desdeTexto = (
  texto,
  { departamento = 'Antioquia', municipio = '', barrio = '', indicaciones = '' } = {},
) => {
  const base = { ...direccionVacia(), departamento, municipio, barrio, indicaciones };
  const t = (texto || '').trim();
  if (!t) return base;

  const m = t.match(
    /^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ.]+)\s*([0-9]+[A-Za-z]?)\s*(?:#|No\.?|N°)?\s*([0-9]+[A-Za-z]?(?:\s*-\s*[0-9]+[A-Za-z]?)?)?/i,
  );
  const tipo = tipoDesdeTexto(m && m[1]);

  // Sin un tipo de vía reconocible no hay nada que separar: se deja el texto
  // en el complemento para no perderlo.
  if (!tipo) return { ...base, complemento: t };

  const resto = t.slice(m[0].length).replace(/^\s*,\s*/, '').trim();
  return {
    ...base,
    // Si no venía un barrio aparte, lo que sigue a la vía suele serlo.
    barrio: barrio || resto,
    tipoVia: tipo,
    numero: (m[2] || '').trim(),
    numeral: (m[3] || '').replace(/\s/g, '').trim(),
  };
};
