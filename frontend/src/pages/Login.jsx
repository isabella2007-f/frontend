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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* ✅ NAVBAR */}
      <Navbar isLanding={true} />

      {/* ✅ CONTENIDO */}
      <div style={{ 
        flex: 1,
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: "linear-gradient(180deg, #1b5e20 0%, #388e3c 50%, #c8e6c9 100%)",
        padding: "20px",
        position: "relative",
        overflow: "hidden"
      }}>

        {/* 🎨 DECORACIÓN */}
        <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "250px", height: "250px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-30px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />

        {/* 🧾 CARD */}
        <div className="modal-card" style={{ 
          maxWidth: "420px", 
          width: "100%",
          borderRadius: "22px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          background: "white"
        }}>

          {/* HEADER */}
          <div style={{ padding: "30px 40px 10px", textAlign: "center" }}>
            <h1 style={{ 
              fontFamily: "var(--font-head)", 
              fontSize: "34px", 
              color: "var(--g)", 
              fontWeight: "900",
              margin: 0,
              fontStyle: "italic"
            }}>
              Tostón App
            </h1>
            <div style={{ width: "60px", height: "4px", background: "var(--g)", margin: "10px auto" }} />
          </div>

          {/* BODY */}
          <div style={{ padding: "15px 40px 35px" }}>
            
            {error && (
              <div style={{ 
                background: "#fff5f5",
                color: "#c62828",
                padding: "10px",
                borderRadius: "10px",
                marginBottom: "15px",
                display: "flex",
                gap: "8px",
                alignItems: "center"
              }}>
                <Ic.XCircle /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <input
                type="email"
                placeholder="Correo"
                required
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Contraseña"
                required
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Entrando..." : "Iniciar Sesión"}
              </button>
            </form>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <span>¿No tienes cuenta? </span>
              <Link to="/register">Regístrate</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;