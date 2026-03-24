import { useState, useEffect, useRef } from 'react';
import { Mail, Phone, MapPin, Camera, Save, X } from 'lucide-react';

const inputBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px',
  background: 'var(--gray-100)',
  border: '1.5px solid transparent',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: 14, fontWeight: 500,
  color: 'var(--gray-900)', outline: 'none',
  transition: 'all .2s',
};

const focusOn  = e => { e.target.style.background = '#fff'; e.target.style.borderColor = 'var(--green-600)'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; };
const focusOff = e => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; };

// ── Campo wrapper ────────────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.05em', color: 'var(--gray-500)',
      fontFamily: 'var(--font-body)', marginBottom: 6,
    }}>
      {Icon && <Icon size={11} />} {label}
    </label>
    {children}
    {error && (
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--accent-red)', fontFamily: 'var(--font-body)' }}>
        {error}
      </p>
    )}
  </div>
);

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
    if (!departamento) { setMunicipios([]); return; }
    const found = deptos.find(d => d.name === departamento);
    if (!found) return;
    setLoadingM(true);
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

// ── ProfileForm principal ────────────────────────────
const ProfileForm = ({ user, onSave, onCancel }) => {
  const fileRef = useRef(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    correo:       user.correo       || '',
    telefono:     user.telefono     || '',
    direccion:    user.direccion    || '',
    municipio:    user.municipio    || '',
    departamento: user.departamento || '',
    fotoPerfil:   user.fotoPerfil   || '',
  });

  const set = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };
  const setVal = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert('Imagen muy pesada. Máximo 1MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(p => ({ ...p, fotoPerfil: reader.result }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.correo.trim())   e.correo   = 'Campo obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Formato inválido';
    if (!form.telefono.trim()) e.telefono = 'Campo obligatorio';
    if (!form.direccion.trim()) e.direccion = 'Campo obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* Foto */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              border: '3px dashed var(--green-400)',
              background: 'var(--green-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: 'pointer', fontSize: 36,
            }}
          >
            {form.fotoPerfil
              ? <img src={form.fotoPerfil} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '👤'
            }
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--green-800)', border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <Camera size={13} color="white" />
          </button>
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
      </div>

      {/* Aviso readonly */}
      <div style={{
        background: 'var(--gray-100)', borderRadius: 'var(--radius-md)',
        padding: '10px 14px', marginBottom: 16,
        fontSize: 12, color: 'var(--gray-500)', fontFamily: 'var(--font-body)',
      }}>
        ℹ️ El nombre y número de documento no pueden modificarse.
      </div>

      <Field label="Correo electrónico" icon={Mail} error={errors.correo}>
        <input type="email" value={form.correo} onChange={set('correo')}
          style={inputBase} onFocus={focusOn} onBlur={focusOff} />
      </Field>

      <Field label="Teléfono" icon={Phone} error={errors.telefono}>
        <input type="tel" value={form.telefono} onChange={set('telefono')}
          placeholder="300 123 4567" style={inputBase} onFocus={focusOn} onBlur={focusOff} />
      </Field>

      <Field label="Dirección" icon={MapPin} error={errors.direccion}>
        <input type="text" value={form.direccion} onChange={set('direccion')}
          placeholder="Calle 45 # 32-10" style={inputBase} onFocus={focusOn} onBlur={focusOff} />
      </Field>

      <LocationSelects
        departamento={form.departamento}
        municipio={form.municipio}
        onDepto={v  => { setVal('departamento', v); setVal('municipio', ''); }}
        onMunicipio={v => setVal('municipio', v)}
      />

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
          <X size={15} /> Cancelar
        </button>
        <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
          <Save size={15} /> Guardar cambios
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;