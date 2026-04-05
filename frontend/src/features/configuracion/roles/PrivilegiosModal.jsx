/**
 * PrivilegiosModal — navegación dos niveles SIN scroll
 *
 * Nivel 1 (chips superiores): Grupos  →  Sistema | Inventario | Producción | Ventas
 * Nivel 2 (tabs inferiores):  Módulos del grupo activo (máx. 5, siempre caben)
 * Panel central:              Tarjetas de acciones del módulo seleccionado
 *
 * Importar y usar igual que antes:
 *   <PrivilegiosModal
 *     privilegios={...}
 *     esAdmin={bool}
 *     isView={bool}          ← opcional, omitir en CrearRol
 *     onChange={fn}
 *     onClose={fn}
 *   />
 */

import { useState } from "react";

const GRUPOS_MODULOS = [
  {
    grupo: "Configuración",
    icon: "⚙️",
    modulos: [
      { key: "Dashboard",  label: "Dashboard",  icon: "📊" },
      { key: "Roles",      label: "Roles",       icon: "🛡️" },
      { key: "Usuarios",   label: "Usuarios",    icon: "👥" },
    ],
  },
  {
    grupo: "Compras",
    icon: "📦",
    modulos: [
      { key: "CategoriaInsumos", label: "Cat. Insumos",  icon: "📂" },
      { key: "Insumos",          label: "Insumos",        icon: "🧪" },
      { key: "Proveedores",      label: "Proveedores",    icon: "🚚" },
      { key: "Compras",   label: "Compras", icon: "📋" },
    ],
  },
  {
    grupo: "Producción",
    icon: "🏭",
    modulos: [
      { key: "CategoriaProductos", label: "Cat. Productos", icon: "📦" },
      { key: "GestionProductos",   label: "Gestión Prod.",  icon: "📋" },
      { key: "OrdenesProduccion",  label: "Órdenes Prod.",  icon: "🏭" },
    ],
  },
  {
    grupo: "Ventas",
    icon: "💰",
    modulos: [
      { key: "Clientes",      label: "Clientes",      icon: "🧑‍💼" },
      { key: "Pedidos",       label: "Pedidos",        icon: "🛒" },
      { key: "GestionVentas", label: "Gestión Ventas", icon: "💰" },
      { key: "Devoluciones",  label: "Devoluciones",   icon: "↩️" },
      { key: "Domicilios",    label: "Domicilios",     icon: "🏍️" },
    ],
  },
];

const MODULOS = GRUPOS_MODULOS.flatMap(g => g.modulos);

const ACCIONES = [
  { key: "ver",      label: "Ver",      icon: "👁️",  color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" },
  { key: "crear",    label: "Crear",    icon: "➕",   color: "#1565c0", bg: "#e3f2fd", border: "#90caf9" },
  { key: "editar",   label: "Editar",   icon: "✎",    color: "#e65100", bg: "#fff3e0", border: "#ffcc80" },
  { key: "eliminar", label: "Eliminar", icon: "🗑️",  color: "#c62828", bg: "#ffebee", border: "#ef9a9a" },
];

const TOTAL_PRIVILEGIOS = MODULOS.reduce(
  (acc, m) => acc + (m.key === "Dashboard" ? 1 : ACCIONES.length), 0
);

export function buildPrivilegios(overrides = []) {
  const map = {};
  overrides.forEach(p => { if (p.modulo) map[p.id] = p.estado; });
  return MODULOS.flatMap(m =>
    ACCIONES.map(a => {
      const id = `${m.key}_${a.key}`;
      return { id, modulo: m.key, accion: a.key,
        nombre: `${a.label} ${m.label.toLowerCase()}`, estado: map[id] ?? false };
    })
  );
}

function tieneTodosLosPrivilegios(privilegios) {
  const activos = privilegios.filter(p =>
    p.modulo === "Dashboard" ? p.accion === "ver" && p.estado : p.estado
  ).length;
  return activos >= TOTAL_PRIVILEGIOS;
}

/* ── Estilos inline reutilizables ── */
const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1100,
  },
  box: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    width: "min(700px, 96vw)",
    /* altura fija: evita cualquier scroll externo */
    maxHeight: "90vh",
    overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px 12px",
    borderBottom: "1px solid #f0f0f0",
    flexShrink: 0,
  },
  /* ── Nivel 1: fila de grupos ── */
  gruposBar: {
    display: "flex",
    gap: 6,
    padding: "10px 20px 0",
    flexShrink: 0,
  },
  grupoChip: (activo) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 13px",
    borderRadius: 20,
    border: activo ? "1.5px solid #4caf50" : "1.5px solid #e0e0e0",
    background: activo ? "#f1f8e9" : "#fafafa",
    color: activo ? "#2e7d32" : "#757575",
    fontSize: 13,
    fontWeight: activo ? 700 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  }),
  /* ── Nivel 2: fila de módulos ── */
  modulosBar: {
    display: "flex",
    gap: 4,
    padding: "8px 20px 0",
    flexShrink: 0,
  },
  moduloTab: (activo) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    borderBottom: activo ? "2px solid #4caf50" : "2px solid transparent",
    background: activo ? "#fff" : "transparent",
    color: activo ? "#212121" : "#9e9e9e",
    fontSize: 12,
    fontWeight: activo ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.12s",
    whiteSpace: "nowrap",
  }),
  /* ── Panel de acciones ── */
  panelBody: {
    flex: 1,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    overflow: "hidden", /* nunca scroll */
  },
  accionesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  accionCard: (on, accion) => ({
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 6,
    padding: "14px 8px",
    borderRadius: 10,
    border: `1.5px solid ${on ? accion.border : "#e8e8e8"}`,
    background: on ? accion.bg : "#fafafa",
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  }),
  accionCheck: (on, accion) => ({
    width: 18, height: 18,
    borderRadius: 4,
    border: `1.5px solid ${on ? accion.color : "#ccc"}`,
    background: on ? accion.color : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
  }),
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "12px 20px",
    borderTop: "1px solid #f0f0f0",
    flexShrink: 0,
  },
};

