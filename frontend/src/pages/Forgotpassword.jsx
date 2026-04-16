import { useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, saveUser } from "../services/userService";
import { Mail, Lock, Eye, EyeOff, Key, ChevronRight, CheckCircle, ArrowLeft } from "lucide-react";
import "./Auth.css";

const ForgotPassword = () => {
  const [step, setStep]           = useState(1); // 1 | 2 | 3
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const found = users.find(u => u.correo === email);
      if (!found) {
        setError("No encontramos una cuenta con ese correo.");
      } else {
        setStep(2);
      }
      setLoading(false);
    }, 600);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      const user  = users.find(u => u.correo === email);
      saveUser({ ...user, password });
      setStep(3);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />

        <div className="auth-card">
          <div className="auth-topbar" />

          {/* ── STEP INDICATOR ── */}
          <div className="auth-steps">
            {[1, 2, 3].map(s => (
              <div key={s} className={`auth-step ${step >= s ? "auth-step--active" : ""} ${step > s ? "auth-step--done" : ""}`}>
                <div className="auth-step-dot">
                  {step > s ? "✓" : s}
                </div>
                {s < 3 && <div className={`auth-step-line ${step > s ? "auth-step-line--done" : ""}`} />}
              </div>
            ))}
          </div>

          {/* ── PASO 1: CORREO ── */}
          {step === 1 && (
            <>
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <Key size={20} color="#2e7d32" />
                </div>
                <h1 className="auth-brand-name">Recuperar contraseña</h1>
                <p className="auth-brand-sub">Ingresa tu correo para continuar</p>
              </div>

              {error && (
                <div className="auth-error">
                  <span className="auth-error-icon">⚠</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="auth-form">
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

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      Verificar correo
                      <span className="auth-arrow">
                        <ChevronRight size={18} />
                      </span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 2: NUEVA CONTRASEÑA ── */}
          {step === 2 && (
            <>
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <Lock size={20} color="#2e7d32" />
                </div>
                <h1 className="auth-brand-name">Nueva contraseña</h1>
                <p className="auth-brand-sub">Elige una contraseña segura</p>
              </div>

              {error && (
                <div className="auth-error">
                  <span className="auth-error-icon">⚠</span>
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">
                    <Lock size={11} />
                    Nueva contraseña
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">
                    <Lock size={11} />
                    Confirmar contraseña
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showConf ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="auth-input"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowConf(v => !v)} tabIndex={-1}>
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {confirm && (
                  <div className={`auth-match ${password === confirm ? "auth-match--ok" : "auth-match--err"}`}>
                    {password === confirm ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                  </div>
                )}

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      Guardar contraseña
                      <span className="auth-arrow">
                        <ChevronRight size={18} />
                      </span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 3: ÉXITO ── */}
          {step === 3 && (
            <div className="auth-success">
              <div className="auth-success-circle">
                <CheckCircle size={32} color="#fff" />
              </div>
              <h2 className="auth-success-title">¡Listo!</h2>
              <p className="auth-success-text">Tu contraseña fue actualizada correctamente.</p>
              <Link to="/login" className="auth-submit auth-submit--link">
                Ir a iniciar sesión
                <span className="auth-arrow">
                  <ChevronRight size={18} />
                </span>
              </Link>
            </div>
          )}

          {/* Back to login */}
          {step < 3 && (
            <p className="auth-switch">
              <Link to="/login" className="auth-switch-link">
                <ArrowLeft size={14} style={{ marginRight: 4 }} />
                Volver al inicio de sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;