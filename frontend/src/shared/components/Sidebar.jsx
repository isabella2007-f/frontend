import { useState } from "react";
import { Link } from "react-router-dom"; // Importa Link
import "./Sidebar.css";

const menuItems = [
  { section: "Configuración", icon: "⚙️", items: [
    { label: "Notificaciones", icon: "🔔" },
    { label: "Roles y Permisos", icon: "🛡️", link: "/roles" }, // Ruta ejemplo
    { label: "Gestión de Usuario", icon: "👤", link: "/usuarios" },
    { label: "Control de Acceso", icon: "🔐", link: "/control-acceso" }, // Ruta ejemplo
  ]},
  { section: "Compras", icon: "🛒", items: [
    { label: "Categorías de Insumos", icon: "🗂️", link: "/categorias_insumos" },
    { label: "Gestión de Insumos", icon: "📦", link: "/gestion-insumos" },
    { label: "Proveedores", icon: "🏭", link: "/proveedores" },
    { label: "Compras", icon: "🛒", link: "/compras" }, // Ruta ejemplo
  ]},
  { section: "Producción", icon: "⚡", items: [
    { label: "Categoría de Productos", icon: "🏷️", link: "/categorias_productos" },
    { label: "Gestión de Productos", icon: "📦", link: "/products" },
    { label: "Órdenes de Producción", icon: "📋", link: "/ordenes-compra" },
  ]},
  { section: "Ventas", icon: "💰", items: [
    { label: "Clientes", icon: "👤", link: "/clientes" },
    { label: "Pedidos", icon: "🛍️", link: "/pedidos" },
    { label: "Gestión de Ventas", icon: "📈", link: "/gestion-ventas" },
    { label: "Devoluciones", icon: "↩️", link: "/devoluciones" },
    { label: "Domicilios", icon: "🚚", link: "/domicilios" },
  ]},
  { section: "Dashboard", icon: "▦", items: [
    { label: "Vista General", icon: "🖥️", link: "/admin" },
  ]},
];

const BADGES = { Ventas: "7", Compras: "4" };

export default function Sidebar() {
  const [openSections, setOpenSections] = useState({ Ventas: true });
  const [activeItem, setActiveItem] = useState("Gestión de Ventas");
  const [search, setSearch] = useState("");

  const toggle = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

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
                    link ? (
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
                    ) : (
                      <div
                        key={label}
                        className={`sub-item ${activeItem === label ? "active" : ""}`}
                        onClick={() => setActiveItem(label)}
                      >
                        {activeItem === label && <div className="sub-item-dot" />}
                        <span className="sub-icon">{subIcon}</span>
                        <span className="sub-label">{label}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="avatar">👤</div>
        <div>
          <div className="user-name">Ana García</div>
          <div className="user-role">Administrador</div>
        </div>
        <button className="logout-btn" title="Cerrar sesión">⏏</button>
      </div>

    </aside>
  );
}