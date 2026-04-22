import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
import { Menu, X, ShoppingCart, Bell } from "lucide-react";
import "./Navbar.css";
import { getCartCount, getCart, getTotal } from "../../features/sales/orders/services/cartService";
import CartAside from "../../features/sales/orders/components/CartAside";
import CheckoutModal from "../../features/sales/orders/components/CheckoutModal";
import LogoutModal from "./LogoutModal";
// ── NOTIFICACIONES ──────────────────────────────────────────
import { useNotificaciones } from "../../features/notificaciones/context/NotificacionesContext";
import NotificacionesPanel from "../../features/notificaciones/components/NotificacionesPanel";
import AlertaBanner from "../../features/notificaciones/components/AlertaBanner";
import "../../features/notificaciones/components/notificaciones.css";

export default function Navbar({ isLanding = false, onToggleSidebar }) {
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [user,             setUser]             = useState(null);
  const [cartCount,        setCartCount]        = useState(0);
  const [isCartOpen,       setIsCartOpen]       = useState(false);
  const [isCheckoutOpen,   setIsCheckoutOpen]   = useState(false);
  const [orderDetails,     setOrderDetails]     = useState(null);
  const [cartUpdateToggle, setCartUpdateToggle] = useState(false);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  // ── Panel notificaciones ──
  const [notifOpen,        setNotifOpen]        = useState(false);
  const navigate = useNavigate();

  // ── Notificaciones context ──
  const { noLeidas } = useNotificaciones();

  useEffect(() => {
    setUser(getUser());
    updateCartCount();
    const handleCartUpdate = () => {
      updateCartCount();
      setCartUpdateToggle(prev => !prev);
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const updateCartCount = () => setCartCount(getCartCount());

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = () => { logout(); navigate("/login"); };

  const handleCheckout = (details) => {
    const currentUser = getUser();
    if (!currentUser) { navigate("/login"); return; }
    setOrderDetails({
      ...details,
      clientName: currentUser.nombre || 'Cliente',
      address: details.address || currentUser.direccion || '',
      departamento: details.departamento || currentUser.departamento || '',
      items: getCart(),
      total: getTotal(),
    });
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleLoginRequired = () => navigate("/login");

  const handleConfirmOrder = (paymentMethod, onBehalfOf, comprobante) => {
    console.log("Orden confirmada:", { ...orderDetails, paymentMethod, onBehalfOf, comprobante });
    alert("¡Pedido realizado con éxito! Gracias por tu compra.");
    setIsCheckoutOpen(false);
    localStorage.removeItem('toston_app_cart');
    updateCartCount();
    window.dispatchEvent(new Event('cart-updated'));
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  // La campanita sólo se muestra a usuarios autenticados (no landing, no cliente)
  const mostrarCampana = !isLanding && user && user.rol !== "cliente";

  return (
    <>
      <nav className={`navbar ${isLanding ? 'is-landing' : ''}`}>
        <div className="navbar-inner">

          {/* LEFT — Hamburger */}
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

          {/* CENTER — Logo */}
          <div className="logo-wrapper" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
            <img src="/Logo.png" alt="Logo" className="logo" />
          </div>

          {/* RIGHT */}
          <div className="nav-right">
            <div className="links-bell-wrapper">
              <div className="nav-links">
                {isLanding ? (
                  <>
                    <button onClick={() => navigate('/')} className="nav-link">Inicio</button>
                    <button onClick={() => scrollToSection('productos')} className="nav-link">Productos</button>
                    <button onClick={() => scrollToSection('nosotros')} className="nav-link">Nosotros</button>
                  </>
                ) : (
                  <>
                    {user?.rol !== 'administrador' && (
                      <Link to="/cliente/inicio" className="nav-link">Inicio</Link>
                    )}
                    {user?.rol === 'administrador' && (
                      <Link to="/" className="nav-link">Dashboard</Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── 🔔 CAMPANITA DE NOTIFICACIONES ── */}
            {mostrarCampana && (
              <button
                className="bell-btn"
                onClick={() => setNotifOpen(true)}
                title="Notificaciones"
                aria-label={`${noLeidas} notificaciones sin leer`}
              >
                <Bell size={22} />
                {noLeidas > 0 && (
                  <span className="bell-badge">
                    {noLeidas > 99 ? "99+" : noLeidas}
                  </span>
                )}
              </button>
            )}

            {/* Carrito */}
            {(user?.rol === "cliente" || (!user && !isLanding)) && (
              <button className="cart-btn" onClick={() => setIsCartOpen(true)} title="Ver carrito">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>
            )}

            {!isLanding && user && (
              <div className="user-area" onClick={() => navigate(user.rol === "cliente" ? "/cliente/perfil" : "/admin/perfil")} style={{ cursor: 'pointer' }}>
                <div className="avatar">{user.nombre.charAt(0)}</div>
                <div className="user-info-text">
                  <div className="user-name">{user.nombre}</div>
                  <div className="user-role">{user.rol}</div>
                </div>
              </div>
            )}

            {isLanding && (
              <div className="auth-btns">
                <button onClick={() => navigate("/login")} className="btn-login-nav">Iniciar sesión</button>
                <button onClick={() => navigate("/register")} className="btn-register-nav">Registrarse</button>
              </div>
            )}

            {!isLanding && (
              <button className="logout-btn" title="Cerrar sesión" onClick={handleLogout}>⏏</button>
            )}
          </div>
        </div>

        {/* Mobile dropdown Landing */}
        {isLanding && menuOpen && (
          <div className="mobile-menu">
            <button onClick={() => navigate('/')} className="mobile-link">Inicio</button>
            <button onClick={() => scrollToSection('productos')} className="mobile-link">Productos</button>
            <button onClick={() => scrollToSection('nosotros')} className="mobile-link">Nosotros</button>
            <button onClick={() => navigate("/login")} className="mobile-link">Iniciar sesión</button>
            <button onClick={() => navigate("/register")} className="mobile-link">Registrarse</button>
          </div>
        )}
      </nav>

      {/* ── Panel de notificaciones ── */}
      {mostrarCampana && (
        <>
          <NotificacionesPanel
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
          {/* Banner de alertas críticas al entrar */}
          <AlertaBanner onVerTodas={() => { setNotifOpen(true); }} />
        </>
      )}

      {/* Cart */}
      <CartAside
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
        onLoginRequired={handleLoginRequired}
        cartUpdateToggle={cartUpdateToggle}
      />

      {orderDetails && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          orderDetails={orderDetails}
          onConfirm={handleConfirmOrder}
        />
      )}

      {showLogoutModal && (
        <LogoutModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}