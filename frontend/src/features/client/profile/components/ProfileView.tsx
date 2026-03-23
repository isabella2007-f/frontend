// src/features/client/profile/components/ProfileView.tsx
import React from 'react';
import { UserProfile } from '../services/profileService';

interface ProfileViewProps {
  user: UserProfile;
  onEdit: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onEdit }) => {
  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <div className="modal-header">
        <div>
          <p className="modal-header__eyebrow">PERFIL DEL CLIENTE</p>
          <h2 className="modal-header__title">{user.nombre}</h2>
        </div>
        <div className={`status-pill ${user.estado ? 'act-btn--view' : 'act-btn--delete'}`} style={{ padding: '5px 15px' }}>
          <span className="status-dot" style={{ backgroundColor: user.estado ? '#2e7d32' : '#c62828' }}></span>
          {user.estado ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      <div className="modal-body" style={{ textAlign: 'center' }}>
        {/* Foto de Perfil Redonda */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            margin: '0 auto', 
            border: '4px solid #c8e6c9', 
            overflow: 'hidden',
            background: '#e8f5e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px'
          }}>
            {user.fotoPerfil ? (
              <img src={user.fotoPerfil} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Documento / NIT</label>
            <div className="doc-badge">
              <span className="doc-type">ID</span>
              <span className="doc-num">{user.documento}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <p style={{ margin: '5px 0', fontSize: '15px', fontWeight: 600 }}>{user.correo}</p>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <div className="phone-cell">
                <span className="phone-icon">📞</span>
                {user.telefono}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>{user.direccion}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn-save" onClick={onEdit}>
          <span>✏️</span> Editar Información
        </button>
      </div>
    </div>
  );
};

export default ProfileView;
