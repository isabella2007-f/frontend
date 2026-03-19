import { useState, useEffect } from "react";
import { getUser, logout } from "../../services/authService";
import "./Navbar.css";

const navLinks = ["Productos", "Nosotros", "Contacto"];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* LEFT — hamburger (solo mobile) */}
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* CENTER — logo */}
        <div className="logo-wrapper">
          <img src="/Logo.png" alt="Logo" className="logo" />
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

          {/* User Dinámico */}
          {user && (
            <div className="user-area">
              <div className="avatar" style={{ 
                background: "var(--g)", 
                color: "white", 
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                width: "32px",
                height: "32px"
              }}>
                {user.nombre.charAt(0)}
              </div>
              <div>
                <div className="user-name">{user.nombre}</div>
                <div className="user-role" style={{ textTransform: "capitalize" }}>{user.rol}</div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button className="logout-btn" title="Cerrar sesión" onClick={handleLogout}>⏏</button>

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
