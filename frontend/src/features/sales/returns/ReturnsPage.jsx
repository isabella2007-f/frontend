import { useState, useEffect } from 'react';
import ReturnForm        from './components/ReturnForm';
import ReturnList        from './components/ReturnList';
import ReturnDetailModal from './components/ReturnDetailModal';
import { getReturns }    from './services/returnService';
import { RefreshCw, Leaf, PackageSearch } from 'lucide-react';
import '../../../styles/client.css';

const ReturnsPage = () => {
  const [returns,        setReturns]        = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [toast,          setToast]          = useState(null);

  const loadReturns = () => setReturns(getReturns());

  useEffect(() => { loadReturns(); }, []);

  const handleSuccess = () => {
    loadReturns();
    setToast({ message: 'Solicitud registrada con éxito', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewDetails = (request) => {
    setSelectedReturn(request);
    setShowModal(true);
  };

  return (
    <div className="toston-page">

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.type === 'error' ? 'toast--error' : ''}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <header className="page-hero">
        <div className="page-hero__inner">
          <div>
            <span className="page-hero__label">
              <Leaf size={11} /> Tostón App
            </span>
            <h1 className="page-hero__title">
              Gestión de <em>Devoluciones</em>
            </h1>
            <p className="page-hero__sub">
              Registra y consulta el estado de tus solicitudes de devolución de forma sencilla.
            </p>
          </div>

          <div className="page-hero__badge">
            <span className="page-hero__badge-icon">
              <RefreshCw size={18} color="white" />
            </span>
            {returns.length} solicitud{returns.length !== 1 ? 'es' : ''} registrada{returns.length !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="page-content">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'clamp(300px, 35%, 420px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}>

          {/* Columna formulario */}
          <div className="card" style={{ padding: 28 }}>
            <p className="section-title">Nueva solicitud</p>
            <ReturnForm onSuccess={handleSuccess} />
          </div>

          {/* Columna listado */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <p className="section-title" style={{ margin: 0 }}>
                <PackageSearch size={18} style={{ marginRight: 8 }} />
                Solicitudes registradas
              </p>
              <span className="badge badge--green">{returns.length} en total</span>
            </div>

            {returns.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-state__icon">
                  <PackageSearch size={28} />
                </div>
                <h3 className="empty-state__title" style={{ fontSize: '1.1rem' }}>
                  Sin solicitudes aún
                </h3>
                <p className="empty-state__text">
                  Cuando registres una devolución aparecerá aquí.
                </p>
              </div>
            ) : (
              <div style={{
                maxHeight: 'calc(100vh - 380px)',
                overflowY: 'auto',
                paddingRight: 4,
              }}>
                <ReturnList returns={returns} onViewDetails={handleViewDetails} />
              </div>
            )}
          </div>
        </div>
      </main>

      <ReturnDetailModal
        show={showModal}
        onClose={() => setShowModal(false)}
        request={selectedReturn}
      />
    </div>
  );
};

export default ReturnsPage;