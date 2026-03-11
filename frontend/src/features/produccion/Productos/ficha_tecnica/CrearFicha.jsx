import { useState, useRef } from "react";
import "./FichasTecnicas.css";

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

export default function CrearFicha({ onClose, onSave, productoNombre = "", productoCategoria = "" }) {

  const [form, setForm] = useState({
    producto: productoNombre,
    fecha: new Date().toISOString().slice(0, 10),
    fotoPreview: null,
    insumos: [{ id: 1, categoriaInsumo: "", nombre: "", cantidad: "", unidad: "" }],
    procedimiento: "",
    observaciones: "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab]       = useState("insumos");

  const fotoRef = useRef();

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const handleFoto = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => set("fotoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const addInsumo = () => {
    setForm(p => ({
      ...p,
      insumos: [
        ...p.insumos,
        { id: Date.now(), categoriaInsumo: "", nombre: "", cantidad: "", unidad: "" }
      ]
    }));
  };

  const delInsumo = id => {
    setForm(p => ({
      ...p,
      insumos: p.insumos.filter(i => i.id !== id)
    }));
  };

  const setInsumo = (id, k, v) => {
    setForm(p => ({
      ...p,
      insumos: p.insumos.map(i =>
        i.id === id
          ? { ...i, [k]: v, ...(k === "categoriaInsumo" ? { nombre: "" } : {}) }
          : i
      )
    }));
  };

  const validate = () => {
    const e = {};

    if (!form.producto.trim()) e.producto = "Campo requerido";
    if (!form.procedimiento.trim()) e.procedimiento = "El procedimiento es requerido";

    return e;
  };

  const handleSave = async () => {

    const e = validate();

    if (Object.keys(e).length) {
      setErrors(e);
      if (e.procedimiento) setTab("procedimiento");
      return;
    }

    setSaving(true);

    await new Promise(r => setTimeout(r, 500));

    onSave({
      ...form,
      id: Date.now()
    });

    setSaving(false);
  };

  const TABS = [
    { id: "insumos", label: "🧪 Insumos" },
    { id: "procedimiento", label: "📋 Procedimiento" },
    { id: "observaciones", label: "💬 Observaciones" },
  ];

  return (

    <div className="modal-overlay" onClick={onClose}>

      <div className="ficha-modal" onClick={e => e.stopPropagation()}>

        {/* HEADER */}

        <div className="ficha-modal__header">

          <div className="ficha-modal__header-left">
            <div className="ficha-modal__badge">Ficha Técnica</div>
            <h2 className="ficha-modal__title">Nueva Ficha Técnica</h2>
          </div>

          <button className="modal-close-btn" onClick={onClose}>✕</button>

        </div>

        {/* FOTO + INFO */}

        <div className="ficha-modal__top">

          <div className="ficha-foto-upload" onClick={() => fotoRef.current.click()}>

            {form.fotoPreview
              ? <img src={form.fotoPreview} alt="foto" className="ficha-foto-upload__img" />
              : <>
                  <span className="ficha-foto-upload__icon">🖼️</span>
                  <span className="ficha-foto-upload__hint">Subir foto</span>
                </>
            }

          </div>

          <input
            ref={fotoRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFoto}
          />

          <div className="ficha-modal__info-grid">

            {/* PRODUCTO */}

            <div className="form-group">

              <label className="form-label">Nombre del producto</label>

              <input
                required
                className={`field-input${errors.producto ? " field-input--error" : ""}`}
                value={form.producto}
                onChange={e => set("producto", e.target.value)}
                placeholder="Ej. Tostones de plátano"
                onFocus={e => e.target.style.borderColor = "#4caf50"}
                onBlur={e => e.target.style.borderColor = errors.producto ? "#e53935" : "#e0e0e0"}
              />

              {errors.producto && <p className="field-error">{errors.producto}</p>}

            </div>

            {/* FECHA */}

            <div className="form-group">

              <label className="form-label">Fecha</label>

              <input
                type="date"
                className="field-input"
                value={form.fecha}
                onChange={e => set("fecha", e.target.value)}
              />

            </div>

          </div>

        </div>

        {/* TABS */}

        <div className="ficha-tabs">

          {TABS.map(t => (

            <button
              key={t.id}
              className={`ficha-tab${tab === t.id ? " ficha-tab--active" : ""}${t.id === "procedimiento" && errors.procedimiento ? " ficha-tab--error" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>

          ))}

        </div>

        {/* BODY */}

        <div className="ficha-modal__body">

          {/* INSUMOS */}

          {tab === "insumos" && (

            <div>

              <div className="ficha-insumos-table-wrap">

                <table className="ficha-insumos-tbl">

                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Insumo</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>

                    {form.insumos.map((ins, idx) => (

                      <tr key={ins.id}>

                        <td>
                          <select
                            className="ficha-select"
                            value={ins.categoriaInsumo}
                            onChange={e => setInsumo(ins.id, "categoriaInsumo", e.target.value)}
                          >
                            <option value="">— Categoría —</option>
                            {CATEGORIAS_INSUMOS.map(c =>
                              <option key={c} value={c}>{c}</option>
                            )}
                          </select>
                        </td>

                        <td>
                          <select
                            className="ficha-select"
                            value={ins.nombre}
                            onChange={e => setInsumo(ins.id, "nombre", e.target.value)}
                            disabled={!ins.categoriaInsumo}
                          >
                            <option value="">— Insumo —</option>
                            {(INSUMOS_POR_CATEGORIA[ins.categoriaInsumo] || []).map(i =>
                              <option key={i} value={i}>{i}</option>
                            )}
                          </select>
                        </td>

                        <td>
                          <input
                            className="ficha-input-num"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={ins.cantidad}
                            onChange={e => setInsumo(ins.id, "cantidad", e.target.value)}
                          />
                        </td>

                        <td>
                          <select
                            className="ficha-select"
                            value={ins.unidad}
                            onChange={e => setInsumo(ins.id, "unidad", e.target.value)}
                          >
                            <option value="">—</option>
                            {UNIDADES.map(u =>
                              <option key={u} value={u}>{u}</option>
                            )}
                          </select>
                        </td>

                        <td>
                          <button
                            className="ficha-del-btn"
                            onClick={() => delInsumo(ins.id)}
                          >
                            ✕
                          </button>
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <button className="ficha-add-btn" onClick={addInsumo}>
                + Agregar insumo
              </button>

            </div>

          )}

          {/* PROCEDIMIENTO */}

          {tab === "procedimiento" && (

            <div>

              <p className="ficha-hint">
                Escribe un paso por línea. Cada línea se numerará automáticamente.
              </p>

              <textarea
                required
                className={`field-input ficha-textarea${errors.procedimiento ? " field-input--error" : ""}`}
                rows={8}
                value={form.procedimiento}
                onChange={e => set("procedimiento", e.target.value)}
              />

              {errors.procedimiento &&
                <p className="field-error">{errors.procedimiento}</p>
              }

            </div>

          )}

          {/* OBSERVACIONES */}

          {tab === "observaciones" && (

            <textarea
              className="field-input ficha-textarea"
              rows={6}
              value={form.observaciones}
              onChange={e => set("observaciones", e.target.value)}
            />

          )}

        </div>

        {/* FOOTER */}

        <div className="ficha-modal__footer">

          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>

        </div>

      </div>

    </div>
  );
}