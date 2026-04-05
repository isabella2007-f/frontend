import { useState, useRef, useEffect } from "react";
import { useApp, calcularTotal } from "../../../AppContext.jsx";
import CrearCompra from "./CrearCompra.jsx";
import EditarCompra, { AnularCompraModal } from "./EditarCompra.jsx";
import "./compras.css";

const ITEMS_PER_PAGE = 6;

const COP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const METODOS_LABEL = {
  efectivo:      { label: "Efectivo",      icon: "💵" },
  transferencia: { label: "Transferencia", icon: "🏦" },
};

/* ── Toast ────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}>
      <span style={{ fontSize: 15 }}>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function GestionCompras() {
  const {
    compras, proveedores,
    crearCompra, editarCompra, eliminarCompra, anularCompra,
    getProveedor,
  } = useApp();

  const [search,      setSearch]      = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterProv,   setFilterProv]   = useState("todos");
  const [showFilter,   setShowFilter]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);
  const [toast,        setToast]        = useState(null);
  const filterRef = useRef();

  /* Cerrar dropdown al hacer clic fuera */
  useEffect(() => {
    const h = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Filtrado ── */
  const filtered = compras.filter(c => {
    const prov = getProveedor(c.idProveedor);
    const q    = search.toLowerCase();
    const matchQ = (
      c.id.toLowerCase().includes(q) ||
      (prov?.responsable || "").toLowerCase().includes(q) ||
      (prov?.ciudad      || "").toLowerCase().includes(q) ||
      (c.metodoPago      || "").toLowerCase().includes(q) ||
      (c.notas           || "").toLowerCase().includes(q)
    );
    const matchEstado = filterEstado === "todos" || c.estado === filterEstado;
    const matchProv   = filterProv   === "todos" || c.idProveedor === filterProv;
    return matchQ && matchEstado && matchProv;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filterEstado, filterProv]);

  const hasFilter = filterEstado !== "todos" || filterProv !== "todos";

  /* ── Métricas rápidas ── */
  const totalPendientes  = compras.filter(c => c.estado === "pendiente").length;
  const totalCompletadas = compras.filter(c => c.estado === "completada").length;
  const totalAnuladas    = compras.filter(c => c.estado === "anulada").length;
  const montoTotal       = compras.filter(c => c.estado === "completada")
    .reduce((acc, c) => acc + calcularTotal(c.detalles), 0);

  /* ── CRUD handlers ── */
  const handleCreate = (form) => {
    crearCompra(form);
    showToast("Compra registrada correctamente");
    setModal(null);
  };

  const handleEdit = (form) => {
    editarCompra(form);
    showToast("Compra actualizada");
    setModal(null);
  };

  const handleAnular = (id) => {
    const result = anularCompra ? anularCompra(id) : eliminarCompra(id);
    if (result.ok) {
      showToast("Compra anulada", "error");
    } else {
      showToast(result.razon, "error");
    }
    setModal(null);
  };

  return (
    <div className="page-wrapper">

      {/* ENCABEZADO */}
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Compras</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* MÉTRICAS RÁPIDAS */}
        <div className="compras-metrics">
          <div className="metric-card">
            <span className="metric-card__icon">🛒</span>
            <div>
              <p className="metric-card__num">{compras.length}</p>
              <p className="metric-card__label">Total compras</p>
            </div>
          </div>
          <div className="metric-card metric-card--warn">
            <span className="metric-card__icon">⏳</span>
            <div>
              <p className="metric-card__num">{totalPendientes}</p>
              <p className="metric-card__label">Pendientes</p>
            </div>
          </div>
          <div className="metric-card metric-card--ok">
            <span className="metric-card__icon">✅</span>
            <div>
              <p className="metric-card__num">{totalCompletadas}</p>
              <p className="metric-card__label">Completadas</p>
            </div>
          </div>
          <div className="metric-card metric-card--danger">
            <span className="metric-card__icon">🚫</span>
            <div>
              <p className="metric-card__num">{totalAnuladas}</p>
              <p className="metric-card__label">Anuladas</p>
            </div>
          </div>
          <div className="metric-card metric-card--money">
            <span className="metric-card__icon">💰</span>
            <div>
              <p className="metric-card__num metric-card__num--sm">{COP(montoTotal)}</p>
              <p className="metric-card__label">Invertido (completadas)</p>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por ID, proveedor, método de pago…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filtros */}
          <div ref={filterRef} style={{ position: "relative" }}>
            <button
              className={"filter-icon-btn" + (hasFilter ? " has-filter" : "")}
              onClick={() => setShowFilter(v => !v)}
            >
              ▼
            </button>

            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 190 }}>

                {/* Por estado */}
                <p className="filter-section-title">Estado</p>
                {[
                  { val: "todos",      label: "Todos",       dot: "#bdbdbd" },
                  { val: "pendiente",  label: "Pendientes",  dot: "#f9a825" },
                  { val: "completada", label: "Completadas", dot: "#43a047" },
                  { val: "anulada",    label: "Anuladas",    dot: "#e53935" },
                ].map(f => (
                  <button
                    key={f.val}
                    className={"filter-option" + (filterEstado === f.val ? " active" : "")}
                    onClick={() => { setFilterEstado(f.val); setPage(1); }}
                  >
                    <span className="filter-dot" style={{ background: f.dot }} />{f.label}
                  </button>
                ))}

                <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0" }} />

                {/* Por proveedor */}
                <p className="filter-section-title">Proveedor</p>
                <button
                  className={"filter-option" + (filterProv === "todos" ? " active" : "")}
                  onClick={() => { setFilterProv("todos"); setPage(1); setShowFilter(false); }}
                >
                  <span className="filter-dot" style={{ background: "#bdbdbd" }} />Todos
                </button>
                {proveedores.map(p => (
                  <button
                    key={p.id}
                    className={"filter-option" + (filterProv === p.id ? " active" : "")}
                    onClick={() => { setFilterProv(p.id); setPage(1); setShowFilter(false); }}
                  >
                    <span className="filter-dot" style={{ background: "#2e7d32" }} />{p.responsable}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ mode: "new" })}>
            Nueva compra <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* TABLA */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Nº</th>
                  <th>ID Compra</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🛒</div>
                        <p className="empty-state__text">
                          {hasFilter || search ? "Sin compras que coincidan." : "Sin compras registradas"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((c, idx) => {
                  const prov   = getProveedor(c.idProveedor);
                  const total  = calcularTotal(c.detalles);
                  const metodo = METODOS_LABEL[c.metodoPago];

                  return (
                    <tr key={c.id} className="tbl-row">

                      {/* Nº */}
                      <td>
                        <span className="row-num">
                          {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* ID */}
                      <td>
                        <span className="compra-id-badge">{c.id}</span>
                      </td>

                      {/* Proveedor */}
                      <td>
                        <div className="prov-cell">
                          <div className="prov-avatar">🏭</div>
                          <div>
                            <div className="prov-name">{prov?.responsable || "—"}</div>
                            <div className="prov-id">{prov?.ciudad || ""}</div>
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td>
                        <span className="date-badge">📅 {c.fecha}</span>
                      </td>

                      {/* Método */}
                      <td>
                        <span className="metodo-badge">
                          {metodo?.icon} {metodo?.label || c.metodoPago}
                        </span>
                      </td>

                      {/* Total */}
                      <td>
                        <span className="total-cell">{COP(total)}</span>
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={`estado-chip estado-chip--${c.estado}`}>
                          {c.estado === "pendiente" && "⏳ Pendiente"}
                          {c.estado === "completada" && "✅ Completada"}
                          {c.estado === "anulada" && "🚫 Anulada"}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td>
                        <div className="actions-cell">
                          <button
                            className="act-btn act-btn--view"
                            title="Ver detalle"
                            onClick={() => setModal({ mode: "view", compra: c })}
                          >👁</button>
                          <button
                            className="act-btn act-btn--edit"
                            title="Editar"
                            onClick={() => setModal({ mode: "edit", compra: c })}
                          >✎</button>
                          <button
                            className="act-btn act-btn--delete"
                            title="Anular"
                            onClick={() => setModal({ mode: "anular", compra: c })}
                          >🚫</button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "compra" : "compras"} en total
            </span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>

      </div>

      {/* MODALES */}
      {modal?.mode === "new" && (
        <CrearCompra onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal?.mode === "view" && (
        <EditarCompra
          compra={modal.compra}
          mode="view"
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "edit" && (
        <EditarCompra
          compra={modal.compra}
          mode="edit"
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      )}
      {modal?.mode === "anular" && (
        <AnularCompraModal
          compra={modal.compra}
          onClose={() => setModal(null)}
          onConfirm={handleAnular}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}