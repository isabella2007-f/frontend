import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { DIAS_SEMANA } from "../../../services/ubicacionesService";
import { formatCOP } from "../../../utils/formato";

const fmt = formatCOP;

export default function DetalleOferta({ oferta, onCerrar }) {
  const o = oferta;
  const ej = o.ejemploCalculo;

  return createPortal(
    <div className="ub-overlay" onClick={onCerrar}>
      <div className="ub-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal__head">
          <div>
            <p className="ub-modal__eyebrow">Detalle de la oferta</p>
            <h2>{o.nombre}</h2>
          </div>
          <button className="ub-modal__x" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="ub-modal__body">
          <div className="ub-detail-block">
            <h4>Tipo</h4>
            <p>
              <span className={`ub-badge ub-badge--${o.tipo === "recargo" ? "recargo" : "descuento"}`}>{o.tipo}</span>
              {" "}{o.estado === 1
                ? <span className="ub-badge ub-badge--activo">Activa</span>
                : <span className="ub-badge ub-badge--inactivo">Inactiva</span>}
            </p>
          </div>
          <div className="ub-detail-block">
            <h4>Valor</h4>
            {o.montoPesos != null && <p>{fmt(o.montoPesos)} en pesos</p>}
            {o.porcentaje != null && <p>{o.porcentaje}% en porcentaje</p>}
          </div>
          <div className="ub-detail-block">
            <h4>Días</h4>
            {(o.diasSemana || []).length > 0 && (
              <p>Semana: {o.diasSemana.map((d) => DIAS_SEMANA.find((x) => x.valor === d)?.largo || d).join(", ")}</p>
            )}
            {(o.diasMes || []).length > 0 && <p>Del mes: {o.diasMes.join(", ")}</p>}
          </div>
          <div className="ub-detail-block">
            <h4>Barrios afectados ({o.barrios.length})</h4>
            {o.barrios.map((b) => (
              <p key={b.id}>{b.nombre}{b.ciudad ? ` · ${b.ciudad}` : ""}</p>
            ))}
          </div>
          {ej && (
            <div className="ub-detail-block">
              <h4>Ejemplo de cálculo hoy (sobre {o.barrios[0]?.nombre})</h4>
              <p>Precio base: {fmt(ej.base)}</p>
              {(ej.ofertas || []).map((x, i) => (
                <p key={i}>{x.nombre}: {x.efecto >= 0 ? "+" : ""}{fmt(x.efecto)}</p>
              ))}
              <p><strong>Precio final: {ej.final === 0 ? "Domicilio gratis" : fmt(ej.final)}</strong>
                {ej.techo_aplicado ? " (tarifa máxima)" : ""}</p>
            </div>
          )}
        </div>
        <div className="ub-modal__foot">
          <button className="ub-btn ub-btn--ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
