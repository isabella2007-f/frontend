import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
import { usePrivilegios } from "../../context/PrivilegiosContext";
import LogoutModal from "./LogoutModal";
import "./Sidebar.css";

/* =========================
   MENÚS
========================= */

const adminMenuItems = [
  {
    section: "Sitio Web",
    icon: "🌐",
    items: [
      { label: "Ver Landing Page", icon: "🏠", link: "/", privilegioKey: "LandingPage" },
    ],
  },
  {
    section: "Dashboard",
    icon: "▦",
    items: [
      { label: "Vista General", icon: "🖥️", link: "/admin", privilegioKey: "Dashboard" },
    ],
  },
  {
    section: "Configuración",
    icon: "⚙️",
    items: [
      { label: "Roles y Privilegios",  icon: "🛡️", link: "/admin/roles",     privilegioKey: "Roles" },
      { label: "Gestión de Usuario",   icon: "👤", link: "/admin/usuarios",   privilegioKey: "Usuarios" },
      { label: "Gestión de Salidas",   icon: "📤", link: "/admin/salidas",    privilegioKey: "GestionSalidas" },
    ],
  },
  {
    section: "Compras",
    icon: "🛒",
    items: [
      { label: "Categorías de Insumos", icon: "🗂️", link: "/admin/categorias_insumos",  privilegioKey: "CategoriaInsumos" },
      { label: "Gestión de Insumos",    icon: "📦", link: "/admin/gestion-insumos",      privilegioKey: "Insumos" },
      { label: "Compras",               icon: "🧾", link: "/admin/compras",              privilegioKey: "Compras" },
      { label: "Proveedores",           icon: "🏭", link: "/admin/proveedores",          privilegioKey: "Proveedores" },
    ],
  },
  {
    section: "Producción",
    icon: "⚡",
    items: [
      { label: "Categoría de Productos", icon: "🏷️", link: "/admin/categorias_productos", privilegioKey: "CategoriaProductos" },
      { label: "Gestión de Productos",   icon: "📦", link: "/admin/products",             privilegioKey: "GestionProductos" },
      { label: "Órdenes de Producción",  icon: "📋", link: "/admin/ordenes-produccion",   privilegioKey: "OrdenesProduccion" },
      { label: "Cocina",                 icon: "🍳", link: "/admin/cocina",             roleRequired: "Cocinero" },
    ],
  },
  {
    section: "Ventas",
    icon: "💰",
    items: [
      { label: "Pedidos",       icon: "🛍️", link: "/admin/pedidos",              privilegioKey: "Pedidos" },
      { label: "Domicilios",    icon: "🚚", link: "/admin/domicilios",           privilegioKey: "Domicilios" },
      { label: "Mi Dashboard",    icon: "🏠", link: "/admin/mi-dashboard",           clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Mis Entregas",    icon: "🛵", link: "/admin/mis-entregas",           clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Pedido Actual",   icon: "📦", link: "/admin/pedido-actual",          clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Historial",       icon: "📋", link: "/admin/historial-entregas",     clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Mis Ganancias",   icon: "💰", link: "/admin/mis-ganancias",          clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Notificaciones",  icon: "🔔", link: "/admin/mis-notificaciones",     clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Mi Perfil",       icon: "👤", link: "/admin/mi-perfil-repartidor",   clave: "Domicilios_cambiar_estado", hideFromAdmin: true },
      { label: "Devoluciones",  icon: "🔄", link: "/admin/devoluciones",         privilegioKey: "Devoluciones" },
    ],
  },
];

const clienteMenuItems = [
  { section: "Mi Cuenta", icon: "👤", items: [
    { label: "Inicio",       icon: "🏠", link: "/cliente/inicio" },
    { label: "Mis Pedidos",  icon: "🛍️", link: "/cliente/pedidos" },
    { label: "Devoluciones", icon: "🔄", link: "/cliente/devoluciones" },
    { label: "Mi Perfil",    icon: "👤", link: "/cliente/perfil" },
  ]},
];

/* =========================
   COMPONENTE
========================= */

export default function Sidebar({ isOpen, onToggle }) {
  const [openSections, setOpenSections] = useState({
    Dashboard: true,
    Ventas: true,
    "Mi Cuenta": true,
  });

  const [search,          setSearch]          = useState("");
  const [user,            setUser]            = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { hasPrivilegio, isAdmin, loading } = usePrivilegios();

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("session-changed", sync);
    return () => window.removeEventListener("session-changed", sync);
  }, []);

  const canSeeItem = (item) => {
    if (item.roleRequired) {
      const expected = Array.isArray(item.roleRequired) ? item.roleRequired : [item.roleRequired];
      const rol = user?.rol?.toLowerCase();
      const matches = expected.some(r => r.toLowerCase() === rol);
      if (!matches) return false;
    }
    if (!item.privilegioKey && !item.clave) return true;  // sin restricción → siempre visible
    if (loading) return false;                             // aún cargando → no mostrar hasta tener privilegios
    if (item.hideFromAdmin && isAdmin) return false;       // ocultar al admin explícitamente
    if (isAdmin) return true;                              // admin → todo lo demás visible
    if (item.clave) return hasPrivilegio(item.clave);      // clave exacta (sin sufijo _ver)
    return hasPrivilegio(`${item.privilegioKey}_ver`);
  };

  const menuItems = user?.tipo === "empleado" ? adminMenuItems : clienteMenuItems;

  const toggle = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  if (!user) return null;

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : "is-closed"}`}>
      <button
        className="sidebar-toggle-btn"
        onClick={onToggle}
        title={isOpen ? "Contraer menú" : "Expandir menú"}
      >
        {isOpen ? "◀" : "▶"}
      </button>

      <div className="sidebar-content">
        <div className="sidebar-inner">

          <div className="sidebar-search">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Buscar módulo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="nav-group-label">Módulos</div>

          <nav className="sidebar-nav">
            {menuItems.map(({ section, icon, items }) => {
              const filtered = search
                ? items.filter(it => it.label.toLowerCase().includes(search.toLowerCase()))
                : items;

              const visible = filtered.filter(canSeeItem);

              if (visible.length === 0) return null;

              const isSectionOpen = openSections[section] || !!search;

              return (
                <div key={section}>
                  <button
                    className={`section-btn ${isSectionOpen ? "open" : ""}`}
                    onClick={() => toggle(section)}
                  >
                    <span className="section-icon-wrap">{icon}</span>
                    <span className="section-label">{section}</span>
                    <span className={`chevron ${isSectionOpen ? "rotated" : ""}`}>▼</span>
                  </button>

                  <div className={`submenu ${isSectionOpen ? "open" : ""}`}>
                    <div className="submenu-inner">
                      {visible.map(({ label, icon: subIcon, link }) => (
                        <Link
                          key={label}
                          to={link}
                          className={`sub-item ${location.pathname === link ? "active" : ""}`}
                        >
                          <span className="sub-icon">{subIcon}</span>
                          <span className="sub-label">{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <div
              className="avatar"
              onClick={() => navigate(user.tipo === "cliente" ? "/cliente/perfil" : "/admin/perfil")}
            >
              {user?.nombre?.charAt(0) || "U"}
            </div>
            <div className="footer-info">
              <div className="user-name">{user?.nombre}</div>
              <div className="user-role">{user?.tipo}</div>
            </div>
            <button className="logout-btn-sidebar" onClick={handleLogout} title="Cerrar sesión">⏏</button>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />
      )}
    </aside>
  );
}
