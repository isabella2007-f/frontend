import { Home, MapPin, PencilLine, AlertTriangle } from 'lucide-react';
import FormularioDireccion from './FormularioDireccion';
import { direccionVacia, desdeTexto } from '../../utils/direccionEntrega';

/**
 * A dónde se lleva el pedido: la dirección de siempre, u otra.
 *
 * La dirección guardada se muestra **como es y no se puede editar**. Antes se
 * cargaba dentro de un campo de texto y quedaba editable: cualquier corrección
 * hecha ahí terminaba pisando la dirección del perfil sin que el cliente
 * quisiera, y el pedido siguiente salía a un lugar que nadie había cambiado a
 * propósito. Para cambiarla está "Mis datos", que es donde se cambia.
 *
 * Elegir otra abre el formulario completo y esa dirección vale **solo para
 * este pedido**.
 *
 * Lo usan el carrito, el checkout y el alta de pedidos del panel: las tres
 * preguntaban lo mismo de tres maneras distintas.
 */
export default function SelectorDireccionEntrega({
  /** Lo que hay guardado: { direccion, municipio, departamento, barrio, indicaciones } */
  registrada,
  /** true = usar la guardada; false = escribir otra. */
  usarRegistrada,
  onUsarRegistrada,
  /** La dirección alternativa, campo por campo. */
  otra,
  onOtra,
  /** Para el panel: el nombre de quien recibe, para que se lea como suyo. */
  nombreCliente,
}) {
  const linea = (registrada?.direccion || '').trim();
  const tieneRegistrada = !!linea;
  const resumen = [linea, registrada?.municipio].filter(Boolean).join(', ');

  const elegirOtra = () => {
    onUsarRegistrada(false);
    // Se arranca de la guardada: casi siempre cambia el número o el barrio,
    // no la ciudad entera.
    if (!otra?.municipio && tieneRegistrada) {
      onOtra(desdeTexto(registrada.direccion, {
        departamento: registrada.departamento || 'Antioquia',
        municipio:    registrada.municipio    || '',
        barrio:       registrada.barrio       || '',
        indicaciones: registrada.indicaciones || '',
      }));
    } else if (!otra) {
      onOtra(direccionVacia());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tieneRegistrada ? (
        <Opcion
          activa={usarRegistrada}
          onClick={() => onUsarRegistrada(true)}
          icono={<Home size={16} color={usarRegistrada ? 'var(--green-700)' : '#9e9e9e'} />}
          titulo={nombreCliente
            ? `Dirección registrada de ${nombreCliente}`
            : 'Mi dirección de siempre'}
          detalle={resumen}
          nota={registrada?.indicaciones}
        />
      ) : (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-start',
          background: '#fff8e1', border: '1px solid #ffe082',
          borderRadius: 12, padding: '10px 12px',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#e65100' }} />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, color: '#5d4037' }}>
            {nombreCliente
              ? `${nombreCliente} no tiene dirección registrada. Escribe abajo a dónde se lleva este pedido.`
              : 'No tienes una dirección registrada. Escribe abajo a dónde llevamos este pedido.'}
          </p>
        </div>
      )}

      <Opcion
        activa={!usarRegistrada || !tieneRegistrada}
        onClick={elegirOtra}
        icono={<PencilLine size={16} color={
          (!usarRegistrada || !tieneRegistrada) ? 'var(--green-700)' : '#9e9e9e'} />}
        titulo="Entregar en otra dirección"
        detalle="Vale solo para este pedido: no cambia la dirección guardada"
      />

      {(!usarRegistrada || !tieneRegistrada) && (
        <div style={{ marginTop: 4 }}>
          <FormularioDireccion
            tema="checkout"
            mostrarAvisoCosto
            valor={otra || direccionVacia()}
            onCambio={onOtra}
          />
        </div>
      )}
    </div>
  );
}

function Opcion({ activa, onClick, icono, titulo, detalle, nota }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%',
        textAlign: 'left', cursor: 'pointer',
        background: activa ? '#f1f8f1' : '#fff',
        border: `${activa ? 2 : 1.5}px solid ${activa ? 'var(--green-600)' : '#e8e8e8'}`,
        borderRadius: 12, padding: activa ? '11px 13px' : '12px 14px',
        transition: 'all .15s',
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 2, lineHeight: 0 }}>{icono}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: 13.5, fontWeight: 800,
          color: activa ? 'var(--green-800)' : 'var(--gray-800, #333)',
        }}>{titulo}</span>
        {detalle && (
          <span style={{
            display: 'block', fontSize: 12, lineHeight: 1.4, marginTop: 2,
            color: '#757575', wordBreak: 'break-word',
          }}>{detalle}</span>
        )}
        {nota && (
          <span style={{
            display: 'flex', gap: 4, alignItems: 'flex-start',
            fontSize: 11.5, lineHeight: 1.35, marginTop: 3, color: '#9e9e9e',
          }}>
            <MapPin size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {nota}
          </span>
        )}
      </span>
    </button>
  );
}
