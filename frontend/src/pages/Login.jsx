import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import Navbar from "../shared/components/Navbar";
import { Mail, Lock, Eye, EyeOff, Leaf, ChevronRight } from "lucide-react";
import "./Auth.css";

const Login = () => {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = login(email, password);
      navigate(user.rol === "administrador" ? "/admin" : "/cliente");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar isLanding={true} />

      <div className="auth-bg">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />

        <div className="auth-card">

          {/* Barra superior animada */}
          <div className="auth-topbar" />

          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Leaf size={20} color="#2e7d32" />
            </div>
            <h1 className="auth-brand-name">Tostón App</h1>
            <p className="auth-brand-sub">Bienvenido de vuelta</p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="auth-form">

            {/* Correo */}
            <div className="auth-field">
              <label className="auth-label">
                <Mail size={11} />
                Correo electrónico
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="auth-field">
              <div className="auth-label-row">
                <label className="auth-label">
                  <Lock size={11} />
                  Contraseña
                </label>
                <Link to="/recuperar" className="auth-forgot">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Lock size={14} />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  Iniciar sesión
                  <span className="auth-arrow">
                    <ChevronRight size={18} />
                  </span>
                </>
              )}
            </button>

          </form>

          {/* Footer */}
          <p className="auth-switch">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="auth-switch-link">
              Regístrate gratis
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Login;