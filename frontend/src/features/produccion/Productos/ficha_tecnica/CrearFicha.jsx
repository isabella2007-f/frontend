import { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { getCategorias } from "../../../../services/categoriasInsumosService.js";
import { getInsumos } from "../../../../services/insumosService.js";
import { getProductos } from "../../../../services/productosService.js";
import SearchableSelect from "../../../../shared/components/SearchableSelect.jsx";
import { unidadesCompatibles } from "../../../../utils/unidades.js";
import "./FichasTecnicas.css";


export default function CrearFicha({ onClose, onSave, productoNombre = "", productoId: productoIdProp = null }) {
  const [categoriasInsumosActivas, setCategoriasInsumosActivas] = useState([]);
  const [insumosPorCategoriaId,    setInsumosPorCategoriaId]    = useState({});
  const [insumosFlat,              setInsumosFlat]              = useState([]);
  const [productosDisponibles,     setProductosDisponibles]     = useState([]);
  const [insumosError,             setInsumosError]             = useState(null);

  useEffect(() => {
    getCategorias()
      .then(catData => {
        const cats = (catData.categorias || catData.items || [])
          .filter(c => c.Estado === 1 || c.estado === true)
          .map(c => ({ id: c.ID_Categoria || c.id, nombre: c.Nombre_Categoria || c.Nombre || c.nombre, icon: c.Icono || c.icono || "" }));
        setCategoriasInsumosActivas(cats);
      })
      .catch(() => {});
    getInsumos()
      .then(insData => {
        const map = {};
        const flat = [];
        (insData.insumos || insData.items || []).forEach(i => {
          if (i.Estado !== 0 && i.estado !== false) {
            const catId = String(i.ID_Categoria || i.id_categoria || "");
            const item = {
              id: i.ID_Insumo || i.id,
              nombre: i.Nombre || i.nombre,
              unidad: i.simbolo_unidad || i.Unidad || i.unidad || "",
              precioUnitario: Number(i.precio_unitario || 0),
              idCategoria: catId,
            };
            if (!map[catId]) map[catId] = [];
            map[catId].push(item);
            flat.push(item);
          }
        });
        setInsumosPorCategoriaId(map);
        setInsumosFlat(flat);
      })
      .catch(() => setInsumosError("No se pudieron cargar los insumos. Verifica que el rol tiene el permiso 'ver_insumos'."));
    getProductos({ porPagina: 100 })
      .then(prodData => {
        setProductosDisponibles((prodData.productos || []).map(p => ({
          id:     p.ID_Producto,
          nombre: p.nombre,
        })));
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    producto:         productoNombre,
    productoId:       productoIdProp ? String(productoIdProp) : "",
    fecha:            new Date().toISOString().slice(0, 10),
    fotoPreview:      null,
    insumos:          [{ id: 1, idCategoria: "", idInsumo: "", nombre: "", cantidad: "", unidad: "" }],
    procedimiento:    "",
    observaciones:    "",
    vidaUtilCantidad: "",
    vidaUtilUnidad:   "dias",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [tab, setTab]       = useState("insumos");
  const fotoRef             = useRef();

  // True when launched from CrearProducto (ficha stored in local state, no API call)
  const fromCreate = Boolean(productoNombre && !productoIdProp);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    let err = "";
    if (k === "productoId" && !fromCreate && !v) err = "Selecciona un producto";
    if (k === "procedimiento" && !v.trim()) err = "Debes describir el procedimiento";
    setErrors(p => ({ ...p, [k]: err }));
  };

  const handleFoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const addInsumo = () => setForm(p => ({
    ...p,
    insumos: [...p.insumos, { id: Date.now(), idCategoria: "", idInsumo: "", nombre: "", cantidad: "", unidad: "" }],
  }));

  const delInsumo = id => setForm(p => ({ ...p, insumos: p.insumos.filter(i => i.id !== id) }));

  // Las unidades que la receta puede usar para este insumo, derivadas de cómo
  // está medido en el depósito. La tabla vive en utils/unidades.js, espejo de
  // la del servidor: acá había otra distinta que ofrecía "docena" —que el
  // servidor no sabe convertir, así que elegirla hacía fallar la orden— y se
  // quedaba con una sola opción si el insumo estaba medido en "gr" o "Kg".
  const getUnidadOptions = (insumoId, categoriaId) => {
    const insumo = (insumosPorCategoriaId[String(categoriaId)] || []).find(i => String(i.id) === String(insumoId))
      || insumosFlat.find(i => String(i.id) === String(insumoId));
    return unidadesCompatibles(insumo?.unidad);
  };

  const setInsumo = (id, k, v) => setForm(p => ({
    ...p,
    insumos: p.insumos.map(i => {
      if (i.id !== id) return i;
      if (k === "idCategoria") {
        // Al cambiar de categoría solo se limpia el insumo si ya no pertenece a ella.
        const perteneceNueva = i.idInsumo &&
          (insumosPorCategoriaId[String(v)] || []).some(x => String(x.id) === String(i.idInsumo));
        return perteneceNueva
          ? { ...i, idCategoria: v }
          : { ...i, idCategoria: v, idInsumo: "", nombre: "", unidad: "" };
      }
      if (k === "idInsumo") {
        // Se puede elegir el insumo primero: la categoría se autocompleta con la suya.
        const found = insumosFlat.find(x => String(x.id) === String(v));
        return {
          ...i,
          idInsumo: v ? Number(v) : "",
          idCategoria: found?.idCategoria || i.idCategoria || "",
          nombre: found?.nombre || "",
          unidad: found?.unidad || "",
          precioUnitario: found?.precioUnitario ?? 0,
        };
      }
      return { ...i, [k]: v };
    }),
  }));

  const validate = () => {
    const e = {};
    if (!fromCreate && !form.productoId) e.producto = "Selecciona un producto";
    const insumosValidos = form.insumos.filter(i => i.idInsumo && i.cantidad && i.unidad);
    if (form.insumos.length === 0 || insumosValidos.length === 0) {
      e.insumos = "Debes agregar al menos un insumo completo";
    } else if (insumosValidos.length < form.insumos.length) {
      e.insumos = "Hay insumos incompletos. Complétalos o elimínalos.";
    }
    if (!form.procedimiento.trim()) e.procedimiento = "Debes describir el procedimiento";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      if (e.insumos) setTab("insumos");
      else if (e.procedimiento) setTab("procedimiento");
      return;
    }

    if (fromCreate) {
      // No API call — show done screen then let parent close the modal
      setDone(true);
      setTimeout(() => onSave(form), 800);
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } catch {
      // parent handles error
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: "insumos",       label: "Insumos" },
    { id: "procedimiento", label: "Procedimiento" },
    { id: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="modal-overlay">
      <div className="ficha-modal" onClick={e => e.stopPropagation()}>

        <div className="ficha-modal__header">
          <div className="ficha-modal__header-left">
            <div className="ficha-modal__badge">Ficha Técnica</div>
            <h2 className="ficha-modal__title">Nueva Ficha Técnica</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ficha-modal__top">
          <div style={{ fontSize: 12, color: "#616161", background: "#f9fdf9", borderRadius: 8, padding: "7px 12px", border: "1px solid #e8f5e9", marginBottom: 2 }}>
            Esta ficha técnica describe los insumos necesarios para producir <strong>1 unidad</strong> del producto.
          </div>
          <div className="ficha-top-row">
            <div className="ficha-foto-upload" onClick={() => fotoRef.current.click()}>
              {form.fotoPreview
                ? <img src={form.fotoPreview} alt="foto" className="ficha-foto-upload__img" />
                : <><span style={{ fontSize: 24, color: "#43a047", lineHeight: 1 }}>+</span><span className="ficha-foto-upload__hint">Subir foto</span></>
              }
            </div>
            <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Producto</label>
                {(productoIdProp || fromCreate) ? (
                  <div className="field-input field-input--disabled" style={{ background: "#f5f5f5", color: "#424242", cursor: "default" }}>
                    {productoNombre || "—"}
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={productosDisponibles}
                      value={form.productoId}
                      getValue={p => p.id}
                      getLabel={p => p.nombre}
                      placeholder="— Selecciona un producto —"
                      searchPlaceholder="Buscar producto…"
                      className={`field-input${errors.producto ? " field-input--error" : ""}`}
                      error={!!errors.producto}
                      onChange={e => {
                        const id = e.target.value;
                        const found = productosDisponibles.find(p => String(p.id) === String(id));
                        set("productoId", id);
                        set("producto", found?.nombre || "");
                        if (!id) setErrors(p => ({ ...p, producto: "Selecciona un producto" }));
                      }}
                    />
                    {errors.producto && <p className="field-error">{errors.producto}</p>}
                  </>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vida útil <span style={{ fontWeight: 400, color: "#9e9e9e" }}>(opcional)</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number" min="1" className="field-input" style={{ width: 80 }}
                    placeholder="ej. 7"
                    value={form.vidaUtilCantidad}
                    onChange={e => set("vidaUtilCantidad", e.target.value)} />
                  <select
                    className="field-input" style={{ flex: 1 }}
                    value={form.vidaUtilUnidad}
                    onChange={e => set("vidaUtilUnidad", e.target.value)}>
                    <option value="dias">días</option>
                    <option value="semanas">semanas</option>
                    <option value="meses">meses</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ficha-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`ficha-tab${tab === t.id ? " ficha-tab--active" : ""}${t.id === "insumos" && errors.insumos ? " ficha-tab--error" : ""}${t.id === "procedimiento" && errors.procedimiento ? " ficha-tab--error" : ""}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="ficha-modal__body">

          {/* ── Pantalla de confirmación ── */}
          {done && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200, gap: 14, padding: "32px 20px", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e8f5e9", border: "2.5px solid #a5d6a7", display: "flex", alignItems: "center", justifyContent: "center", color: "#2e7d32" }}><Check size={30} /></div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 17, color: "#2e7d32", margin: "0 0 6px", fontFamily: "'Nunito', sans-serif" }}>¡Ficha técnica lista!</p>
                <p style={{ fontSize: 13, color: "#9e9e9e", margin: 0 }}>Volviendo al formulario del producto…</p>
              </div>
            </div>
          )}

          {!done && tab === "insumos" && (
            <div>
              <div className="ficha-insumos-table-wrap">
                <table className="ficha-insumos-tbl">
                  <thead><tr><th>Categoría</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th><th></th></tr></thead>
                  <tbody>
                    {form.insumos.map((ins, idx) => (
                      <tr key={ins.id} className={idx % 2 === 0 ? "ficha-insumos-tbl__row" : "ficha-insumos-tbl__row ficha-insumos-tbl__row--alt"}>
                        <td>
                          <SearchableSelect
                            className="ficha-select"
                            options={categoriasInsumosActivas}
                            value={ins.idCategoria}
                            onChange={e => setInsumo(ins.id, "idCategoria", e.target.value)}
                            getValue={c => c.id}
                            getLabel={c => `${c.icon || ""} ${c.nombre}`}
                            placeholder="— Categoría —"
                            searchPlaceholder="Categoría…"
                          />
                        </td>
                        <td>
                          <SearchableSelect
                            className="ficha-select"
                            options={ins.idCategoria ? (insumosPorCategoriaId[String(ins.idCategoria)] || []) : insumosFlat}
                            value={ins.idInsumo}
                            onChange={e => setInsumo(ins.id, "idInsumo", e.target.value)}
                            getValue={i => i.id}
                            getLabel={i => i.nombre}
                            placeholder="— Insumo —"
                            searchPlaceholder="Insumo…"
                          />
                        </td>
                        <td>
                          <input className="ficha-input-num" type="number" min="0" placeholder="0"
                            value={ins.cantidad} onChange={e => setInsumo(ins.id, "cantidad", e.target.value)} />
                        </td>
                        <td>
                          <select className="ficha-select" value={ins.unidad} onChange={e => setInsumo(ins.id, "unidad", e.target.value)}>
                            <option value="">—</option>
                            {getUnidadOptions(ins.idInsumo, ins.idCategoria).map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td><button className="ficha-del-btn" onClick={() => delInsumo(ins.id)}><X size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {insumosError && <p className="field-error" style={{ marginTop: 6 }}>{insumosError}</p>}
              {errors.insumos && <p className="field-error" style={{ marginTop: 6 }}>{errors.insumos}</p>}
              <button className="ficha-add-btn" onClick={addInsumo}>+ Agregar insumo</button>
            </div>
          )}

          {!done && tab === "procedimiento" && (
            <div>
              <p className="ficha-hint">Escribe un paso por línea. Cada línea se numerará automáticamente.</p>
              <textarea className={`field-input ficha-textarea${errors.procedimiento ? " field-input--error" : ""}`}
                rows={8} placeholder={"Pelar los plátanos.\nCortar en rodajas.\nFreír a 180°C."} value={form.procedimiento}
                onChange={e => set("procedimiento", e.target.value)}
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => {
                  const empty = !e.target.value.trim();
                  if (empty) setErrors(p => ({ ...p, procedimiento: "Debes describir el procedimiento" }));
                  e.target.style.borderColor = (errors.procedimiento || empty) ? "#e53935" : "#e0e0e0";
                }} />
              {errors.procedimiento && <p className="field-error">{errors.procedimiento}</p>}
              {form.procedimiento && (
                <div className="ficha-preview-steps">
                  <p className="ficha-preview-label">Vista previa</p>
                  <ol className="ficha-steps-list">
                    {form.procedimiento.split("\n").filter(l => l.trim()).map((paso, i) => (
                      <li key={i} className="ficha-step-item"><span className="ficha-step-num">{i + 1}</span><span>{paso}</span></li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {!done && tab === "observaciones" && (
            <div>
              <p className="ficha-hint">Notas adicionales, alérgenos o recomendaciones de conservación.</p>
              <textarea className="field-input ficha-textarea" rows={6} placeholder="Ej: Conservar en lugar fresco y seco."
                value={form.observaciones} onChange={e => set("observaciones", e.target.value)}
                onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
            </div>
          )}
        </div>

        <div className="ficha-modal__footer" style={{ justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {!done && <button className="btn-ghost" onClick={onClose}>Cancelar</button>}
            <button className="btn-save" onClick={handleSave} disabled={saving || done}>
              {done ? "Listo" : saving ? "Guardando…" : fromCreate ? "Guardar ficha" : "Guardar"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
