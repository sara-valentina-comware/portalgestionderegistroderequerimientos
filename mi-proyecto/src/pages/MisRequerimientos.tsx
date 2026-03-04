import { Link, useNavigate } from "react-router-dom";

export default function MisRequerimientos() {
  const navigate = useNavigate();

  return (
    <div className="misrequerimientos-page">
      
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

        {/* PAGE HEADER */}
        <section className="page-header">
          <h1>Mis Requerimientos</h1>
          <p>
            Consulta el estado y detalle de tus solicitudes registradas.
          </p>
        </section>

        {/* TOOLBAR */}
        <div className="req-toolbar">

          {/* Buscador */}
          <div className="req-search">
            <input
              type="text"
              placeholder="🔎 Buscar Requerimiento..."
            />
          </div>

          {/* Filtro */}
          <select>
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En validación">En validación</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
          </select>

          {/* Contador */}
          <span>0 requerimientos</span>

          {/* Botón Nuevo */}
          <button
            className="btn-primary"
            onClick={() => navigate("/nuevo")}
          >
            +
          </button>

        </div>

        {/* LISTA */}
        <div className="result-card">
          <p>No hay requerimientos registrados todavía...</p>
        </div>

      </main>
    </div>
  );
}