import { useState, useEffect, useRef } from "react";
import { useApp } from "../../../AppContext.jsx";
import "./OrdenesProduccion.css";

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);

const PER_PAGE = 5;

const ESTADOS_ORDEN = ["Pendiente", "En proceso", "Pausada", "Completada", "Cancelada"];

const ESTADO_CONFIG = {
  "Pendiente":  { bg: "#fff8e1", color: "#f9a825", border: "#ffe082", dot: "#f9a825",
                  desc: "Esperando inicio de fabricación" },
  "En proceso": { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9", dot: "#1976d2",
                  desc: "Actualmente en fabricación" },
  "Pausada":    { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8", dot: "#8e24aa",
                  desc: "Temporalmente detenida" },
  "Completada": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7", dot: "#43a047",
                  desc: "Fabricación finalizada — stock actualizado" },
  "Cancelada":  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", dot: "#e53935",
                  desc: "Orden cancelada" },
};

const fmtFecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const urgenciaFecha = (fechaISO) => {
  if (!fechaISO) return "normal";
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(fechaISO + "T00:00:00") - hoy) / 86_400_000);
  if (dias < 0)  return "vencida";
  if (dias <= 1) return "urgente";
  if (dias <= 3) return "pronto";
  return "normal";
};

/* ─── Componentes ────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const c   = ESTADO_CONFIG[estado] || { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0", dot: "#bdbdbd" };
  const cls = `estado-badge estado--${estado.replace(/ /g, "-")}`;
  return (
    <span className={cls}>
      <span className="estado-badge__dot" />
      {estado}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "#c62828" : toast.type === "warn" ? "#e65100" : "#2e7d32";
  return (
    <div className="toast" style={{ background: bg }}>
      <span style={{ fontSize: 15 }}>{toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓"}</span>
      {toast.message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL FORMULARIO — CREAR / EDITAR ORDEN COMPLETA
   ═══════════════════════════════════════════════════════════ */
