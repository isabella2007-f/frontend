import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../../services/authService";
import { Menu, X, ShoppingCart } from "lucide-react";
import "./Navbar.css";
import { getCartCount, getCart, getTotal } from "../../features/sales/orders/services/cartService";
import CartAside from "../../features/sales/orders/components/CartAside";
import CheckoutModal from "../../features/sales/orders/components/CheckoutModal";

export default function Navbar({ isLanding = false, onToggleSidebar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [cartUpdateToggle, setCartUpdateToggle] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUser());
    updateCartCount();

    // Escuchar cambios en el carrito
    const handleCartUpdate = () => {
      updateCartCount();
      setCartUpdateToggle(prev => !prev);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const updateCartCount = () => {
    setCartCount(getCartCount());
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCheckout = (details) => {
    setOrderDetails({
      ...details,
      clientName: user?.nombre || "Cliente",
      items: getCart(),
      total: getTotal()
    });
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = (paymentMethod, onBehalfOf) => {
    console.log("Orden confirmada:", { ...orderDetails, paymentMethod, onBehalfOf });
    alert("¡Pedido realizado con éxito! Gracias por tu compra.");
    setIsCheckoutOpen(false);
    // Limpiar carrito
    localStorage.removeItem('toston_app_cart');
    updateCartCount();
    window.dispatchEvent(new Event('cart-updated'));
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  return (
    <>
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

            {/* Carrito Icon - Solo para clientes o logueados */}
            {user && (
              <button 
                className="cart-btn"
                onClick={() => setIsCartOpen(true)}
                title="Ver carrito"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="cart-badge">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

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
            <button onClick={() => scrollToSection('inicio')} className="mobile-link">Inicio</button>
            <button onClick={() => scrollToSection('productos')} className="mobile-link">Productos</button>
            <button onClick={() => scrollToSection('nosotros')} className="mobile-link">Nosotros</button>
            <button onClick={() => navigate("/login")} className="mobile-link">Iniciar sesión</button>
            <button onClick={() => navigate("/register")} className="mobile-link">Registrarse</button>
          </div>
        )}
      </nav>

      {/* Cart Components */}
      <CartAside 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onCheckout={handleCheckout}
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
    </>
  );
}
