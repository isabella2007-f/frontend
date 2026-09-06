import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { fmtFecha } from "../../utils/dateUtils";
import { ESTADOS_FLUJO, ESTADO_ID_KEY, ESTADO_KEY_COLOR, ESTADOS_COMPLETADO_ID } from "./estados";
import { datasetsTarjeta, exportarDatasets } from "./dashboardExport";
import ExportMenu from "./ExportMenu";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

const TITULOS = {
  flujo:    "Flujo de ventas — detalle",
  top:      "Top productos — detalle",
  ingresos: "Ingresos reales — detalle",
  tiempo:   "Ventas en el tiempo — detalle",
};

export default function DetalleModal({ card, detalle, rangoLabel, filenameBase, onClose }) {
  const esProductos = card === "top";
  const [estadosSel, setEstadosSel] = useState(() => ESTADOS_FLUJO.map(e => e.key));

  const ventasBase = useMemo(() => {
    const ventas = detalle?.ventas ?? [];
    if (card === "flujo") return ventas;
    // ingresos / tiempo → solo pedidos completados (entregado/completada) sin devolución
    return ventas.filter(v => ESTADOS_COMPLETADO_ID.includes(v.estadoId) && !v.tieneDevolucion);
  }, [detalle, card]);

  const ventas = useMemo(() => {
    if (card !== "flujo") return ventasBase;
    return ventasBase.filter(v => estadosSel.includes(ESTADO_ID_KEY[v.estadoId]));
  }, [ventasBase, estadosSel, card]);

  const toggleEstado = (key) =>
    setEstadosSel(sel => sel.includes(key) ? sel.filter(k => k !== key) : [...sel, key]);

  const handleExport = (formato) => {
    const datasets = datasetsTarjeta(card, {
      ventas,
      productos: detalle?.productos ?? [],
    });
    exportarDatasets(formato, `${filenameBase}-${card}`, `${TITULOS[card]} · ${rangoLabel}`, datasets)
      .catch(e => console.error("Export detalle:", e));
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ width: "min(96vw, 960px)", maxHeight: "92vh" }}
      >
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>{TITULOS[card]}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.85 }}>{rangoLabel}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {card === "flujo" && (
            <div className="dash-estado-chips">
              {ESTADOS_FLUJO.map(e => {
                const activo = estadosSel.includes(e.key);
                return (
                  <button
                    key={e.key}
                    type="button"
                    className={`dash-estado-chip${activo ? " dash-estado-chip--on" : ""}`}
                    style={activo ? { borderColor: e.color, background: e.color + "18" } : undefined}
                    onClick={() => toggleEstado(e.key)}
                  >
                    <span className="dash-dot" style={{ background: e.color }} />
                    {e.label}
                  </button>
                );
              })}
            </div>
          )}

          {esProductos ? (
            <ProductosTabla productos={detalle?.productos ?? []} />
          ) : (
            <VentasTabla ventas={ventas} />
          )}
        </div>

        <div className="modal-footer modal-footer--space-between">
          <span style={{ fontSize: 12, color: "#757575" }}>
            {esProductos
              ? `${(detalle?.productos ?? []).length} productos`
              : `${ventas.length} pedidos`}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <ExportMenu onExport={handleExport} disabled={esProductos ? !(detalle?.productos ?? []).length : !ventas.length} />
            <button className="btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VentasTabla({ ventas }) {
  if (!ventas.length) {
    return <p style={{ textAlign: "center", color: "#9e9e9e", padding: "24px 0", margin: 0 }}>Sin pedidos para mostrar.</p>;
  }
  return (
    <div className="tbl-wrapper">
      <table className="dash-tbl">
        <thead>
          <tr>
            <th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Método</th>
            <th>Estado</th><th style={{ textAlign: "right" }}>Total</th><th>Productos</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map(v => (
            <tr key={v.idVenta}>
              <td>#{v.idVenta}</td>
              <td>{fmtFecha(v.fecha)}</td>
              <td>{v.cliente}</td>
              <td>{v.metodoPago}</td>
              <td>
                <span className="dash-dot" style={{ background: ESTADO_KEY_COLOR[ESTADO_ID_KEY[v.estadoId]] || "#bdbdbd" }} />
                {v.estado}
                {v.tieneDevolucion && <span className="dash-badge-dev">devuelto</span>}
              </td>
              <td style={{ textAlign: "right" }}>{money(v.total)}</td>
              <td>{v.productos.map(p => `${p.nombre} ×${p.cantidad}`).join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductosTabla({ productos }) {
  if (!productos.length) {
    return <p style={{ textAlign: "center", color: "#9e9e9e", padding: "24px 0", margin: 0 }}>Sin ventas de productos en el periodo.</p>;
  }
  return (
    <div className="tbl-wrapper">
      <table className="dash-tbl">
        <thead>
          <tr>
            <th>Producto</th>
            <th style={{ textAlign: "right" }}>Unidades</th>
            <th style={{ textAlign: "right" }}>% del total</th>
            <th style={{ textAlign: "right" }}>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td style={{ textAlign: "right" }}>{p.cantidad}</td>
              <td style={{ textAlign: "right" }}>{p.porcentaje}%</td>
              <td style={{ textAlign: "right" }}>{money(p.ingresos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
