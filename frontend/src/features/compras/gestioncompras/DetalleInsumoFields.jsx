import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { GRUPO_UNIDAD, CANT_MAX, soloNumero, unidadesDelGrupo } from "./compraDetalleUtils.js";

/* ───────────────────────────────────────────────────────────
   Selector de insumo con buscador (idéntico en crear y editar).
─────────────────────────────────────────────────────────── */
export function InsumoSelect({ value, insumosActivos, idsSeleccionados, onChange, error, disabled = false }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  const selected = insumosActivos.find((i) => String(i.id) === String(value));
  const filtered = insumosActivos.filter((i) =>
    i.nombre.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setOpen((o) => !o);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`field-select ${error ? "error" : ""}`}
        style={{
          width: "100%", textAlign: "left", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 6,
          opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected ? "#222" : "#9e9e9e", flex: 1 }}>
          {selected
            ? `${selected.nombre}${selected.unidad ? ` (${selected.unidad})` : ""}`
            : "— Seleccionar insumo —"}
        </span>
        <span style={{ color: "#9e9e9e", flexShrink: 0 }}>▾</span>
      </button>

      {open && !disabled && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #d0e8d0", borderRadius: 10,
          boxShadow: "0 8px 28px rgba(0,0,0,0.13)", zIndex: 200, overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: "1px solid #f0f0f0", background: "#fafdf9" }}>
            <Search size={13} style={{ color: "#9e9e9e", flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar insumo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#333", fontFamily: "inherit" }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#bdbdbd", padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ maxHeight: 210, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12, color: "#9e9e9e", textAlign: "center" }}>
                Sin resultados para "{query}"
              </div>
            ) : filtered.map((ins) => {
              const isSelected = String(ins.id) === String(value);
              const isDisabled = idsSeleccionados.includes(String(ins.id)) && !isSelected;
              return (
                <button
                  key={ins.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { onChange(ins); setOpen(false); setQuery(""); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 12px",
                    border: "none", background: isSelected ? "#e8f5e9" : "transparent",
                    color: isDisabled ? "#bdbdbd" : isSelected ? "#2e7d32" : "#333",
                    fontSize: 13, cursor: isDisabled ? "not-allowed" : "pointer",
                    fontWeight: isSelected ? 700 : 400,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontFamily: "inherit",
                  }}
                >
                  <span>{ins.nombre}</span>
                  {ins.unidad && (
                    <span style={{ fontSize: 11, color: isDisabled ? "#d0d0d0" : "#9e9e9e", flexShrink: 0, marginLeft: 8 }}>
                      {ins.unidad}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Campos de una línea de insumo desplegada — MISMO layout en
   crear y editar (3.9). El contenedor, la numeración y el
   colapso los aporta el padre.

   props:
   - detalle: { idInsumo, idUnidad, cantidad, precioUnd,
                vencimientoTipo, vencimientoValor, fechaVencimiento }
   - index, insumosActivos, idsSeleccionados, errors
   - onInsumoChange(ins), onField(field, value), onRemove()
   - disabled (solo lectura)
   - showVencimiento (editar de compra completada oculta el vencimiento)
─────────────────────────────────────────────────────────── */
export default function DetalleInsumoFields({
  detalle: d,
  index: i,
  insumosActivos,
  idsSeleccionados,
  errors = {},
  onInsumoChange,
  onField,
  onRemove,
  disabled = false,
  showVencimiento = true,
}) {
  const hoy = new Date().toISOString().split("T")[0];
  const insSelect  = insumosActivos.find((ins) => String(ins.id) === String(d.idInsumo));
  const grupoActual = GRUPO_UNIDAD[Number(d.idUnidad)];
  const soloEntero  = grupoActual === "und";
  const opciones    = insSelect ? unidadesDelGrupo(insSelect.idUnidad) : [];

  return (
    <>
      {/* Línea 1: número + selector + eliminar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9e9e9e", flexShrink: 0, minWidth: 20 }}>
          {String(i + 1).padStart(2, "0")}
        </span>
        <InsumoSelect
          value={d.idInsumo}
          insumosActivos={insumosActivos}
          idsSeleccionados={idsSeleccionados}
          error={errors[`ins_${i}`]}
          disabled={disabled}
          onChange={onInsumoChange}
        />
        {onRemove && !disabled && (
          <button className="detalle-remove-btn" type="button" onClick={onRemove}><X size={16} /></button>
        )}
      </div>
      {errors[`ins_${i}`] && <span className="field-error" style={{ marginBottom: 6, display: "block" }}>{errors[`ins_${i}`]}</span>}

      {/* Línea 2: cantidad | precio | vencimiento */}
      <div style={{ display: "grid", gridTemplateColumns: showVencimiento ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, paddingLeft: 28 }}>

        {/* Cantidad + unidad */}
        <div>
          <label className="field-label" style={{ fontSize: 10 }}>Cantidad</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number"
              className={`field-input ${errors[`cant_${i}`] ? "error" : ""}`}
              placeholder="0"
              min="0.001"
              max={CANT_MAX}
              step={soloEntero ? "1" : "0.001"}
              value={d.cantidad}
              disabled={disabled}
              onChange={(e) => { if (soloNumero(e.target.value)) onField("cantidad", e.target.value); }}
              style={{ flex: 1, minWidth: 0 }}
            />
            {opciones.length <= 1
              ? (insSelect?.unidad
                  ? <span style={{ display: "flex", alignItems: "center", padding: "0 8px", background: "#f5f5f5", border: "1.5px solid #e8e8e8", borderRadius: 7, fontSize: 11, color: "#555", fontWeight: 700, flexShrink: 0 }}>{insSelect.unidad}</span>
                  : null)
              : (
                <select
                  value={d.idUnidad}
                  disabled={disabled}
                  onChange={(e) => onField("idUnidad", e.target.value)}
                  style={{ flexShrink: 0, width: 68, borderRadius: 7, border: "1.5px solid #e0e0e0", background: "#fff", fontSize: 12, fontWeight: 700, color: "#333", cursor: "pointer", padding: "0 4px" }}
                >
                  {opciones.map((u) => <option key={u.id} value={String(u.id)}>{u.simbolo}</option>)}
                </select>
              )}
          </div>
          {errors[`cant_${i}`] && <span className="field-error" style={{ fontSize: 10 }}>{errors[`cant_${i}`]}</span>}
        </div>

        {/* Precio unitario */}
        <div>
          <label className="field-label" style={{ fontSize: 10 }}>Precio unitario</label>
          <input
            type="number"
            min="0"
            className={`field-input ${errors[`precio_${i}`] ? "error" : ""}`}
            placeholder="$ 0"
            value={d.precioUnd}
            disabled={disabled}
            onChange={(e) => { if (soloNumero(e.target.value)) onField("precioUnd", e.target.value); }}
          />
          {errors[`precio_${i}`] && <span className="field-error" style={{ fontSize: 10 }}>{errors[`precio_${i}`]}</span>}
        </div>

        {/* Vencimiento — toggle + input en una línea */}
        {showVencimiento && (
          <div>
            <label className="field-label" style={{ fontSize: 10 }}>Vencimiento</label>
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button"
                disabled={disabled}
                onClick={() => onField("vencimientoTipo", "dias")}
                style={{ flexShrink: 0, padding: "0 8px", height: 36, borderRadius: 7, border: `1.5px solid ${d.vencimientoTipo === "dias" ? "#4caf50" : "#e0e0e0"}`, background: d.vencimientoTipo === "dias" ? "#e8f5e9" : "#fff", color: d.vencimientoTipo === "dias" ? "#2e7d32" : "#9e9e9e", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>
                Días
              </button>
              <button type="button"
                disabled={disabled}
                onClick={() => onField("vencimientoTipo", "fecha")}
                style={{ flexShrink: 0, padding: "0 8px", height: 36, borderRadius: 7, border: `1.5px solid ${d.vencimientoTipo === "fecha" ? "#4caf50" : "#e0e0e0"}`, background: d.vencimientoTipo === "fecha" ? "#e8f5e9" : "#fff", color: d.vencimientoTipo === "fecha" ? "#2e7d32" : "#9e9e9e", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>
                Fecha
              </button>
              {d.vencimientoTipo === "dias" ? (
                <input type="number" min="1" className="field-input" style={{ flex: 1 }}
                  placeholder="30" value={d.vencimientoValor} disabled={disabled}
                  onChange={(e) => { if (soloNumero(e.target.value)) onField("vencimientoValor", e.target.value); }} />
              ) : (
                <input type="date" min={hoy} className={`field-input ${errors[`venc_${i}`] ? "error" : ""}`} style={{ flex: 1 }}
                  value={d.fechaVencimiento} disabled={disabled}
                  onChange={(e) => onField("fechaVencimiento", e.target.value)} />
              )}
            </div>
            {errors[`venc_${i}`] && <span className="field-error" style={{ fontSize: 10 }}>{errors[`venc_${i}`]}</span>}
          </div>
        )}
      </div>
    </>
  );
}

