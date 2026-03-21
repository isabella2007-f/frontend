export const TIPOS_DOC = ["CC", "TI", "CE", "Pasaporte", "NIT", "PPT"];

export const ROLES_EMPLEADO = [
  { id: 1, nombre: "Administrador", icon: "👑", bg: "#fce4ec", color: "#c2185b", border: "#f48fb1" },
  { id: 2, nombre: "Vendedor",      icon: "🛒", bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  { id: 3, nombre: "Domiciliario",  icon: "🛵", bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
  { id: 4, nombre: "Producción",    icon: "⚙️", bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  { id: 5, nombre: "Contador",      icon: "📊", bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
];

export const ITEMS_PER_PAGE = 5;

export const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export const fmtTel = raw => {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
  return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
};

export const toInputDate   = v => v && v.includes("/") ? v.split("/").reverse().join("-") : (v || "");
export const fromInputDate = v => { if (!v) return ""; const [y,m,d] = v.split("-"); return `${d}/${m}/${y}`; };

export const INIT_EMPLEADOS = [
  { id:uid(), tipoDoc:"CC", numDoc:"1023456789", nombre:"Laura",     apellidos:"Sánchez Ríos",   correo:"laura.s@empresa.com",     telefono:"300 111 2222", direccion:"Calle 10 # 5-20",     departamento:"Antioquia", municipio:"Medellín", idRol:1, estado:true,  fotoPreview:null, fechaIngreso:"01/01/2025" },
  { id:uid(), tipoDoc:"CC", numDoc:"8034567890", nombre:"Andrés",    apellidos:"Gómez Herrera",  correo:"andres.g@empresa.com",    telefono:"310 222 3333", direccion:"Carrera 20 # 15-40",  departamento:"Antioquia", municipio:"Bello",    idRol:2, estado:true,  fotoPreview:null, fechaIngreso:"15/03/2025" },
  { id:uid(), tipoDoc:"CC", numDoc:"9045678901", nombre:"Camila",    apellidos:"Torres Vargas",  correo:"camila.t@empresa.com",    telefono:"315 333 4444", direccion:"Av. 33 # 80-12",      departamento:"Antioquia", municipio:"Itagüí",   idRol:3, estado:true,  fotoPreview:null, fechaIngreso:"01/06/2025" },
  { id:uid(), tipoDoc:"CC", numDoc:"7056789012", nombre:"Diego",     apellidos:"Ramírez Castro", correo:"diego.r@empresa.com",     telefono:"320 444 5555", direccion:"Transversal 4 # 7-8", departamento:"Antioquia", municipio:"Envigado", idRol:4, estado:false, fotoPreview:null, fechaIngreso:"10/08/2025" },
  { id:uid(), tipoDoc:"CC", numDoc:"6067890123", nombre:"Valentina", apellidos:"López Moreno",   correo:"valentina.l@empresa.com", telefono:"317 555 6666", direccion:"Cll 45 Sur # 30-10",  departamento:"Antioquia", municipio:"Sabaneta", idRol:5, estado:true,  fotoPreview:null, fechaIngreso:"20/10/2025" },
];