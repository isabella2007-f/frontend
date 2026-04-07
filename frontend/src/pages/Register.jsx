import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/userService';
import { TIPO_DOC, validatePassword } from '../features/configuracion/Usuarios/usuariosUtils.js';
import {
  User, Mail, Lock, Phone, MapPin, CreditCard,
  ChevronRight, ChevronLeft, Eye, EyeOff, Check, Leaf, Camera, XCircle
} from 'lucide-react';
import './Auth.css';

// ── Pasos ───────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Identidad', icon: CreditCard },
  { id: 2, label: 'Contacto',  icon: Phone      },
  { id: 3, label: 'Ubicación', icon: MapPin     },
  { id: 4, label: 'Seguridad', icon: Lock       },
];

// ── Estilos base reutilizables ───────────────────────
const inputBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px',
  background: '#f3f4f6',
  border: '1.5px solid transparent',
  borderRadius: 12,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14, fontWeight: 500,
  color: '#1a1a1a', outline: 'none',
  transition: 'all .2s',
};

const focusOn  = e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#2a9d47'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; };
const focusOff = e => { e.target.style.background = '#f3f4f6'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; };

// ── Campo wrapper ────────────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.05em', color: '#3d3d3d',
      fontFamily: "'DM Sans', sans-serif", marginBottom: 6,
    }}>
      {Icon && <Icon size={12} />} {label}
    </label>
    {children}
    {error && (
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626', fontFamily: "'DM Sans', sans-serif" }}>
        {error}
      </p>
    )}
  </div>
);

// ── Input genérico ───────────────────────────────────
const InputField = ({ type = 'text', placeholder, value, onChange, style = {} }) => (
  <input
    type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ ...inputBase, ...style }}
    onFocus={focusOn} onBlur={focusOff}
  />
);

