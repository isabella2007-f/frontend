// src/features/client/profile/ProfilePage.jsx
import { useState, useEffect } from 'react';
import ProfileView from './components/ProfileView';
import ProfileForm from './components/ProfileForm';
import { getCurrentUser, updateUser } from './services/profileService';
import './../../ventas/Clientes/clientes.css';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const userData = getCurrentUser();
    setUser(userData);
  }, []);

  const handleSave = (updatedData) => {
    try {
      const updatedUser = updateUser(updatedData);
      setUser(updatedUser);
      setIsEditing(false);
      showToast('¡Datos actualizados correctamente!', 'success');
    } catch (error) {
      showToast('Ocurrió un error al actualizar los datos.', 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!user) {
    return (
      <div className="page-wrapper">
        <div className="page-inner" style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="spinner">⌛</div>
          <p>Cargando información del perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Mi Perfil</h1>
        <div className="page-header__line"></div>
      </div>

      <div className="page-inner">
        {isEditing ? (
          <ProfileForm 
            user={user} 
            onSave={handleSave} 
            onCancel={() => setIsEditing(false)} 
          />
        ) : (
          <ProfileView 
            user={user} 
            onEdit={() => setIsEditing(true)} 
          />
        )}
      </div>

      {toast && (
        <div className="toast" style={{ backgroundColor: toast.type === 'success' ? '#2e7d32' : '#c62828' }}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;