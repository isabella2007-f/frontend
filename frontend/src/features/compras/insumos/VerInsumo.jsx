import { useState } from "react";
import "./GestionInsumos.css";

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

export default function VerInsumo({ ins, categorias, unidades, onClose }) {
  const [tab, setTab] = useState("info");

  const cat    = (categorias ?? []).find(c => c.id === ins.idCategoria) ?? { icon: "🧺", nombre: "—" };
  const unidad = (unidades   ?? []).find(u => u.id === ins.idUnidad)    ?? { simbolo: ins.simboloUnidad || "uds.", nombre: "Unidad" };
  const est    = calcEstado(ins.stockActual, ins.stockMinimo);

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

        <div className="ver-ins-tabs">
          <button className={`ver-ins-tab${tab === "info"     ? " ver-ins-tab--active" : ""}`} onClick={() => setTab("info")}>📋 Información</button>
          <button className={`ver-ins-tab${tab === "lotes"    ? " ver-ins-tab--active" : ""}`} onClick={() => setTab("lotes")}>📦 Lotes en inventario</button>
          <button className={`ver-ins-tab${tab === "vencidos" ? " ver-ins-tab--active" : ""}`} onClick={() => setTab("vencidos")}>🕒 Historial vencidos</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>

          {tab === "info" && (
            <>
              {est !== "disponible" && (
                <div className="ver-ins-alerta" style={{ borderColor: ec.border, background: ec.bg, color: ec.color, marginBottom: 12 }}>
                  {ec.icon} <strong>{ec.label}</strong>
                  {est === "bajo"    && ` — faltan ${ins.stockMinimo - ins.stockActual} ${unidad.simbolo} para alcanzar el mínimo`}
                  {est === "agotado" && " — este insumo no tiene stock disponible"}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Columna izquierda: clasificación */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                </div>

                {/* Columna derecha: stock */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="ver-ins-stock-cards" style={{ marginBottom: 0 }}>
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
                  </div>
                  <StockBar actual={ins.stockActual} minimo={ins.stockMinimo} />
                </div>
              </div>
            </>
          )}

          {(tab === "lotes" || tab === "vencidos") && (
            <div style={{ textAlign: "center", padding: "32px 20px", color: "#9e9e9e" }}>
              <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>
                {tab === "lotes" ? "📦" : "⏰"}
              </span>
              <p style={{ margin: 0, fontSize: 13 }}>
                {tab === "lotes"
                  ? "La gestión de lotes estará disponible próximamente."
                  : "El historial de vencidos estará disponible próximamente."}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
