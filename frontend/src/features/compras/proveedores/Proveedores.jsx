import { useState, useRef, useEffect } from "react";
import "./proveedores.css";
import CrearProveedor   from "./CrearProveedor";
import EditarProveedor  from "./EditarProveedor";

/* ── helpers ──────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const ITEMS_PER_PAGE = 6;

/* ── Datos de ejemplo ─────────────────────────────────────── */
const initialProveedores = [
  { id: uid(), responsable: "Juan Morales",    direccion: "Cra 45 # 10-20, Medellín",      celular: "300 123 4567", correo: "juan.morales@prov.com"   },
  { id: uid(), responsable: "Sandra López",    direccion: "Calle 80 # 23-15, Bogotá",      celular: "312 456 7890", correo: "sandra.lopez@prov.com"   },
  { id: uid(), responsable: "Pedro Ríos",      direccion: "Av. 6N # 12-50, Cali",          celular: "315 789 0123", correo: "pedro.rios@prov.com"     },
  { id: uid(), responsable: "Marcela Gómez",   direccion: "Cl. 50 # 40-30, Barranquilla",  celular: "318 012 3456", correo: "marcela.gomez@prov.com"  },
  { id: uid(), responsable: "Andrés Herrera",  direccion: "Cra 15 # 68-10, Bucaramanga",   celular: "321 345 6789", correo: "andres.herrera@prov.com" },
];

/* Compras de ejemplo vinculadas a proveedores */
const initialCompras = [
  {
    ID_Compra: 1,
    ID_Proveedor: initialProveedores[0].id,
    Fecha_Compra: "10/03/2026",
    Estado: "completada",
    Total_Pagar: 850000,
    detalles: [
      { ID_Detalle_Compra: 1, ID_Insumo: 5, nombreInsumo: "Harina de trigo",    Cantidad: 10, Notas: "Bultos x 50kg", Precio_Und: 45000 },
      { ID_Detalle_Compra: 2, ID_Insumo: 8, nombreInsumo: "Azúcar refinada",    Cantidad: 5,  Notas: "Bultos x 25kg", Precio_Und: 32000 },
    ],
  },
  {
    ID_Compra: 2,
    ID_Proveedor: initialProveedores[0].id,
    Fecha_Compra: "02/03/2026",
    Estado: "completada",
    Total_Pagar: 210000,
    detalles: [
      { ID_Detalle_Compra: 3, ID_Insumo: 12, nombreInsumo: "Sal marina",        Cantidad: 3,  Notas: "",              Precio_Und: 12000 },
    ],
  },
  {
    ID_Compra: 3,
    ID_Proveedor: initialProveedores[1].id,
    Fecha_Compra: "08/03/2026",
    Estado: "completada",
    Total_Pagar: 640000,
    detalles: [
      { ID_Detalle_Compra: 4, ID_Insumo: 3,  nombreInsumo: "Aceite de girasol", Cantidad: 8,  Notas: "Bidones x 20L", Precio_Und: 80000 },
    ],
  },
];

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

/* ── Modal Eliminar ───────────────────────────────────────── */
function EliminarModal({ proveedor, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const run = async () => { setDeleting(true); await new Promise(r => setTimeout(r, 500)); onConfirm(); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "28px 24px 18px", textAlign: "center" }}>
          <div className="delete-icon-wrap">🗑️</div>
          <h3 className="delete-title">Eliminar proveedor</h3>
          <p className="delete-body">¿Eliminar a <strong>"{proveedor.responsable}"</strong>?</p>
          <p className="delete-warn">Esta acción no se puede deshacer.</p>
        </div>
        <div className="modal-footer modal-footer--center">
          <button className="btn-cancel-full" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function GestionProveedores() {
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [compras]                     = useState(initialCompras);
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Filtrado ── */
  const filtered = proveedores.filter(p => {
    const q = search.toLowerCase();
    return (
      p.responsable.toLowerCase().includes(q) ||
      (p.correo    || "").toLowerCase().includes(q) ||
      (p.celular   || "").toLowerCase().includes(q) ||
      (p.direccion || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  useEffect(() => setPage(1), [search]);

  /* ── CRUD ── */
  const handleCreate = data => {
    setProveedores(p => [{ ...data, id: uid() }, ...p]);
    showToast("Proveedor creado");
    setModal(null);
  };
  const handleEdit = data => {
    setProveedores(p => p.map(x => x.id === data.id ? data : x));
    showToast("Cambios guardados");
    setModal(null);
  };
  const handleDelete = () => {
    setProveedores(p => p.filter(x => x.id !== modal.proveedor.id));
    showToast("Proveedor eliminado", "error");
    setModal(null);
  };

  return (
    <div className="page-wrapper">

      {/* ENCABEZADO */}
      <div className="page-header">
        <h1 className="page-header__title">Gestión de Proveedores</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por responsable, correo, celular o dirección…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-agregar" onClick={() => setModal({ mode: "new" })}>
            Agregar <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        {/* TABLA */}
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Nº</th>
                  <th>Responsable</th>
                  <th>Dirección</th>
                  <th>Celular</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state__icon">🏭</div>
                        <p className="empty-state__text">Sin proveedores registrados</p>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((p, idx) => (
                  <tr key={p.id} className="tbl-row">

                    {/* Nº */}
                    <td>
                      <span className="row-num">
                        {String((safePage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, "0")}
                      </span>
                    </td>

                    {/* Responsable */}
                    <td>
                      <div className="prov-cell">
                        <div className="prov-avatar">🏭</div>
                        <div>
                          <div className="prov-name">{p.responsable}</div>
                          <div className="prov-id">ID #{p.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Dirección */}
                    <td style={{ fontSize: 13, color: "#424242", maxWidth: 200 }}>
                      {p.direccion || "—"}
                    </td>

                    {/* Celular */}
                    <td>
                      <span className="phone-cell">
                        <span className="phone-icon">📞</span>
                        {p.celular || "—"}
                      </span>
                    </td>

                    {/* Correo */}
                    <td>
                      <span className="client-email" style={{ fontSize: 13 }}>
                        {p.correo || "—"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--view"
                          onClick={() => setModal({ mode: "view", proveedor: p })}>👁</button>
                        <button className="act-btn act-btn--edit"
                          onClick={() => setModal({ mode: "edit", proveedor: p })}>✎</button>
                        <button className="act-btn act-btn--delete"
                          onClick={() => setModal({ mode: "delete", proveedor: p })}>🗑️</button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <div className="pagination-bar">
            <span className="pagination-count">
              {filtered.length} {filtered.length === 1 ? "proveedor" : "proveedores"} en total
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
        <CrearProveedor onClose={() => setModal(null)} onSave={handleCreate} />
      )}
      {modal?.mode === "edit" && (
        <EditarProveedor
          proveedor={modal.proveedor}
          mode="edit"
          compras={compras}
          onClose={() => setModal(null)}
          onSave={handleEdit}
        />
      )}
      {modal?.mode === "view" && (
        <EditarProveedor
          proveedor={modal.proveedor}
          mode="view"
          compras={compras}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "delete" && (
        <EliminarModal
          proveedor={modal.proveedor}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}