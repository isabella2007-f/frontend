import { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle, Truck } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import {
  getDepartamentosCheckout, getCiudadesCheckout, getBarriosCheckout, getCobertura,
} from "../../services/ubicacionesService";
import { formatCOP as COP } from "../../utils/formato";

/**
 * Selector Departamento → Ciudad → Barrio de la dirección de ENTREGA, contra el
 * API del módulo Ubicaciones (barrios reales, con estado efectivo). El barrio
 * determina el precio del domicilio.
 *
 * Reemplaza la lista de barrios embebida en `utils/barrios.js` para el punto de
 * entrega. `Direccion_entrega` (la vía / complemento) sigue siendo texto libre
 * y lo maneja el componente padre.
 *
 * Llama `onChange(idBarrio | null, cobertura | null)` donde `cobertura` es la
 * respuesta de `/ubicaciones/checkout/cobertura/{id}`:
 *   { disponible, motivo, base, final, desglose, barrio, ciudad, departamento }
 *
 * `prefillIdBarrio` (del perfil): al montar, si viene, resuelve su
 * departamento/ciudad y lo deja seleccionado. Totalmente editable después.
 */
export default function SelectorBarrioEntrega({
  prefillIdBarrio = null,
  onChange,
  compacto = false,
  /** false = solo los selectores, sin el recuadro de precio/cobertura (perfil). */
  mostrarCobertura = true,
  /**
   * Esconde el paso del departamento y lo resuelve solo.
   *
   * Para elegir a dónde va UN pedido: no se manda un domicilio a otro
   * departamento, así que preguntarlo es un paso de más. Se usa
   * `idDepartamentoPreferido` si viene; si no, el único que haya, o el primero.
   */
  sinDepartamento = false,
  /** Departamento con el que arrancar cuando `sinDepartamento` está puesto. */
  idDepartamentoPreferido = null,
  /** Su nombre, cuando solo se tiene eso (lo que el cliente guardó). */
  nombreDepartamentoPreferido = null,
}) {
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [idDepto, setIdDepto] = useState("");
  const [idCiudad, setIdCiudad] = useState("");
  const [idBarrio, setIdBarrio] = useState("");
  const [cobertura, setCobertura] = useState(null);
  const [cargandoCobertura, setCargandoCobertura] = useState(false);
  const prefillHecho = useRef(false);

  useEffect(() => {
    getDepartamentosCheckout().then(setDepartamentos).catch(() => setDepartamentos([]));
  }, []);

  // Prefill desde el ID_Barrio del perfil: pide su cobertura (trae ciudad y
  // departamento por nombre) y arma la cadena.
  useEffect(() => {
    if (prefillHecho.current || !prefillIdBarrio || departamentos.length === 0) return;
    prefillHecho.current = true;
    getCobertura(prefillIdBarrio)
      .then((cob) => {
        const dep = departamentos.find((d) => d.Nombre === cob.departamento);
        if (!dep) return;
        setIdDepto(String(dep.ID_Departamento));
        return getCiudadesCheckout(dep.ID_Departamento).then((cs) => {
          setCiudades(cs);
          const ciu = cs.find((c) => c.Nombre === cob.ciudad);
          if (!ciu) return;
          setIdCiudad(String(ciu.ID_Ciudad));
          return getBarriosCheckout({ idCiudad: ciu.ID_Ciudad, porPagina: 100 }).then((r) => {
            setBarrios(r.barrios || []);
            setIdBarrio(String(prefillIdBarrio));
            setCobertura(cob);
            onChange?.(prefillIdBarrio, cob);
          });
        });
      })
      .catch(() => {});
  }, [prefillIdBarrio, departamentos, onChange]);

  // Sin paso de departamento: se resuelve solo, pero con criterio.
  //
  // Tomar el primero de la lista es alfabético, no correcto: daba Amazonas y
  // ofrecía Leticia y Puerto Nariño. Se busca el del cliente; si no hay forma
  // de saber cuál es y hay varios, mejor preguntarlo que inventarlo.
  const departamentoResuelto = (() => {
    if (departamentos.length === 0) return null;
    if (idDepartamentoPreferido) {
      const porId = departamentos.find(
        (d) => String(d.ID_Departamento) === String(idDepartamentoPreferido));
      if (porId) return porId;
    }
    if (nombreDepartamentoPreferido) {
      const normal = (t) => String(t || '').trim().toLowerCase();
      const porNombre = departamentos.find(
        (d) => normal(d.Nombre) === normal(nombreDepartamentoPreferido));
      if (porNombre) return porNombre;
    }
    return departamentos.length === 1 ? departamentos[0] : null;
  })();

  /// Se esconde el paso solo si de verdad se pudo resolver.
  const ocultarDepartamento = sinDepartamento && !!departamentoResuelto;

  useEffect(() => {
    if (!sinDepartamento || idDepto || !departamentoResuelto) return;
    setIdDepto(String(departamentoResuelto.ID_Departamento));
  }, [sinDepartamento, departamentoResuelto, idDepto]);

  useEffect(() => {
    if (!idDepto) { setCiudades([]); return; }
    getCiudadesCheckout(Number(idDepto)).then(setCiudades).catch(() => setCiudades([]));
  }, [idDepto]);

  useEffect(() => {
    if (!idCiudad) { setBarrios([]); return; }
    getBarriosCheckout({ idCiudad: Number(idCiudad), porPagina: 100 })
      .then((r) => setBarrios(r.barrios || []))
      .catch(() => setBarrios([]));
  }, [idCiudad]);

  useEffect(() => {
    if (!idBarrio) { setCobertura(null); onChange?.(null, null); return; }
    setCargandoCobertura(true);
    getCobertura(Number(idBarrio))
      .then((cob) => { setCobertura(cob); onChange?.(Number(idBarrio), cob); })
      .catch(() => { setCobertura(null); onChange?.(Number(idBarrio), null); })
      .finally(() => setCargandoCobertura(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idBarrio]);

  const tieneDescuento = cobertura?.disponible && cobertura.final < cobertura.base;
  const tieneRecargo = cobertura?.disponible && cobertura.final > cobertura.base;

  // Un barrio puede tener recargo Y descuento a la vez. Se listan por separado
  // (cada uno con su nombre y color); el precio de arriba ya muestra el neto.
  const uniq = (a) => a.filter((v, i, arr) => arr.indexOf(v) === i);
  const ofertasDesglose = cobertura?.desglose?.ofertas || [];
  const nombresRecargo = uniq(
    ofertasDesglose.filter((o) => String(o.tipo || "").startsWith("recargo") || o.efecto > 0)
      .map((o) => o.nombre),
  );
  const nombresDescuento = uniq(
    ofertasDesglose.filter((o) => String(o.tipo || "").startsWith("descuento") || o.efecto < 0)
      .map((o) => o.nombre),
  );

  const cls = compacto
    ? "w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-700 font-medium"
    : "field-input";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!ocultarDepartamento && (
        <SearchableSelect
          options={departamentos} value={idDepto}
          onChange={(e) => { setIdDepto(e.target.value); setIdCiudad(""); setIdBarrio(""); }}
          getValue={(d) => d.ID_Departamento} getLabel={(d) => d.Nombre}
          placeholder="Departamento" className={cls}
        />
      )}
      <SearchableSelect
        options={ciudades} value={idCiudad}
        onChange={(e) => { setIdCiudad(e.target.value); setIdBarrio(""); }}
        getValue={(c) => c.ID_Ciudad}
        getLabel={(c) => `${c.Nombre}${c.departamento ? ` (${c.departamento})` : ""}`}
        placeholder={idDepto ? "Ciudad / municipio" : "Primero elige el departamento"}
        disabled={!idDepto} className={cls}
      />
      <SearchableSelect
        options={barrios} value={idBarrio}
        onChange={(e) => setIdBarrio(e.target.value)}
        getValue={(b) => b.ID_Barrio} getLabel={(b) => b.Nombre}
        placeholder={idCiudad ? "Barrio" : "Primero elige la ciudad"}
        disabled={!idCiudad} className={cls}
      />

      {mostrarCobertura && cargandoCobertura && (
        <p style={{ fontSize: 12, color: "#9e9e9e", margin: "2px 0" }}>Calculando el costo del domicilio…</p>
      )}

      {mostrarCobertura && cobertura && !cobertura.disponible && (
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-start",
          background: "#fff8e1", border: "1px solid #ffe082",
          borderRadius: 10, padding: "10px 12px",
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: "#e65100" }} />
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: "#5d4037" }}>
            <strong>No hacemos domicilios en este barrio por ahora.</strong> Hacemos
            domicilios solo en algunas zonas y esta no está cubierta. Elige un barrio
            con cobertura o recoge tu pedido en la tienda — el resto del pedido sigue igual.
          </p>
        </div>
      )}

      {mostrarCobertura && cobertura?.disponible && (
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "#f1f8f1", border: "1px solid #c8e6c9",
          borderRadius: 10, padding: "10px 12px", fontSize: 13,
        }}>
          <Truck size={15} style={{ flexShrink: 0, color: "var(--green-700, #2e7d32)" }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 800, color: "#1a1a1a" }}>
              Domicilio:{" "}
              {(tieneDescuento || tieneRecargo) && (
                <span style={{ textDecoration: "line-through", color: "#9e9e9e", fontWeight: 500 }}>
                  {COP(cobertura.base)}
                </span>
              )}{" "}
              <span style={{ color: "var(--green-800, #1b5e20)" }}>
                {cobertura.final === 0 ? "gratis" : COP(cobertura.final)}
              </span>
            </span>
            {nombresRecargo.length > 0 && (
              <span style={{ display: "block", fontSize: 11, color: "#e65100", marginTop: 1 }}>
                Recargo: {nombresRecargo.join(", ")}
              </span>
            )}
            {nombresDescuento.length > 0 && (
              <span style={{ display: "block", fontSize: 11, color: "#2e7d32", marginTop: 1 }}>
                Descuento: {nombresDescuento.join(", ")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
