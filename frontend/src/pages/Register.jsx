import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/userService";
import "./Auth.css";

const Register = () => {
  const [formData, setFormData] = useState({ nombre: "", correo: "", password: "", confirmar: "" });
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setFormData(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      registerUser({ nombre: formData.nombre, correo: formData.correo, password: formData.password });
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />

        <div className="auth-card auth-card--wide">

          <div className="auth-topbar" />

          <div className="auth-brand">
            <div className="auth-brand-icon">🌿</div>
            <h1 className="auth-brand-name">Crear cuenta</h1>
            <p className="auth-brand-sub">Únete a la familia Tostón</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="auth-field">
              <label className="auth-label">Nombre completo</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Tostón"
                  className="auth-input"
                  value={formData.nombre}
                  onChange={set("nombre")}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉</span>
                <input
                  type="email"
                  required
                  placeholder="tu@correo.com"
                  className="auth-input"
                  value={formData.correo}
                  onChange={set("correo")}
                />
              </div>
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label className="auth-label">Contraseña</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="auth-input"
                    value={formData.password}
                    onChange={set("password")}
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirmar</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showConf ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="auth-input"
                    value={formData.confirmar}
                    onChange={set("confirmar")}
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowConf(v => !v)} tabIndex={-1}>
                    {showConf ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
            </div>

            {/* Password match indicator */}
            {formData.confirmar && (
              <div className={`auth-match ${formData.password === formData.confirmar ? "auth-match--ok" : "auth-match--err"}`}>
                {formData.password === formData.confirmar ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>Crear mi cuenta <span className="auth-arrow">→</span></>
              )}
            </button>
          </form>

          <p className="auth-switch">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="auth-switch-link">Inicia sesión</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Register;