function ModalFormOrden({ orden, onClose, onSave }) {
  const { productos, usuarios, getCatProducto, insumos: allInsumos, UNIDADES_MEDIDA } = useApp();
  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [form, setForm] = useState({
    idEmpleado: orden?.idEmpleado || "",
    fechaEntrega: orden?.fechaEntrega || "",
    notas: orden?.notas || "",
    productos: orden?.productos || [],
    insumos: orden?.insumos || [],
    costo: orden?.costo || 0,
    estado: orden?.estado || "Pendiente",
  });

  const [errors, setErrors] = useState({});

  // Calcular insumos automáticos basados en productos elegidos
  useEffect(() => {
    const insumosMap = {};
    let totalCosto = 0;

    form.productos.forEach(item => {
      const prod = productos.find(p => p.id === item.idProducto);
      totalCosto += (prod?.precio || 0) * item.cantidad;

      if (!prod?.ficha?.insumos?.length) return;

      prod.ficha.insumos.forEach(fi => {
        const ins = allInsumos.find(i => i.nombre === fi.nombre || i.id === fi.idInsumo);
        if (!ins) return;
        const cantItem = (Number(fi.cantidad) || 0) * item.cantidad;
        if (insumosMap[ins.id]) {
          insumosMap[ins.id].cantidad += cantItem;
        } else {
          insumosMap[ins.id] = {
            idInsumo: ins.id,
            nombre: ins.nombre,
            cantidad: cantItem,
            unidad: UNIDADES_MEDIDA.find(u => u.id === ins.idUnidad)?.simbolo || "und",
            stockOk: (ins.stockActual || 0) >= cantItem
          };
        }
      });
    });

    // Validar stock real para cada insumo acumulado
    const insumosArray = Object.values(insumosMap).map(ins => {
      const real = allInsumos.find(i => i.id === ins.idInsumo);
      return { ...ins, stockOk: (real?.stockActual || 0) >= ins.cantidad };
    });

    setForm(p => ({ ...p, insumos: insumosArray, costo: totalCosto }));
  }, [form.productos]);

  const addProducto = (id) => {
    const p = productos.find(x => x.id === Number(id));
    if (!p) return;
    if (form.productos.some(x => x.idProducto === p.id)) return;
    setForm(f => ({
      ...f,
      productos: [...f.productos, { idProducto: p.id, nombre: p.nombre, cantidad: 1, precio: p.precio }]
    }));
  };

  const updateCant = (id, cant) => {
    setForm(f => ({
      ...f,
      productos: f.productos.map(x => x.idProducto === id ? { ...x, cantidad: Math.max(1, Number(cant)) } : x)
    }));
  };

  const removeProd = (id) => {
    setForm(f => ({ ...f, productos: f.productos.filter(x => x.idProducto !== id) }));
  };

  const handleSave = () => {
    const e = {};
    if (!form.productos.length) e.productos = "Agrega al menos un producto";
    if (!form.fechaEntrega) e.fecha = "Fecha requerida";
    if (Object.keys(e).length) { setErrors(e); return; }

    onSave({ ...form, id: orden?.id });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Gestión de producción</p>
            <h2 className="modal-header__title">{orden ? `Editar Orden ${orden.id}` : "Nueva Orden Independiente"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          
          {/* Columna Izquierda: Configuración */}
          <div>
            <p className="section-label" style={{ marginTop: 0 }}>Datos generales</p>
            <div className="form-group">
              <label className="form-label">Responsable (Empleado)</label>
              <select className="field-input" value={form.idEmpleado} onChange={e => setForm({...form, idEmpleado: Number(e.target.value)})}>
                <option value="">— Sin asignar —</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha de entrega estimada *</label>
                <input type="date" className={`field-input ${errors.fecha ? "error" : ""}`} value={form.fechaEntrega} onChange={e => setForm({...form, fechaEntrega: e.target.value})} />
                {errors.fecha && <p className="field-error">{errors.fecha}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="field-input" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                  {ESTADOS_ORDEN.map(est => <option key={est} value={est}>{est}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas / Instrucciones</label>
              <textarea className="field-input" rows="2" value={form.notes} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Ej: Empaque especial, sin sal..." />
            </div>

            <p className="section-label">Insumos requeridos (Auto)</p>
            <div className="insumos-preview-list">
              {form.insumos.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9e9e9e", textAlign: "center", padding: 10 }}>Se calcularán al agregar productos con ficha técnica.</p>
              ) : form.insumos.map(ins => (
                <div key={ins.idInsumo} className={`insumo-mini-card ${!ins.stockOk ? "no-stock" : ""}`}>
                  <span>{ins.nombre}</span>
                  <strong>{ins.cantidad} {ins.unidad}</strong>
                  {!ins.stockOk && <span title="Stock insuficiente">⚠️</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Productos */}
          <div>
            <p className="section-label" style={{ marginTop: 0 }}>Productos a fabricar</p>
            <div className="form-group">
              <select className="field-input" onChange={e => { if(e.target.value) addProducto(e.target.value); e.target.value = ""; }}>
                <option value="">+ Seleccionar producto para agregar...</option>
                {productos.filter(p => p.activo !== false).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (${p.precio})</option>
                ))}
              </select>
              {errors.productos && <p className="field-error">{errors.productos}</p>}
            </div>

            <div className="selected-prods-list">
              {form.productos.map(p => (
                <div key={p.idProducto} className="prod-edit-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: "#9e9e9e" }}>{fmt(p.precio)} c/u</div>
                  </div>
                  <input type="number" min="1" className="cant-input" value={p.cantidad} onChange={e => updateCant(p.idProducto, e.target.value)} />
                  <button className="btn-remove" onClick={() => removeProd(p.idProducto)}>✕</button>
                </div>
              ))}
            </div>

            <div className="order-summary-box">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Total productos:</span>
                <strong>{form.productos.reduce((acc, x) => acc + x.cantidad, 0)} uds</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#2e7d32", fontSize: 16, fontWeight: 800 }}>
                <span>Costo estimado:</span>
                <span>{fmt(form.costo)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={handleSave}>
            {orden ? "Guardar cambios" : "Crear Orden de Producción"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function GestionOrdenesProduccion() {
  const {
    ordenes,
    cambiarEstadoOrden,
    crearOrdenProduccion,
    editarOrdenProduccion,
    usuarios,
    pedidos,
  } = useApp();

  const empleados = usuarios.filter(u => u.rol === "Empleado" && u.estado);

  const [search, setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showFilter, setShowFilter]   = useState(false);
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null);
  const [toast, setToast]             = useState(null);
  const filterRef                     = useRef();

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = ordenes.filter(o => {
    const q = search.toLowerCase();
    const matchQ = [
      o.id,
      o.numeroPedido || "",
      ...(o.productos || []).map(p => p.nombre),
      empleados.find(e => e.id === o.idEmpleado)?.nombre || "",
    ].some(v => v.toLowerCase().includes(q));
    const matchE = filterEstado === "todos" || o.estado === filterEstado;
    return matchQ && matchE;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleSaveOrder = (data) => {
    if (data.id) {
      editarOrdenProduccion(data);
      showToast("Orden actualizada correctamente");
    } else {
      crearOrdenProduccion(data);
      showToast("Nueva orden creada");
    }
    setModal(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-header__title">Órdenes de Producción</h1>
        <div className="page-header__line" />
      </div>

      <div className="page-inner">
        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input" placeholder="Buscar orden, producto, empleado..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div ref={filterRef} style={{ position: "relative" }}>
            <button className={`filter-icon-btn${filterEstado !== "todos" ? " has-filter" : ""}`} onClick={() => setShowFilter(v => !v)}>▼</button>
            {showFilter && (
              <div className="filter-dropdown" style={{ minWidth: 180 }}>
                <p className="filter-section-title">Estado</p>
                {["todos", ...ESTADOS_ORDEN].map(f => (
                  <button key={f} className={`filter-option${filterEstado === f ? " active" : ""}`} onClick={() => { setFilterEstado(f); setPage(1); setShowFilter(false); }}>
                    <span className="filter-dot" style={{ background: ESTADO_CONFIG[f]?.dot || "#bdbdbd" }} />{f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-agregar" onClick={() => setModal({ type: "form" })}>
            Agregar Orden <span style={{ fontSize: 18 }}>+</span>
          </button>
        </div>

        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Nº</th>
                  <th>Orden</th>
                  <th>Productos</th>
                  <th>Responsable</th>
                  <th>Fecha entrega</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><p className="empty-state__text">No se encontraron órdenes.</p></div></td></tr>
                ) : paged.map((orden, idx) => (
                  <tr key={orden.id} className="tbl-row">
                    <td><span className="row-num">{String((safePage - 1) * PER_PAGE + idx + 1).padStart(2, "0")}</span></td>
                    <td>
                      <div className="orden-num">{orden.id}</div>
                      {orden.numeroPedido && <div style={{ fontSize: 10, color: "#1565c0", fontWeight: 700 }}>{orden.numeroPedido}</div>}
                    </td>
                    <td>
                      {(orden.productos || []).map((p, i) => (
                        <div key={i} className="prod-name">{p.nombre} <span className="prod-qty">×{p.cantidad}</span></div>
                      ))}
                    </td>
                    <td>{empleados.find(e => e.id === orden.idEmpleado)?.nombre || "Sin asignar"}</td>
                    <td>
                      <span className={`date-badge ${urgenciaFecha(orden.fechaEntrega)}`}>
                        {fmtFecha(orden.fechaEntrega)}
                      </span>
                    </td>
                    <td>{fmt(orden.costo)}</td>
                    <td><EstadoBadge estado={orden.estado} /></td>
                    <td>
                      <div className="actions-cell">
                        <button className="act-btn act-btn--edit" title="Editar orden completa" onClick={() => setModal({ type: "form", orden })}>✎</button>
                        <button className="act-btn act-btn--status" title="Cambiar estado rápido" 
                          onClick={() => {
                            const nextIdx = (ESTADOS_ORDEN.indexOf(orden.estado) + 1) % ESTADOS_ORDEN.length;
                            cambiarEstadoOrden(orden.id, ESTADOS_ORDEN[nextIdx]);
                            showToast(`Estado cambiado a ${ESTADOS_ORDEN[nextIdx]}`);
                          }}>🔄</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal?.type === "form" && <ModalFormOrden orden={modal.orden} onClose={() => setModal(null)} onSave={handleSaveOrder} />}
      <Toast toast={toast} />
    </div>
  );
}
