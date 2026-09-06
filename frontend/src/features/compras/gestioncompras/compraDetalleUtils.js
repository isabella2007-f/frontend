/* Constantes y helpers compartidos del detalle de insumos de una compra.
   Fuente única para CrearCompra, EditarCompra y DetalleInsumoFields. */

export const UNIDADES = [
  { id: 1, nombre: "Kilogramo", simbolo: "kg"   },
  { id: 2, nombre: "Gramo",     simbolo: "g"    },
  { id: 3, nombre: "Litro",     simbolo: "L"    },
  { id: 4, nombre: "Mililitro", simbolo: "ml"   },
  { id: 5, nombre: "Unidad",    simbolo: "uds." },
  { id: 6, nombre: "Libra",     simbolo: "lb"   },
];

export const GRUPO_UNIDAD = { 1: "masa", 2: "masa", 6: "masa", 3: "vol", 4: "vol", 5: "und" };

export const CANT_MAX = 10_000;

// Deja pasar dígitos y un punto decimal; rechaza signo, letras y separadores.
export const soloNumero = (v) => v === "" || /^\d*\.?\d*$/.test(v);

export const unidadesDelGrupo = (idUnidadBase) => {
  const grupo = GRUPO_UNIDAD[Number(idUnidadBase)];
  if (!grupo) return [];
  return UNIDADES.filter((u) => GRUPO_UNIDAD[u.id] === grupo);
};

export const COP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
