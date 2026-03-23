// src/features/client/profile/components/ProfileForm.tsx
import React, { useState, useRef } from 'react';
import { UserProfile, validateEmail } from '../services/profileService';

interface ProfileFormProps {
  user: UserProfile;
  onSave: (updatedData: Partial<UserProfile>) => void;
  onCancel: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    correo: user.correo,
    telefono: user.telefono,
    direccion: user.direccion,
    fotoPerfil: user.fotoPerfil || '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Límite 1MB para LocalStorage
        alert("La imagen es muy pesada. Máximo 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, fotoPerfil: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.correo) newErrors.correo = 'El correo es obligatorio';
    else if (!validateEmail(formData.correo)) newErrors.correo = 'Formato inválido';
    if (!formData.telefono) newErrors.telefono = 'El teléfono es obligatorio';
    if (!formData.direccion) newErrors.direccion = 'La dirección es obligatoria';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', animation: 'slideUp 0.3s ease' }}>
      <div className="modal-header">
        <h2 className="modal-header__title">Actualizar Perfil</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* Selector de Foto */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                margin: '0 auto', 
                cursor: 'pointer',
                position: 'relative',
                border: '3px dashed #4caf50',
                background: '#f9fdf9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {formData.fotoPerfil ? (
                <img src={formData.fotoPerfil} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '30px' }}>📷</span>
              )}
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                width: '100%', 
                background: 'rgba(46,125,50,0.7)', 
                color: 'white', 
                fontSize: '10px', 
                padding: '2px 0' 
              }}>Cambiar</div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <p style={{ fontSize: '11px', color: '#757575', marginTop: '8px' }}>Haz clic para subir foto</p>
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              name="correo"
              className={`field-input ${errors.correo ? 'field-input--error' : ''}`}
              value={formData.correo}
              onChange={handleChange}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                name="telefono"
                className={`field-input ${errors.telefono ? 'field-input--error' : ''}`}
                value={formData.telefono}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                name="direccion"
                className={`field-input ${errors.direccion ? 'field-input--error' : ''}`}
                value={formData.direccion}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-save">💾 Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
