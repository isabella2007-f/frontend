import { Link } from "react-router-dom";
import { usePrivilegios } from "../../context/PrivilegiosContext";
import {
  Shield, Users, Upload, FolderOpen, Package, Building2, Receipt, Tag, Box,
  ClipboardList, ShoppingBag, Truck, RotateCcw, Globe, LayoutGrid,
} from "lucide-react";

/**
 * Pantalla de entrada del panel para quien NO tiene "ver Dashboard".
 * Antes, sin ese permiso, /admin redirigía a /sin-acceso y el usuario quedaba
 * bloqueado aunque tuviera acceso a otros módulos. "ver Dashboard" ahora solo
 * controla las estadísticas; el panel de módulos se ve con cualquier permiso.
 */
const MODULOS = [
  { clave: "Roles_ver",              label: "Roles y Privilegios",   to: "/admin/roles",                Icon: Shield },
  { clave: "Usuarios_ver",           label: "Usuarios",              to: "/admin/usuarios",             Icon: Users },
  { clave: "GestionSalidas_ver",     label: "Salidas",               to: "/admin/salidas",              Icon: Upload },
  { clave: "CategoriaInsumos_ver",   label: "Categorías de Insumos", to: "/admin/categorias_insumos",   Icon: FolderOpen },
  { clave: "Insumos_ver",            label: "Insumos",               to: "/admin/gestion-insumos",      Icon: Package },
  { clave: "Compras_ver",            label: "Compras",               to: "/admin/compras",              Icon: Receipt },
  { clave: "Proveedores_ver",        label: "Proveedores",           to: "/admin/proveedores",          Icon: Building2 },
  { clave: "CategoriaProductos_ver", label: "Categorías de Productos", to: "/admin/categorias_productos", Icon: Tag },
  { clave: "GestionProductos_ver",   label: "Productos",             to: "/admin/products",             Icon: Box },
  { clave: "OrdenesProduccion_ver",  label: "Órdenes de Producción", to: "/admin/ordenes-produccion",   Icon: ClipboardList },
  { clave: "Pedidos_ver",            label: "Pedidos",               to: "/admin/pedidos",              Icon: ShoppingBag },
  { clave: "Domicilios_ver",         label: "Domicilios",            to: "/admin/domicilios",           Icon: Truck },
  { clave: "Devoluciones_ver",       label: "Devoluciones",          to: "/admin/devoluciones",         Icon: RotateCcw },
  { clave: "LandingPage_editar",     label: "Editar Landing Page",   to: "/admin/landing",              Icon: Globe },
];

export default function PanelInicio() {
  const { hasPrivilegio, loading } = usePrivilegios();
  if (loading) return null;

  const visibles = MODULOS.filter(m => hasPrivilegio(m.clave));

  return (
    <div style={{ padding: "40px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <LayoutGrid size={26} style={{ color: "#2e7d32" }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#212121" }}>Panel de gestión</h1>
      </div>
      <p style={{ margin: "0 0 28px", color: "#757575", fontSize: 14 }}>
        {visibles.length > 0
          ? "Selecciona un módulo para empezar."
          : "Tu rol todavía no tiene módulos habilitados. Contacta al administrador."}
      </p>

      <div style={{
        display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}>
        {visibles.map((m) => (
          <Link
            key={m.clave}
            to={m.to}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 18px", borderRadius: 12,
              border: "1px solid #e0e0e0", background: "#fff",
              textDecoration: "none", color: "#212121", fontWeight: 600, fontSize: 14,
              transition: "border-color .15s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#4caf50"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(76,175,80,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: 10, background: "#f1f8f1",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#2e7d32",
            }}>
              <m.Icon size={20} />
            </span>
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
