import { useState, useRef, useEffect } from "react";
import { useApp } from "../../../../AppContext.jsx";
import "./FichasTecnicas.css";

const UNIDADES = ["kg","g","l","ml","unidad","taza","cucharada","cucharadita"];

export default function EditarFicha({ ficha, mode = "edit", onClose, onSave }) {
  const { categoriasInsumosActivas, insumosPorCategoriaId } = useApp();

  const [form, setForm]   = useState({ ...ficha });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState("insumos");
  const fotoRef             = useRef();
  const isView              = mode === "view";

  useEffect(() => { if (ficha) setForm({ ...ficha }); }, [ficha]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const handleFoto = e => {
    if (isView) return;
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const addInsumo = () => setForm(p => ({ ...p, insumos: [...p.insumos, { id: Date.now(), idCategoria: "", nombre: "", cantidad: "", unidad: "" }] }));
  const delInsumo = id => setForm(p => ({ ...p, insumos: p.insumos.filter(i => i.id !== id) }));
  const setInsumo = (id, k, v) => setForm(p => ({
    ...p,
    insumos: p.insumos.map(i => i.id === id
      ? { ...i, [k]: v, ...(k === "idCategoria" ? { nombre: "" } : {}) }
      : i),
  }));

  // Para insumos guardados que tenían categoriaInsumo (string), derivar idCategoria si falta
  const getInsumoCatId = ins => {
    if (ins.idCategoria) return ins.idCategoria;
    // fallback: buscar por nombre de categoría
    const cat = categoriasInsumosActivas.find(c => c.nombre === ins.categoriaInsumo);
    return cat?.id || "";
  };

  const validate = () => {
    const e = {};
    if (!form.producto?.trim())      e.producto      = "Campo requerido";
    if (!form.procedimiento?.trim()) e.procedimiento = "El procedimiento es requerido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); if (e.procedimiento) setTab("procedimiento"); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(form);
    setSaving(false);
  };

  const pasos = (form.procedimiento || "").split("\n").filter(l => l.trim());

  const TABS = [
    { id: "insumos",       label: "🧪 Insumos" },
    { id: "procedimiento", label: "📋 Procedimiento" },
    { id: "observaciones", label: "💬 Observaciones" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ficha-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ficha-modal__header">
          <div className="ficha-modal__header-left">
            <div className="ficha-modal__badge">Ficha Técnica</div>
            <h2 className="ficha-modal__title">{isView ? form.producto || "Detalle" : "Editar Ficha Técnica"}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Foto + Info */}
        <div className="ficha-modal__top">
          <div className="ficha-foto-upload" style={{ cursor: isView ? "default" : "pointer" }}
            onClick={() => !isView && fotoRef.current.click()}>
            {form.fotoPreview
              ? <img src={form.fotoPreview} alt="foto" className="ficha-foto-upload__img" />
              : <><span className="ficha-foto-upload__icon">🖼️</span>{!isView && <span className="ficha-foto-upload__hint">Cambiar foto</span>}</>
            }
          </div>
          <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />

          <div className="ficha-modal__info-grid">
            <div className="form-group">
              <label className="form-label">Nombre del producto</label>
              {isView
                ? <div className="field-input field-input--disabled">{form.producto}</div>
                : <>
                    <input className={`field-input${errors.producto ? " field-input--error" : ""}`}
                      value={form.producto || ""} onChange={e => set("producto", e.target.value)}
                      onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = errors.producto ? "#e53935" : "#e0e0e0"} />
                    {errors.producto && <p className="field-error">{errors.producto}</p>}
                  </>
              }
            </div>
            <div className="form-group">
              <label className="form-label">Fecha</label>
              {isView
                ? <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#424242", paddingTop: 4 }}><span>📅</span> {form.fecha}</div>
                : <input type="date" className="field-input" value={form.fecha || ""} onChange={e => set("fecha", e.target.value)} />
              }
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ficha-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`ficha-tab${tab === t.id ? " ficha-tab--active" : ""}${t.id === "procedimiento" && errors.procedimiento ? " ficha-tab--error" : ""}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="ficha-modal__body">

          {/* Insumos */}
          {tab === "insumos" && (
            <div>
              <div className="ficha-insumos-table-wrap">
                <table className="ficha-insumos-tbl">
                  <thead><tr><th>Categoría</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th>{!isView && <th></th>}</tr></thead>
                  <tbody>
                    {(form.insumos || []).map((ins, idx) => {
                      const catId = getInsumoCatId(ins);
                      return (
                        <tr key={ins.id} className={idx % 2 === 0 ? "ficha-insumos-tbl__row" : "ficha-insumos-tbl__row ficha-insumos-tbl__row--alt"}>
                          <td>
                            {isView
                              ? <span className="ficha-cell-text">{categoriasInsumosActivas.find(c => c.id === Number(catId))?.nombre || ins.categoriaInsumo || "—"}</span>
                              : <select className="ficha-select" value={catId}
                                  onChange={e => setInsumo(ins.id, "idCategoria", e.target.value)}>
                                  <option value="">— Categoría —</option>
                                  {categoriasInsumosActivas.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nombre}</option>)}
                                </select>
                            }
                          </td>
                          <td>
                            {isView
                              ? <span className="ficha-cell-text ficha-cell-text--bold">{ins.nombre}</span>
                              : <select className="ficha-select" value={ins.nombre}
                                  onChange={e => setInsumo(ins.id, "nombre", e.target.value)}
                                  disabled={!catId} style={{ opacity: catId ? 1 : 0.45 }}>
                                  <option value="">— Insumo —</option>
                                  {(insumosPorCategoriaId[catId] || []).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            }
                          </td>
                          <td>
                            {isView
                              ? <span className="ficha-cell-text ficha-cell-text--green">{ins.cantidad}</span>
                              : <input className="ficha-input-num" type="number" min="0" placeholder="0"
                                  value={ins.cantidad} onChange={e => setInsumo(ins.id, "cantidad", e.target.value)} />
                            }
                          </td>
                          <td>
                            {isView
                              ? <span className="ficha-cell-text">{ins.unidad}</span>
                              : <select className="ficha-select" value={ins.unidad} onChange={e => setInsumo(ins.id, "unidad", e.target.value)}>
                                  <option value="">—</option>
                                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            }
                          </td>
                          {!isView && <td><button className="ficha-del-btn" onClick={() => delInsumo(ins.id)}>✕</button></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!isView && <button className="ficha-add-btn" onClick={addInsumo}>+ Agregar insumo</button>}
            </div>
          )}

          {/* Procedimiento */}
          {tab === "procedimiento" && (
            <div>
              {isView
                ? <ol className="ficha-steps-list">{pasos.map((paso, i) => (<li key={i} className="ficha-step-item"><span className="ficha-step-num">{i + 1}</span><span>{paso}</span></li>))}</ol>
                : <>
                    <p className="ficha-hint">Escribe un paso por línea.</p>
                    <textarea className={`field-input ficha-textarea${errors.procedimiento ? " field-input--error" : ""}`} rows={8}
                      value={form.procedimiento || ""} onChange={e => set("procedimiento", e.target.value)}
                      onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = errors.procedimiento ? "#e53935" : "#e0e0e0"} />
                    {errors.procedimiento && <p className="field-error">{errors.procedimiento}</p>}
                    {form.procedimiento && (
                      <div className="ficha-preview-steps">
                        <p className="ficha-preview-label">Vista previa</p>
                        <ol className="ficha-steps-list">{form.procedimiento.split("\n").filter(l => l.trim()).map((paso, i) => (<li key={i} className="ficha-step-item"><span className="ficha-step-num">{i + 1}</span><span>{paso}</span></li>))}</ol>
                      </div>
                    )}
                  </>
              }
            </div>
          )}

          {/* Observaciones */}
          {tab === "observaciones" && (
            <div>
              {isView
                ? <p style={{ fontSize: 14, color: "#424242", lineHeight: 1.7, margin: 0 }}>{form.observaciones || <span style={{ color: "#9e9e9e" }}>Sin observaciones.</span>}</p>
                : <>
                    <p className="ficha-hint">Notas adicionales, alérgenos o recomendaciones.</p>
                    <textarea className="field-input ficha-textarea" rows={6} value={form.observaciones || ""}
                      onChange={e => set("observaciones", e.target.value)}
                      onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = "#e0e0e0"} />
                  </>
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ficha-modal__footer">
          <div className="ficha-tabs-nav">
            {TABS.map(t => <span key={t.id} className={`ficha-step-dot${tab === t.id ? " ficha-step-dot--active" : ""}`} />)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Cancelar"}</button>
            {!isView && <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>}
          </div>
        </div>

      </div>
    </div>
  );
}