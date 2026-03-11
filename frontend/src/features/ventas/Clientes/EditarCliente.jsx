import { useState, useRef, useEffect } from "react";
import "./clientes.css";

const DEPARTAMENTOS = ["Antioquia","Cundinamarca","Valle del Cauca","Atlántico","Santander","Bolívar","Nariño","Córdoba","Tolima","Cauca"];
const MUNICIPIOS = {
  "Antioquia":       ["Medellín","Bello","Itagüí","Envigado","Sabaneta"],
  "Cundinamarca":    ["Bogotá","Soacha","Chía","Zipaquirá","Facatativá"],
  "Valle del Cauca": ["Cali","Buenaventura","Palmira","Tuluá","Buga"],
  "Atlántico":       ["Barranquilla","Soledad","Malambo","Sabanalarga"],
  "Santander":       ["Bucaramanga","Floridablanca","Girón","Piedecuesta"],
  "Bolívar":         ["Cartagena","Magangué","Mompós"],
  "Nariño":          ["Pasto","Tumaco","Ipiales"],
  "Córdoba":         ["Montería","Cereté","Lorica"],
  "Tolima":          ["Ibagué","Espinal","Melgar"],
  "Cauca":           ["Popayán","Santander de Quilichao","Puerto Tejada"],
};

/* mode="edit" | mode="view" */
export default function EditarCliente({ cliente, mode="edit", onClose, onSave }) {
  const [form, setForm]     = useState({...cliente});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const fotoRef = useRef();
  const isView  = mode === "view";

  useEffect(()=>{ if(cliente) setForm({...cliente}); },[cliente]);

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:""})); };

  const handleFoto = e => {
    if(isView) return;
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if(!form.nombre.trim())    e.nombre    = "Requerido";
    if(!form.apellidos.trim()) e.apellidos = "Requerido";
    if(!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) e.correo = "Correo inválido";
    if(!form.telefono.trim())  e.telefono  = "Requerido";
    if(!form.departamento)     e.departamento = "Selecciona un departamento";
    if(!form.municipio)        e.municipio    = "Selecciona un municipio";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if(Object.keys(e).length){ setErrors(e); return; }
    setSaving(true);
    await new Promise(r=>setTimeout(r,500));
    onSave(form);
    setSaving(false);
  };

  const Field = ({k, label, type="text", ph="", full=false}) => (
    <div className="form-group" style={full?{gridColumn:"1 / -1"}:{}}>
      <label className="form-label">{label}</label>
      {isView
        ? <div className="field-input field-input--disabled">{form[k] || "—"}</div>
        : <>
            <input className={"field-input"+(errors[k]?" field-input--error":"")}
              type={type} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph}
              onFocus={e=>e.target.style.borderColor="#4caf50"}
              onBlur={e=>e.target.style.borderColor=errors[k]?"#e53935":"#e0e0e0"}/>
            {errors[k] && <p className="field-error">{errors[k]}</p>}
          </>
      }
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--cliente" onClick={e=>e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Clientes</p>
            <h2 className="modal-header__title">
              {isView ? `${form.nombre} ${form.apellidos}` : "Editar Cliente"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{maxHeight:"66vh",overflowY:"auto"}}>

          {/* Avatar */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div className="avatar-upload-wrap"
              style={{cursor:isView?"default":"pointer"}}
              onClick={()=>!isView&&fotoRef.current.click()}>
              {form.fotoPreview
                ? <img className="avatar-upload-img" src={form.fotoPreview} alt="avatar"/>
                : <div className="avatar-upload-placeholder">👤</div>}
              {!isView && <div className="avatar-upload-overlay">📷</div>}
            </div>
            <p style={{margin:0,fontSize:11,color:"#9e9e9e"}}>Foto de perfil</p>
            <input ref={fotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFoto}/>
          </div>

          <div className="form-grid-2">
            <Field k="nombre"    label="Nombre"    ph="Ej. Ana"/>
            <Field k="apellidos" label="Apellidos" ph="Ej. García López"/>
            <Field k="correo"    label="Correo electrónico" type="email" ph="correo@ejemplo.com" full/>

            <Field k="telefono"  label="Teléfono"  ph="Ej. 300 123 4567"/>

            {/* Estado */}
            <div className="form-group">
              <label className="form-label">Estado</label>
              <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:6}}>
                <button onClick={()=>!isView&&set("estado",!form.estado)} className="toggle-btn"
                  style={{background:form.estado?"#43a047":"#bdbdbd",boxShadow:form.estado?"0 2px 8px rgba(67,160,71,0.45)":"none",cursor:isView?"default":"pointer"}}>
                  <span className="toggle-thumb" style={{left:form.estado?27:3}}>
                    <span className="toggle-label">{form.estado?"ON":""}</span>
                  </span>
                </button>
                <span style={{fontSize:13,fontWeight:600,color:form.estado?"#2e7d32":"#9e9e9e"}}>
                  {form.estado?"Activo":"Inactivo"}
                </span>
              </div>
            </div>

            <Field k="direccion" label="Dirección" ph="Ej. Calle 50 # 40-20" full/>

            {/* Departamento */}
            <div className="form-group">
              <label className="form-label">Departamento</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.departamento||"—"}</div>
                : <>
                    <select className={"field-input"+(errors.departamento?" field-input--error":"")}
                      value={form.departamento||""}
                      onChange={e=>{set("departamento",e.target.value);set("municipio","");}}
                      style={{cursor:"pointer"}}>
                      <option value="">— Seleccionar —</option>
                      {DEPARTAMENTOS.map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.departamento && <p className="field-error">{errors.departamento}</p>}
                  </>
              }
            </div>

            {/* Municipio */}
            <div className="form-group">
              <label className="form-label">Municipio</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.municipio||"—"}</div>
                : <>
                    <select className={"field-input"+(errors.municipio?" field-input--error":"")}
                      value={form.municipio||""} onChange={e=>set("municipio",e.target.value)}
                      style={{cursor:"pointer"}} disabled={!form.departamento}>
                      <option value="">— Seleccionar —</option>
                      {(MUNICIPIOS[form.departamento]||[]).map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                    {errors.municipio && <p className="field-error">{errors.municipio}</p>}
                  </>
              }
            </div>

            {/* Nueva contraseña (solo en edit) */}
            {!isView && (
              <>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña <span style={{color:"#9e9e9e",fontWeight:400}}>(opcional)</span></label>
                  <div className="pass-wrap">
                    <input className="field-input" type={showPass?"text":"password"} style={{paddingRight:36}}
                      value={form.contrasena||""} onChange={e=>set("contrasena",e.target.value)}
                      placeholder="Dejar vacío para no cambiar"
                      onFocus={e=>e.target.style.borderColor="#4caf50"}
                      onBlur={e=>e.target.style.borderColor="#e0e0e0"}/>
                    <button className="pass-toggle-btn" onClick={()=>setShowPass(v=>!v)}>{showPass?"🙈":"👁"}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar contraseña</label>
                  <div className="pass-wrap">
                    <input className={"field-input"+(errors.confirmar?" field-input--error":"")}
                      type={showPass?"text":"password"} style={{paddingRight:36}}
                      value={form.confirmar||""} onChange={e=>set("confirmar",e.target.value)}
                      placeholder="Repetir contraseña"
                      onFocus={e=>e.target.style.borderColor="#4caf50"}
                      onBlur={e=>e.target.style.borderColor=errors.confirmar?"#e53935":"#e0e0e0"}/>
                    <button className="pass-toggle-btn" onClick={()=>setShowPass(v=>!v)}>{showPass?"🙈":"👁"}</button>
                  </div>
                  {errors.confirmar && <p className="field-error">{errors.confirmar}</p>}
                </div>
              </>
            )}

            {/* Fecha creación (view only) */}
            {isView && cliente?.fechaCreacion && (
              <div className="date-info" style={{gridColumn:"1 / -1"}}>
                <span>📅</span>
                <span>Cliente desde <strong>{cliente.fechaCreacion}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{isView?"Cerrar":"Cancelar"}</button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving && <span className="spinner">◌</span>}
              {saving?"Guardando…":"Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}