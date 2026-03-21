import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/userService";
import { Ic } from "../features/configuracion/Usuarios/usuariosIcons";
import "../features/configuracion/Usuarios/Usuarios.css";

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    password: "",
    confirmar: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      registerUser({
        nombre: formData.nombre,
        correo: formData.correo,
        password: formData.password
      });
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      navigate("/login");
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
      background: "linear-gradient(180deg, #1b5e20 0%, #388e3c 60%, #c8e6c9 100%)",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: "10%", right: "15%", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", bottom: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />

      <div className="modal-card" style={{ 
        maxWidth: "500px", 
        width: "100%",
        animation: "slideUp 0.5s ease", 
        padding: "0",
        borderRadius: "24px",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.35)",
        border: "none",
        overflow: "hidden"
      }}>
        
        <div style={{ 
          background: "white",
          padding: "25px 40px 5px",
          textAlign: "center"
        }}>
          <h1 style={{ 
            fontFamily: "var(--font-head)", 
            fontSize: "32px", 
            color: "var(--g)", 
            fontStyle: "italic", 
            fontWeight: "900",
            margin: "0" 
          }}>
            Regístrate
          </h1>
          <div className="usuarios-header-line" style={{ width: "50px", height: "4px", marginTop: "8px" }} />
        </div>

        <div className="modal-body" style={{ padding: "15px 40px 30px", background: "white" }}>
          
          {error && (
            <div style={{ background: "#fff5f5", color: "#c62828", padding: "10px 15px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", marginBottom: "12px", border: "1px solid #fed7d7", display: "flex", alignItems: "center", gap: "8px" }}>
              <Ic.XCircle /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="field-wrap">
              <label className="field-label" style={{ color: "var(--g)", fontWeight: "800", fontSize: "13px", marginBottom: "4px" }}>Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Tostón"
                className="field-input"
                style={{ padding: "11px 16px", borderRadius: "11px", border: "2px solid #f0f7f0" }}
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>

            <div className="field-wrap">
              <label className="field-label" style={{ color: "var(--g)", fontWeight: "800", fontSize: "13px", marginBottom: "4px" }}>Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                className="field-input"
                style={{ padding: "11px 16px", borderRadius: "11px", border: "2px solid #f0f7f0" }}
                value={formData.correo}
                onChange={(e) => setFormData({...formData, correo: e.target.value})}
              />
            </div>

            <div className="field-grid-2" style={{ gap: "15px" }}>
              <div className="field-wrap">
                <label className="field-label" style={{ color: "var(--g)", fontWeight: "800", fontSize: "13px", marginBottom: "4px" }}>Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="field-input"
                  style={{ padding: "11px 16px", borderRadius: "11px", border: "2px solid #f0f7f0" }}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="field-wrap">
                <label className="field-label" style={{ color: "var(--g)", fontWeight: "800", fontSize: "13px", marginBottom: "4px" }}>Confirmar</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="field-input"
                  style={{ padding: "11px 16px", borderRadius: "11px", border: "2px solid #f0f7f0" }}
                  value={formData.confirmar}
                  onChange={(e) => setFormData({...formData, confirmar: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" className="btn-save" style={{ 
              width: "100%", 
              justifyContent: "center", 
              padding: "14px", 
              fontSize: "16px", 
              borderRadius: "14px",
              marginTop: "8px",
              background: "linear-gradient(90deg, #1b5e20, #2e7d32)",
              boxShadow: "0 8px 20px rgba(27,94,32,0.25)"
            }} disabled={loading}>
              {loading ? "Creando..." : "Crear Cuenta"}
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid #f5f5f5", paddingTop: "15px" }}>
            <span style={{ fontSize: "14px", color: "#757575" }}>¿Ya tienes cuenta? </span>
            <Link to="/login" style={{ fontSize: "14px", fontWeight: "900", color: "var(--g)", textDecoration: "none" }}>
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
