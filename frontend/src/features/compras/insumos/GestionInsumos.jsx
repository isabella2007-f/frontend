import { useState, useEffect, useRef } from "react";
import { usePrivilegio } from "../../../context/PrivilegiosContext";
import { registrarSalida, procesarVencidos } from "../../../services/salidasService";
import CrearInsumo from "./CrearInsumo.jsx";
import EditarInsumo from "./EditarInsumo.jsx";
import VerInsumo from "./VerInsumo.jsx";
import SalidaModal from "../../produccion/Productos/SalidaModal.jsx";
import ModalEliminarValidado from "../../../ModalEliminarValidado";
import { getInsumos, crearInsumo, editarInsumo, eliminarInsumo, toggleEstadoInsumo } from "../../../services/insumosService.js";
import { getCategorias } from "../../../services/categoriasInsumosService.js";
import "./GestionInsumos.css";

const ITEMS_PER_PAGE = 10;

export const UNIDADES = [
  { id: 1, nombre: "Kilogramo", simbolo: "kg"   },
  { id: 2, nombre: "Gramo",     simbolo: "g"    },
  { id: 3, nombre: "Litro",     simbolo: "L"    },
  { id: 4, nombre: "Mililitro", simbolo: "ml"   },
  { id: 5, nombre: "Unidad",    simbolo: "uds." },
  { id: 6, nombre: "Libra",     simbolo: "lb"   },
];

const ADAPT_INSUMO = raw => ({
  id:               raw.ID_Insumo,
  nombre:           raw.Nombre,
  idCategoria:      raw.ID_Categoria,
  idUnidad:         raw.Unidad_Medida,
  stockActual:      raw.Stock_Actual,
  stockMinimo:      raw.Stock_Minimo,
  estado:           raw.Estado === 1,
  simboloUnidad:    raw.simbolo_unidad ?? "",
  proxVencimiento:  raw.proximo_vencimiento ?? null,
  diasParaVencer:   raw.dias_para_vencer ?? null,
  loteId:           raw.lote_id ?? null,
  tieneFicha:       raw.tiene_ficha_tecnica ?? false,
  tieneOrden:       raw.tiene_orden_produccion ?? false,
});

const ADAPT_CAT = raw => ({
  id:          raw.ID_Categoria,
  nombre:      raw.Nombre_Categoria,
  descripcion: raw.Descripcion ?? "",
  icon:        raw.Icono ?? "🧺",
  estado:      raw.Estado === 1,
});

function calcEstado(actual, minimo) {
  if (actual === 0)    return "agotado";
  if (actual < minimo) return "bajo";
  return "disponible";
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#c62828", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "0 2px 8px rgba(198,40,40,0.3)" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label" style={{ color:"black" }}>{value ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

function StockBar({ actual, minimo, simbolo = "" }) {
  const [hovered, setHovered] = useState(false);
  const pct   = minimo > 0 ? Math.min(100, Math.round((actual / (minimo * 2)) * 100)) : 100;
  const est   = calcEstado(actual, minimo);
  const color = est === "agotado" ? "#ef5350" : est === "bajo" ? "#ffa726" : "#43a047";
  const tipMap = {
    disponible: { label: "Disponible", bg: "#e8f5e9", border: "#a5d6a7", text: "#2e7d32" },
    bajo:       { label: "Stock bajo", bg: "#fff8e1", border: "#ffe082", text: "#f57f17" },
    agotado:    { label: "Agotado",    bg: "#ffebee", border: "#ef9a9a", text: "#c62828" },
  };
  const tip = tipMap[est];
  return (
    <div className="stock-cell" style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="stock-bar-wrap" style={est === "agotado" ? { background: "#ffcdd2" } : undefined}>
        <div className="stock-bar" style={{ width: est === "agotado" ? "100%" : pct + "%", background: color }} />
      </div>
      <span className="stock-nums" style={est === "agotado" ? { color: "#c62828" } : undefined}>
        <strong>{actual}</strong>{simbolo ? ` ${simbolo}` : ""} / mín {minimo}{simbolo ? ` ${simbolo}` : ""}
      </span>
      {est !== "disponible" && (
        <span style={{ fontSize: 10, fontWeight: 700, color: est === "agotado" ? "#c62828" : "#e65100", whiteSpace: "nowrap" }}>
          {est === "agotado" ? "🚫 Agotado" : "⚠ Bajo mínimo"}
        </span>
      )}
      {hovered && (
        <div className="stock-tooltip" style={{ background: tip.bg, border: `1px solid ${tip.border}`, color: tip.text }}>
          <span className="stock-tooltip__dot" style={{ background: color }} />
          {tip.label}
          {est === "bajo" && <span style={{ fontWeight: 400, opacity: 0.8 }}> · faltan {minimo - actual}</span>}
        </div>
      )}
    </div>
  );
}

function CatCell({ cat }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ width: 34, height: 34, borderRadius: 8, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "default" }}>
        {cat?.icon || "🧺"}
      </span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 999, pointerEvents: "none" }}>
          {cat?.nombre || "—"}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1a1a1a" }} />
        </span>
      )}
    </span>
  );
}

