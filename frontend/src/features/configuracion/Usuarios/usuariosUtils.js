// ─── COLORS ───────────────────────────────────────────────
export const G     = "#3a8f2a";
export const GD    = "#2d7020";
export const GL    = "#e8f5e2";
export const GB    = "#5ab535";
export const GGLOW = "rgba(90,181,53,0.18)";

// ─── INITIAL DATA ─────────────────────────────────────────
export const INIT_USERS = [
  { id:1, nombre:"Ana García", apellidos:    "García",     telefono:"321-555-0001", cedula:"1001234567", correo:"ana@tostones.com",    direccion:"Calle 10 #5-20", municipio:    "Medellín", departamento:"Cundinamarca",   contrasena:"", rol:"Admin",    estado:true,  fechaCreacion:"2024-01-15", foto:null },
  { id:2, nombre:"Carlos López", apellidos:    "López",    telefono:"322-555-0002", cedula:"1009876543", correo:"carlos@tostones.com", direccion:"Carrera 7 #14-30", municipio:    "Medellín", departamento:"Cundinamarca",   contrasena:"", rol:"Empleado", estado:false, fechaCreacion:"2024-03-02", foto:null },
  { id:3, nombre:"María Rodríguez", apellidos:    "Rodríguez", telefono:"315-555-0003", cedula:"1011223344", correo:"maria@tostones.com",  direccion:"Av. El Poblado 45", municipio:    "Medellín", departamento:"Cundinamarca",   contrasena:"", rol:"Cliente",  estado:true,  fechaCreacion:"2024-05-18", foto:null },
  { id:4, nombre:"Juan Martínez", apellidos:    "Martínez",   telefono:"318-555-0004", cedula:"1055667788", correo:"juan@tostones.com",   direccion:"Calle 80 #23-10", municipio:    "Medellín", departamento:"Cundinamarca",   contrasena:"", rol:"Empleado", estado:true,  fechaCreacion:"2024-07-09", foto:null },
  { id:5, nombre:"Sofía Herrera", apellidos:    "Herrera",   telefono:"311-555-0005", cedula:"1099001122", correo:"sofia@tostones.com",  direccion:"Transversal 6 #8-5",municipio:    "Medellín", departamento:"Cundinamarca",   contrasena:"", rol:"Cliente",  estado:false, fechaCreacion:"2024-09-25", foto:null },
];
export const EMPTY_FORM = {
  nombre:       "",
  apellidos:    "",       // ← nuevo
  correo:       "",
  direccion:    "",
  municipio:    "",       // ← nuevo
  departamento: "",       // ← nuevo
  telefono:     "",
  foto:         null,
  fechaCreacion: new Date().toISOString().split("T")[0],
  contrasena:   "",
  confirmar:    "",
  rol:          "",
  estado:       true,
};

export const EMPTY_FILTERS = { roles:[], estado:"", desde:"", hasta:"" };

export const PER_PAGE = 5;

// ─── ROL CONFIG ───────────────────────────────────────────
import { Ic } from "./usuariosIcons.jsx";

export const ROL_STYLES = {
  Admin:    { bg: "#d4edda", color: "#1a6b2a", border: "#5ab535" },
  Empleado: { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
  Cliente:  { bg: "#e3eeff", color: "#1a4db5", border: "#6b9ef5" },
};