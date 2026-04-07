import { useState } from "react";
import { useApp } from "../../../AppContext.jsx";
import { LotesInsumoPanel } from "../../compras/gestioncompras/EditarCompra.jsx";
import "./GestionInsumos.css";

/* ─── helpers locales (mismos que en GestionInsumos) ─────── */
function calcEstado(actual, minimo) {
  if (actual === 0)    return "agotado";
  if (actual < minimo) return "bajo";
  return "disponible";
}

function Toggle({ value }) {
  return (
    <button className="toggle-btn" style={{
      background: value ? "#43a047" : "#bdbdbd",
      boxShadow: value ? "0 2px 8px rgba(67,160,71,0.4)" : "none",
      cursor: "default",
    }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label">{value ? "ON" : ""}</span>
      </span>
    </button>
  );
}

function StockBar({ actual, minimo }) {
  const pct   = minimo > 0 ? Math.min(100, Math.round((actual / (minimo * 2)) * 100)) : 100;
  const est   = calcEstado(actual, minimo);
  const color = est === "agotado" ? "#ef5350" : est === "bajo" ? "#ffa726" : "#43a047";
  return (
    <div className="stock-cell">
      <div className="stock-bar-wrap">
        <div className="stock-bar" style={{ width: pct + "%", background: color }} />
      </div>
      <span className="stock-nums"><strong>{actual}</strong> / mín {minimo}</span>
    </div>
  );
}

/* ─── VerInsumo — tabs internas, sin scroll externo ─────── */
export default function VerInsumo({ ins, onClose }) {
  const { getCatInsumo, getUnidad, getStockRealInsumo, getLotesVencidos, getSalidasInsumo, getLotesDeInsumo } = useApp();
  const [tab, setTab] = useState("info");

  const cat       = getCatInsumo(ins.idCategoria);
  const unidad    = getUnidad(ins.idUnidad);
  const est       = calcEstado(ins.stockActual, ins.stockMinimo);
  const stockReal = getStockRealInsumo(ins.id);

  const getProximoVencimiento = (idInsumo) => {
    const lotesValidos = getLotesDeInsumo(idInsumo).filter(l => l.cantidadActual > 0);
    if (lotesValidos.length === 0) return "—";
    return lotesValidos[0].fechaVencimiento;
  };

  const proxVenc = getProximoVencimiento(ins.id);

  const estConfig = {
    disponible: { label: "Disponible", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7", icon: "✅" },
    bajo:       { label: "Stock bajo", color: "#f57f17", bg: "#fff8e1", border: "#ffe082", icon: "⚠️" },
    agotado:    { label: "Agotado",    color: "#c62828", bg: "#ffebee", border: "#ef9a9a", icon: "🚫" },
  };
  const ec = estConfig[est];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-box--lg"
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 40px)" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="ver-ins-avatar">{cat.icon}</div>
            <div>
              <p className="modal-header__eyebrow">Insumo #{String(ins.id).padStart(4, "0")}</p>
              <h2 className="modal-header__title">{ins.nombre}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="ver-ins-tabs">
          <button
            className={`ver-ins-tab${tab === "info" ? " ver-ins-tab--active" : ""}`}
            onClick={() => setTab("info")}
          >
            📋 Información
          </button>
          <button
            className={`ver-ins-tab${tab === "lotes" ? " ver-ins-tab--active" : ""}`}
            onClick={() => setTab("lotes")}
          >
            📦 Lotes en inventario
          </button>
          <button
            className={`ver-ins-tab${tab === "vencidos" ? " ver-ins-tab--active" : ""}`}
            onClick={() => setTab("vencidos")}
          >
            🕒 Historial vencidos
          </button>
        </div>

        {/* Body — overflow solo aquí adentro si el contenido lo requiere */}
        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>

          {tab === "info" && (
            <>
              {/* Alerta de stock */}
              {est !== "disponible" && (
                <div className="ver-ins-alerta"
                  style={{ borderColor: ec.border, background: ec.bg, color: ec.color }}>
                  {ec.icon} <strong>{ec.label}</strong>
                  {est === "bajo"    && ` — faltan ${ins.stockMinimo - ins.stockActual} ${unidad.simbolo} para alcanzar el mínimo`}
                  {est === "agotado" && " — este insumo no tiene stock disponible"}
                </div>
              )}

              {/* Clasificación */}
              <p className="ver-ins-section-label" style={{textTransform: "none"}}>Clasificación</p>
              <div className="ver-ins-grid">
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Categoría</span>
                  <span className="cat-chip" style={{ display: "inline-flex" }}>
                    <span className="cat-chip__icon">{cat.icon}</span>{cat.nombre}
                  </span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Unidad de medida</span>
                  <span className="unidad-badge">{unidad.simbolo} — {unidad.nombre}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Estado operativo</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Toggle value={ins.estado} />
                    <span style={{ fontSize: 12, color: ins.estado ? "#2e7d32" : "#9e9e9e", fontWeight: 700 }}>
                      {ins.estado ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Fecha de creación</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#555", marginTop: 4 }}>{ins.fechaCreacion || "—"}</span>
                </div>
                <div className="ver-ins-field">
                  <span className="ver-ins-field__label">Próximo vencimiento</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#555", marginTop: 4 }}>{proxVenc || "—"}</span>
                </div>
              </div>

              {/* Stock */}
              <p className="ver-ins-section-label"  style={{textTransform: "none"}}>Stock</p>
              <div className="ver-ins-stock-cards">
                <div className="ver-ins-stock-card ver-ins-stock-card--actual">
                  <span className="ver-ins-stock-card__num">{ins.stockActual}</span>
                  <span className="ver-ins-stock-card__label">Stock actual</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
                <div className="ver-ins-stock-card ver-ins-stock-card--minimo">
                  <span className="ver-ins-stock-card__num">{ins.stockMinimo}</span>
                  <span className="ver-ins-stock-card__label">Stock mínimo</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
                <div className="ver-ins-stock-card ver-ins-stock-card--real">
                  <span className="ver-ins-stock-card__num">{stockReal}</span>
                  <span className="ver-ins-stock-card__label">Stock real (lotes vigentes)</span>
                  <span className="ver-ins-stock-card__uni">{unidad.simbolo}</span>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <StockBar actual={ins.stockActual} minimo={ins.stockMinimo} />
              </div>

              {stockReal !== ins.stockActual && (
                <div className="ver-ins-diff-aviso">
                  ℹ️ El stock real de lotes ({stockReal} {unidad.simbolo}) difiere del stock registrado ({ins.stockActual} {unidad.simbolo}). Esto puede deberse a lotes vencidos o consumo en producción.
                </div>
              )}
            </>
          )}

          {tab === "lotes" && <LotesInsumoPanel idInsumo={ins.id} />}

          {tab === "vencidos" && (
            <div>
              <p className="ver-ins-section-label" style={{ textTransform: "none" }}>Lotes vencidos</p>
              {getLotesVencidos(ins.id).length === 0 ? (
                <div className="empty-state" style={{ padding: "12px 14px" }}>
                  <p className="empty-state__text">No hay lotes vencidos para este insumo.</p>
                </div>
              ) : (
                <div className="lotes-lista">
                  {getLotesVencidos(ins.id).map(lote => (
                    <div key={lote.id} className="lote-item" style={{ borderColor: "#ef9a9a" }}>
                      <div className="lote-item__head">
                        <span className="lote-item__id">{lote.id}</span>
                        <span style={{ fontWeight: 600 }}>Vence: {lote.fechaVencimiento}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginTop: 8 }}>
                        <div><strong>Cantidad actual:</strong> {lote.cantidadActual} {unidad.simbolo}</div>
                        <div><strong>Ingreso:</strong> {lote.fechaIngreso}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="ver-ins-section-label" style={{ textTransform: "none", marginTop: 14 }}>Historial de salidas</p>
              {getSalidasInsumo(ins.id).length === 0 ? (
                <div className="empty-state" style={{ padding: "12px 14px" }}>
                  <p className="empty-state__text">Aún no hay salidas registradas.</p>
                </div>
              ) : (
                <div className="historial-list">
                  {getSalidasInsumo(ins.id).map(salida => (
                    <div key={salida.id} className="historial-item">
                      <span>{salida.fecha} · {salida.tipo} · {salida.cantidad} {unidad.simbolo}</span>
                      <span style={{ color: "#757575" }}>{salida.motivo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