// ── Photo Uploader Reusable ──────────────────────────
const PhotoUploader = ({ foto, onFoto }) => {
  const fileRef = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onFoto(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {foto ? (
          <img src={foto} alt="avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2a9d47' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', border: '2px dashed #d1d5db' }}>
            <User size={32} />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          style={{ position: 'absolute', bottom: 0, right: 0, background: '#2a9d47', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          <Camera size={14} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: "'DM Sans', sans-serif" }}>Foto de perfil</span>
      {foto && (
        <button
          type="button"
          onClick={() => onFoto(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          <XCircle size={12} /> Quitar
        </button>
      )}
    </div>
  );
};

// ── API Colombia — Departamento / Municipio ──────────
const LocationSelects = ({ departamento, municipio, onDepto, onMunicipio, errDepto, errMunicipio }) => {
  const [deptos,     setDeptos]     = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingD,   setLoadingD]   = useState(false);
  const [loadingM,   setLoadingM]   = useState(false);

  useEffect(() => {
    setLoadingD(true);
    fetch('https://api-colombia.com/api/v1/Department')
      .then(r => r.json())
      .then(data => setDeptos(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, []);

  useEffect(() => {
    if (!departamento) { setMunicipios([]); onMunicipio(''); return; }
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    setLoadingM(true);
    onMunicipio('');
    fetch(`https://api-colombia.com/api/v1/Department/${found.id}/cities`)
      .then(r => r.json())
      .then(data => setMunicipios(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
      .finally(() => setLoadingM(false));
  }, [departamento, deptos]);

  const selStyle = { ...inputBase, cursor: 'pointer' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="Departamento" icon={MapPin} error={errDepto}>
        <select
          value={departamento || ''} onChange={e => onDepto(e.target.value)}
          disabled={loadingD} style={{ ...selStyle, opacity: loadingD ? .6 : 1 }}
          onFocus={focusOn} onBlur={focusOff}
        >
          <option value="">{loadingD ? 'Cargando…' : '— Seleccionar —'}</option>
          {deptos.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </Field>

      <Field label="Municipio" icon={MapPin} error={errMunicipio}>
        <select
          value={municipio || ''} onChange={e => onMunicipio(e.target.value)}
          disabled={!departamento || loadingM}
          style={{ ...selStyle, opacity: (!departamento || loadingM) ? .5 : 1 }}
          onFocus={focusOn} onBlur={focusOff}
        >
          <option value="">
            {!departamento ? 'Selecciona depto…' : loadingM ? 'Cargando…' : '— Seleccionar —'}
          </option>
          {municipios.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
        </select>
      </Field>
    </div>
  );
};

// ── Register principal ───────────────────────────────
const Register = () => {
  const navigate = useNavigate();
  const [step,     setStep]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [form, setForm] = useState({
    foto: null,
    nombre: '', apellidos: '', tipoDocumento: 'CC', cedula: '',
    correo: '', telefono: '',
    direccion: '', municipio: '', departamento: '',
    password: '', confirmar: '',
  });

  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };
  const setVal = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  // ── Validación por paso ──
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.nombre.trim())    e.nombre    = 'Campo obligatorio';
      if (!form.apellidos.trim()) e.apellidos = 'Campo obligatorio';
      if (!form.cedula.trim())    e.cedula    = 'Campo obligatorio';
    }
    if (step === 2) {
      if (!form.correo.trim())   e.correo   = 'Campo obligatorio';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Formato inválido';
      if (!form.telefono.trim()) e.telefono = 'Campo obligatorio';
    }
    if (step === 3) {
      if (!form.direccion.trim()) e.direccion = 'Campo obligatorio';
      if (!form.departamento)     e.departamento = 'Selecciona un departamento';
      if (!form.municipio)        e.municipio    = 'Selecciona un municipio';
    }
    if (step === 4) {
      const passError = validatePassword(form.password, form.confirmar);
      if (passError) e.password = passError;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser({
        foto: form.foto,
        nombre: form.nombre, apellidos: form.apellidos,
        tipoDocumento: form.tipoDocumento, cedula: form.cedula,
        correo: form.correo, telefono: form.telefono,
        direccion: form.direccion, municipio: form.municipio,
        departamento: form.departamento, password: form.password,
        rol: 'Cliente' // Por defecto al registrarse
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />

        <div className="auth-card auth-card--wide">
          <div className="auth-topbar" />

          {/* Brand */}
          <div className="auth-brand" style={{ marginBottom: 24 }}>
            <div className="auth-brand-icon">
              <Leaf size={22} color="#2a9d47" />
            </div>
            <h1 className="auth-brand-name">Crear cuenta</h1>
            <p className="auth-brand-sub">Únete a la familia Tostón</p>
          </div>

          {/* Stepper */}
          <div style={{ padding: '0 32px', marginBottom: 28 }}>
            <div style={{ position: 'relative', height: 4, background: '#e5e7eb', borderRadius: 99, marginBottom: 16 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #1a5c2a, #2a9d47)',
                borderRadius: 99, transition: 'width .4s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {STEPS.map(s => {
                const StepIcon = s.icon;
                const done   = step > s.id;
                const active = step === s.id;
                return (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? '#1a5c2a' : active ? '#e8f5ec' : '#f3f4f6',
                      border: active ? '2px solid #2a9d47' : '2px solid transparent',
                      transition: 'all .3s',
                    }}>
                      {done
                        ? <Check size={14} color="white" strokeWidth={3} />
                        : <StepIcon size={14} color={active ? '#1a5c2a' : '#9ca3af'} />
                      }
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: active ? 700 : 500,
                      color: active ? '#1a5c2a' : '#9ca3af',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error global */}
          {errors.global && (
            <div style={{ padding: '0 32px', marginBottom: 16 }}>
              <div style={{
                background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              }}>⚠️ {errors.global}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" style={{ paddingBottom: 24 }}>

            {/* ── PASO 1: Identidad ── */}
            {step === 1 && (
              <div>
                <PhotoUploader foto={form.foto} onFoto={v => setVal('foto', v)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Nombre(s)" icon={User} error={errors.nombre}>
                    <InputField placeholder="Carlos" value={form.nombre} onChange={set('nombre')} />
                  </Field>
                  <Field label="Apellidos" icon={User} error={errors.apellidos}>
                    <InputField placeholder="Pérez García" value={form.apellidos} onChange={set('apellidos')} />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
                  <Field label="Tipo Doc.">
                    <select
                      value={form.tipoDocumento} onChange={set('tipoDocumento')}
                      style={{ ...inputBase, cursor: 'pointer' }}
                      onFocus={focusOn} onBlur={focusOff}
                    >
                      {TIPO_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="N° Documento" icon={CreditCard} error={errors.cedula}>
                    <InputField placeholder="1234567890" value={form.cedula} onChange={set('cedula')} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── PASO 2: Contacto ── */}
            {step === 2 && (
              <div>
                <Field label="Correo electrónico" icon={Mail} error={errors.correo}>
                  <InputField type="email" placeholder="tu@correo.com" value={form.correo} onChange={set('correo')} />
                </Field>
                <Field label="Teléfono" icon={Phone} error={errors.telefono}>
                  <InputField type="tel" placeholder="300 123 4567" value={form.telefono} onChange={set('telefono')} />
                </Field>
              </div>
            )}

            {/* ── PASO 3: Ubicación ── */}
            {step === 3 && (
              <div>
                <Field label="Dirección" icon={MapPin} error={errors.direccion}>
                  <InputField placeholder="Calle 45 # 32-10" value={form.direccion} onChange={set('direccion')} />
                </Field>
                <LocationSelects
                  departamento={form.departamento}
                  municipio={form.municipio}
                  onDepto={v  => { setVal('departamento', v); setVal('municipio', ''); }}
                  onMunicipio={v => setVal('municipio', v)}
                  errDepto={errors.departamento}
                  errMunicipio={errors.municipio}
                />
              </div>
            )}

            {/* ── PASO 4: Seguridad ── */}
            {step === 4 && (
              <div>
                <Field label="Contraseña" icon={Lock} error={errors.password}>
                  <div style={{ position: 'relative' }}>
                    <InputField
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password} onChange={set('password')}
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4,
                    }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirmar contraseña" icon={Lock} error={errors.confirmar}>
                  <div style={{ position: 'relative' }}>
                    <InputField
                      type={showConf ? 'text' : 'password'}
                      placeholder="Repite tu contraseña"
                      value={form.confirmar} onChange={set('confirmar')}
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4,
                    }}>
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                {form.confirmar && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, marginBottom: 16,
                    color: form.password === form.confirmar ? '#166534' : '#991b1b',
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {form.password === form.confirmar
                      ? <><Check size={13} /> Las contraseñas coinciden</>
                      : <>✗ Las contraseñas no coinciden</>
                    }
                  </div>
                )}
              </div>
            )}

            {/* ── Navegación ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {step > 1 && (
                <button type="button" onClick={back} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '13px 20px', borderRadius: 12,
                  background: '#f3f4f6', border: 'none',
                  color: '#3d3d3d', fontWeight: 700, fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  transition: 'background .18s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
                >
                  <ChevronLeft size={16} /> Atrás
                </button>
              )}

              {step < 4 ? (
                <button type="button" onClick={next} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #1a5c2a, #2a9d47)',
                  border: 'none', color: 'white', fontWeight: 700, fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(26,92,42,.25)', transition: 'opacity .18s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" disabled={loading} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px', borderRadius: 12,
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1a5c2a, #2a9d47)',
                  border: 'none', color: 'white', fontWeight: 700, fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(26,92,42,.25)',
                }}>
                  {loading ? <span className="auth-spinner" /> : <><Check size={16} /> Crear mi cuenta</>}
                </button>
              )}
            </div>
          </form>

          <p className="auth-switch" style={{ marginTop: 20 }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-switch-link">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;