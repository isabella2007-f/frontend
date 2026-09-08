import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { DIAS_SEMANA } from "../../../services/ubicacionesService";
import { formatCOP } from "../../../utils/formato";

const fmt = formatCOP;

const nombresDias = (arr) =>
  (arr || []).map((d) => DIAS_SEMANA.find((x) => x.valor === d)?.corto || d).join(", ");

/** "Ver detalle" de un barrio: datos, ofertas activas que le aplican, y cuántos
 * registros lo referencian (para explicar por qué no se puede eliminar). */
export default function DetalleBarrio({ barrio, onCerrar }) {
  const b = barrio;
  const refs = b.referencias || {};

  return createPortal(
    <div className="ub-overlay" onClick={onCerrar}>
      <div className="ub-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal__head">
          <div>
            <p className="ub-modal__eyebrow">Detalle del barrio</p>
            <h2>{b.Nombre}</h2>
          </div>
          <button className="ub-modal__x" onClick={onCerrar}><X size={18} /></button>
        </div>
        <div className="ub-modal__body">
          <div className="ub-detail-block">
            <h4>Ubicación</h4>
            <p>{b.departamento} · {b.ciudad}</p>
          </div>
          <div className="ub-detail-block">
            <h4>Precio del domicilio</h4>
            <p className="ub-price">{fmt(b.Precio)}</p>
          </div>
          <div className="ub-detail-block">
            <h4>Estado</h4>
            <p>
              <span className={`ub-badge ub-badge--${b.Estado === 1 ? "activo" : "inactivo"}`}>
                {b.Estado === 1 ? "Activo (propio)" : "Inactivo (propio)"}
              </span>{"  "}
              <span className={`ub-badge ub-badge--${b.estado_efectivo ? "activo" : "inactivo"}`}>
                {b.estado_efectivo ? "Disponible para domicilio" : "No disponible"}
              </span>
            </p>
            {!b.estado_efectivo && b.motivo_inactivo && (
              <p style={{ color: "#ef6c00", fontStyle: "italic", fontSize: 12 }}>{b.motivo_inactivo}</p>
            )}
          </div>
          <div className="ub-detail-block">
            <h4>Origen</h4>
            <p>{b.Es_Base ? "Catálogo base (quemado) — solo precio y estado editables" : "Creado desde el módulo"}</p>
          </div>

          <div className="ub-detail-block">
            <h4>Ofertas activas que le aplican</h4>
            {(b.ofertas_activas || []).length === 0
              ? <p style={{ color: "#9e9e9e" }}>Ninguna.</p>
              : (b.ofertas_activas || []).map((o) => (
                <p key={o.ID_Oferta}>
                  <span className={`ub-badge ub-badge--${o.Tipo === "recargo" ? "recargo" : "descuento"}`}>{o.Tipo}</span>{" "}
                  <strong>{o.Nombre}</strong>{" — "}
                  {o.Monto_Pesos != null && `${fmt(o.Monto_Pesos)} `}
                  {o.Porcentaje != null && `${o.Porcentaje}% `}
                  {o.Dias_Semana?.length ? `· ${nombresDias(o.Dias_Semana)} ` : ""}
                  {o.Dias_Mes?.length ? `· días ${o.Dias_Mes.join(",")}` : ""}
                </p>
              ))}
          </div>

          <div className="ub-detail-block">
            <h4>Referencias</h4>
            <p>Pedidos / domicilios: <strong>{refs.pedidos ?? 0}</strong></p>
            <p>Clientes con este barrio en su perfil: <strong>{refs.usuarios ?? 0}</strong></p>
            <p>Ofertas de domicilio: <strong>{refs.ofertas ?? 0}</strong></p>
            {!b.Es_Base && !b.puede_eliminar && (
              <p style={{ color: "#ef6c00", fontStyle: "italic", fontSize: 12 }}>
                No se puede eliminar mientras algo lo referencie. Desactívalo en su lugar.
              </p>
            )}
          </div>
        </div>
        <div className="ub-modal__foot">
          <button className="ub-btn ub-btn--ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
