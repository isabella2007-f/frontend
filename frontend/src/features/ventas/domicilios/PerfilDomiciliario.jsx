import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../../utils/api";
import { getUser } from "../../../services/authService";
import { getTodosLosDomicilios } from "../../../services/domiciliosService";
import { esDomicilioActivo } from "./estadosDomicilio";
import "./DomiciliarioUI.css";
import "./PerfilDomiciliario.css";
import {
  X, Check, User, Phone, Mail, MapPin, IdCard, CalendarDays,
  Pencil, Package, CheckCircle2, Banknote, Bike, ShieldCheck,
  AlertCircle, Info, MessageSquare, Building2, Map,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n || 0);

const fmtMes = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

/* Los campos que el backend acepta editar en /auth/perfil (ver PerfilUpdate).
   La pantalla solo dejaba tocar el teléfono, aunque el resto ya se guardaba. */
const CAMPOS_EDITABLES = [
  { name: "Telefono",     label: "Teléfono",     Icono: Phone,          tipo: "tel",  placeholder: "Ej. 3001234567" },
  { name: "Direccion",    label: "Dirección",    Icono: MapPin,         tipo: "text", placeholder: "Ej. Calle 10 # 4-32" },
  { name: "Municipio",    label: "Municipio",    Icono: Building2,      tipo: "text", placeholder: "Ej. Popayán" },
  { name: "Departamento", label: "Departamento", Icono: Map,            tipo: "text", placeholder: "Ej. Cauca" },
  { name: "Indicaciones", label: "Indicaciones", Icono: MessageSquare,  tipo: "area", placeholder: "Punto de referencia, portería, torre…", ancho: true },
];

const vacio = (v) => v === null || v === undefined || String(v).trim() === "";

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`du-toast du-toast--${toast.type === "error" ? "error" : "ok"}`}>
      <span className="du-toast__icon">{toast.type === "error" ? <X size={15} /> : <Check size={15} />}</span>
      {toast.message}
    </div>
  );
}

/** Un dato en modo lectura, con su icono y el aviso de "sin registrar". */
function Valor({ icono, children, ancho, label }) {
  // El plugin de React no está en esta config de eslint, así que un componente
  // recibido como parámetro se marca sin uso: se reasigna a una constante.
  const Icono = icono;
  const sinDato = vacio(children);
  return (
    <div className={ancho ? "pf-campo--ancho" : undefined}>
      <span className="pf-campo__label">{label}</span>
      <div className={`pf-valor${sinDato ? " pf-valor--vacio" : ""}`}>
        <Icono size={15} />
        {sinDato ? "No registrado" : children}
      </div>
    </div>
  );
}