export default function PrivilegiosModal({
  privilegios,
  esAdmin   = false,
  isView    = false,
  onChange,
  onClose,
}) {
  const normalizar = (raw) =>
    raw.length > 0 && raw[0].modulo ? raw : buildPrivilegios(raw);

  const [local, setLocal]   = useState(() => normalizar(privilegios));
  const [grupo, setGrupo]   = useState(GRUPOS_MODULOS[0].grupo);
  const [modKey, setModKey] = useState(GRUPOS_MODULOS[0].modulos[0].key);

  /* Al cambiar grupo, seleccionar automáticamente el primer módulo */
  const handleGrupo = (g) => {
    setGrupo(g);
    const primerMod = GRUPOS_MODULOS.find(gr => gr.grupo === g)?.modulos[0];
    if (primerMod) setModKey(primerMod.key);
  };

  const toggle = (id) => {
    if (isView) return;
    setLocal(prev => prev.map(p => p.id === id ? { ...p, estado: !p.estado } : p));
  };

  const toggleAll = (moduloKey, valor) => {
    if (isView) return;
    if (moduloKey === "Dashboard") {
      setLocal(prev =>
        prev.map(p => p.modulo === moduloKey && p.accion === "ver" ? { ...p, estado: valor } : p)
      );
    } else {
      setLocal(prev => prev.map(p => p.modulo === moduloKey ? { ...p, estado: valor } : p));
    }
  };

  /* Datos del módulo activo */
  const grupoActual    = GRUPOS_MODULOS.find(g => g.grupo === grupo);
  const modMeta        = MODULOS.find(m => m.key === modKey);
  const modItems       = local.filter(p => p.modulo === modKey);
  const accionesMod    = ACCIONES.filter(a => modKey === "Dashboard" ? a.key === "ver" : true);
  const modActivos     = modItems.filter(p => p.estado).length;
  const todosOn        = modKey === "Dashboard"
    ? modItems.some(p => p.accion === "ver" && p.estado)
    : modActivos === accionesMod.length;

  /* Totales globales */
  const totalActivos = local.filter(p => p.estado).length;
  const advertencia  = !isView && !esAdmin && tieneTodosLosPrivilegios(local);

  /* Badge de activos por grupo (para el chip) */
  const activosPorGrupo = (g) => {
    const modulos = GRUPOS_MODULOS.find(gr => gr.grupo === g)?.modulos || [];
    return local.filter(p =>
      modulos.some(m => m.key === p.modulo) && p.estado
    ).length;
  };

  /* Badge de activos por módulo en nivel 2 */
  const activosPorModulo = (mKey) => {
    const items = local.filter(p => p.modulo === mKey &&
      (mKey === "Dashboard" ? p.accion === "ver" : true));
    return { activos: items.filter(p => p.estado).length, total: items.length };
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={e => e.stopPropagation()}>

        {/* ── Cabecera ── */}
        <div style={S.header}>
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "#9e9e9e",
              textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Gestión de privilegios
            </p>
            <h2 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 700, color: "#212121" }}>
              Privilegios del rol
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: "3px 10px", borderRadius: 12,
              background: "#f5f5f5", color: "#757575",
              border: "1px solid #e0e0e0",
            }}>
              {totalActivos}/{local.length} activos
            </span>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: 18,
              color: "#9e9e9e", cursor: "pointer", lineHeight: 1,
            }}>✕</button>
          </div>
        </div>

        {/* ── Advertencia todos los privilegios ── */}
        {advertencia && (
          <div style={{
            margin: "8px 20px 0",
            padding: "8px 12px",
            borderRadius: 8,
            background: "#fff8e1", border: "1px solid #ffe082",
            color: "#f57f17", fontSize: 12,
            display: "flex", gap: 7, alignItems: "center",
            flexShrink: 0,
          }}>
            ⚠️ <span>Este rol no es administrador pero tiene <strong>todos los privilegios</strong> activos.</span>
          </div>
        )}

        {/* ── Nivel 1: chips de grupo ── */}
        <div style={S.gruposBar}>
          {GRUPOS_MODULOS.map(g => {
            const activos = activosPorGrupo(g.grupo);
            const esActivo = grupo === g.grupo;
            return (
              <button
                key={g.grupo}
                style={S.grupoChip(esActivo)}
                onClick={() => handleGrupo(g.grupo)}
              >
                <span style={{ fontSize: 14 }}>{g.icon}</span>
                <span>{g.grupo}</span>
                {activos > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: esActivo ? "#c8e6c9" : "#eeeeee",
                    color: esActivo ? "#2e7d32" : "#9e9e9e",
                    borderRadius: 10, padding: "0 5px",
                    marginLeft: 2,
                  }}>
                    {activos}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Nivel 2: tabs de módulo del grupo activo ── */}
        <div style={{
          ...S.modulosBar,
          borderBottom: "1px solid #f0f0f0",
          paddingBottom: 0,
          marginBottom: 0,
        }}>
          {grupoActual?.modulos.map(m => {
            const { activos, total } = activosPorModulo(m.key);
            const esActivo = modKey === m.key;
            return (
              <button
                key={m.key}
                style={S.moduloTab(esActivo)}
                onClick={() => setModKey(m.key)}
              >
                <span style={{ fontSize: 13 }}>{m.icon}</span>
                <span>{m.label}</span>
                {activos > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: activos === total ? "#e8f5e9" : "#fff3e0",
                    color: activos === total ? "#2e7d32" : "#e65100",
                    border: `1px solid ${activos === total ? "#c8e6c9" : "#ffcc80"}`,
                    borderRadius: 10, padding: "0 5px",
                  }}>
                    {activos}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Panel de acciones ── */}
        <div style={S.panelBody}>
          {/* Sub-cabecera del módulo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{
                fontSize: 24, lineHeight: 1,
                background: "#f5f5f5", borderRadius: 8, padding: "5px 7px",
              }}>
                {modMeta?.icon}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#212121" }}>
                  {modMeta?.label}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "#9e9e9e" }}>
                  {isView
                    ? `${modActivos} acciones habilitadas`
                    : `${modActivos} de ${accionesMod.length} acciones habilitadas`}
                </p>
              </div>
            </div>
            {!isView && (
              <button
                onClick={() => toggleAll(modKey, !todosOn)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: todosOn ? "1px solid #ef9a9a" : "1px solid #a5d6a7",
                  background: todosOn ? "#ffebee" : "#e8f5e9",
                  color: todosOn ? "#c62828" : "#2e7d32",
                  fontSize: 12, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {todosOn ? "Desactivar todo" : "Activar todo"}
              </button>
            )}
          </div>

          {/* Tarjetas */}
          <div style={S.accionesGrid}>
            {accionesMod
              .filter(a => !isView || modItems.find(p => p.accion === a.key)?.estado)
              .map(accion => {
                const permiso = modItems.find(p => p.accion === accion.key);
                if (!permiso) return null;
                const on = permiso.estado;
                return (
                  <div
                    key={accion.key}
                    style={{
                      ...S.accionCard(on, accion),
                      cursor: isView ? "default" : "pointer",
                    }}
                    onClick={() => toggle(permiso.id)}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: on ? accion.bg : "#f5f5f5",
                      border: `1.5px solid ${on ? accion.border : "#e8e8e8"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 22 }}>{accion.icon}</span>
                    </div>
                    <p style={{
                      margin: 0, fontSize: 12, fontWeight: 600,
                      color: on ? accion.color : "#9e9e9e",
                    }}>
                      {accion.label}
                    </p>
                    <div style={S.accionCheck(on, accion)}>
                      {on && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                    </div>
                  </div>
                );
              })}

            {/* Placeholder si modo view y sin acciones activas */}
            {isView && accionesMod.filter(a => modItems.find(p => p.accion === a.key)?.estado).length === 0 && (
              <div style={{
                gridColumn: "1 / -1", textAlign: "center",
                padding: "28px 0", color: "#bdbdbd", fontSize: 13,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
                Sin acciones habilitadas para este módulo
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 18px", borderRadius: 8,
              border: "1px solid #e0e0e0", background: "#fff",
              color: "#555", fontSize: 13, cursor: "pointer",
            }}
          >
            {isView ? "Cerrar" : "Cancelar"}
          </button>
          {!isView && (
            <button
              onClick={() => { onChange(local); onClose(); }}
              style={{
                padding: "7px 18px", borderRadius: 8,
                border: "none", background: "#4caf50",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Aplicar privilegios
            </button>
          )}
        </div>
      </div>
    </div>
  );
}