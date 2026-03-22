import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
import "./Sidebar.css";

const adminMenuItems = [
  { section: "Configuración", icon: "⚙️", items: [
    { label: "Roles y Permisos", icon: "🛡️", link: "/roles" },
    { label: "Gestión de Usuario", icon: "👤", link: "/usuarios" },
    { label: "Gestión de Empleados", icon: "👥", link: "/empleados" },
    { label: "Control de Acceso", icon: "🔐", link: "/control-acceso" },
  ]},
  { section: "Compras", icon: "🛒", items: [
    { label: "Categorías de Insumos", icon: "🗂️", link: "/categorias_insumos" },
    { label: "Gestión de Insumos", icon: "📦", link: "/gestion-insumos" },
    { label: "Compras", icon: "🧾", link: "/compras" },
    { label: "Proveedores", icon: "🏭", link: "/proveedores" },
  ]},
  { section: "Producción", icon: "⚡", items: [
    { label: "Categoría de Productos", icon: "🏷️", link: "/categorias_productos" },
    { label: "Gestión de Productos", icon: "📦", link: "/products" },
    { label: "Órdenes de Producción", icon: "🏭", link: "/ordenes-produccion" },
  ]},
  { section: "Ventas", icon: "💰", items: [
    { label: "Clientes", icon: "👤", link: "/clientes" },
    { label: "Pedidos", icon: "🛍️", link: "/pedidos" },
    { label: "Devoluciones", icon: "↩️", link: "/devoluciones" },
    { label: "Domicilios", icon: "🏠", link: "/domicilios" },
  ]},
  { section: "Dashboard", icon: "▦", items: [
    { label: "Vista General", icon: "🖥️", link: "/admin" },
  ]},
];

const clienteMenuItems = [
  { section: "Mi Cuenta", icon: "👤", items: [
    { label: "Mis Pedidos", icon: "🛍️", link: "/cliente/pedidos" },
    { label: "Mi Perfil", icon: "👤", link: "/cliente/perfil" },
  ]},
];

const BADGES = { Ventas: "7", Compras: "4" };

export default function Sidebar() {
  const [openSections, setOpenSections] = useState({ Ventas: true, "Mi Cuenta": true });
  const [activeItem, setActiveItem] = useState("");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUser());
  }, []);

  const menuItems = user?.rol === "administrador" ? adminMenuItems : clienteMenuItems;

  const toggle = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleLogout = () => {
    logout();
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      {/* Search */}
      <div className="sidebar-search">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          placeholder="Buscar módulo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="nav-group-label">Módulos</div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map(({ section, icon, items }, i) => {
          const filtered = search
            ? items.filter((it) => it.label.toLowerCase().includes(search.toLowerCase()))
            : items;
          if (search && filtered.length === 0) return null;
          const isOpen = openSections[section] || !!search;

          return (
            <div key={section}>
              {i === 4 && <div className="nav-divider" />}

              <button
                className={`section-btn ${isOpen ? "open" : ""}`}
                onClick={() => toggle(section)}
              >
                <span className="section-icon-wrap">{icon}</span>
                <span className="section-label">{section}</span>
                {BADGES[section] && !search && (
                  <span className="section-badge">{BADGES[section]}</span>
                )}
                <span className={`chevron ${isOpen ? "rotated" : ""}`}>▼</span>
              </button>

              <div className={`submenu ${isOpen ? "open" : ""}`}>
                <div className="submenu-inner">
                  <div className="submenu-line" />
                  {filtered.map(({ label, icon: subIcon, link }) => (
                    <Link
                      key={label}
                      to={link}
                      className={`sub-item ${activeItem === label ? "active" : ""}`}
                      onClick={() => setActiveItem(label)}
                    >
                      {activeItem === label && <div className="sub-item-dot" />}
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

      {/* Footer Dinámico */}
      <div className="sidebar-footer">
        <div className="avatar" style={{ 
          background: "var(--g)", 
          color: "white", 
          fontWeight: "800", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          {user?.nombre?.charAt(0) || "U"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name" style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            fontSize: "14px",
            fontWeight: "700"
          }}>
            {user?.nombre || "Usuario"}
          </div>
          <div className="user-role" style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            fontWeight: "800", 
            color: "var(--g)",
            letterSpacing: "0.5px"
          }}>
            {user?.rol || "Invitado"}
          </div>
        </div>
        <button className="logout-btn" title="Cerrar sesión" onClick={handleLogout}>⏏</button>
      </div>
    </aside>
  );
}