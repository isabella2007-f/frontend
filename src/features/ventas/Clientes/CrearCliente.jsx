import { useState, useRef, useEffect } from "react";
import "./clientes.css";


/* ===============================
   SELECT DEPARTAMENTO / MUNICIPIO
================================ */

function LocationSelects({
  departamento,
  municipio,
  onDepto,
  onMunicipio,
  errDepto,
  errMunicipio
}) {

  const [deptos, setDeptos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingM, setLoadingM] = useState(false);


  /* Cargar departamentos */

  useEffect(() => {

    const cargarDeptos = async () => {

      try {

        setLoadingD(true);

        const res = await fetch("https://api-colombia.com/api/v1/Department");
        const data = await res.json();

        const ordenados = data.sort((a,b)=>
          a.name.localeCompare(b.name)
        );

        setDeptos(ordenados);

      } catch (error) {
        console.log("Error cargando departamentos", error);
      }

      setLoadingD(false);
    };

    cargarDeptos();

  }, []);



  /* Cargar municipios */

  useEffect(() => {

    const cargarMunicipios = async () => {

      if(!departamento){
        setMunicipios([]);
        onMunicipio("");
        return;
      }

      const depto = deptos.find(d => d.name === departamento);

      if(!depto) return;

      try {

        setLoadingM(true);
        onMunicipio("");

        const res = await fetch(
          `https://api-colombia.com/api/v1/Department/${depto.id}/cities`
        );

        const data = await res.json();

        const ordenados = data.sort((a,b)=>
          a.name.localeCompare(b.name)
        );

        setMunicipios(ordenados);

      } catch (error) {
        console.log("Error cargando municipios", error);
      }

      setLoadingM(false);
    };

    cargarMunicipios();

  }, [departamento, deptos]);


  return (

    <div className="field-grid-2">

      {/* Departamento */}

      <div className="field-wrap">

        <label className="field-label">
          Departamento <span className="required">*</span>
        </label>

        <div className="select-wrap">

          <select
            required
            value={departamento}
            onChange={e => onDepto(e.target.value)}
            className={`field-select${errDepto ? " error" : ""}`}
            disabled={loadingD}
          >

            <option value="">
              {loadingD ? "Cargando..." : "Seleccione..."}
            </option>

            {deptos.map(d => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}

          </select>

        </div>

        {errDepto && <span className="field-error">{errDepto}</span>}

      </div>



      {/* Municipio */}

      <div className="field-wrap">

        <label className="field-label">
          Municipio <span className="required">*</span>
        </label>

        <div className="select-wrap">

          <select
            required
            value={municipio}
            onChange={e => onMunicipio(e.target.value)}
            className={`field-select${errMunicipio ? " error" : ""}`}
            disabled={!departamento || loadingM}
          >

            <option value="">
              {!departamento
                ? "Seleccione depto..."
                : loadingM
                ? "Cargando..."
                : "Seleccione..."
              }
            </option>

            {municipios.map(m => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}

          </select>

        </div>

        {errMunicipio && (
          <span className="field-error">{errMunicipio}</span>
        )}

      </div>

    </div>
  );
}



/* ===============================
   COMPONENTE CREAR CLIENTE
================================ */

export default function CrearCliente({ onClose, onSave }) {

  const [form, setForm] = useState({
    nombre:"",
    apellidos:"",
    correo:"",
    telefono:"",
    direccion:"",
    departamento:"",
    municipio:"",
    contrasena:"",
    confirmar:"",
    estado:true,
    fotoPreview:null
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const fotoRef = useRef();



  const set = (k,v) => {
    setForm(p => ({...p,[k]:v}));
    setErrors(p => ({...p,[k]:""}));
  };



  const handleFoto = e => {

    const file = e.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = ev => set("fotoPreview", ev.target.result);

    reader.readAsDataURL(file);
  };



  const validate = () => {

    const e = {};

    if(!form.nombre.trim()) e.nombre = "Requerido";
    if(!form.apellidos.trim()) e.apellidos = "Requerido";

    if(!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo))
      e.correo = "Correo inválido";

    if(!form.telefono.trim()) e.telefono = "Requerido";

    if(!form.departamento)
      e.departamento = "Selecciona un departamento";

    if(!form.municipio)
      e.municipio = "Selecciona un municipio";

    if(form.contrasena.length < 6)
      e.contrasena = "Mínimo 6 caracteres";

    if(form.contrasena !== form.confirmar)
      e.confirmar = "No coinciden";

    return e;
  };



  const handleSave = async () => {

    const e = validate();

    if(Object.keys(e).length){
      setErrors(e);
      return;
    }

    setSaving(true);

    await new Promise(r=>setTimeout(r,500));

    const {confirmar,...data} = form;

    onSave({
      ...data,
      id:Date.now(),
      fechaCreacion:new Date().toLocaleDateString("es-CO")
    });

    setSaving(false);
  };



  /* ===============================
     INPUT REUTILIZABLE
  ================================ */

  const fi = (k,label,type="text",ph="",extra={},required=true) => (

    <div className="form-group" style={extra.full ? {gridColumn:"1 / -1"} : {}}>

      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>

      <input
        required={required}
        className={"field-input"+(errors[k]?" field-input--error":"")}
        type={type}
        value={form[k]}
        onChange={e=>set(k,e.target.value)}
        placeholder={ph}
      />

      {errors[k] && <p className="field-error">{errors[k]}</p>}

    </div>
  );



  return (

    <div className="modal-overlay" onClick={onClose}>

      <div className="modal-box modal-box--cliente" onClick={e=>e.stopPropagation()}>

        {/* HEADER */}

        <div className="modal-header">

          <div>
            <p className="modal-header__eyebrow">Clientes</p>
            <h2 className="modal-header__title">Nuevo Cliente</h2>
          </div>

          <button className="modal-close-btn" onClick={onClose}>✕</button>

        </div>



        {/* BODY */}

        <div className="modal-body" style={{maxHeight:"66vh",overflowY:"auto"}}>


          {/* FOTO PERFIL */}

          <div style={{textAlign:"center",marginBottom:20}}>

            <div className="avatar-upload-wrap" onClick={()=>fotoRef.current.click()}>

              {form.fotoPreview
                ? <img className="avatar-upload-img" src={form.fotoPreview} alt="avatar"/>
                : <div className="avatar-upload-placeholder">👤</div>}

              <div className="avatar-upload-overlay">📷</div>

            </div>

            <p style={{margin:0,fontSize:11,color:"#9e9e9e"}}>
              Foto de perfil
            </p>

            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              style={{display:"none"}}
              onChange={handleFoto}
            />

          </div>



          {/* FORMULARIO */}

          <div className="form-grid-2">

            {fi("nombre","Nombre","text","Ej. Ana")}
            {fi("apellidos","Apellidos","text","Ej. García López")}

            {fi("correo","Correo electrónico","email","correo@ejemplo.com",{full:true})}

            {fi("telefono","Teléfono","text","Ej. 300 123 4567")}

            {fi("direccion","Dirección","text","Ej: Cra 5 #12-34, Apto 201",{full:true})}


            <LocationSelects
              departamento={form.departamento}
              municipio={form.municipio}
              onDepto={v => set("departamento", v)}
              onMunicipio={v => set("municipio", v)}
              errDepto={errors.departamento}
              errMunicipio={errors.municipio}
            />


            {/* CONTRASEÑA */}

            <div className="form-group">

              <label className="form-label">
                Contraseña <span className="required">*</span>
              </label>

              <div className="pass-wrap">

                <input
                  required
                  className={"field-input"+(errors.contrasena?" field-input--error":"")}
                  type={showPass?"text":"password"}
                  value={form.contrasena}
                  onChange={e=>set("contrasena",e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />

                <button
                  type="button"
                  className="pass-toggle-btn"
                  onClick={()=>setShowPass(v=>!v)}
                >
                  {showPass?"🙈":"👁"}
                </button>

              </div>

              {errors.contrasena && <p className="field-error">{errors.contrasena}</p>}

            </div>



            {/* CONFIRMAR */}

            <div className="form-group">

              <label className="form-label">
                Confirmar contraseña <span className="required">*</span>
              </label>

              <div className="pass-wrap">

                <input
                  required
                  className={"field-input"+(errors.confirmar?" field-input--error":"")}
                  type={showPass?"text":"password"}
                  value={form.confirmar}
                  onChange={e=>set("confirmar",e.target.value)}
                  placeholder="Repetir contraseña"
                />

                <button
                  type="button"
                  className="pass-toggle-btn"
                  onClick={()=>setShowPass(v=>!v)}
                >
                  {showPass?"🙈":"👁"}
                </button>

              </div>

              {errors.confirmar && <p className="field-error">{errors.confirmar}</p>}

            </div>

          </div>

        </div>



        {/* FOOTER */}

        <div className="modal-footer">

          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>

          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>

        </div>

      </div>
    </div>
  );
}