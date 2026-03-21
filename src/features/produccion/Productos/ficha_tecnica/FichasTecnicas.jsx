import { useState, useEffect, useRef } from "react";
import CrearFicha from "./CrearFicha.jsx";
import EditarFicha from "./EditarFicha.jsx";
import "./FichasTecnicas.css";

const initialFichas = [
  {
    id: 1, producto: "Plátano Tostón", productoId: "02", categoria: "Snacks",
    version: "v1.0", estado: true, fecha: "2026-01-12", fotoPreview: null,
    insumos: [
      { id: 1, nombre: "Plátano verde", cantidad: "2", unidad: "kg" },
      { id: 2, nombre: "Aceite de oliva", cantidad: "500", unidad: "ml" },
      { id: 3, nombre: "Sal", cantidad: "1", unidad: "cucharadita" },
    ],
    procedimiento:
      "Pelar los plátanos verdes y cortarlos en rodajas de 1 cm.\n" +
      "Calentar el aceite de oliva en una sartén grande a fuego medio.\n" +
      "Freír las rodajas de plátano durante 5 minutos, o hasta que estén doradas y crujientes.\n" +
      "Retirar los plátanos del aceite y escurrir el exceso de grasa con un papel absorbente.\n" +
      "Sazonar con sal al gusto y servir.",
    observaciones: "Se puede acompañar con salsa de ajo o guacamole.\nAlternativa: Si no tienes aceite de oliva, puedes usar aceite vegetal.",
  },
  {
    id: 2, producto: "Muffin de plátano", productoId: "01", categoria: "Postres",
    version: "v2.1", estado: true, fecha: "2026-02-01", fotoPreview: null,
    insumos: [
      { id: 1, nombre: "Plátano verde", cantidad: "3", unidad: "unidad" },
      { id: 2, nombre: "Harina", cantidad: "200", unidad: "g" },
      { id: 3, nombre: "Huevo", cantidad: "2", unidad: "unidad" },
    ],
    procedimiento:
      "Machacar los plátanos hasta obtener un puré homogéneo.\n" +
      "Mezclar el puré con los huevos y el azúcar.\n" +
      "Incorporar la harina tamizada y mezclar hasta integrar.\n" +
      "Verter en moldes de muffin y hornear a 180°C por 20 minutos.",
    observaciones: "Servir tibio para mejor textura.",
  },
];

const ITEMS_PER_PAGE = 4;

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="toggle-btn"
      style={{ background: value ? "#43a047" : "#bdbdbd", boxShadow: value ? "0 2px 8px rgba(67,160,71,0.45)" : "none" }}>
      <span className="toggle-thumb" style={{ left: value ? 27 : 3 }}>
        <span className="toggle-label">{value ? "ON" : ""}</span>
      </span>
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" style={{ background: toast.type === "success" ? "#2e7d32" : "#c62828" }}>
      <span className="toast-icon">{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

function EliminarModal({ ficha, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => { setDeleting(true); await new Promise(r => setTimeout(r, 500)); onConfirm(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar ficha</h3>
          <p className="delete-body">¿Eliminar ficha de <strong>"{ficha.producto}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>{deleting ? "Eliminando…" : "Eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function FichaTecnica() {
  const [fichas, setFichas]         = useState(initialFichas);
  const [search, setSearch]         = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCat, setFilterCat]   = useState("Todas");
  const [page, setPage]             = useState(1);
  const [modal, setModal]           = useState(null);
  const [toast, setToast]           = useState(null);
  const filterRef                   = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const CATEGORIAS = ["Todas","Congelados","Postres","Snacks","Bebidas","Harinas","Orgánicos"];

  const filtered = fichas.filter(f => {
    const q = search.toLowerCase();
    const matchQ = f.producto.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q);
    const matchC = filterCat === "Todas" || f.categoria === filterCat;
    return matchQ && matchC;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => setPage(1), [search, filterCat]);

  const handleCreate = form => { setFichas(p => [form, ...p]); showToast("Ficha creada"); setModal(null); };
  const handleEdit   = form => { setFichas(p => p.map(f => f.id === form.id ? form : f)); showToast("Cambios guardados"); setModal(null); };
  const handleDelete = ()   => { setFichas(p => p.filter(f => f.id !== modal.ficha.id)); showToast("Ficha eliminada", "error"); setModal(null); };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-header__title">Ficha Técnica 📖</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input"
              placeholder="Buscar o filtrar por…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${filterCat !== "Todas" ? " has-filter" : ""}`}
              onClick={() => setShowFilter(v => !v)} title="Filtrar">▼</button>
            {showFilter && (
              <div className="filter-dropdown">
                {CATEGORIAS.map(c => (
                  <button key={c} className={`filter-option${filterCat === c ? " active" : ""}`}
                    onClick={() => { setFilterCat(c); setShowFilter(false); }}>
                    <span className="filter-dot" style={{ background: filterCat === c ? "#43a047" : "#bdbdbd" }} />{c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ mode: "new" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Nombre Producto</th>
                  <th>ID del producto</th>
                  <th>Categoría del producto</th>
                  <th>Versión</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state__icon">📖</div>
                      <p className="empty-state__text">Sin fichas técnicas</p>
                    </div>
                  </td></tr>
                ) : paginated.map((f, idx) => (
                  <tr key={f.id} className="tbl-row">
                    <td><span className="cat-num">{String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}</span></td>

                    {/* Nombre con foto miniatura */}
                    <td>
                      <div className="cat-cell">
                        {f.fotoPreview
                          ? <img src={f.fotoPreview} alt={f.producto} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1px solid #c8e6c9", flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f1f8f1", border: "1px solid #c8e6c9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📋</div>
                        }
                        <span className="cat-name">{f.producto}</span>
                      </div>
                    </td>

                    <td><span className="cat-num" style={{ fontSize: 13, color: "#424242" }}>{f.productoId || "—"}</span></td>

                    <td>
                      <span style={{ fontSize: 13, color: "#424242", background: "#f1f8f1", padding: "3px 10px", borderRadius: 20, border: "1px solid #c8e6c9", fontWeight: 600 }}>
                        {f.categoria}
                      </span>
                    </td>

                    <td><span className="version-tag">{f.version}</span></td>

                    <td>
                      <Toggle value={f.estado} onChange={() => setFichas(p => p.map(x => x.id === f.id ? { ...x, estado: !x.estado } : x))} />
                    </td>

                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"   title="Ver"      onClick={() => setModal({ mode: "view",   ficha: f })}>👁</button>
                        <button className="act-btn act-btn--edit"   title="Editar"   onClick={() => setModal({ mode: "edit",   ficha: f })}>✎</button>
                        <button className="act-btn act-btn--delete" title="Eliminar" onClick={() => setModal({ mode: "delete", ficha: f })}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination-bar">
            <span className="pagination-count">{filtered.length} {filtered.length === 1 ? "ficha" : "fichas"} en total</span>
            <div className="pagination-btns">
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</button>
              <span className="pg-pill">Página {safePage} de {totalPages}</span>
              <button className="pg-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal?.mode === "new"    && <CrearFicha  onClose={() => setModal(null)} onSave={handleCreate} />}
      {modal?.mode === "edit"   && <EditarFicha ficha={modal.ficha} mode="edit" onClose={() => setModal(null)} onSave={handleEdit} />}
      {modal?.mode === "view"   && <EditarFicha ficha={modal.ficha} mode="view" onClose={() => setModal(null)} />}
      {modal?.mode === "delete" && <EliminarModal ficha={modal.ficha} onClose={() => setModal(null)} onConfirm={handleDelete} />}

      <Toast toast={toast} />
    </div>
  );
}