export default function PerfilDomiciliario() {
  const user = getUser();
  const [perfil,   setPerfil]   = useState(null);
  const [resumen,  setResumen]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editando, setEditando] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [form, setForm] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const formDesde = (data) =>
    Object.fromEntries(CAMPOS_EDITABLES.map(c => [c.name, data?.[c.name] || ""]));

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/auth/perfil");
      setPerfil(data);
      setForm(formDesde(data));
    } catch {
      showToast("Error al cargar perfil", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Resumen de la hoja de servicio. Va aparte del perfil: si falla, la ficha
     se sigue viendo — son datos de apoyo, no la razón de esta pantalla. */
  const cargarResumen = useCallback(async () => {
    if (!user?.id) return;
    try {
      const doms = await getTodosLosDomicilios({ idEmpleado: user.id });
      const entregados = doms.filter(d => d.estado === "Entregado");
      setResumen({
        activas:    doms.filter(d => esDomicilioActivo(d.estadoId)).length,
        entregadas: entregados.length,
        valor:      entregados.reduce((s, d) => s + (d.total || 0), 0),
      });
    } catch {
      setResumen(null);
    }
  }, [user?.id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const campo of CAMPOS_EDITABLES) {
        const nuevo = form[campo.name] ?? "";
        if (nuevo !== (perfil?.[campo.name] || "")) payload[campo.name] = nuevo || null;
      }

      if (Object.keys(payload).length > 0) {
        await apiFetch("/auth/perfil", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      await cargar();
      setEditando(false);
      showToast("Perfil actualizado");
    } catch {
      showToast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelar = () => {
    setEditando(false);
    setForm(formDesde(perfil));
  };

  const fotoUrl   = perfil?.Foto_perfil;
  const iniciales = perfil ? `${perfil.Nombre?.[0] || ""}${perfil.Apellidos?.[0] || ""}`.toUpperCase() : "?";
  const desde     = fmtMes(perfil?.Fecha_creacion);
  const documento = [perfil?.Tipo_Documento, perfil?.Cedula].filter(Boolean).join(" ");
  const correoOk  = perfil?.Correo_Verificado !== 0;

  const STATS = [
    { label: "Entregas activas",  valor: resumen?.activas    ?? "—", Icono: Package },
    { label: "Completadas",       valor: resumen?.entregadas ?? "—", Icono: CheckCircle2 },
    { label: "Valor entregado",   valor: resumen ? fmt(resumen.valor) : "—", money: true, oro: true, Icono: Banknote },
  ];

  if (loading) {
    return (
      <div className="dom-ui perfil">
        <header className="du-hero">
          <span className="du-hero__eyebrow"><User size={14} /> Tu ficha</span>
          <h1 className="du-hero__title">Mi Perfil</h1>
          <p className="du-hero__sub">Cargando tus datos…</p>
        </header>
        <div className="du-inner du-inner--angosto">
          <div className="pf-col">
            {[1, 2].map(i => (
              <div key={i} className="du-skel-card">
                {[45, 80, 60, 70].map((w, j) => (
                  <div key={j} className="du-skel" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dom-ui perfil">
      <header className="du-hero">
        <div className="du-hero__top">
          <div className="pf-ident">
            <span className="pf-avatar">
              {fotoUrl ? <img src={fotoUrl} alt="" /> : iniciales}
            </span>
            <div className="pf-ident__txt">
              <span className="du-hero__eyebrow"><Bike size={14} /> {perfil?.rol || "Domiciliario"}</span>
              <h1 className="pf-ident__nombre">
                {perfil?.Nombre} {perfil?.Apellidos}
              </h1>
              <div className="pf-chips">
                {desde && <span className="pf-chip"><CalendarDays size={12} /> Desde {desde}</span>}
                <span className={`pf-chip${correoOk ? "" : " pf-chip--alerta"}`}>
                  {correoOk ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                  {correoOk ? "Correo verificado" : "Correo sin verificar"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="du-stats">
          {STATS.map(s => (
            <div key={s.label} className={`du-stat${s.oro ? " du-stat--oro" : ""}`}>
              <span className="du-stat__icon"><s.Icono size={19} /></span>
              <div>
                <div className={`du-stat__valor${s.money ? " du-stat__valor--money" : ""}`}>{s.valor}</div>
                <div className="du-stat__label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="du-inner du-inner--angosto">
        <div className="pf-col">

          {/* ── Datos de la cuenta (solo lectura) ── */}
          <section className="du-panel">
            <div className="du-panel__head">
              <h2 className="du-panel__titulo">Datos de la cuenta</h2>
            </div>
            <div className="du-panel__body">
              <div className="pf-campos">
                <Valor label="Correo"    icono={Mail}>{perfil?.Correo}</Valor>
                <Valor label="Documento" icono={IdCard}>{documento}</Valor>
              </div>
              <p className="pf-nota">
                <Info size={14} />
                El correo y el documento no se editan desde aquí. Si hay un error, pídeselo a
                administración.
              </p>
            </div>
          </section>

          {/* ── Contacto y dirección (editable) ── */}
          <section className="du-panel">
            <div className="du-panel__head">
              <h2 className="du-panel__titulo">Contacto y dirección</h2>
              {!editando ? (
                <button className="du-btn du-btn--fantasma du-btn--sm" onClick={() => setEditando(true)}>
                  <Pencil size={13} /> Editar
                </button>
              ) : (
                <div className="pf-acciones">
                  <button className="du-btn du-btn--fantasma du-btn--sm" onClick={cancelar} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="du-btn du-btn--primario du-btn--sm" onClick={handleSave} disabled={saving}>
                    <Check size={13} /> {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              )}
            </div>

            <div className="du-panel__body">
              <div className="pf-campos">
                {CAMPOS_EDITABLES.map(campo => (
                  editando ? (
                    <div key={campo.name} className={campo.ancho ? "pf-campo--ancho" : undefined}>
                      <label className="pf-campo__label" htmlFor={`pf-${campo.name}`}>{campo.label}</label>
                      {campo.tipo === "area" ? (
                        <textarea
                          id={`pf-${campo.name}`}
                          className="pf-textarea"
                          rows={3}
                          value={form[campo.name]}
                          placeholder={campo.placeholder}
                          onChange={e => setForm(f => ({ ...f, [campo.name]: e.target.value }))}
                        />
                      ) : (
                        <input
                          id={`pf-${campo.name}`}
                          className="pf-input"
                          type={campo.tipo}
                          value={form[campo.name]}
                          placeholder={campo.placeholder}
                          onChange={e => setForm(f => ({ ...f, [campo.name]: e.target.value }))}
                        />
                      )}
                    </div>
                  ) : (
                    <Valor key={campo.name} label={campo.label} icono={campo.Icono} ancho={campo.ancho}>
                      {perfil?.[campo.name]}
                    </Valor>
                  )
                ))}
              </div>

              {!editando && vacio(perfil?.Telefono) && (
                <p className="pf-nota">
                  <AlertCircle size={14} />
                  Sin teléfono registrado los clientes no pueden contactarte durante una entrega.
                </p>
              )}
            </div>
          </section>

        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
