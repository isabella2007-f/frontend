import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Tag, TrendingUp } from "lucide-react";
import CampoMonto from "../../../shared/components/CampoMonto";
import SelectorBarriosMultiple from "./SelectorBarriosMultiple";
import { crearOferta, editarOferta, DIAS_SEMANA } from "../../../services/ubicacionesService";

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Crear / editar una oferta de domicilio (o recargo). Independiente del módulo
 * congelado configuracion/descuentos: solo afecta el precio del domicilio.
 *
 *  - Tipo: descuento (baja el precio) | recargo (lo sube).
 *  - Descuento/recargo en pesos (>= 0, máx 7 díg) y/o en % (0–100). Al menos uno.
 *  - Días de semana (L–D) y/o días del mes (1–31). Al menos uno (OR entre ambos).
 *  - Barrios donde aplica: 1..N (se agregan uno a uno, estilo "insumos").
 */
export default function ModalOferta({ oferta, onGuardado, onCerrar }) {
  const editando = !!oferta;

  const [nombre, setNombre] = useState(oferta?.nombre || "");
  const [tipo, setTipo] = useState(oferta?.tipo || "descuento");
  const [pesos, setPesos] = useState(oferta?.montoPesos ?? "");
  const [pct, setPct] = useState(oferta?.porcentaje ?? "");
  const [diasSemana, setDiasSemana] = useState(new Set(oferta?.diasSemana || []));
  const [diasMes, setDiasMes] = useState(new Set(oferta?.diasMes || []));
  const [barrios, setBarrios] = useState(
    (oferta?.barrios || []).map((b) => ({ id: b.id, nombre: b.nombre, ciudad: b.ciudad })),
  );
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi] = useState("");

  const togglePosible = (set, valor) => {
    const s = new Set(set);
    s.has(valor) ? s.delete(valor) : s.add(valor);
    return s;
  };

  // ── Validación ──
  const pctNum = pct === "" ? null : Number(pct);
  const errNombre = tocado && !nombre.trim() ? "El nombre es obligatorio" : null;
  const errMonto = tocado && (pesos === "" && pctNum === null)
    ? "Indica un descuento/recargo en pesos, en porcentaje, o ambos" : null;
  const errPct = pctNum !== null && (pctNum < 0 || pctNum > 100)
    ? "El porcentaje va de 0 a 100" : null;
  const errDias = tocado && diasSemana.size === 0 && diasMes.size === 0
    ? "Elige al menos un día de la semana o del mes" : null;
  const errBarrios = tocado && barrios.length === 0
    ? "Agrega al menos un barrio" : null;

  const snapshotInicial = useMemo(() => JSON.stringify({
    n: oferta?.nombre || "", t: oferta?.tipo || "descuento",
    p: oferta?.montoPesos ?? "", pc: oferta?.porcentaje ?? "",
    ds: [...(oferta?.diasSemana || [])].sort(), dm: [...(oferta?.diasMes || [])].sort(),
    b: (oferta?.barrios || []).map((x) => x.id).sort(),
  }), [oferta]);
  const sinCambios = editando && JSON.stringify({
    n: nombre.trim(), t: tipo, p: pesos === "" ? "" : Number(pesos),
    pc: pctNum === null ? "" : pctNum,
    ds: [...diasSemana].sort(), dm: [...diasMes].sort(),
    b: barrios.map((x) => x.id).sort(),
  }) === snapshotInicial;

  const puedeGuardar = nombre.trim() && (pesos !== "" || pctNum !== null)
    && !errPct && (diasSemana.size || diasMes.size) && barrios.length > 0;

  const guardar = async () => {
    setTocado(true);
    setErrorApi("");
    if (!puedeGuardar) return;
    if (editando && sinCambios) { onGuardado({ sinCambios: true }); return; }

    const payload = {
      Nombre: nombre.trim(),
      Tipo: tipo,
      Monto_Pesos: pesos === "" ? null : Number(pesos),
      Porcentaje: pctNum,
      Dias_Semana: [...diasSemana].sort((a, b) => a - b),
      Dias_Mes: [...diasMes].sort((a, b) => a - b),
      barrios: barrios.map((b) => b.id),
    };
    if (editando) {
      payload.limpiar_pesos = pesos === "";
      payload.limpiar_porcentaje = pctNum === null;
    }

    setGuardando(true);
    try {
      const res = editando
        ? await editarOferta(oferta.id, payload)
        : await crearOferta(payload);
      onGuardado(res);
    } catch (e) {
      setErrorApi(e?.message || "No se pudo guardar la oferta");
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="ub-overlay" onClick={onCerrar}>
      <div className="ub-modal" style={{ width: "min(640px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="ub-modal__head">
          <div>
            <p className="ub-modal__eyebrow">Ofertas y recargos</p>
            <h2>{editando ? "Editar oferta / recargo" : "Nueva oferta / recargo"}</h2>
          </div>
          <button className="ub-modal__x" onClick={onCerrar}><X size={18} /></button>
        </div>

        <div className="ub-modal__body">
          <div className="ub-field">
            <label>Nombre</label>
            <input
              className={`ub-input${errNombre ? " ub-input--error" : ""}`}
              value={nombre} maxLength={80}
              onChange={(e) => { setNombre(e.target.value); setTocado(true); }}
              placeholder="Ej: Martes de envío · Recargo zona lejana"
            />
            {errNombre && <p className="ub-error">{errNombre}</p>}
          </div>

          <div className="ub-field">
            <label>Tipo</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button"
                className={`ub-btn ${tipo === "descuento" ? "ub-btn--primary" : "ub-btn--ghost"}`}
                onClick={() => setTipo("descuento")}>
                <Tag size={14} /> Descuento (baja el precio)
              </button>
              <button type="button"
                className={`ub-btn ${tipo === "recargo" ? "ub-btn--primary" : "ub-btn--ghost"}`}
                onClick={() => setTipo("recargo")}>
                <TrendingUp size={14} /> Recargo (sube el precio)
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="ub-field">
              <label>{tipo === "recargo" ? "Recargo" : "Descuento"} en pesos</label>
              <CampoMonto valor={pesos} onValor={(v) => { setPesos(v); setTocado(true); }}
                maximo={9_999_999} placeholder="0" />
            </div>
            <div className="ub-field">
              <label>{tipo === "recargo" ? "Recargo" : "Descuento"} en %</label>
              <input
                className={`ub-input${errPct ? " ub-input--error" : ""}`}
                inputMode="numeric" value={pct}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setPct(v === "" ? "" : Math.min(Number(v), 100));
                  setTocado(true);
                }}
                placeholder="0" />
              {errPct && <p className="ub-error">{errPct}</p>}
            </div>
          </div>
          {errMonto && <p className="ub-error" style={{ marginTop: -6 }}>{errMonto}</p>}

          <div className="ub-field">
            <label>Días de la semana</label>
            <div className="ub-daygrid">
              {DIAS_SEMANA.map((d) => (
                <button key={d.valor} type="button"
                  className={`ub-daychip${diasSemana.has(d.valor) ? " ub-daychip--on" : ""}`}
                  onClick={() => { setDiasSemana(togglePosible(diasSemana, d.valor)); setTocado(true); }}>
                  {d.corto}
                </button>
              ))}
            </div>
          </div>

          <div className="ub-field">
            <label>Días del mes</label>
            <div className="ub-monthgrid">
              {DIAS_MES.map((d) => (
                <button key={d} type="button"
                  className={`ub-daychip${diasMes.has(d) ? " ub-daychip--on" : ""}`}
                  onClick={() => { setDiasMes(togglePosible(diasMes, d)); setTocado(true); }}>
                  {d}
                </button>
              ))}
            </div>
            {errDias && <p className="ub-error">{errDias}</p>}
            <p className="ub-hint">Si marcas días de semana y días de mes, la oferta aplica cuando coincide cualquiera de los dos.</p>
          </div>

          <div className="ub-field">
            <label>Barrios donde aplica</label>
            <SelectorBarriosMultiple
              value={barrios}
              onChange={(nuevo) => { setBarrios(nuevo); setTocado(true); }}
            />
            {errBarrios && <p className="ub-error">{errBarrios}</p>}
          </div>

          {errorApi && <p className="ub-error">{errorApi}</p>}
        </div>

        <div className="ub-modal__foot">
          <button className="ub-btn ub-btn--ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="ub-btn ub-btn--primary" onClick={guardar} disabled={guardando || !puedeGuardar}>
            {guardando ? "Guardando…" : (editando ? "Guardar cambios" : "Crear")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
