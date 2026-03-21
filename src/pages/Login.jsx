import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { Ic } from "../features/configuracion/Usuarios/usuariosIcons";
import Navbar from "../shared/components/Navbar";
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
    <div className="login-page" style={{ 
      display: "flex", 
      flexDirection: "column",
      minHeight: "100vh"
    }}>
      <Navbar isLanding={true} />
      
      <div style={{ 
        flex: 1,
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "linear-gradient(180deg, #1b5e20 0%, #388e3c 50%, #81c784 100%)",
        padding: "20px"
      }}>
        <div className="modal-card" style={{ 
          maxWidth: "400px", 
          width: "100%",
          padding: "0",
          borderRadius: "20px",
          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.2)",
          background: "white",
          overflow: "hidden"
        }}>
          
          <div style={{ 
            padding: "30px 40px 10px",
            textAlign: "center"
          }}>
            <h1 style={{ 
              fontFamily: "var(--font-head)", 
              fontSize: "32px", 
              color: "#1b5e20", 
              fontWeight: "900",
              margin: "0",
              fontStyle: "italic"
            }}>
              Tostón App
            </h1>
            <div style={{ width: "50px", height: "3px", background: "#1b5e20", margin: "8px auto" }} />
          </div>

          <div className="modal-body" style={{ padding: "10px 40px 40px" }}>
            {error && (
              <div style={{ background: "#fff5f5", color: "#c62828", padding: "10px 15px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginBottom: "15px", border: "1px solid #fed7d7" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="field-wrap">
                <label style={{ fontSize: "13px", color: "#1b5e20", fontWeight: "800", marginBottom: "5px", display: "block" }}>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="admin@toston.com"
                  className="field-input"
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e0e0e0" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-wrap">
                <label style={{ fontSize: "13px", color: "#1b5e20", fontWeight: "800", marginBottom: "5px", display: "block" }}>Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="field-input"
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e0e0e0" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-save" style={{ 
                width: "100%", 
                padding: "14px", 
                fontSize: "15px", 
                fontWeight: "700",
                borderRadius: "12px",
                marginTop: "10px",
                background: "#1b5e20",
                color: "white",
                border: "none",
                cursor: "pointer"
              }} disabled={loading}>
                {loading ? "Cargando..." : "Entrar"}
              </button>
            </form>

            <div style={{ marginTop: "25px", textAlign: "center", borderTop: "1px solid #f0f0f0", paddingTop: "20px" }}>
              <span style={{ fontSize: "14px", color: "#777" }}>¿No tienes cuenta? </span>
              <Link to="/register" style={{ fontSize: "14px", fontWeight: "800", color: "#1b5e20", textDecoration: "none" }}>
                Regístrate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
