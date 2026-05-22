import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { User, Mail, Lock, Eye, EyeOff, Check, Leaf, ChevronRight } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [form, setForm] = useState({
    Nombre:               '',
    Apellidos:            '',
    Correo:               '',
    Contrasena:           '',
    Confirmar_contrasena: '',
  });

  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = () => {
    const e = {};
    if (!form.Nombre.trim())    e.Nombre    = 'El nombre es obligatorio';
    if (!form.Apellidos.trim()) e.Apellidos = 'Los apellidos son obligatorios';
    if (!form.Correo.trim())    e.Correo    = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Correo)) e.Correo = 'Formato de correo inválido';
    if (!form.Contrasena)       e.Contrasena = 'La contraseña es obligatoria';
    else if (form.Contrasena.length < 8) e.Contrasena = 'Mínimo 8 caracteres';
    if (form.Contrasena !== form.Confirmar_contrasena) e.Confirmar_contrasena = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await apiFetch('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          Nombre:               form.Nombre,
          Apellidos:            form.Apellidos,
          Correo:               form.Correo,
          Contrasena:           form.Contrasena,
          Confirmar_contrasena: form.Confirmar_contrasena,
        }),
      });

      // Guardar sesión igual que en login
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario', JSON.stringify({
        id:        data.cedula,
        nombre:    data.nombre,
        apellidos: data.apellidos,
        tipo:      data.tipo,
        rol:       data.rol,
      }));

      navigate('/'); // cliente va a la landing
    } catch (err) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />

        <div className="auth-card">
          <div className="auth-topbar" />

          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Leaf size={22} color="#2a9d47" />
            </div>
            <h1 className="auth-brand-name">Crear cuenta</h1>
            <p className="auth-brand-sub">Únete a la familia Tostón</p>
          </div>

          {/* Error global */}
          {errors.global && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Nombre */}
            <div className="auth-field">
              <label className="auth-label"><User size={11} /> Nombre(s)</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><User size={14} /></span>
                <input
                  type="text" placeholder="Carlos"
                  className="auth-input" value={form.Nombre}
                  onChange={set('Nombre')}
                />
              </div>
              {errors.Nombre && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.Nombre}</p>}
            </div>

            {/* Apellidos */}
            <div className="auth-field">
              <label className="auth-label"><User size={11} /> Apellidos</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><User size={14} /></span>
                <input
                  type="text" placeholder="Pérez García"
                  className="auth-input" value={form.Apellidos}
                  onChange={set('Apellidos')}
                />
              </div>
              {errors.Apellidos && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.Apellidos}</p>}
            </div>

            {/* Correo */}
            <div className="auth-field">
              <label className="auth-label"><Mail size={11} /> Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Mail size={14} /></span>
                <input
                  type="email" placeholder="tu@correo.com"
                  className="auth-input" value={form.Correo}
                  onChange={set('Correo')}
                />
              </div>
              {errors.Correo && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.Correo}</p>}
            </div>

            {/* Contraseña */}
            <div className="auth-field">
              <label className="auth-label"><Lock size={11} /> Contraseña</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={14} /></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="auth-input" value={form.Contrasena}
                  onChange={set('Contrasena')}
                />
                <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.Contrasena && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.Contrasena}</p>}
            </div>

            {/* Confirmar contraseña */}
            <div className="auth-field">
              <label className="auth-label"><Lock size={11} /> Confirmar contraseña</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><Lock size={14} /></span>
                <input
                  type={showConf ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  className="auth-input" value={form.Confirmar_contrasena}
                  onChange={set('Confirmar_contrasena')}
                />
                <button type="button" className="auth-eye" onClick={() => setShowConf(v => !v)} tabIndex={-1}>
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.Confirmar_contrasena && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626' }}>{errors.Confirmar_contrasena}</p>}
              {form.Confirmar_contrasena && (
                <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: form.Contrasena === form.Confirmar_contrasena ? '#166534' : '#991b1b' }}>
                  {form.Contrasena === form.Confirmar_contrasena ? <><Check size={12} /> Las contraseñas coinciden</> : '✗ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : <> Crear mi cuenta <ChevronRight size={18} /> </>}
            </button>

          </form>

          <p className="auth-switch">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-switch-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;