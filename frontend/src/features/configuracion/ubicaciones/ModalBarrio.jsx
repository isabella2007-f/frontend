import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, MapPin } from "lucide-react";
import SearchableSelect from "../../../shared/components/SearchableSelect";
import CampoMonto from "../../../shared/components/CampoMonto";
import {
  getDepartamentos, getCiudades, crearBarrio, editarBarrio,
} from "../../../services/ubicacionesService";

/** Valida el nombre del barrio con la misma regla del backend (2.·). */
const PALABRA = "[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+";
const NOMBRE_RE = new RegExp(`^${PALABRA}( ${PALABRA})*$`);

function validarNombre(v) {
  if (!v) return "El nombre es obligatorio";
  if (v.length > 35) return "Máximo 35 caracteres";
  if (!NOMBRE_RE.test(v))
    return "Solo letras, números y espacios simples internos (sin símbolos ni espacios al inicio/fin)";
  return null;
}

/**
 * Crear o editar un barrio.
 *  - Crear: Departamento → Ciudad (dependiente) → Nombre → Precio. Todos obligatorios.
 *  - Editar Es_Base=1 (quemado): SOLO Precio. Todo lo demás en solo lectura.
 *  - Editar Es_Base=0 (creado): Nombre y Precio. Ciudad/departamento no se cambian.
 * "No se hicieron cambios": al guardar sin tocar nada no se dispara el PUT.
 */
export default function ModalBarrio({ barrio, onGuardado, onCerrar }) {
  const editando = !!barrio;
  const esBase = !!barrio?.Es_Base;

  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [idDepartamento, setIdDepartamento] = useState("");
  const [idCiudad, setIdCiudad] = useState(barrio?.ID_Ciudad ? String(barrio.ID_Ciudad) : "");
  const [nombre, setNombre] = useState(barrio?.Nombre || "");
  const [precio, setPrecio] = useState(barrio?.Precio ?? "");
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState("");

  useEffect(() => {
    getDepartamentos().then(setDepartamentos).catch(() => setDepartamentos([]));
  }, []);

  // Al crear: cargar ciudades cuando cambia el departamento.
  useEffect(() => {
    if (editando || !idDepartamento) { setCiudades([]); return; }
    getCiudades(Number(idDepartamento)).then(setCiudades).catch(() => setCiudades([]));
  }, [idDepartamento, editando]);

  const nombreError = tocado ? validarNombre(nombre.trim()) : null;
  const precioError = tocado && (precio === "" || precio == null) ? "El precio es obligatorio" : null;

  const snapshotInicial = useMemo(
    () => JSON.stringify({ n: barrio?.Nombre || "", p: barrio?.Precio ?? "" }),
    [barrio],
  );
  const sinCambios = editando &&
    JSON.stringify({ n: nombre.trim(), p: precio === "" ? "" : Number(precio) }) === snapshotInicial;

  const puedeGuardar = editando
    ? (esBase ? precio !== "" : (nombre.trim() && precio !== "" && !validarNombre(nombre.trim())))
    : (idCiudad && nombre.trim() && precio !== "" && !validarNombre(nombre.trim()));

  const guardar = async () => {
    setTocado(true);
    setErrorApi("");
    if (!puedeGuardar) return;

    if (editando && sinCambios) {
      onGuardado({ sinCambios: true });
      return;
    }
    setGuardando(true);
    try {
      let res;
      if (editando) {
        res = await editarBarrio(barrio.ID_Barrio, {
          Nombre: esBase ? undefined : nombre.trim(),
          Precio: Number(precio),
        });
      } else {
        res = await crearBarrio({
          ID_Ciudad: Number(idCiudad),
          Nombre: nombre.trim(),
          Precio: Number(precio),
        });
      }
      onGuardado(res);
    } catch (e) {
      setErrorApi(e?.message || "No se pudo guardar el barrio");
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="ub-overlay" onClick={onCerrar}>
      <div className="ub-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal__head">
          <h2>{editando ? "Editar barrio" : "Crear barrio"}</h2>
          <button className="ub-modal__x" onClick={onCerrar}><X size={18} /></button>
        </div>

        <div className="ub-modal__body">
          {editando && esBase && (
            <div className="ub-info">
              <MapPin size={15} />
              <span>Este barrio es del catálogo base. Solo puedes cambiar su precio
                (y su estado desde el listado).</span>
            </div>
          )}

          {editando ? (
            <div className="ub-field">
              <label>Ubicación</label>
              <input className="ub-input" disabled
                value={`${barrio.departamento || ""} · ${barrio.ciudad || ""}`} />
              <p className="ub-hint">Para mover un barrio se crea otro y se desactiva este.</p>
            </div>
          ) : (
            <>
              <div className="ub-field">
                <label>Departamento</label>
                <SearchableSelect
                  options={departamentos}
                  value={idDepartamento}
                  onChange={(e) => { setIdDepartamento(e.target.value); setIdCiudad(""); }}
                  getValue={(d) => d.ID_Departamento}
                  getLabel={(d) => d.Nombre}
                  placeholder="— Departamento —"
                />
              </div>
              <div className="ub-field">
                <label>Ciudad</label>
                <SearchableSelect
                  options={ciudades}
                  value={idCiudad}
                  onChange={(e) => setIdCiudad(e.target.value)}
                  getValue={(c) => c.ID_Ciudad}
                  getLabel={(c) => `${c.Nombre}${c.departamento ? ` (${c.departamento})` : ""}`}
                  placeholder={idDepartamento ? "— Ciudad —" : "Primero elige el departamento"}
                  disabled={!idDepartamento}
                />
              </div>
            </>
          )}

          {!(editando && esBase) && (
            <div className="ub-field">
              <label>Nombre del barrio</label>
              <input
                className={`ub-input${nombreError ? " ub-input--error" : ""}`}
                value={nombre}
                maxLength={35}
                onChange={(e) => { setNombre(e.target.value); setTocado(true); }}
                placeholder="Ej: Manrique Central"
              />
              {nombreError && <p className="ub-error">{nombreError}</p>}
            </div>
          )}

          <div className="ub-field">
            <label>Precio del domicilio (COP)</label>
            <CampoMonto
              valor={precio}
              onValor={(v) => { setPrecio(v); setTocado(true); }}
              maximo={9_999_999}
              placeholder="5000"
            />
            {precioError && <p className="ub-error">{precioError}</p>}
            <p className="ub-hint">Entero, sin decimales. Máximo $9.999.999.</p>
          </div>

          {errorApi && <p className="ub-error">{errorApi}</p>}
        </div>

        <div className="ub-modal__foot">
          <button className="ub-btn ub-btn--ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="ub-btn ub-btn--primary" onClick={guardar} disabled={guardando || !puedeGuardar}>
            {guardando ? "Guardando…" : (editando ? "Guardar cambios" : "Crear barrio")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
