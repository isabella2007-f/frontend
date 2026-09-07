import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import { getDepartamentos, getCiudades, getBarrios } from "../../../services/ubicacionesService";

/**
 * Multiselección de barrios (1..N) estilo "insumos": se eligen uno a uno con
 * Departamento → Ciudad → Barrio y se acumulan como chips.
 *
 * `value`: [{ id, nombre, ciudad }]  ·  `onChange(nuevoArray)`
 */
export default function SelectorBarriosMultiple({ value = [], onChange }) {
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [opciones, setOpciones] = useState([]);
  const [selDepto, setSelDepto] = useState("");
  const [selCiudad, setSelCiudad] = useState("");
  const [selBarrio, setSelBarrio] = useState("");

  useEffect(() => { getDepartamentos().then(setDepartamentos).catch(() => {}); }, []);
  useEffect(() => {
    if (!selDepto) { setCiudades([]); return; }
    getCiudades(Number(selDepto)).then(setCiudades).catch(() => {});
  }, [selDepto]);
  useEffect(() => {
    if (!selCiudad) { setOpciones([]); return; }
    getBarrios({ idCiudad: Number(selCiudad), porPagina: 100 })
      .then((r) => setOpciones(r.barrios || []))
      .catch(() => setOpciones([]));
  }, [selCiudad]);

  const agregar = () => {
    if (!selBarrio) return;
    const b = opciones.find((x) => String(x.ID_Barrio) === String(selBarrio));
    if (!b || value.some((x) => x.id === b.ID_Barrio)) return;
    onChange([...value, { id: b.ID_Barrio, nombre: b.Nombre, ciudad: b.ciudad }]);
    setSelBarrio("");
  };

  const quitar = (id) => onChange(value.filter((b) => b.id !== id));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "start" }}>
        <SearchableSelect options={departamentos} value={selDepto}
          onChange={(e) => { setSelDepto(e.target.value); setSelCiudad(""); setSelBarrio(""); }}
          getValue={(d) => d.ID_Departamento} getLabel={(d) => d.Nombre}
          placeholder="Departamento" />
        <SearchableSelect options={ciudades} value={selCiudad}
          onChange={(e) => { setSelCiudad(e.target.value); setSelBarrio(""); }}
          getValue={(c) => c.ID_Ciudad}
          getLabel={(c) => `${c.Nombre}${c.departamento ? ` (${c.departamento})` : ""}`}
          placeholder="Ciudad" disabled={!selDepto} />
        <SearchableSelect options={opciones} value={selBarrio}
          onChange={(e) => setSelBarrio(e.target.value)}
          getValue={(b) => b.ID_Barrio} getLabel={(b) => b.Nombre}
          placeholder="Barrio" disabled={!selCiudad} />
        <button type="button" className="ub-btn ub-btn--ghost" onClick={agregar} disabled={!selBarrio}>
          <Plus size={14} /> Agregar
        </button>
      </div>
      {value.length > 0 && (
        <div className="ub-chips">
          {value.map((b) => (
            <span key={b.id} className="ub-chip">
              {b.nombre}{b.ciudad ? ` · ${b.ciudad}` : ""}
              <button type="button" onClick={() => quitar(b.id)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
