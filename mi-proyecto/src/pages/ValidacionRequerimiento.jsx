import { Link } from "react-router-dom";

function ValidacionRequerimiento() {
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
        <section className="page-header">
          <h1>Validación del Requerimiento</h1>
          <p>
            Revisión técnica y funcional por parte de Product Owner y QA.
          </p>
        </section>

        <section className="result-card">
          <div className="card-top-bar">
            <div
              className="status-badge warning"
              id="estadoValidacion"
            >
              Pendiente de validación
            </div>

            <button
              className="btn-icon-volver top-volver"
              onClick={() => irValidacion()}
              title="Volver a la lista"
            >
              <img src="/img/anterior.png" className="img-volver" />
            </button>
          </div>

          <div
            className="document-preview"
            id="resultadoContenido"
          >
            Cargando documento técnico...
          </div>

          <div className="validation-panel">
            <div className="panel-header">
              <h3>Controles de Validación</h3>
            </div>

            <div className="check-group">
              <label className="check-card">
                <input type="checkbox" id="checkPO" />
                <div className="card-content">
                  <span className="check-icon">👤</span>
                  <span className="check-text">Product Owner</span>
                </div>
              </label>

              <label className="check-card">
                <input type="checkbox" id="checkQA" />
                <div className="card-content">
                  <span className="check-icon">🛡️</span>
                  <span className="check-text">QA Técnica</span>
                </div>
              </label>
            </div>

            <div className="reject-reason-container">
              <label
                htmlFor="motivoRechazo"
                className="textarea-label"
              >
                Motivo de rechazo u observaciones técnicas:
              </label>
              <textarea
                id="motivoRechazo"
                placeholder="Si vas a rechazar, explica detalladamente los cambios necesarios..."
              ></textarea>
            </div>
          </div>

          <div className="actions-buttons">
            <div className="buttons-right">
              <button
                className="btn-primary"
                onClick={() => verPDF()}
              >
                👁️ Ver PDF
              </button>

              <button
                className="btn-secondary"
                onClick={() => editarPDF()}
              >
                ✏️ Editar
              </button>

              <button
                id="btnRechazar"
                className="btn-danger-modern"
                onClick={() => rechazarRequerimiento()}
              >
                ❌ Rechazar
              </button>

              <button
                id="btnEnviarJira"
                className="btn-success-modern"
                disabled
              >
                🚀 Aprobar y Enviar
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default ValidacionRequerimiento;