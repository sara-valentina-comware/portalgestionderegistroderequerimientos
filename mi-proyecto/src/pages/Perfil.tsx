import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Perfil() {
  const navigate = useNavigate();

  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passConfirmar, setPassConfirmar] = useState("");

  const cambiarPassword = (e) => {
    e.preventDefault();
    console.log("Cambiar contraseña");
  };

  return (
    <>
      {/* HEADER */}
      <header className="main-header">
        <div className="header-container">
          <nav className="nav-menu">

            <Link to="/inicio" className="logo">
              <img src="/img/logo-blanco.png" alt="Logo Empresa" />
            </Link>

            <div className="nav-links">
              <Link to="/inicio">Inicio</Link>
              <Link to="/mis-requerimientos">Mis Requerimientos</Link>
              <Link to="/validacion">Validación</Link>
            </div>

            <div className="nav-actions">
              <Link to="/perfil" className="perfil-btn">
                <img src="/img/avatar.png" alt="Perfil" />
              </Link>

              <a
                href="/"
                className="logout-btn"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                <img src="/img/log-out.png" alt="Salir" />
              </a>
            </div>

          </nav>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="main-content perfil-page">

        <section className="page-header">
          <h1>Mi Perfil</h1>
          <p>Administra tu información personal y seguridad de acceso.</p>
        </section>

        <section className="perfil-card">

          {/* PERFIL HEADER */}
          <div className="perfil-header">
            <img src="/img/avatar.png" alt="Avatar" className="perfil-avatar" />
            <h2>Cargando...</h2>
            <span className="perfil-rol">Centro de costo</span>
          </div>

          {/* INFO */}
          <div className="perfil-body">
            <div className="perfil-item">
              <label>Correo</label>
              <span>-</span>
            </div>

            <div className="perfil-item">
              <label>Usuario</label>
              <span>-</span>
            </div>
          </div>

          <hr />

          {/* CAMBIAR PASSWORD */}
          <div className="perfil-password">
            <h3>Cambiar contraseña</h3>

            <form onSubmit={cambiarPassword}>
              <input
                type="password"
                placeholder="Contraseña actual"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
              />

              <input
                type="password"
                placeholder="Nueva contraseña"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
              />

              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={passConfirmar}
                onChange={(e) => setPassConfirmar(e.target.value)}
              />

              <button type="submit" className="btn-primary">
                Actualizar contraseña
              </button>
            </form>
          </div>

        </section>

      </main>
    </>
  );
}