import { useState, useEffect, useRef } from "react";
import { useApp } from "../../AppContext.jsx";
import "./Salidas.css";

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function hoyISO() {
  return new Date().toISOString().split("T")[0];
}
function formatFecha(f) {
  if (!f) return "—";
  if (f.includes("/")) return f;
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}
function estaVencido(fechaVenc) {
  if (!fechaVenc) return false;
  return fechaVenc < hoyISO();
}
function diasParaVencer(fechaVenc) {
  if (!fechaVenc) return null;
  return Math.ceil((new Date(fechaVenc + "T00:00:00") - new Date(hoyISO() + "T00:00:00")) / 86400000);
}

const TIPOS = [
  { val: "vencido",    label: "Vencido",    icon: "🕒", color: "#e65100", bg: "#fff3e0", border: "#ffcc80" },
  { val: "dañado",     label: "Dañado",     icon: "💥", color: "#c62828", bg: "#ffebee", border: "#ef9a9a" },
  { val: "ajuste",     label: "Ajuste",     icon: "⚖️", color: "#1565c0", bg: "#e3f2fd", border: "#90caf9" },
  { val: "consumo",    label: "Consumo",    icon: "🍽️", color: "#4a148c", bg: "#f3e5f5", border: "#ce93d8" },
  { val: "devolucion", label: "Devolución", icon: "↩️", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" },
];

const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.val, t]));

