import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { Ic } from "../features/configuracion/Usuarios/usuariosIcons";
import "../features/configuracion/Usuarios/Usuarios.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = login(email, password);
      if (user.rol === "administrador") {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usuarios-page" style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      background: "linear-gradient(180deg, #1b5e20 0%, #388e3c 50%, #c8e6c9 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Círculos decorativos mejorados */}
      <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "250px", height: "250px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", blur: "40px" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "-30px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", top: "20%", left: "10%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />

      <div className="modal-card" style={{ 
        maxWidth: "420px", 
        width: "100%",
        animation: "slideUp 0.5s ease", 
        padding: "0",
        borderRadius: "22px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        border: "none",
        overflow: "hidden"
      }}>
        
        <div style={{ 
          background: "white",
          padding: "30px 40px 10px",
          textAlign: "center"
        }}>
          <div style={{ 
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "60px",
            background: "var(--gl)",
            borderRadius: "16px",
            marginBottom: "15px",
            boxShadow: "0 8px 15px rgba(46,125,50,0.1)"
          }}>
            <span style={{ fontSize: "32px" }}>🥪</span>
          </div>
          
          <h1 style={{ 
            fontFamily: "var(--font-head)", 
            fontSize: "36px", 
            color: "var(--g)", 
            fontStyle: "italic", 
            fontWeight: "900",
            margin: "0",
            lineHeight: "1"
          }}>
            Tostón App
          </h1>
          <div className="usuarios-header-line" style={{ width: "60px", height: "4px", marginTop: "8px" }} />
        </div>

        <div className="modal-body" style={{ padding: "15px 40px 35px", background: "white" }}>
          {error && (
            <div style={{ background: "#fff5f5", color: "#c62828", padding: "10px 15px", borderRadius: "12px", fontSize: "13px", fontWeight: "700", marginBottom: "15px", border: "1px solid #fed7d7", display: "flex", alignItems: "center", gap: "8px" }}>
              <Ic.XCircle /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="field-wrap">
              <label className="field-label" style={{ fontSize: "13px", color: "var(--g)", fontWeight: "800", marginBottom: "5px" }}>Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="tu@toston.com"
                className="field-input"
                style={{ padding: "12px 16px", borderRadius: "12px", background: "#f9fff9" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field-wrap">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <label className="field-label" style={{ fontSize: "13px", color: "var(--g)", fontWeight: "800", margin: "0" }}>Contraseña</label>
                <a href="#" style={{ fontSize: "11px", fontWeight: "800", color: "#4caf50", textDecoration: "none" }} onClick={e => e.preventDefault()}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="field-input"
                style={{ padding: "12px 16px", borderRadius: "12px", background: "#f9fff9" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-save" style={{ 
              width: "100%", 
              justifyContent: "center", 
              padding: "14px", 
              fontSize: "16px", 
              borderRadius: "14px",
              marginTop: "5px",
              background: "linear-gradient(90deg, #2e7d32, #43a047)",
              boxShadow: "0 10px 20px rgba(46,125,50,0.2)"
            }} disabled={loading}>
              {loading ? "Entrando..." : "Iniciar Sesión"}
            </button>
          </form>

          <div style={{ marginTop: "25px", textAlign: "center", borderTop: "1px solid #f0f0f0", paddingTop: "20px" }}>
            <span style={{ fontSize: "14px", color: "#757575" }}>¿No tienes cuenta? </span>
            <Link to="/register" style={{ fontSize: "14px", fontWeight: "900", color: "var(--g)", textDecoration: "none" }}>
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
