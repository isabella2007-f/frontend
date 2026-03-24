import { Eye, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  'Pendiente':  { icon: Clock,         color: '#92400e', bg: '#fef3c7', border: '#fde68a',  label: 'Pendiente'  },
  'Aprobado':   { icon: CheckCircle2,  color: '#166534', bg: '#dcfce7', border: '#bbf7d0',  label: 'Aprobado'   },
  'Rechazado':  { icon: XCircle,       color: '#991b1b', bg: '#fee2e2', border: '#fca5a5',  label: 'Rechazado'  },
};

const StatusPill = ({ status }) => {
  const cfg  = STATUS_CONFIG[status] || { color: 'var(--gray-500)', bg: 'var(--gray-100)', border: 'var(--gray-300)', label: status, icon: Clock };
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color,
      fontSize: 11, fontWeight: 700,
      padding: '4px 10px', borderRadius: 99,
      fontFamily: 'var(--font-body)',
      textTransform: 'uppercase', letterSpacing: '.04em',
      whiteSpace: 'nowrap',
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
};

const ReturnList = ({ returns, onViewDetails }) => {
  if (!returns || returns.length === 0) return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: 'var(--gray-100)', borderRadius: 'var(--radius-lg)',
      border: '2px dashed var(--gray-300)',
    }}>
      <Package size={36} style={{ color: 'var(--gray-300)', marginBottom: 12 }} />
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
        No hay solicitudes registradas aún.
      </p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {returns.map((item) => (
        <div key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--white)',
          border: '1.5px solid var(--green-100)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          transition: 'border-color .2s, box-shadow .2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-400)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--green-100)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          {/* Icono */}
          <div style={{
            width: 40, height: 40, flexShrink: 0,
            background: 'var(--green-50)',
            border: '1px solid var(--green-100)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={18} color="var(--green-700)" />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontWeight: 700, fontSize: 14,
              color: 'var(--gray-900)', fontFamily: 'var(--font-body)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{item.productName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              {item.idVenta && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--gray-500)',
                  fontFamily: 'var(--font-body)',
                }}>Venta #{item.idVenta}</span>
              )}
              {item.idVenta && item.date && (
                <span style={{ fontSize: 11, color: 'var(--gray-300)' }}>·</span>
              )}
              <span style={{
                fontSize: 11, color: 'var(--gray-500)',
                fontFamily: 'var(--font-body)',
              }}>{item.date}</span>
            </div>
          </div>

          {/* Estado + Botón */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <StatusPill status={item.status} />
            <button
              className="btn-ghost"
              style={{ padding: '8px 12px', gap: 4 }}
              onClick={() => onViewDetails(item)}
            >
              <Eye size={14} /> Ver
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReturnList;