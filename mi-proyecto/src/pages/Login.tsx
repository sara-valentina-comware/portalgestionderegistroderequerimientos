import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-wrapper">
        
        <div className="login-card">
          <h2>Iniciar Sesión</h2>
          <p className="subtitle">
            Plataforma de Gestión de Registro de Requerimientos
          </p>

          <input type="text" placeholder="Usuario" />
          <input type="password" placeholder="Contraseña" />

          <button onClick={() => navigate("/inicio")}>
            Ingresar
          </button>
        </div>

        <div className="login-logo">
          <img src="/img/logo.png" alt="Logo Empresa" />
        </div>

      </div>
    </div>
  );
}