import { useState } from "react";
import { MapPin, Tag } from "lucide-react";
import PestanaUbicaciones from "./PestanaUbicaciones";
import PestanaOfertas from "./PestanaOfertas";
import "./Ubicaciones.css";

/**
 * Módulo Ubicaciones — jerarquía Departamento → Ciudad → Barrio y ofertas de
 * domicilio. El precio del domicilio de un pedido sale del barrio de entrega
 * (Barrios.Precio + ofertas activas del día) y se congela como snapshot en el
 * pedido. Reemplaza la constante COSTO_DOMICILIO = 5000.
 *
 * Visible con `ver_ubicaciones`. Ruta: /admin/ubicaciones.
 */
export default function Ubicaciones() {
  const [tab, setTab] = useState("ubicaciones");

  return (
    <div className="ub-wrap">
      <div className="ub-head">
        <h1><MapPin size={20} /> Ubicaciones</h1>
        <p>Departamentos, ciudades y barrios de Colombia. Cada barrio tiene el
          precio del domicilio de los pedidos que se entregan ahí.</p>
      </div>

      <div className="ub-tabs">
        <button className={`ub-tab${tab === "ubicaciones" ? " ub-tab--active" : ""}`}
          onClick={() => setTab("ubicaciones")}>
          <MapPin size={14} /> Ubicaciones
        </button>
        <button className={`ub-tab${tab === "ofertas" ? " ub-tab--active" : ""}`}
          onClick={() => setTab("ofertas")}>
          <Tag size={14} /> Ofertas y recargos
        </button>
      </div>

      {tab === "ubicaciones" ? <PestanaUbicaciones /> : <PestanaOfertas />}
    </div>
  );
}
