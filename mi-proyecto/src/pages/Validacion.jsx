import { Link } from "react-router-dom";

function Validacion() {
  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <nav className="nav-menu">
            <Link to="/inicio" className="logo">
              <img src="/img/logo-blanco.png" alt="Logo Empresa" />
            </Link>

            <div className="nav-links">
              <Link to="/inicio">Inicio</Link>
              <Link to="/mis-requerimientos">Mis Requerimientos</Link>
              <Link to="/validacion" id="navValidar">Validación</Link>
            </div>

            <div className="nav-actions">
              <Link to="/perfil" className="perfil-btn">
                <img id="navAvatar" src="/img/avatar.png" alt="Perfil" />
              </Link>

              <a href="#" className="logout-btn" onClick={() => logout()}>
                <img src="/img/log-out.png" alt="Salir" />
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <section className="page-header">
          <h1>Bandeja de Validación</h1>
          <p>Seleccione un requerimiento para revisar y validar.</p>
        </section>

        <section className="result-card">
          <div id="listaRequerimientos" className="validacion-grid">
            Cargando requerimientos...
          </div>
        </section>
      </main>
    </>
  );
}

export default Validacion;