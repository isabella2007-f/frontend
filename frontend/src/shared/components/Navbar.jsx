import { useState } from "react";
import "./Navbar.css";

const navLinks = ["Productos", "Nosotros", "Contacto"];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* LEFT — hamburger (solo mobile) */}
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* CENTER — logo */}
        <div className="logo-wrapper">
          <img src="\public\Logo.png" alt="Logo" className="logo" />
        </div>


      {/* RIGHT */}
<div className="nav-right">

  {/* Links + Bell al extremo derecho */}
  <div className="links-bell-wrapper">
    <div className="nav-links">
      {navLinks.map((link) => (
        <a key={link} href="#" className="nav-link">{link}</a>
      ))}
    </div>

    {/* Campana al lado de los links */}
    <button className="bell-btn" title="Notificaciones">
      🔔
      <span className="bell-dot" />
    </button>
  </div>

  {/* User */}
  <div className="user-area">
    <div className="avatar">👤</div>
    <div>
      <div className="user-name">Ana García</div>
      <div className="user-role">Administrador</div>
    </div>
  </div>

  {/* Logout */}
  <button className="logout-btn" title="Cerrar sesión">⏏</button>

</div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <a key={link} href="#" className="mobile-link">{link}</a>
          ))}
        </div>
      )}
    </nav>
  );
}