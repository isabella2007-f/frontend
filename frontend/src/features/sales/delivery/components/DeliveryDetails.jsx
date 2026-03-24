import { ShoppingBag, MapPin, Calendar, Download, Receipt } from 'lucide-react';

const DeliveryDetails = ({ order, onDownload }) => {
  if (!order) return null;

  const total = order.total?.toLocaleString('es-CO') ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info rows */}
      {[
        { icon: Receipt,     label: 'N° de Pedido',  value: order.id },
        { icon: Calendar,    label: 'Fecha',          value: order.date },
        { icon: MapPin,      label: 'Dirección',      value: order.address || 'No especificada' },
      ].map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'var(--green-50)',
              border: '1px solid var(--green-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={16} color="var(--green-700)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 11, fontWeight: 600,
                color: 'var(--gray-500)', textTransform: 'uppercase',
                letterSpacing: '.05em', fontFamily: 'var(--font-body)',
              }}>{item.label}</p>
              <p style={{
                margin: 0, fontSize: 14, fontWeight: 600,
                color: 'var(--gray-900)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{item.value}</p>
            </div>
          </div>
        );
      })}

      <div style={{ height: 1, background: 'var(--green-100)', margin: '4px 0' }} />

      {/* Productos */}
      {order.items && order.items.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShoppingBag size={14} color="var(--gray-500)" />
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.05em', color: 'var(--gray-500)',
              fontFamily: 'var(--font-body)',
            }}>Productos</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                background: 'var(--gray-100)',
                borderRadius: 10,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--gray-700)', fontFamily: 'var(--font-body)',
                }}>
                  {item.name}
                  <span style={{ color: 'var(--gray-400)', marginLeft: 6 }}>×{item.quantity}</span>
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: 'var(--gray-900)', fontFamily: 'var(--font-body)',
                }}>
                  ${(item.price * item.quantity).toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--green-900)',
        borderRadius: 12,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,.75)', fontFamily: 'var(--font-body)',
        }}>Total del pedido</span>
        <span style={{
          fontSize: 18, fontWeight: 800,
          color: 'white', fontFamily: 'var(--font-display)',
        }}>${total}</span>
      </div>

      {/* Botón descarga */}
      <button
        onClick={onDownload}
        className="btn-secondary"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <Download size={15} />
        Descargar comprobante
      </button>
    </div>
  );
};

export default DeliveryDetails;