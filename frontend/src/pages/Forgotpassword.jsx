import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { recuperarContrasena, verificarCodigo, resetearContrasena } from "../services/authService";
import Navbar from "../shared/components/Navbar";
import { Mail, Lock, Eye, EyeOff, Key, ChevronRight, CheckCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import "./Auth.css";

const COOLDOWN = 60; // segundos entre reenvíos

const ForgotPassword = () => {
  const [step, setStep]         = useState(1); // 1: Email | 2: Code | 3: Password | 4: Success
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [resending, setResending]   = useState(false);
  const [resendMsg, setResendMsg]   = useState("");   // mensaje de éxito del reenvío
  const [countdown, setCountdown]   = useState(0);   // segundos restantes
  const timerRef = useRef(null);

  // Limpia el intervalo al desmontar
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCountdown = () => {
    setCountdown(COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await recuperarContrasena(email);
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.message || "No encontramos una cuenta con ese correo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setResendMsg("");
    setError("");
    try {
      await recuperarContrasena(email);
      setResendMsg("Código reenviado. Revisa tu correo.");
      setCode("");
      startCountdown();
    } catch (err) {
      setError(err.message || "No se pudo reenviar el código.");
    } finally {
      setResending(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const data = await verificarCodigo(email, code);
      setResetToken(data.reset_token);
      setStep(3);
    } catch (err) {
      setError(err.message || "Código incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await resetearContrasena(resetToken, password);
      setStep(4);
    } catch (err) {
      setError(err.message || "No se pudo actualizar la contraseña.");
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
          <div className="auth-topbar" />

          {/* ── STEP INDICATOR ── */}
          <div className="auth-steps">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`auth-step ${step >= s ? "auth-step--active" : ""} ${step > s ? "auth-step--done" : ""}`}>
                <div className="auth-step-dot">
                  {step > s ? "✓" : s}
                </div>
                {s < 4 && <div className={`auth-step-line ${step > s ? "auth-step-line--done" : ""}`} style={{ width: 35 }} />}
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
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="auth-spinner" />
                      Conectando… puede tardar hasta 60 seg
                    </span>
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

          {/* ── PASO 2: CÓDIGO DE VERIFICACIÓN ── */}
          {step === 2 && (
            <>
              <div className="auth-brand">
                <div className="auth-brand-icon">
                  <ShieldCheck size={20} color="#2e7d32" />
                </div>
                <h1 className="auth-brand-name">Código de seguridad</h1>
                <p className="auth-brand-sub">
                  Hemos enviado un código a <strong>{email}</strong>
                </p>
              </div>

              {error && (
                <div className="auth-error">
                  <span className="auth-error-icon">⚠</span>
                  {error}
                </div>
              )}

              {resendMsg && (
                <div style={{
                  padding: "10px 14px", borderRadius: 9, marginBottom: 8,
                  background: "#e8f5e9", border: "1px solid #a5d6a7",
                  color: "#2e7d32", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  ✓ {resendMsg}
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">
                    <ShieldCheck size={11} />
                    Código de 6 dígitos
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">
                      <ShieldCheck size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      className="auth-input"
                      style={{ letterSpacing: '0.5em', textAlign: 'center', paddingLeft: 14 }}
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setResendMsg(""); }}
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      Validar código
                      <span className="auth-arrow">
                        <ChevronRight size={18} />
                      </span>
                    </>
                  )}
                </button>

                {/* Reenviar código */}
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  {countdown > 0 ? (
                    <p style={{ fontSize: 13, color: '#9e9e9e', margin: 0 }}>
                      Puedes reenviar en{' '}
                      <span style={{ fontWeight: 700, color: '#2e7d32' }}>{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="auth-forgot"
                      style={{ fontWeight: 600 }}
                    >
                      {resending ? 'Reenviando…' : '¿No recibiste el código? Reenviar'}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); setResendMsg(""); setCode(""); }}
                  className="auth-forgot"
                  style={{ textAlign: 'center', marginTop: 6 }}
                >
                  Cambiar correo electrónico
                </button>
              </form>
            </>
          )}

          {/* ── PASO 3: NUEVA CONTRASEÑA ── */}
          {step === 3 && (
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

          {/* ── PASO 4: ÉXITO ── */}
          {step === 4 && (
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
          {step < 4 && (
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
