import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
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
      { label: "Ver Landing Page", icon: "🏠", link: "/" },
    ],
  },
  {
    section: "Dashboard",
    icon: "▦",
    items: [
      { label: "Vista General", icon: "🖥️", link: "/admin" },
    ],
  },
  {
    section: "Configuración",
    icon: "⚙️",
    items: [
      { label: "Roles y Privilegios", icon: "🛡️", link: "/admin/roles" },
      { label: "Gestión de Usuario", icon: "👤", link: "/admin/usuarios" },
      { label: "Gestión de Salidas", icon: "📤", link: "/admin/salidas" },
    ],
  },
  {
    section: "Compras",
    icon: "🛒",
    items: [
      { label: "Categorías de Insumos", icon: "🗂️", link: "/admin/categorias_insumos" },
      { label: "Gestión de Insumos", icon: "📦", link: "/admin/gestion-insumos" },
      { label: "Compras", icon: "🧾", link: "/admin/compras" },
      { label: "Proveedores", icon: "🏭", link: "/admin/proveedores" },
    ],
  },
  {
    section: "Producción",
    icon: "⚡",
    items: [
      { label: "Categoría de Productos", icon: "🏷️", link: "/admin/categorias_productos" },
      { label: "Gestión de Productos", icon: "📦", link: "/admin/products" },
      { label: "Órdenes de Producción", icon: "📋", link: "/admin/ordenes-produccion" },
    ],
  },
  {
    section: "Ventas",
    icon: "💰",
    items: [
      { label: "Pedidos", icon: "🛍️", link: "/admin/pedidos" },
      { label: "Domicilios", icon: "🚚", link: "/admin/domicilios" },
      { label: "Devoluciones", icon: "🔄", link: "/admin/devoluciones" },
    
    ],
  },
];

const clienteMenuItems = [
  { section: "Mi Cuenta", icon: "👤", items: [
    { label: "Inicio", icon: "🏠", link: "/cliente/inicio" },
    { label: "Mis Pedidos", icon: "🛍️", link: "/cliente/pedidos" },
    { label: "Devoluciones", icon: "🔄", link: "/cliente/devoluciones" },
    { label: "Mi Perfil", icon: "👤", link: "/cliente/perfil" },
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

  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);


  useEffect(() => {
    setUser(getUser());
  }, []);

  const menuItems =
    user?.rol === "administrador" ? adminMenuItems : clienteMenuItems;

  const toggle = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  if (!user) return null;

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : "is-closed"}`}>
      {/* Botón flotante para colapsar/abrir (visible siempre en el borde) */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={onToggle}
        title={isOpen ? "Contraer menú" : "Expandir menú"}
      >
        {isOpen ? "◀" : "▶"}
      </button>

      <div className="sidebar-content">
        <div className="sidebar-inner">

          {/* BUSCADOR */}
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

          {/* NAVEGACIÓN */}
          <nav className="sidebar-nav">
            {menuItems.map(({ section, icon, items }) => {
              const filtered = search
                ? items.filter((it) =>
                    it.label.toLowerCase().includes(search.toLowerCase())
                  )
                : items;

              if (search && filtered.length === 0) return null;

              const isSectionOpen = openSections[section] || !!search;

              return (
                <div key={section}>
                  <button
                    className={`section-btn ${isSectionOpen ? "open" : ""}`}
                    onClick={() => toggle(section)}
                  >
                    <span className="section-icon-wrap">{icon}</span>
                    <span className="section-label">{section}</span>
                    <span className={`chevron ${isSectionOpen ? "rotated" : ""}`}>
                      ▼
                    </span>
                  </button>

                  <div className={`submenu ${isSectionOpen ? "open" : ""}`}>
                    <div className="submenu-inner">
                      {filtered.map(({ label, icon: subIcon, link }) => (
                        <Link
                          key={label}
                          to={link}
                          className={`sub-item ${
                            location.pathname === link ? "active" : ""
                          }`}
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

          {/* FOOTER */}
          <div className="sidebar-footer">
            <div className="avatar" onClick={() => navigate(user.rol === "cliente" ? "/cliente/perfil" : "/admin/perfil")} style={{ cursor: 'pointer' }}>
              {user?.nombre?.charAt(0) || "U"}
            </div>

            <div className="footer-info">
              <div className="user-name">{user?.nombre}</div>
              <div className="user-role">{user?.rol}</div>
            </div>

            <button
              className="logout-btn-sidebar"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              ⏏
            </button>
          </div>
        </div>
      </div>
      {showLogoutModal && (
        <LogoutModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </aside>
  );
}