/* ══════════════════════════════════════════════════════════
   TAB 1 — REGISTRAR SALIDA
══════════════════════════════════════════════════════════ */
function RegistrarSalida({ onSalidaRegistrada }) {
  const {
    productos, insumos,
    getCatProducto, getCatInsumo, getUnidad,
    registrarSalidaProducto, registrarSalidaInsumo,
  } = useApp();

  const [entidadTipo,  setEntidadTipo]  = useState("producto"); // "producto" | "insumo"
  const [busqueda,     setBusqueda]     = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [tipoSalida,   setTipoSalida]   = useState("vencido");
  const [cantidad,     setCantidad]     = useState("");
  const [motivo,       setMotivo]       = useState("");
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const lista = entidadTipo === "producto"
    ? productos.map(p => ({ ...p, _tipo: "producto", _stock: p.stock, _label: getCatProducto(p.idCategoria)?.nombre }))
    : insumos.map(i => ({ ...i, _tipo: "insumo",   _stock: i.stockActual, _label: getCatInsumo(i.idCategoria)?.nombre, _unidad: getUnidad(i.idUnidad)?.simbolo }));

  const filtrados = lista.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e._label || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const unidadLabel = seleccionado?._tipo === "insumo"
    ? (getUnidad(seleccionado.idUnidad)?.simbolo || "uds.")
    : "uds.";

  const stockActual = seleccionado?._stock ?? 0;

  const validate = () => {
    const e = {};
    if (!seleccionado)                                         e.seleccionado = "Selecciona un producto o insumo";
    if (!cantidad || isNaN(cantidad) || Number(cantidad) <= 0) e.cantidad     = "Ingresa una cantidad válida";
    else if (Number(cantidad) > stockActual)                   e.cantidad     = `Máximo: ${stockActual} ${unidadLabel}`;
    return e;
  };

  const handleRegistrar = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);

    const payload = {
      id:       seleccionado.id,
      tipo:     tipoSalida,
      cantidad: Number(cantidad),
      motivo:   motivo.trim() || tipoActual.label,
      fecha:    new Date().toLocaleDateString("es-CO"),
    };

    let result;
    if (seleccionado._tipo === "producto") {
      result = registrarSalidaProducto(payload);
    } else {
      result = registrarSalidaInsumo({
        idInsumo: payload.id,
        tipo:     payload.tipo,
        cantidad: payload.cantidad,
        motivo:   payload.motivo,
        fecha:    payload.fecha,
      });
    }

    if (result?.ok !== false) {
      showToast(`Salida registrada — ${seleccionado.nombre} (-${cantidad} ${unidadLabel})`);
      onSalidaRegistrada && onSalidaRegistrada();
      setSeleccionado(null);
      setBusqueda("");
      setCantidad("");
      setMotivo("");
      setErrors({});
    } else {
      showToast(result.razon || "Error al registrar", "error");
    }
    setSaving(false);
  };

  const tipoActual     = TIPO_MAP[tipoSalida];
  const stockDespues   = Math.max(0, stockActual - (Number(cantidad) || 0));
  const pct            = stockActual > 0 ? Math.min(100, Math.round((stockDespues / stockActual) * 100)) : 0;

  return (
    <div className="salidas-registrar-grid">

      {/* ── Panel izquierdo: selección ── */}
      <div className="salidas-panel">
        <p className="salidas-panel__title">1. Seleccionar elemento</p>

        {/* Tipo */}
        <div className="salidas-tipo-tabs">
          <button
            className={`salidas-tipo-tab${entidadTipo === "producto" ? " active" : ""}`}
            onClick={() => { setEntidadTipo("producto"); setSeleccionado(null); setBusqueda(""); }}>
            📦 Productos
          </button>
          <button
            className={`salidas-tipo-tab${entidadTipo === "insumo" ? " active" : ""}`}
            onClick={() => { setEntidadTipo("insumo"); setSeleccionado(null); setBusqueda(""); }}>
            🧺 Insumos
          </button>
        </div>

        {/* Búsqueda */}
        <div className="salidas-search">
          <span className="salidas-search__icon">🔍</span>
          <input
            className="salidas-search__input"
            placeholder="Buscar por nombre o categoría…"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setErrors(p => ({ ...p, seleccionado: "" })); }}
          />
        </div>

        {/* Lista */}
        <div className="salidas-lista">
          {filtrados.length === 0 ? (
            <div className="salidas-lista__empty">Sin resultados</div>
          ) : filtrados.map(item => {
            const stock  = item._stock;
            const minimo = item.stockMinimo ?? item.stockMinimo ?? 10;
            const bajo   = stock < minimo && stock > 0;
            const agot   = stock === 0;
            return (
              <button
                key={item.id}
                className={`salidas-lista__item${seleccionado?.id === item.id && seleccionado?._tipo === item._tipo ? " selected" : ""}`}
                onClick={() => { setSeleccionado(item); setErrors(p => ({ ...p, seleccionado: "" })); }}
              >
                <div className="salidas-lista__item-name">{item.nombre}</div>
                <div className="salidas-lista__item-meta">
                  <span className="salidas-lista__item-cat">{item._label}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: agot ? "#c62828" : bajo ? "#f57f17" : "#2e7d32" }}>
                    {stock} {item._unidad || "uds."}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {errors.seleccionado && <p className="field-error" style={{ marginTop: 6 }}>{errors.seleccionado}</p>}
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="salidas-panel">
        <p className="salidas-panel__title">2. Registrar salida</p>

        {/* Elemento seleccionado */}
        {seleccionado ? (
          <div className="salidas-seleccionado">
            <span style={{ fontSize: 22 }}>{seleccionado._tipo === "producto" ? "📦" : "🧺"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{seleccionado.nombre}</div>
              <div style={{ fontSize: 12, color: "#9e9e9e" }}>
                Stock actual: <strong style={{ color: "#2e7d32" }}>{stockActual} {unidadLabel}</strong>
              </div>
            </div>
            <button
              onClick={() => { setSeleccionado(null); setCantidad(""); setErrors({}); }}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#bdbdbd" }}>✕</button>
          </div>
        ) : (
          <div className="salidas-seleccionado salidas-seleccionado--empty">
            <span style={{ fontSize: 28, opacity: 0.3 }}>👈</span>
            <span style={{ fontSize: 13, color: "#bdbdbd" }}>Selecciona un elemento de la lista</span>
          </div>
        )}

        {/* Tipo de salida */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="salidas-form-label">Tipo de salida</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {TIPOS.map(t => (
              <button key={t.val} onClick={() => setTipoSalida(t.val)}
                style={{
                  padding: "8px 6px", borderRadius: 9,
                  border: `2px solid ${tipoSalida === t.val ? t.border : "#e0e0e0"}`,
                  background: tipoSalida === t.val ? t.bg : "#fafafa",
                  color: tipoSalida === t.val ? t.color : "#9e9e9e",
                  fontWeight: tipoSalida === t.val ? 700 : 500,
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cantidad */}
        <div className="form-group">
          <label className="salidas-form-label">Cantidad a descontar</label>
          <div style={{ position: "relative" }}>
            <input
              type="number" min="1" max={stockActual}
              className={`salidas-input${errors.cantidad ? " salidas-input--error" : ""}`}
              value={cantidad}
              onChange={e => { setCantidad(e.target.value); setErrors(p => ({ ...p, cantidad: "" })); }}
              placeholder={seleccionado ? `Máx. ${stockActual}` : "—"}
              disabled={!seleccionado}
            />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9e9e9e", pointerEvents: "none" }}>
              {unidadLabel}
            </span>
          </div>
          {errors.cantidad && <p className="field-error">{errors.cantidad}</p>}
        </div>

        {/* Preview stock resultante */}
        {seleccionado && cantidad && !errors.cantidad && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: tipoActual.bg, border: `1px solid ${tipoActual.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "#9e9e9e" }}>Stock después de la salida</span>
              <span style={{ fontWeight: 700, color: tipoActual.color }}>{stockDespues} {unidadLabel}</span>
            </div>
            <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, transition: "width 0.35s", width: pct + "%", background: pct > 50 ? "#43a047" : pct > 20 ? "#ffa726" : "#ef5350" }} />
            </div>
          </div>
        )}

        {/* Motivo */}
        <div className="form-group">
          <label className="salidas-form-label">Motivo <span style={{ color: "#bdbdbd", fontWeight: 400 }}>(opcional)</span></label>
          <input
            className="salidas-input"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Descripción adicional…"
            disabled={!seleccionado}
          />
        </div>

        {/* Botón */}
        <button
          className="salidas-btn-registrar"
          onClick={handleRegistrar}
          disabled={saving || !seleccionado}
          style={{ background: tipoActual.color }}
        >
          {saving ? "Registrando…" : `${tipoActual.icon} Registrar ${tipoActual.label.toLowerCase()}`}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="salidas-toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
          <span>{toast.type === "error" ? "❌" : "✅"}</span> {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — HISTORIAL DE SALIDAS
══════════════════════════════════════════════════════════ */
function HistorialSalidas() {
  const { productos, insumos, getSalidasProducto, getSalidasInsumo, getCatProducto, getCatInsumo } = useApp();

  const [filtroTipo,     setFiltroTipo]     = useState("todos");
  const [filtroEntidad,  setFiltroEntidad]  = useState("todos"); // "todos" | "producto" | "insumo"
  const [busqueda,       setBusqueda]       = useState("");
  const [showFilter,     setShowFilter]     = useState(false);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Construir listado unificado
  const todasSalidas = [
    ...productos.flatMap(p => {
      const salidas = getSalidasProducto ? getSalidasProducto(p.id) : [];
      return salidas.map(s => ({
        ...s,
        entidadTipo: "producto",
        entidadNombre: p.nombre,
        entidadCat: getCatProducto(p.idCategoria)?.nombre || "—",
        unidad: "uds.",
      }));
    }),
    ...insumos.flatMap(i => {
      const salidas = getSalidasInsumo ? getSalidasInsumo(i.id) : [];
      return salidas.map(s => ({
        ...s,
        entidadTipo: "insumo",
        entidadNombre: i.nombre,
        entidadCat: getCatInsumo(i.idCategoria)?.nombre || "—",
        unidad: "uds.",
      }));
    }),
  ].sort((a, b) => {
    const fa = a.fecha?.split("/").reverse().join("-") || "";
    const fb = b.fecha?.split("/").reverse().join("-") || "";
    return fb.localeCompare(fa);
  });

  const filtradas = todasSalidas.filter(s => {
    const matchTipo    = filtroTipo    === "todos"    || s.tipo === filtroTipo;
    const matchEntidad = filtroEntidad === "todos"    || s.entidadTipo === filtroEntidad;
    const matchQ       = s.entidadNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                         s.motivo?.toLowerCase().includes(busqueda.toLowerCase());
    return matchTipo && matchEntidad && matchQ;
  });

  // Stats rápidas
  const totalUnidades = todasSalidas.reduce((acc, s) => acc + s.cantidad, 0);

  return (
    <div>
      {/* Stats */}
      <div className="salidas-stats-row">
        <div className="salidas-stat-card">
          <span className="salidas-stat-card__num">{todasSalidas.length}</span>
          <span className="salidas-stat-card__label">Total salidas</span>
        </div>
        <div className="salidas-stat-card">
          <span className="salidas-stat-card__num">{totalUnidades}</span>
          <span className="salidas-stat-card__label">Unidades descontadas</span>
        </div>
        {TIPOS.map(t => {
          const count = todasSalidas.filter(s => s.tipo === t.val).length;
          return (
            <div key={t.val} className="salidas-stat-card" style={{ borderColor: count > 0 ? t.border : "#e0e0e0" }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span className="salidas-stat-card__num" style={{ color: count > 0 ? t.color : "#bdbdbd" }}>{count}</span>
              <span className="salidas-stat-card__label">{t.label}</span>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="salidas-toolbar">
        <div className="salidas-search" style={{ flex: 1 }}>
          <span className="salidas-search__icon">🔍</span>
          <input className="salidas-search__input" placeholder="Buscar por nombre o motivo…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div ref={filterRef} style={{ position: "relative" }}>
          <button className="salidas-filter-btn" onClick={() => setShowFilter(v => !v)}>▼ Filtrar</button>
          {showFilter && (
            <div className="salidas-filter-dropdown">
              <p className="salidas-filter-title">Tipo de salida</p>
              {["todos", ...TIPOS.map(t => t.val)].map(val => {
                const t = TIPO_MAP[val];
                return (
                  <button key={val} className={`salidas-filter-opt${filtroTipo === val ? " active" : ""}`}
                    onClick={() => setFiltroTipo(val)}>
                    <span>{t?.icon || "📋"}</span>
                    {val === "todos" ? "Todos los tipos" : t?.label}
                  </button>
                );
              })}
              <div className="salidas-filter-divider" />
              <p className="salidas-filter-title">Tipo de elemento</p>
              {[
                { val: "todos",    label: "Todos",     icon: "📋" },
                { val: "producto", label: "Productos", icon: "📦" },
                { val: "insumo",   label: "Insumos",   icon: "🧺" },
              ].map(opt => (
                <button key={opt.val} className={`salidas-filter-opt${filtroEntidad === opt.val ? " active" : ""}`}
                  onClick={() => { setFiltroEntidad(opt.val); setShowFilter(false); }}>
                  <span>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="salidas-card">
        {filtradas.length === 0 ? (
          <div className="salidas-empty">
            <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>📋</div>
            <p>No hay salidas registradas aún</p>
          </div>
        ) : (
          <table className="salidas-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Elemento</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s, idx) => {
                const tc = TIPO_MAP[s.tipo] || { color: "#757575", bg: "#f5f5f5", border: "#e0e0e0", icon: "📋", label: s.tipo };
                return (
                  <tr key={s.id || idx} className="salidas-table__row">
                    <td>
                      <span className="salidas-tipo-badge" style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.border}` }}>
                        {tc.icon} {tc.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{s.entidadTipo === "producto" ? "📦" : "🧺"}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{s.entidadNombre}</div>
                          <div style={{ fontSize: 11, color: "#9e9e9e" }}>{s.entidadTipo}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12, color: "#616161" }}>{s.entidadCat}</span></td>
                    <td><span style={{ fontWeight: 700, color: "#c62828", fontSize: 14 }}>-{s.cantidad} <span style={{ fontWeight: 400, fontSize: 11, color: "#9e9e9e" }}>{s.unidad}</span></span></td>
                    <td><span style={{ fontSize: 13, color: "#424242" }}>{s.motivo || "—"}</span></td>
                    <td><span style={{ fontSize: 12, color: "#9e9e9e" }}>{s.fecha || "—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TAB 3 — VENCIDOS
══════════════════════════════════════════════════════════ */
function Vencidos() {
  const { productos, insumos, getLotesProducto, getLotesDeInsumo, getCatProducto, getCatInsumo, getUnidad } = useApp();
  const [filtro, setFiltro] = useState("todos"); // "todos" | "producto" | "insumo" | "por-vencer"

  // Lotes vencidos de productos
  const lotesProductosVencidos = productos.flatMap(p => {
    const lotes = getLotesProducto ? getLotesProducto(p.id) : [];
    return lotes
      .filter(l => l.fechaVencimiento && estaVencido(l.fechaVencimiento))
      .map(l => ({
        ...l,
        entidadTipo:   "producto",
        entidadNombre: p.nombre,
        entidadCat:    getCatProducto(p.idCategoria)?.nombre || "—",
        unidad:        "uds.",
      }));
  });

  // Lotes vencidos de insumos
  const lotesInsumosVencidos = insumos.flatMap(i => {
    const lotes = getLotesDeInsumo ? getLotesDeInsumo(i.id) : [];
    return lotes
      .filter(l => l.fechaVencimiento && estaVencido(l.fechaVencimiento))
      .map(l => ({
        ...l,
        entidadTipo:   "insumo",
        entidadNombre: i.nombre,
        entidadCat:    getCatInsumo(i.idCategoria)?.nombre || "—",
        unidad:        getUnidad(i.idUnidad)?.simbolo || "uds.",
      }));
  });

  // Lotes próximos a vencer (≤7 días, no vencidos)
  const lotesPorVencer = [
    ...productos.flatMap(p => {
      const lotes = getLotesProducto ? getLotesProducto(p.id) : [];
      return lotes.filter(l => {
        const dias = diasParaVencer(l.fechaVencimiento);
        return dias !== null && dias >= 0 && dias <= 7;
      }).map(l => ({ ...l, entidadTipo: "producto", entidadNombre: p.nombre, entidadCat: getCatProducto(p.idCategoria)?.nombre || "—", unidad: "uds." }));
    }),
    ...insumos.flatMap(i => {
      const lotes = getLotesDeInsumo ? getLotesDeInsumo(i.id) : [];
      return lotes.filter(l => {
        const dias = diasParaVencer(l.fechaVencimiento);
        return dias !== null && dias >= 0 && dias <= 7;
      }).map(l => ({ ...l, entidadTipo: "insumo", entidadNombre: i.nombre, entidadCat: getCatInsumo(i.idCategoria)?.nombre || "—", unidad: getUnidad(i.idUnidad)?.simbolo || "uds." }));
    }),
  ];

  const todosVencidos = [...lotesProductosVencidos, ...lotesInsumosVencidos]
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  const mostrar = filtro === "por-vencer" ? lotesPorVencer
    : filtro === "producto" ? lotesProductosVencidos
    : filtro === "insumo"   ? lotesInsumosVencidos
    : todosVencidos;

  return (
    <div>
      {/* Resumen */}
      <div className="salidas-stats-row">
        <div className="salidas-stat-card" style={{ borderColor: "#ef9a9a" }}>
          <span style={{ fontSize: 22 }}>⛔</span>
          <span className="salidas-stat-card__num" style={{ color: "#c62828" }}>{todosVencidos.length}</span>
          <span className="salidas-stat-card__label">Lotes vencidos</span>
        </div>
        <div className="salidas-stat-card" style={{ borderColor: "#ef9a9a" }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <span className="salidas-stat-card__num" style={{ color: "#c62828" }}>{lotesProductosVencidos.length}</span>
          <span className="salidas-stat-card__label">Productos</span>
        </div>
        <div className="salidas-stat-card" style={{ borderColor: "#ef9a9a" }}>
          <span style={{ fontSize: 22 }}>🧺</span>
          <span className="salidas-stat-card__num" style={{ color: "#c62828" }}>{lotesInsumosVencidos.length}</span>
          <span className="salidas-stat-card__label">Insumos</span>
        </div>
        <div className="salidas-stat-card" style={{ borderColor: "#ffcc80" }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span className="salidas-stat-card__num" style={{ color: "#e65100" }}>{lotesPorVencer.length}</span>
          <span className="salidas-stat-card__label">Por vencer (≤7 días)</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="salidas-toolbar">
        {[
          { val: "todos",      label: "Todos",           icon: "📋" },
          { val: "producto",   label: "Productos",       icon: "📦" },
          { val: "insumo",     label: "Insumos",         icon: "🧺" },
          { val: "por-vencer", label: "Por vencer",      icon: "⚠️" },
        ].map(opt => (
          <button key={opt.val}
            className={`salidas-filtro-pill${filtro === opt.val ? " active" : ""}`}
            onClick={() => setFiltro(opt.val)}>
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {mostrar.length === 0 ? (
        <div className="salidas-empty">
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>✅</div>
          <p>{filtro === "por-vencer" ? "No hay lotes próximos a vencer" : "No hay lotes vencidos"}</p>
        </div>
      ) : (
        <div className="vencidos-grid">
          {mostrar.map((lote, idx) => {
            const vencido = estaVencido(lote.fechaVencimiento);
            const dias    = diasParaVencer(lote.fechaVencimiento);
            return (
              <div key={lote.id || idx} className="vencido-card"
                style={{ borderColor: vencido ? "#ef9a9a" : "#ffcc80", background: vencido ? "#fff8f8" : "#fffdf0" }}>
                <div className="vencido-card__header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{lote.entidadTipo === "producto" ? "📦" : "🧺"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{lote.entidadNombre}</div>
                      <div style={{ fontSize: 11, color: "#9e9e9e" }}>{lote.entidadCat}</div>
                    </div>
                  </div>
                  <span className="vencido-card__badge"
                    style={{ background: vencido ? "#ffebee" : "#fff3e0", color: vencido ? "#c62828" : "#e65100", border: `1px solid ${vencido ? "#ef9a9a" : "#ffcc80"}` }}>
                    {vencido ? `Vencido` : `Vence en ${dias}d`}
                  </span>
                </div>
                <div className="vencido-card__body">
                  <div><span className="vencido-card__key">Lote</span><span className="vencido-card__val">{lote.id}</span></div>
                  <div><span className="vencido-card__key">Vencimiento</span><span className="vencido-card__val" style={{ color: vencido ? "#c62828" : "#e65100", fontWeight: 700 }}>{formatFecha(lote.fechaVencimiento)}</span></div>
                  <div><span className="vencido-card__key">Cantidad</span><span className="vencido-card__val">{lote.cantidadActual} {lote.unidad}</span></div>
                  <div><span className="vencido-card__key">Ingreso</span><span className="vencido-card__val">{formatFecha(lote.fechaIngreso)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL — GestionSalidas
══════════════════════════════════════════════════════════ */
export default function GestionSalidas() {
  const [tab, setTab]           = useState("registrar");
  const [refreshKey, setRefreshKey] = useState(0);

  const TABS = [
    { key: "registrar", label: "🚚 Registrar salida" },
    { key: "historial", label: "📋 Historial"        },
    { key: "vencidos",  label: "⛔ Vencidos"          },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Salidas</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* Tabs */}
        <div className="salidas-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`salidas-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="salidas-content">
          {tab === "registrar" && (
            <RegistrarSalida onSalidaRegistrada={() => setRefreshKey(k => k + 1)} />
          )}
          {tab === "historial" && <HistorialSalidas key={refreshKey} />}
          {tab === "vencidos"  && <Vencidos key={refreshKey} />}
        </div>
      </div>
    </div>
  );
}