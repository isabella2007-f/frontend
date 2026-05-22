import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../../AppContext";
import { getUser, logout } from "../../services/authService";
import { Menu, X, ShoppingCart, Bell } from "lucide-react";
import "./Navbar.css";
import { getCartCount, getCart, getTotal } from "../../features/sales/orders/services/cartService";
import CartAside from "../../features/sales/orders/components/CartAside";
import CheckoutModal from "../../features/sales/orders/components/CheckoutModal";
import LogoutModal from "./LogoutModal";
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
  const [notifOpen,        setNotifOpen]        = useState(false);
  const navigate = useNavigate();

  const { noLeidas, agregarNotificacion } = useNotificaciones();
  const { crearPedido } = useApp();

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
    const currentUser = getUser();
    const currentCart = getCart();
    const total = getTotal();

    const pedido = {
      idCliente:      currentUser?.id || '',
      cliente: {
        nombre:   currentUser ? `${currentUser.nombre} ${currentUser.apellidos || ''}`.trim() : onBehalfOf,
        correo:   currentUser?.correo   || '',
        telefono: currentUser?.telefono || '',
      },
      productosItems: currentCart.map(item => ({
        idProducto:   item.id,
        nombre:       item.nombre,
        precio:       item.precio,
        cantidad:     item.cantidad,
        stockOk:      true,
      })),
      subtotal:          total,
      descuento:         0,
      total:             total,
      metodo_pago:       paymentMethod === 'digital' ? 'Transferencia' : 'Efectivo',
      domicilio:         true,
      direccion_entrega: orderDetails.address,
      notas:             '',
      estado:            'Pendiente',
      orden_produccion:  false,
      comprobante:       !!comprobante,
    };

    const res = crearPedido(pedido);
    if (res && res.error) {
       alert(res.error);
       return;
    }

    setIsCheckoutOpen(false);
    localStorage.removeItem('toston_app_cart');
    updateCartCount();
    window.dispatchEvent(new Event('cart-updated'));
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const mostrarCampana = !!user && !isLanding;

  return (
    <>
      <nav className={`navbar ${isLanding ? 'is-landing' : ''}`}>
        <div className="navbar-inner">

          {/* LEFT */}
          <div className="nav-left-section">
          </div>

          {/* CENTER — Logo */}
          <div
            className="logo-wrapper"
            onClick={() => navigate(user?.tipo === 'usuario' ? "/" : "/panel")}
            style={{ cursor: 'pointer' }}
          >
            <img src="/Logo.png" alt="Logo" className="logo" />
          </div>

          {/* RIGHT */}
          <div className="nav-right">
            <div className="links-bell-wrapper">
              <div className="nav-links">

                {/* Links landing / cliente */}
                {(isLanding || user?.tipo === 'usuario') && (
                  <>
                    <button onClick={() => {
                      if (location.pathname === '/') scrollToSection('inicio');
                      else navigate('/');
                    }} className="nav-link">Inicio</button>

                    <button onClick={() => {
                      if (location.pathname === '/') scrollToSection('productos');
                      else navigate('/#productos');
                    }} className="nav-link">Productos</button>

                    <button onClick={() => {
                      if (location.pathname === '/') scrollToSection('nosotros');
                      else navigate('/#nosotros');
                    }} className="nav-link">Nosotros</button>
                  </>
                )}

                {/* Link Dashboard para empleado/admin */}
                {user?.tipo === 'empleado' && (
                  <Link to="/admin" className="nav-link font-bold text-[#2e7d32]">Dashboard</Link>
                )}
              </div>
            </div>

            {/* Campanita */}
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
            {(user?.tipo === "usuario" || (!user && isLanding)) && (
              <button className="cart-btn" onClick={() => setIsCartOpen(true)} title="Ver carrito">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </button>
            )}

            {/* Avatar usuario logueado */}
            {!isLanding && user && (
              <div
                className="user-area"
                onClick={() => navigate(user.tipo === "usuario" ? "/perfil" : "/panel/perfil")}
                style={{ cursor: 'pointer' }}
              >
                <div className="avatar">{user.nombre.charAt(0)}</div>
                <div className="user-info-text">
                  <div className="user-name">{user.nombre}</div>
                  <div className="user-role">{user.rol}</div>
                </div>
              </div>
            )}

            {/* Botones login/register para invitados en landing */}
            {isLanding && !user && (
              <div className="auth-btns">
                <button onClick={() => navigate("/login")} className="btn-login-nav">Iniciar sesión</button>
                <button onClick={() => navigate("/register")} className="btn-register-nav">Registrarse</button>
              </div>
            )}

            {/* Logout */}
            {user && (
              <button className="logout-btn" title="Cerrar sesión" onClick={handleLogout}>⏏</button>
            )}
          </div>
        </div>
      </nav>

      {/* Panel notificaciones */}
      {mostrarCampana && (
        <>
          <NotificacionesPanel
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
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