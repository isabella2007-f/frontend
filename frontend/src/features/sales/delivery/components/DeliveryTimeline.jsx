import { Package, Truck, CheckCircle2, Circle } from 'lucide-react';

const EVENT_CONFIG = {
  'Entregado':   { icon: CheckCircle2, color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  'En tránsito': { icon: Truck,        color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe' },
  'Pendiente':   { icon: Package,      color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
};

const DeliveryTimeline = ({ history }) => {
  if (!history || history.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      color: 'var(--gray-500)', fontFamily: 'var(--font-body)',
    }}>
      <Circle size={32} style={{ marginBottom: 12, opacity: .3 }} />
      <p style={{ margin: 0, fontSize: 14 }}>Sin eventos registrados aún.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {history.map((event, index) => {
        const cfg  = EVENT_CONFIG[event.status] || EVENT_CONFIG['Pendiente'];
        const Icon = cfg.icon;
        const isLast = index === history.length - 1;

        return (
          <div key={index} style={{ display: 'flex', gap: 16, position: 'relative' }}>

            {/* Línea vertical + icono */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: cfg.bg,
                border: `1.5px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}>
                <Icon size={18} color={cfg.color} strokeWidth={2} />
              </div>
              {!isLast && (
                <div style={{
                  width: 2,
                  flex: 1,
                  minHeight: 24,
                  background: 'var(--green-100)',
                  margin: '4px 0',
                }} />
              )}
            </div>

            {/* Contenido */}
            <div style={{
              flex: 1,
              paddingBottom: isLast ? 0 : 24,
            }}>
              <div style={{
                background: index === 0 ? 'var(--green-50)' : 'var(--gray-100)',
                border: `1px solid ${index === 0 ? 'var(--green-100)' : 'transparent'}`,
                borderRadius: 12,
                padding: '12px 16px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  flexWrap: 'wrap', gap: 6,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: cfg.color,
                    fontFamily: 'var(--font-body)',
                  }}>{event.status}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: 'var(--gray-500)',
                    fontFamily: 'var(--font-body)',
                    background: 'white',
                    padding: '2px 8px',
                    borderRadius: 99,
                    border: '1px solid var(--gray-300)',
                  }}>{event.date}</span>
                </div>
                {event.description && (
                  <p style={{
                    margin: 0, fontSize: 13,
                    color: 'var(--gray-700)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.5,
                  }}>{event.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DeliveryTimeline;