import { useState, useRef, useEffect } from 'react';
import FormularioDireccion from '../../../../shared/components/FormularioDireccion';
import {
  aPerfil, desdeTexto, direccionVacia, queFalta,
} from '../../../../utils/direccionEntrega';
import { Mail, Phone, MapPin, Camera, Save, X, CreditCard, Lock, Eye, EyeOff, KeyRound, Clock, User, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../../../utils/api';
import { soloDigitos } from '../../../../utils/inputFilters';
import { subirImagenCloudinary } from '../../../../utils/cloudinary.js';

const TIPO_DOC_OPTS = ['CC', 'CE', 'TI', 'NIT', 'PP'];

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
const disabledStyle = {
  ...inputBase,
  background: '#f5f5f5',
  color: '#9e9e9e',
  cursor: 'default',
  border: '1.5px solid #e0e0e0',
};

const focusOn  = e => { e.target.style.background = '#fff'; e.target.style.borderColor = 'var(--green-600)'; e.target.style.boxShadow = '0 0 0 4px rgba(42,157,71,.08)'; };
const focusOff = e => { e.target.style.background = 'var(--gray-100)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; };

const Field = ({ label, icon: Icon, error, children, locked }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.05em', color: 'var(--gray-500)',
      fontFamily: 'var(--font-body)', marginBottom: 6,
    }}>
      {Icon && <Icon size={11} />} {label}
      {locked && <Lock size={9} style={{ marginLeft: 2, opacity: 0.5 }} />}
    </label>
    {children}
    {error && (
      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--accent-red)', fontFamily: 'var(--font-body)' }}>
        {error}
      </p>
    )}
  </div>
);

