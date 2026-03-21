import { useState, useRef, useEffect } from "react";
import "./ficha_tecnica/FichasTecnicas.css";


const INSUMOS_POR_CATEGORIA = {
  "Congelados":  ["Plátano verde", "Aceite de palma", "Sal", "Conservantes naturales", "Agua purificada"],
  "Postres":     ["Plátano maduro", "Azúcar", "Harina", "Huevo", "Mantequilla", "Leche", "Canela", "Vainilla"],
  "Snacks":      ["Plátano verde", "Aceite de oliva", "Sal", "Ajo en polvo", "Pimienta", "Paprika"],
  "Bebidas":     ["Plátano maduro", "Leche", "Azúcar", "Hielo", "Yogur", "Miel"],
  "Harinas":     ["Plátano verde", "Plátano maduro", "Almidón", "Bicarbonato", "Sal"],
  "Orgánicos":   ["Plátano orgánico", "Aceite de coco orgánico", "Sal marina", "Azúcar de caña orgánica"],
};
const CATEGORIAS_INSUMOS = Object.keys(INSUMOS_POR_CATEGORIA);
const UNIDADES = ["kg","g","l","ml","unidad","taza","cucharada","cucharadita"];

export default function EditarFicha({ ficha, mode = "edit", onClose, onSave }) {
  const [form, setForm]             = useState({ ...ficha });
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [openSections, setOpenSections] = useState({ insumos: true, procedimiento: true, observaciones: false });
  const fotoRef = useRef();
  const isView  = mode === "view";

  useEffect(() => { if (ficha) setForm({ ...ficha }); }, [ficha]);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };
  const toggleSection = s => setOpenSections(p => ({ ...p, [s]: !p[s] }));

  const handleFoto = e => {
    if (isView) return;
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const addInsumo = () => setForm(p => ({ ...p, insumos: [...p.insumos, { id: Date.now(), categoriaInsumo: "", nombre: "", cantidad: "", unidad: "" }] }));
  const delInsumo = id => setForm(p => ({ ...p, insumos: p.insumos.filter(i => i.id !== id) }));
  const setInsumo = (id, k, v) => setForm(p => ({
    ...p,
    insumos: p.insumos.map(i => i.id === id
      ? { ...i, [k]: v, ...(k === "categoriaInsumo" ? { nombre: "" } : {}) }
      : i
    ),
  }));

  const validate = () => {
    const e = {};
    if (!form.producto?.trim())       e.producto      = "Campo requerido";
    if (!form.procedimiento?.trim())  e.procedimiento = "El procedimiento es requerido";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    onSave(form);
    setSaving(false);
  };

  const pasos = (form.procedimiento || "").split("\n").filter(l => l.trim());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box--ficha-lg" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="modal-header__eyebrow">Ficha Técnica</p>
            <h2 className="modal-header__title">
              {isView ? `Ficha: ${form.producto || ""}` : "Editar Ficha Técnica"}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body ficha-modal-body">

          {/* ── Fila superior: foto + campos ── */}
          <div className="ficha-top-row">

            {/* Foto */}
            <div className="ficha-foto-col">
              <div className="ficha-foto-box-lg"
                style={{ cursor: isView ? "default" : "pointer" }}
                onClick={() => !isView && fotoRef.current.click()}>
                {form.fotoPreview
                  ? <img src={form.fotoPreview} alt="foto" />
                  : <>
                      <span style={{ fontSize: 32, opacity: 0.35 }}>🖼️</span>
                      {!isView && <span className="ficha-foto-hint">Subir foto</span>}
                    </>
                }
              </div>
              <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
            </div>

            {/* Campos */}
            <div className="ficha-main-fields">
              <div className="ficha-fields-grid">
                <div className="form-group">
                  <label className="form-label">Nombre del producto</label>
                  {isView
                    ? <div className="field-input field-input--disabled">{form.producto}</div>
                    : <>
                        <input className={`field-input${errors.producto ? " field-input--error" : ""}`}
                          value={form.producto || ""}
                          onChange={e => set("producto", e.target.value)}
                          placeholder="Ej. Tostones de plátano"
                          onFocus={e => e.target.style.borderColor = "#4caf50"}
                          onBlur={e => e.target.style.borderColor = errors.producto ? "#e53935" : "#e0e0e0"}
                        />
                        {errors.producto && <p className="field-error">{errors.producto}</p>}
                      </>
                  }
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  {isView
                    ? <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#424242" }}>
                        <span>📅</span> {form.fecha}
                      </div>
                    : <input type="date" className="field-input" value={form.fecha || ""} onChange={e => set("fecha", e.target.value)} />
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ── Insumos ── */}
          <div className="section-header" onClick={() => toggleSection("insumos")}>
            <p className="section-title">🧪 Insumos</p>
            <span className={`section-arrow${openSections.insumos ? " open" : ""}`}>▼</span>
          </div>
          {openSections.insumos && (
            <div className="insumos-wrapper">
              <table className="insumos-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>Categoría</th>
                    <th style={{ width: "32%" }}>Insumo</th>
                    <th style={{ width: "18%" }}>Cantidad</th>
                    <th style={{ width: "17%" }}>Unidad</th>
                    {!isView && <th style={{ width: "5%" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {(form.insumos || []).map(ins => (
                    <tr key={ins.id}>
                      <td>
                        {isView
                          ? <span style={{ fontSize: 13, color: "#616161" }}>{ins.categoriaInsumo || ins.nombre}</span>
                          : <select className="insumo-select" value={ins.categoriaInsumo || ""}
                              onChange={e => setInsumo(ins.id, "categoriaInsumo", e.target.value)}>
                              <option value="">— Categoría —</option>
                              {CATEGORIAS_INSUMOS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        }
                      </td>
                      <td>
                        {isView
                          ? <span style={{ fontSize: 13, color: "#424242", fontWeight: 600 }}>{ins.nombre}</span>
                          : <select className="insumo-select" value={ins.nombre}
                              onChange={e => setInsumo(ins.id, "nombre", e.target.value)}
                              disabled={!ins.categoriaInsumo}>
                              <option value="">— Insumo —</option>
                              {(INSUMOS_POR_CATEGORIA[ins.categoriaInsumo] || []).map(i =>
                                <option key={i} value={i}>{i}</option>
                              )}
                            </select>
                        }
                      </td>
                      <td>
                        {isView
                          ? <span style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32" }}>{ins.cantidad}</span>
                          : <input className="insumo-input" type="number" min="0" placeholder="0"
                              value={ins.cantidad} onChange={e => setInsumo(ins.id, "cantidad", e.target.value)} />
                        }
                      </td>
                      <td>
                        {isView
                          ? <span style={{ fontSize: 13, color: "#616161" }}>{ins.unidad}</span>
                          : <select className="insumo-select" value={ins.unidad}
                              onChange={e => setInsumo(ins.id, "unidad", e.target.value)}>
                              <option value="">—</option>
                              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        }
                      </td>
                      {!isView && (
                        <td><button className="insumo-del-btn" onClick={() => delInsumo(ins.id)}>🗑️</button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isView && (
                <div style={{ padding: "8px 12px" }}>
                  <button className="btn-add-insumo" onClick={addInsumo}>
                    <span>+</span> Agregar insumo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Procedimiento ── */}
          <div className="section-header" onClick={() => toggleSection("procedimiento")}>
            <p className="section-title">📋 Procedimiento</p>
            <span className={`section-arrow${openSections.procedimiento ? " open" : ""}`}>▼</span>
          </div>
          {openSections.procedimiento && (
            <div style={{ marginBottom: 8 }}>
              {isView
                ? <ol className="procedimiento-list">
                    {pasos.map((paso, i) => (
                      <li key={i} className="procedimiento-item">
                        <span className="procedimiento-num">{i + 1}</span>
                        <span>{paso}</span>
                      </li>
                    ))}
                  </ol>
                : <>
                    <textarea
                      className={`field-input${errors.procedimiento ? " field-input--error" : ""}`}
                      rows={5} style={{ resize: "vertical" }}
                      placeholder="Un paso por línea."
                      value={form.procedimiento || ""}
                      onChange={e => set("procedimiento", e.target.value)}
                      onFocus={e => e.target.style.borderColor = "#4caf50"}
                      onBlur={e => e.target.style.borderColor = errors.procedimiento ? "#e53935" : "#e0e0e0"}
                    />
                    {errors.procedimiento && <p className="field-error">{errors.procedimiento}</p>}
                  </>
              }
            </div>
          )}

          {/* ── Observaciones ── */}
          <div className="section-header" onClick={() => toggleSection("observaciones")}>
            <p className="section-title">💬 Observaciones</p>
            <span className={`section-arrow${openSections.observaciones ? " open" : ""}`}>▼</span>
          </div>
          {openSections.observaciones && (
            isView
              ? <p style={{ fontSize: 13, color: "#424242", lineHeight: 1.6, margin: "0 0 8px" }}>
                  {form.observaciones || <span style={{ color: "#9e9e9e" }}>Sin observaciones.</span>}
                </p>
              : <textarea className="field-input" rows={3} style={{ resize: "vertical" }}
                  placeholder="Observaciones adicionales…"
                  value={form.observaciones || ""}
                  onChange={e => set("observaciones", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#4caf50"}
                  onBlur={e => e.target.style.borderColor = "#e0e0e0"}
                />
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{isView ? "Cerrar" : "Cancelar"}</button>
          {!isView && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}