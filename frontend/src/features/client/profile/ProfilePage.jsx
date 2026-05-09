import { useState, useEffect } from 'react';
import ProfileView from './components/ProfileView.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import { getCurrentUser, updateUser } from './services/profileService.js';
import { useApp } from '../../../AppContext.jsx';
import { UserCircle, Leaf, ShieldCheck, Package } from 'lucide-react';
import '../../../styles/Client.css';

const ProfilePage = () => {
  const { pedidos } = useApp();
  const [user,      setUser]      = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast,     setToast]     = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const userPedidos = user ? pedidos.filter(p => p.idCliente === user.cedula) : [];
  const totalPedidos = userPedidos.length; // ✅ FIX: variable estaba sin declarar

  const handleSave = (updatedData) => {
    try {
      const updatedUser = updateUser(updatedData);
      setUser(updatedUser);
      setIsEditing(false);
      showToast('¡Datos actualizados correctamente!', 'success');
    } catch {
      showToast('Ocurrió un error al actualizar los datos.', 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!user) return (
    <div className="toston-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⌛</div>
        <p style={{ fontWeight: 600 }}>Cargando perfil...</p>
      </div>
    </div>
  );

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
              Mi <em>Perfil</em>
            </h1>
            <p className="page-hero__sub">
              Mantén tus datos actualizados para recibir tus pedidos sin inconvenientes.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="page-hero__badge">
              <span className="page-hero__badge-icon">
                <UserCircle size={18} color="white" />
              </span>
              {user.nombre || 'Mi cuenta'}
            </div>
            {!isEditing && (
              <button
                className="btn-primary"
                onClick={() => setIsEditing(true)}
                style={{ justifyContent: 'center' }}
              >
                Editar perfil
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="page-content">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}>

          {/* Card principal */}
          <div className="card" style={{ padding: 32 }}>
            <p className="section-title">
              {isEditing ? 'Editar información' : 'Información personal'}
            </p>

            {isEditing ? (
              <ProfileForm
                user={user}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <ProfileView
                user={user}
                totalPedidos={totalPedidos}
                onEdit={() => setIsEditing(true)}
              />
            )}
          </div>

          {/* Card de seguridad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 0', borderBottom: '1px solid var(--green-100)',
                marginBottom: 16,
              }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'var(--green-50)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--green-700)',
                }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--gray-900)' }}>
                    Cuenta verificada
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
                    Tus datos están protegidos
                  </p>
                </div>
                <span className="badge badge--green" style={{ marginLeft: 'auto' }}>Activa</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Miembro desde',    value: user.fechaRegistro || '2024' },
                  { label: 'Pedidos realizados', value: totalPedidos || '—' },
                  { label: 'Última sesión',     value: user.ultimaSesion || 'Hoy' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                  }}>
                    <span style={{ color: 'var(--gray-500)' }}>{item.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card de pedidos */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 0', borderBottom: '1px solid var(--green-100)',
                marginBottom: 16,
              }}>
                <div style={{
                  width: 44, height: 44,
                  background: 'var(--green-50)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--green-700)',
                }}>
                  <Package size={22} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--gray-900)' }}>
                    Mis Pedidos
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
                    Historial de tus compras
                  </p>
                </div>
              </div>

              {userPedidos.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontFamily: 'var(--font-body)' }}>
                  No tienes pedidos registrados aún.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {userPedidos.map(pedido => (
                    <div key={pedido.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)',
                      background: 'var(--gray-50)',
                    }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>
                          {pedido.numero}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>
                          {pedido.fecha_pedido} • {pedido.productosItems.length} producto{pedido.productosItems.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>
                          ${pedido.total.toLocaleString()}
                        </p>
                        <span style={{
                          display: 'inline-block', marginTop: 4,
                          padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: pedido.estado === 'Entregado' ? 'var(--green-100)' : pedido.estado === 'En camino' ? '#dbeafe' : '#fef3c7',
                          color: pedido.estado === 'Entregado' ? 'var(--green-800)' : pedido.estado === 'En camino' ? '#1e40af' : '#92400e',
                        }}>
                          {pedido.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;