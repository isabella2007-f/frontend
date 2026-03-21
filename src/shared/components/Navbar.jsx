import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
import { Menu, X } from "lucide-react";
import "./Navbar.css";

export default function Navbar({ isLanding = false, onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  return (
    <nav className={`navbar ${isLanding ? 'is-landing' : ''}`}>
      <div className="navbar-inner">

        {/* LEFT — Hamburger para Dashboard o Mobile Landing */}
        <div className="nav-left-section">
          {!isLanding && user && (
            <button className="hamburger-toggle" onClick={onToggleSidebar} title="Menu">
              <Menu size={24} />
            </button>
          )}
          
          {isLanding && (
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>

        {/* CENTER — Logo desplazado al centro */}
        <div className="logo-wrapper" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
          <img src="/Logo.png" alt="Logo" className="logo" />
        </div>

        {/* RIGHT */}
        <div className="nav-right">
          <div className="links-bell-wrapper">
            <div className="nav-links">
              {isLanding ? (
                <>
                  <button onClick={() => scrollToSection('inicio')} className="nav-link">Inicio</button>
                  <button onClick={() => scrollToSection('productos')} className="nav-link">Productos</button>
                  <button onClick={() => scrollToSection('nosotros')} className="nav-link">Nosotros</button>
                </>
              ) : (
                <>
                  <Link to={user?.rol === 'administrador' ? "/admin/inicio" : "/cliente/inicio"} className="nav-link">Inicio</Link>
                  <Link to={user?.rol === 'administrador' ? "/admin" : "/cliente"} className="nav-link">Dashboard</Link>
                </>
              )}
            </div>
          </div>

          {!isLanding && user && (
            <div className="user-area">
              <div className="avatar">
                {user.nombre.charAt(0)}
              </div>
              <div className="user-info-text">
                <div className="user-name">{user.nombre}</div>
                <div className="user-role">{user.rol}</div>
              </div>
            </div>
          )}

          {isLanding && !user && (
            <div className="auth-btns">
              <button onClick={() => navigate("/login")} className="btn-login-nav">Login</button>
              <button onClick={() => navigate("/register")} className="btn-register-nav">Registro</button>
            </div>
          )}

          {isLanding && user && (
            <button onClick={() => navigate("/admin")} className="btn-admin-nav">Ir al Sistema</button>
          )}

          {!isLanding && (
            <button className="logout-btn" title="Cerrar sesión" onClick={handleLogout}>⏏</button>
          )}
        </div>
      </div>

      {/* Mobile dropdown Landing */}
      {isLanding && menuOpen && (
        <div className="mobile-menu">
           <button onClick={() => scrollToSection('inicio')} className="mobile-link">Inicio</button>
           <button onClick={() => scrollToSection('productos')} className="mobile-link">Productos</button>
           <button onClick={() => scrollToSection('nosotros')} className="mobile-link">Nosotros</button>
           {!user && <button onClick={() => navigate("/login")} className="mobile-link">Login</button>}
        </div>
      )}
    </nav>
  );
}