const ProfileForm = ({ user, onSave, onCancel }) => {
  const fileRef = useRef(null);
  const [errors,          setErrors]          = useState({});
  const [loadingPerfil,   setLoadingPerfil]   = useState(true);
  const [perfil,          setPerfil]          = useState(null);
  const [showPassSection, setShowPassSection] = useState(false);
  const [passForm,        setPassForm]        = useState({ nueva: '', confirmar: '', showNueva: false, showConf: false });
  const [uploadingFoto,   setUploadingFoto]   = useState(false);

  /// La dirección del perfil, campo por campo. Antes era un renglón libre.
  const [direccion, setDireccion] = useState(direccionVacia());

  const [form, setForm] = useState({
    telefono:      '',
    direccion:     '',
    municipio:     '',
    departamento:  '',
    fotoPerfil:    '',
    cedula:        '',
    tipo_documento: '',
  });

  // Cargar perfil completo desde la API al abrir el formulario
  useEffect(() => {
    setLoadingPerfil(true);
    apiFetch('/auth/perfil')
      .then(data => {
        setPerfil(data);
        setForm({
          telefono:       data.Telefono      || '',
          direccion:      data.Direccion     || '',
          municipio:      data.Municipio     || '',
          departamento:   data.Departamento  || '',
          fotoPerfil:     data.Foto_perfil   || '',
          cedula:         data.Cedula        || '',
          tipo_documento: data.Tipo_Documento || '',
        });
        // Lo guardado es texto libre de antes: se intenta separar en sus
        // partes para no hacerle reescribir todo al cliente.
        setDireccion(desdeTexto(data.Direccion, {
          departamento: data.Departamento || 'Antioquia',
          municipio:    data.Municipio    || '',
          barrio:       data.Barrio       || '',
          indicaciones: data.Indicaciones || '',
        }));
      })
      .catch(() => {
        // Fallback a datos del prop si la API falla
        setForm({
          telefono:      user.telefono      || user.Telefono      || '',
          direccion:     user.direccion     || user.Direccion     || '',
          municipio:     user.municipio     || user.Municipio     || '',
          departamento:  user.departamento  || user.Departamento  || '',
          fotoPerfil:    user.fotoPerfil    || user.Foto_perfil   || '',
          cedula:        user.cedula        || user.Cedula        || '',
          tipo_documento: user.tipo_documento || user.Tipo_Documento || '',
        });
        setDireccion(desdeTexto(user.direccion || user.Direccion, {
          departamento: user.departamento || user.Departamento || 'Antioquia',
          municipio:    user.municipio    || user.Municipio    || '',
        }));
      })
      .finally(() => setLoadingPerfil(false));
  }, []);

  const set = (k) => (e) => {
    let val = e.target.value;
    if (k === 'cedula') val = soloDigitos(val);
    if (k === 'telefono') val = soloDigitos(val, 10);
    const newForm = { ...form, [k]: val };
    setForm(newForm);
    setErrors(p => {
      const n = { ...p };
      if (k === 'telefono') {
        if (val.trim() && val.replace(/\D/g, '').length !== 10) n.telefono = 'El teléfono debe tener 10 dígitos';
        else delete n.telefono;
      }
      if (k === 'tipo_documento') {
        if (!val && newForm.cedula.trim()) n.tipo_documento = 'Selecciona el tipo de documento';
        else delete n.tipo_documento;
      }
      if (k === 'cedula') {
        if (val.trim() && !newForm.tipo_documento) n.tipo_documento = 'Selecciona el tipo de documento';
        else delete n.tipo_documento;
      }
      return n;
    });
  };
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    if (file.size > 5 * 1024 * 1024) {
      setErrors(p => ({ ...p, fotoPerfil: 'Imagen muy pesada. Máximo 5MB.' }));
      return;
    }
    setErrors(p => { const n = { ...p }; delete n.fotoPerfil; return n; });
    setUploadingFoto(true);
    try {
      const url = await subirImagenCloudinary(file);
      setForm(p => ({ ...p, fotoPerfil: url }));
    } catch {
      setErrors(p => ({ ...p, fotoPerfil: 'Error al subir la imagen. Intenta de nuevo.' }));
    } finally {
      setUploadingFoto(false);
    }
  };

  const cedulaYaEstablecida = !!(perfil?.Cedula);

  const validate = () => {
    const e = {};
    if (form.telefono.trim() && form.telefono.replace(/\D/g, '').length !== 10)
      e.telefono = 'El teléfono debe tener 10 dígitos';

    // La dirección es opcional en el perfil —se puede guardar solo el
    // teléfono—, pero si se empezó a llenar tiene que quedar completa: media
    // dirección no sirve para entregar nada.
    const empezoDireccion = !!(
      direccion.municipio || direccion.barrio.trim() ||
      direccion.tipoVia || direccion.numero.trim() || direccion.numeral.trim()
    );
    if (empezoDireccion) {
      const falta = queFalta(direccion);
      if (falta) e.direccion = falta;
    }

    if (!cedulaYaEstablecida && form.cedula.trim() && !form.tipo_documento)
      e.tipo_documento = 'Selecciona el tipo de documento';

    if (showPassSection && passForm.nueva) {
      if (passForm.nueva.length < 8)
        e.passNueva = 'La contraseña debe tener al menos 8 caracteres';
      else if (passForm.nueva !== passForm.confirmar)
        e.passNueva = 'Las contraseñas no coinciden';
    }
    if (showPassSection && !passForm.nueva && passForm.confirmar)
      e.passNueva = 'Escribe la nueva contraseña';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    // La dirección viaja partida: la vía en Direccion —que en el servidor son
    // 50 caracteres— y el barrio, el complemento y las indicaciones en
    // Indicaciones, que es texto largo y es lo que lee quien entrega.
    // `Barrio` todavía no existe como columna; se manda igual porque el
    // esquema descarta lo que no conoce y el día que exista empieza a llegar.
    const partes = aPerfil(direccion);
    const payload = {
      Telefono: form.telefono || null,
      ...(queFalta(direccion) === null
        ? partes
        : { Direccion: null, Municipio: direccion.municipio || null }),
    };

    // La foto NO va acá: `PerfilUpdate` no la declara y el esquema la
    // descarta en silencio. Tiene su propio endpoint.
    const fotoNueva =
      form.fotoPerfil && form.fotoPerfil !== (perfil?.Foto_perfil || '')
        ? form.fotoPerfil
        : null;

    if (showPassSection && passForm.nueva)
      payload.Contrasena = passForm.nueva;

    // Solo enviar cédula si no estaba establecida y el usuario la llenó
    if (!cedulaYaEstablecida && form.cedula.trim()) {
      payload.Cedula         = form.cedula.trim();
      payload.Tipo_Documento = form.tipo_documento || null;
    }

    // Primero la foto: si falla, que el resto del perfil se guarde igual.
    if (fotoNueva) {
      await apiFetch('/auth/foto-perfil', {
        method: 'POST',
        body: JSON.stringify({ url: fotoNueva }),
      })
        .then(() => {
          // Que el encabezado la muestre sin recargar la página.
          try {
            const sesion = JSON.parse(localStorage.getItem('usuario') || '{}');
            localStorage.setItem('usuario', JSON.stringify({
              ...sesion, fotoPerfil: fotoNueva,
            }));
            window.dispatchEvent(new Event('profileUpdated'));
          } catch { /* el navegador puede tener el almacenamiento bloqueado */ }
        })
        .catch(() => {});
    }

    onSave(payload);
  };

  const correoMostrar = perfil?.Correo || user?.Correo || user?.correo || '';
  const nombreMostrar = perfil
    ? `${perfil.Nombre || ''} ${perfil.Apellidos || ''}`.trim()
    : `${user?.nombre || user?.Nombre || ''} ${user?.apellidos || user?.Apellidos || ''}`.trim();

  if (loadingPerfil) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Clock size={28} strokeWidth={1} style={{color:"#bdbdbd"}} /></div>
      <p style={{ fontWeight: 600 }}>Cargando datos del perfil…</p>
    </div>
  );

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
              : <User size={36} strokeWidth={1} style={{color:"#bdbdbd"}} />
            }
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--green-800)', border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Camera size={13} color="white" />
          </button>
          <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
      </div>
      {uploadingFoto && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-500)', marginBottom: 12, fontFamily: 'var(--font-body)' }}>
          Subiendo imagen…
        </p>
      )}
      {errors.fotoPerfil && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent-red)', marginBottom: 12, fontFamily: 'var(--font-body)' }}>
          {errors.fotoPerfil}
        </p>
      )}

      {/* Nombre — solo lectura */}
      <Field label="Nombre completo" locked>
        <input value={nombreMostrar} readOnly style={disabledStyle} />
      </Field>

      {/* Correo — solo lectura, muestra el correo real */}
      <Field label="Correo electrónico" icon={Mail} locked>
        <input
          type="email"
          value={correoMostrar}
          readOnly
          style={disabledStyle}
          title="El correo no puede modificarse desde aquí"
          data-tooltip="El correo no puede modificarse desde aquí"
        />
      </Field>

      {/* Número de documento — editable solo primera vez */}
      <Field
        label={cedulaYaEstablecida ? "Número de documento" : "Número de documento (primera vez)"}
        icon={CreditCard}
        locked={cedulaYaEstablecida}
        error={errors.cedula}
      >
        {cedulaYaEstablecida ? (
          <input value={form.cedula} readOnly style={disabledStyle} title="El número de documento no puede modificarse una vez establecido" data-tooltip="El documento no puede modificarse una vez establecido" />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, marginBottom: errors.tipo_documento ? 0 : 0 }}>
              <select
                value={form.tipo_documento}
                onChange={set('tipo_documento')}
                style={{ ...inputBase, cursor: 'pointer' }}
                onFocus={focusOn} onBlur={focusOff}
              >
                <option value="">Tipo</option>
                {TIPO_DOC_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={form.cedula}
                onChange={set('cedula')}
                placeholder="Ej: 1234567890"
                style={inputBase}
                onFocus={focusOn} onBlur={focusOff}
              />
            </div>
            {errors.tipo_documento && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--accent-red)' }}>{errors.tipo_documento}</p>
            )}
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f57f17', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={11} /> Solo puedes establecerlo una vez. Verifica bien antes de guardar.
            </p>
          </>
        )}
      </Field>

      {/* Teléfono */}
      <Field label="Teléfono" icon={Phone} error={errors.telefono}>
        <input type="tel" value={form.telefono} onChange={set('telefono')}
          placeholder="300 123 4567" style={inputBase} onFocus={focusOn} onBlur={focusOff} />
      </Field>

      {/* Dirección de entrega, campo por campo. Era un renglón de texto libre
          donde cada quien escribía como podía, y el barrio —de lo que va a
          depender el costo del domicilio— quedaba enterrado en la frase. */}
      <div style={{
        borderTop: '1px solid #eef2f0', paddingTop: 16, marginBottom: 4,
      }}>
        <p style={{
          margin: '0 0 12px', fontSize: 11, fontWeight: 800,
          letterSpacing: '.05em', textTransform: 'uppercase',
          color: 'var(--gray-500)', fontFamily: 'var(--font-body)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <MapPin size={11} /> ¿Dónde quieres recibir tus pedidos?
        </p>
        <FormularioDireccion
          valor={direccion}
          onCambio={(d) => {
            setDireccion(d);
            setErrors(p => { const n = { ...p }; delete n.direccion; return n; });
          }}
        />
        {errors.direccion && (
          <p style={{
            margin: '-8px 0 16px', fontSize: 11,
            color: 'var(--accent-red)', fontFamily: 'var(--font-body)',
          }}>{errors.direccion}</p>
        )}
      </div>

      {/* Cambio de contraseña */}
      <div style={{ marginBottom: 16, borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => { setShowPassSection(v => !v); setPassForm({ nueva: '', confirmar: '', showNueva: false, showConf: false }); setErrors(p => { const n = { ...p }; delete n.passNueva; return n; }); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '11px 14px', border: 'none', cursor: 'pointer',
            background: showPassSection ? '#f0fdf4' : '#f8fafc',
            color: showPassSection ? 'var(--green-700)' : 'var(--gray-600)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <KeyRound size={13} /> {showPassSection ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
          </span>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{showPassSection ? '▲' : '▼'}</span>
        </button>

        {showPassSection && (
          <div style={{ padding: '12px 14px 4px', borderTop: '1px solid #e2e8f0', background: '#fafdf9' }}>
            <Field label="Nueva contraseña" icon={Lock} error={errors.passNueva}>
              <div style={{ position: 'relative' }}>
                <input
                  type={passForm.showNueva ? 'text' : 'password'}
                  value={passForm.nueva}
                  onChange={e => {
                    const val = e.target.value;
                    setPassForm(p => ({ ...p, nueva: val }));
                    setErrors(p => {
                      const n = { ...p };
                      if (val && val.length < 8) n.passNueva = 'La contraseña debe tener al menos 8 caracteres';
                      else if (val && passForm.confirmar && val !== passForm.confirmar) n.passNueva = 'Las contraseñas no coinciden';
                      else delete n.passNueva;
                      return n;
                    });
                  }}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...inputBase, paddingRight: 40 }}
                  onFocus={focusOn} onBlur={focusOff}
                />
                <button type="button" onClick={() => setPassForm(p => ({ ...p, showNueva: !p.showNueva }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: 0 }}>
                  {passForm.showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar contraseña" icon={Lock}>
              <div style={{ position: 'relative' }}>
                <input
                  type={passForm.showConf ? 'text' : 'password'}
                  value={passForm.confirmar}
                  onChange={e => {
                    const val = e.target.value;
                    setPassForm(p => ({ ...p, confirmar: val }));
                    setErrors(p => {
                      const n = { ...p };
                      if (val && passForm.nueva && val !== passForm.nueva) n.passNueva = 'Las contraseñas no coinciden';
                      else if (!passForm.nueva || passForm.nueva.length >= 8) delete n.passNueva;
                      return n;
                    });
                  }}
                  placeholder="Repite la nueva contraseña"
                  style={{ ...inputBase, paddingRight: 40 }}
                  onFocus={focusOn} onBlur={focusOff}
                />
                <button type="button" onClick={() => setPassForm(p => ({ ...p, showConf: !p.showConf }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', padding: 0 }}>
                  {passForm.showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
          <X size={15} /> Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={uploadingFoto} style={{ flex: 2, justifyContent: 'center' }}>
          <Save size={15} /> {uploadingFoto ? 'Subiendo imagen…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