function VencCell({ fecha, dias }) {
  const [hovered, setHovered] = useState(false);

  if (!fecha) return <span style={{ fontSize: 13, color: "#bdbdbd", fontWeight: 500 }}>—</span>;

  const [y, m, d] = fecha.split("-");
  const label = `${d}/${m}/${y}`;

  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: { position: "relative", cursor: "default" },
  };

  const Tooltip = ({ bg, border, color, text }) => hovered ? (
    <div style={{
      position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
      transform: "translateX(-50%)", whiteSpace: "nowrap",
      background: bg, border: `1px solid ${border}`, color,
      borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700,
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 99, pointerEvents: "none",
    }}>
      {text}
    </div>
  ) : null;

  if (dias <= 0) return (
    <span {...handlers} style={{ ...handlers.style, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#c62828", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 6, padding: "3px 8px" }}>
      ⚠️ Vencido
      <Tooltip bg="#ffebee" border="#ef9a9a" color="#c62828" text="Este insumo ya está vencido — no apto para producción" />
    </span>
  );
  if (dias <= 7) return (
    <span {...handlers} style={{ ...handlers.style, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#e65100", background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 6, padding: "3px 8px" }}>
      🔴 {label} <span style={{ fontWeight: 400, opacity: 0.8 }}>({dias}d)</span>
      <Tooltip bg="#fff3e0" border="#ffcc80" color="#e65100" text={`⚠️ Vence en ${dias} día${dias === 1 ? "" : "s"} — atención urgente`} />
    </span>
  );
  if (dias <= 30) return (
    <span {...handlers} style={{ ...handlers.style, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#f57f17", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 6, padding: "3px 8px" }}>
      🟡 {label} <span style={{ fontWeight: 400, opacity: 0.8 }}>({dias}d)</span>
      <Tooltip bg="#fff8e1" border="#ffe082" color="#f57f17" text={`Próximo a vencer — quedan ${dias} días`} />
    </span>
  );
  return (
    <span {...handlers} style={{ ...handlers.style, fontSize: 12, fontWeight: 600, color: "#616161" }}>
      {label}
      <Tooltip bg="#f5f5f5" border="#e0e0e0" color="#424242" text={`Vence el ${label} — quedan ${dias} días`} />
    </span>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <tr key={i} className="tbl-row">
      <td><div className="skeleton-cell" style={{ width: 28 }} /></td>
      <td><div className="skeleton-cell" style={{ width: "70%" }} /></td>
      <td><div className="skeleton-cell" style={{ width: 34 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 56 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 120 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 52 }} /></td>
      <td><div className="skeleton-cell" style={{ width: 90 }} /></td>
    </tr>
  ));
}

export default function GestionInsumos() {
  const puedeCrear    = usePrivilegio("Insumos_crear");
  const puedeEditar   = usePrivilegio("Insumos_editar");
  const puedeEliminar = usePrivilegio("Insumos_eliminar");

  const [insumos,    setInsumos]    = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("todas");
  const [filterEst,  setFilterEst]  = useState("todos");
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const filterRef = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [insData, catData] = await Promise.all([getInsumos(), getCategorias()]);
      setInsumos((insData.insumos ?? []).map(ADAPT_INSUMO));
      setCategorias((catData.categorias ?? []).map(ADAPT_CAT));
    } catch (e) {
      showToast(e.message || "Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    procesarVencidos()
      .then(res => { if (res?.procesados > 0) cargarDatos(); })
      .catch(() => {});
    cargarDatos();
  }, []);

  const getCatInsumo = (idCat) => categorias.find(c => c.id === idCat) ?? { icon: "🧺", nombre: "—" };
  const getUnidad    = (idU)   => UNIDADES.find(u => u.id === idU) ?? { simbolo: "uds.", nombre: "Unidad" };

  /* ── Filtrado ── */
  const filtered = insumos.filter(ins => {
    const q        = search.toLowerCase();
    const cat      = getCatInsumo(ins.idCategoria);
    const matchQ   = ins.nombre.toLowerCase().includes(q) || cat.nombre.toLowerCase().includes(q);
    const matchCat = filterCat === "todas" || ins.idCategoria === Number(filterCat);
    const est      = calcEstado(ins.stockActual, ins.stockMinimo);
    const matchEst = filterEst === "todos" || filterEst === est ||
      (filterEst === "activo" && ins.estado) ||
      (filterEst === "inactivo" && !ins.estado);
    return matchQ && matchCat && matchEst;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search, filterCat, filterEst]);

  const hasFilter = filterCat !== "todas" || filterEst !== "todos";

  /* ── Toggle optimista ── */
  const handleToggle = async (ins) => {
    setInsumos(prev => prev.map(i => i.id === ins.id ? { ...i, estado: !i.estado } : i));
    try {
      await toggleEstadoInsumo(ins.id, ins.estado);
    } catch (e) {
      setInsumos(prev => prev.map(i => i.id === ins.id ? { ...i, estado: ins.estado } : i));
      showToast(e.message || "Error al cambiar estado", "error");
    }
  };

  /* ── CRUD ── */
  const handleCreate = async (payload) => {
    try {
      await crearInsumo(payload);
      showToast("Insumo creado");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al crear el insumo", "error");
    }
  };

  const handleEdit = async (payload) => {
    try {
      await editarInsumo(modal.ins.id, payload);
      showToast("Cambios guardados");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al guardar cambios", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await eliminarInsumo(modal.ins.id);
      showToast("Insumo eliminado", "error");
      setModal(null);
      cargarDatos();
    } catch (e) {
      showToast(e.message || "Error al eliminar el insumo", "error");
    }
  };

  const handleSalida = async (payload) => {
    try {
      await registrarSalida({
        tipo:     payload.tipo,
        idInsumo: payload.id,
        cantidad: payload.cantidad,
        motivo:   payload.motivo,
      });
      await cargarDatos();
      showToast("Salida registrada y stock actualizado");
    } catch (e) {
      showToast(e.message || "Error en la salida", "error");
    }
    setModal(null);
  };

  const categoriasActivas = categorias.filter(c => c.estado);

  const filterEstOptions = [
    { val: "todos",      label: "Todos",      dot: "#bdbdbd" },
    { val: "disponible", label: "Disponible", dot: "#43a047" },
    { val: "bajo",       label: "Stock bajo", dot: "#ffa726" },
    { val: "agotado",    label: "Agotado",    dot: "#ef5350" },
    { val: "activo",     label: "Activo",     dot: "#43a047" },
    { val: "inactivo",   label: "Inactivo",   dot: "#9e9e9e" },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Insumos</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input"
              placeholder="Buscar por nombre o categoría…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${hasFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown filter-dropdown--wide">
                <div className="filter-dropdown__section">
                  <p className="filter-section-title">Categoría</p>
                  <div className="filter-grid">
                    <button className={`filter-option${filterCat === "todas" ? " active" : ""}`}
                      onClick={() => { setFilterCat("todas"); setShowFilter(false); }}>
                      <span className="filter-dot" style={{ background: "#bdbdbd" }} />Todas
                    </button>
                    {categorias.map(c => (
                      <button key={c.id}
                        className={`filter-option${filterCat === c.id ? " active" : ""}`}
                        onClick={() => { setFilterCat(c.id); setShowFilter(false); }}>
                        <span style={{ fontSize: 14 }}>{c.icon}</span>{c.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-dropdown__section" style={{ marginTop: 12 }}>
                  <p className="filter-section-title">Estado</p>
                  <div className="filter-grid">
                    {filterEstOptions.map(f => (
                      <button key={f.val}
                        className={`filter-option${filterEst === f.val ? " active" : ""}`}
                        onClick={() => { setFilterEst(f.val); setShowFilter(false); }}>
                        <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(hasFilter || search) && (
            <button className="btn-limpiar" onClick={() => { setSearch(""); setFilterCat("todas"); setFilterEst("todos"); }}>
              ✕ Limpiar
            </button>
          )}

          {puedeCrear && (
            <button className="btn-agregar" onClick={() => setModal({ type: "crear" })}>
              Agregar <span style={{ fontSize: 18 }}>+</span>
            </button>
          )}
        </div>

        <div className="card">
          <div className="tbl-wrapper">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Insumo</th>
                  <th>Categoría</th>
                  <th>Lote</th>
                  <th>Stock</th>
                  <th>Próx. Venc.</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🧺</div>
                        <p className="empty-state__text">
                          {hasFilter || search ? "Sin insumos que coincidan." : "Sin insumos registrados"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((ins, idx) => {
                  const cat    = getCatInsumo(ins.idCategoria);
                  const unidad = getUnidad(ins.idUnidad);
                  return (
                    <tr key={ins.id} className="tbl-row">
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#bdbdbd" }}>
                          {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <div className="insumo-name-cell">
                          <span className="insumo-name">{ins.nombre}</span>
                          <span className="insumo-id">#{String(ins.id).padStart(4, "0")} ({unidad.simbolo})</span>
                        </div>
                      </td>
                      <td><CatCell cat={cat} /></td>
                      <td>
                        {ins.loteId
                          ? <span style={{ fontSize: 11, fontWeight: 700, color: "#1565c0", background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 6, padding: "3px 8px" }}>#{String(ins.loteId).padStart(4, "0")}</span>
                          : <span style={{ fontSize: 13, color: "#bdbdbd", fontWeight: 500 }}>—</span>
                        }
                      </td>
                      <td><StockBar actual={ins.stockActual} minimo={ins.stockMinimo} simbolo={ins.simboloUnidad} /></td>
                      <td><VencCell fecha={ins.proxVencimiento} dias={ins.diasParaVencer} /></td>
                      <td><Toggle value={ins.estado} onChange={() => handleToggle(ins)} /></td>
                      <td>
                        <div className="actions-cell">
                          <button className="act-btn act-btn--view"   title="Ver detalle"      onClick={() => setModal({ type: "ver",      ins })}>👁</button>
                          {puedeEditar   && <button className="act-btn act-btn--edit"   title="Editar"           onClick={() => setModal({ type: "editar",   ins })}>✎</button>}
                          <button className="act-btn act-btn--salida" title="Registrar salida" onClick={() => setModal({ type: "salida",   ins })}>🚚</button>
                          {puedeEliminar && <button className="act-btn act-btn--delete" title="Eliminar"         onClick={() => setModal({ type: "eliminar", ins })}>🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "insumo" : "insumos"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(1)} disabled={safePage === 1}>«</button>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
              <button className="pg-btn-arrow" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "crear"  && (
        <CrearInsumo onClose={() => setModal(null)} onSave={handleCreate}
          categorias={categoriasActivas} unidades={UNIDADES} />
      )}
      {modal?.type === "editar" && (
        <EditarInsumo ins={modal.ins} onClose={() => setModal(null)} onSave={handleEdit}
          categorias={categoriasActivas} unidades={UNIDADES} />
      )}
      {modal?.type === "ver" && (
        <VerInsumo ins={modal.ins} categorias={categorias} unidades={UNIDADES} onClose={() => setModal(null)} />
      )}
      {modal?.type === "salida" && (
        <SalidaModal
          entidad={modal.ins}
          tipo="insumo"
          stockActual={modal.ins.stockActual}
          unidadLabel={getUnidad(modal.ins.idUnidad).simbolo}
          onClose={() => setModal(null)}
          onConfirm={handleSalida}
        />
      )}
      {modal?.type === "eliminar" && (
        (modal.ins.tieneFicha || modal.ins.tieneOrden) ? (
          <div className="modal-overlay" onClick={() => setModal(null)} style={{ zIndex: 30000 }}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <p className="modal-header__eyebrow">Gestión de Insumos</p>
                  <h2 className="modal-header__title">No se puede eliminar</h2>
                </div>
                <button className="modal-close-btn" onClick={() => setModal(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: "20px 24px 24px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, borderRadius: 10, background: "#fff3e0", border: "1px solid #ffcc80" }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>⚠️</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: "#e65100", fontSize: 14 }}>
                      El insumo está en uso y no puede eliminarse
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#424242" }}>
                      El insumo <strong>"{modal.ins.nombre}"</strong>
                      {modal.ins.tieneFicha && modal.ins.tieneOrden
                        ? " forma parte de fichas técnicas y está en órdenes de producción activas."
                        : modal.ins.tieneFicha
                        ? " forma parte de la receta de uno o más productos."
                        : " está actualmente en una o más órdenes de producción activas."
                      }
                      {" "}Retíralo de todos los registros antes de poder eliminarlo.
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-ghost" onClick={() => setModal(null)}>Entendido</button>
              </div>
            </div>
          </div>
        ) : (
          <ModalEliminarValidado
            titulo="Eliminar insumo"
            descripcion={`¿Está seguro de que desea eliminar el insumo "${modal.ins.nombre}"?`}
            validacion={{ ok: true }}
            onClose={() => setModal(null)}
            onConfirm={handleDelete}
          />
        )
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#c62828" : "#2e7d32" }}>
          <span className="toast-icon">{toast.type === "error" ? "🗑️" : "✅"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
