import { Link } from "react-router-dom";

function Editar() {
  return (
    <>
      <header className="main-header">
        <div className="header-container">
          <nav className="nav-menu">
            <Link to="/inicio" className="logo">
              <img src="/img/logo blanco.png" alt="Logo Empresa" />
            </Link>

            <div className="nav-links">
              <Link to="/inicio">Inicio</Link>
              <Link to="/misRequerimientos">Mis Requerimientos</Link>
              <Link to="/validacion" id="navValidar">
                Validación
              </Link>
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
        <section className="result-card">
          <h3>Modificar Contenido Técnico</h3>

          <div
            id="editorContenido"
            contentEditable="true"
            className="document-preview editor-estilo-fijo"
          >
            Cargando contenido...
          </div>

          <div className="actions-buttons">
            <button
              className="btn-icon-volver"
              onClick={() => irAtrasSegunRol()}
              title="Volver a la lista"
            >
              <img
                src="/img/anterior.png"
                alt="Regresar"
                className="img-volver"
              />
            </button>

            <div className="buttons-right">
              <button
                className="btn-primary"
                onClick={() => guardarEdicion()}
              >
                💾 Guardar Cambios
              </button>

              <button
                className="btn-danger"
                onClick={() => window.history.back()}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Editar;