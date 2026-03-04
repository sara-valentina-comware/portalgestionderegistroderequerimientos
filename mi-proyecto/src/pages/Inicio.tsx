import { Link, useNavigate } from "react-router-dom";

export default function Inicio() {
  const navigate = useNavigate();

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
                href="#"
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
      <main className="main-content">
        <section className="intro">
          <h1>Bienvenido(a) al Panel de Gestión de Requerimientos</h1>
          <p>
            Crea, consulta y da seguimiento a tus requerimientos en un solo lugar.
          </p>
        </section>

        <section className="actions">

          <div
            className="action-card"
            onClick={() => navigate("/nuevo")}
          >
            <div className="icon">
              <img src="/img/registro.png" alt="Nuevo" />
            </div>
            <div className="content">
              <h3>Nuevo Requerimiento</h3>
              <p>Inicia el levantamiento de un requerimiento.</p>
              <span className="action-btn">Crear Ahora →</span>
            </div>
          </div>

          <div
            className="action-card"
            onClick={() => navigate("/mis-requerimientos")}
          >
            <div className="icon">
              <img src="/img/consulta.png" alt="Consultar" />
            </div>
            <div className="content">
              <h3>Consultar Requerimientos</h3>
              <p>Visualiza los requerimientos que has solicitado.</p>
              <span className="action-btn">Ver Detalles →</span>
            </div>
          </div>

          <div
            className="action-card"
            onClick={() => navigate("/validacion")}
          >
            <div className="icon">
              <img src="/img/pendiente.png" alt="Validación" />
            </div>
            <div className="content">
              <h3>Validación de Requerimientos</h3>
              <p>Aprueba los requerimientos que han solicitado.</p>
              <span className="action-btn">Ver Detalles →</span>
            </div>
          </div>

        </section>
      </main>
    </>
  );
}