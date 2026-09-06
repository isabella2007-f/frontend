// Filas de relleno para tablas paginadas.
// Rellena la página actual con filas vacías hasta `perPage`, de modo que el alto
// del cuerpo de la tabla sea constante en todas las páginas y la barra de
// paginación no salte de posición. El alto de cada fila lo fija el CSS
// (`.tbl--fixed-rows tbody tr { height: var(--tbl-row-h) }`), no este componente.
//
// No renderiza nada cuando la página está vacía (deja sitio al empty-state) ni
// cuando la página ya viene completa.
export default function FilasRelleno({ current = 0, perPage = 0, colSpan = 1 }) {
  const faltan = Math.max(0, Math.floor(perPage) - Math.floor(current));
  if (current <= 0 || faltan === 0) return null;

  return Array.from({ length: faltan }, (_, i) => (
    <tr key={`relleno-${i}`} className="tbl-fill-row" aria-hidden="true">
      <td colSpan={colSpan} />
    </tr>
  ));
}
