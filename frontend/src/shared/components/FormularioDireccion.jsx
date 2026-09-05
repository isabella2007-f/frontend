import { MapPin, Home, Signpost, Hash, Building2, Info, Truck, Bike } from 'lucide-react';
import { MUNICIPIOS_VALLE_ABURRA } from '../../utils/departamentosYCiudades';
import { BARRIO_OTRO, barriosDe } from '../../utils/barrios';
import { TIPOS_VIA, direccionCompleta, via } from '../../utils/direccionEntrega';

/**
 * La dirección de entrega, campo por campo.
 *
 * Antes era un renglón de texto libre —"Calle 45 # 32-10", escrito a mano y
 * distinto en cada cliente—, así que no había forma de saber a qué barrio va
 * el pedido. El costo del domicilio va a depender del barrio, y escrito a mano
 * "Manrique", "manrique" y "Barrio Manrique" son tres barrios distintos para
 * cualquier tabla de tarifas: por eso sale de una lista.
 *
 * Es el mismo formulario que la app (`widgets/formulario_direccion.dart`), con
 * los mismos campos y los mismos barrios.
 */

const inputBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px',
  background: 'var(--gray-100)',
  border: '1.5px solid transparent',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: 14, fontWeight: 500,
  color: 'var(--gray-900)', outline: 'none',
  transition: 'all .2s',
};

const focusOn = (e) => {
  e.target.style.background = '#fff';
  e.target.style.borderColor = 'var(--green-600)';
  e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)';
};
const focusOff = (e) => {
  e.target.style.background = 'var(--gray-100)';
  e.target.style.borderColor = 'transparent';
  e.target.style.boxShadow = 'none';
};

const Etiqueta = ({ icon: Icon, children }) => (
  <label style={{
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.05em', color: 'var(--gray-500)',
    fontFamily: 'var(--font-body)', marginBottom: 6,
  }}>
    {Icon && <Icon size={11} />} {children}
  </label>
);

const Campo = ({ label, icon, children }) => (
  <div style={{ marginBottom: 16 }}>
    <Etiqueta icon={icon}>{label}</Etiqueta>
    {children}
  </div>
);

export default function FormularioDireccion({
  valor,
  onCambio,
  /** El aviso del costo. En el perfil no aplica: ahí no se cobra nada. */
  mostrarAvisoCosto = false,
}) {
  const d = valor;
  const barrios = barriosDe(d.municipio);
  // Un barrio escrito a mano (o uno de una lista vieja) cae en "otro".
  const barrioEnLista = barrios.includes(d.barrio);
  const eligioOtro = !!d.barrio && !barrioEnLista;

  const set = (campo) => (e) => onCambio({ ...d, [campo]: e.target.value });

  return (
    <>
      {mostrarAvisoCosto && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: '#fff8e1', border: '1px solid #ffe082',
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        }}>
          <Truck size={16} style={{ flexShrink: 0, marginTop: 1, color: '#e65100' }} />
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              textTransform: 'uppercase', color: '#e65100',
            }}>Costo del domicilio</p>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.4, color: '#5d4037' }}>
              {d.barrio
                ? 'Depende del barrio seleccionado. Por ahora es la misma tarifa para toda el Área Metropolitana.'
                : 'Depende del barrio: elígelo abajo y te decimos cuánto.'}
            </p>
          </div>
        </div>
      )}

      {/* Municipio */}
      <Campo label="Municipio (Valle de Aburrá)" icon={MapPin}>
        <select
          value={d.municipio || ''}
          // Cambiar de municipio deja el barrio anterior sin sentido.
          onChange={(e) => onCambio({ ...d, municipio: e.target.value, barrio: '' })}
          style={{ ...inputBase, cursor: 'pointer' }}
          onFocus={focusOn} onBlur={focusOff}
        >
          <option value="">— Seleccionar —</option>
          {MUNICIPIOS_VALLE_ABURRA.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Campo>

      {/* Barrio */}
      <Campo label="Barrio" icon={Home}>
        <select
          value={barrioEnLista ? d.barrio : (eligioOtro ? BARRIO_OTRO : '')}
          onChange={(e) => onCambio({
            ...d,
            // Un espacio marca "otro elegido pero sin escribir todavía": deja
            // el campo de texto a la vista y la dirección incompleta.
            barrio: e.target.value === BARRIO_OTRO ? ' ' : e.target.value,
          })}
          disabled={!d.municipio}
          style={{ ...inputBase, cursor: d.municipio ? 'pointer' : 'not-allowed' }}
          onFocus={focusOn} onBlur={focusOff}
        >
          <option value="">
            {d.municipio ? '— Seleccionar —' : 'Primero elige el municipio'}
          </option>
          {barrios.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Campo>

      {/* El barrio que no está en la lista se escribe. Sin esta salida, quien
          viva en uno que falte no puede pedir, y eso es peor que una lista
          incompleta. */}
      {eligioOtro && (
        <Campo label="¿Cómo se llama tu barrio?" icon={Home}>
          <input
            type="text" value={d.barrio.trim()} onChange={set('barrio')}
            style={inputBase} onFocus={focusOn} onBlur={focusOff}
          />
        </Campo>
      )}

      {/* La vía */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <Campo label="Tipo de vía" icon={Signpost}>
          <select
            value={d.tipoVia || ''} onChange={set('tipoVia')}
            style={{ ...inputBase, cursor: 'pointer' }}
            onFocus={focusOn} onBlur={focusOff}
          >
            <option value="">— Seleccionar —</option>
            {TIPOS_VIA.map((t) => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Número">
          <input type="text" value={d.numero || ''} onChange={set('numero')}
            style={inputBase} onFocus={focusOn} onBlur={focusOff} />
        </Campo>
      </div>

      <Campo label="Número después del #" icon={Hash}>
        <input type="text" value={d.numeral || ''} onChange={set('numeral')}
          placeholder="Como 59-56" style={inputBase}
          onFocus={focusOn} onBlur={focusOff} />
      </Campo>

      <Campo label="Complemento (opcional)" icon={Building2}>
        <input type="text" value={d.complemento || ''} onChange={set('complemento')}
          placeholder="Apartamento, torre, interior, local" style={inputBase}
          onFocus={focusOn} onBlur={focusOff} />
      </Campo>

      <Campo label="Indicaciones (opcional)" icon={Info}>
        <input type="text" value={d.indicaciones || ''} onChange={set('indicaciones')}
          placeholder="Cómo reconocer la casa, a quién preguntar" style={inputBase}
          onFocus={focusOn} onBlur={focusOff} />
      </Campo>

      {/* Cómo va a quedar: para corregir acá y no cuando el domiciliario esté
          dando vueltas por el barrio. */}
      {via(d) && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: '#f1f8f1', border: '1px solid #c8e6c9',
          borderRadius: 12, padding: '12px 14px', marginBottom: 16,
        }}>
          <Bike size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--green-700)' }} />
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
              textTransform: 'uppercase', color: 'var(--green-700)',
            }}>Así le llega al domiciliario</p>
            <p style={{
              margin: '2px 0 0', fontSize: 13.5, fontWeight: 700,
              lineHeight: 1.4, color: 'var(--gray-900)',
            }}>{direccionCompleta(d)}</p>
            {d.indicaciones?.trim() && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-600)' }}>
                {d.indicaciones.trim()}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
