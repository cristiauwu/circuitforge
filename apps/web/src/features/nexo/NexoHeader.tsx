import { Link, NavLink } from 'react-router-dom'

export function NexoHeader() {
  return (
    <header className="nx-header">
      <div className="nx-header-inner">
        <Link className="nx-brand" to="/" aria-label="Nexo, inicio">
          nexo
          <svg
            className="nx-brand-mark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 20 20 4M4 4h16v16" />
          </svg>
        </Link>
        <nav className="nx-nav" aria-label="Navegación principal">
          <NavLink className="nx-nav-link" to="/" end>
            Inicio
          </NavLink>
          <NavLink className="nx-nav-link" to="/biblioteca">
            Biblioteca
          </NavLink>
          <NavLink className="nx-nav-link" to="/proyectos">
            Proyectos
          </NavLink>
        </nav>
        <Link className="nx-button nx-button-primary nx-header-action cf-btn__roll" to="/editor">
          <span className="cf-btn__text">Abrir laboratorio</span>
          <span className="cf-btn__text" aria-hidden="true">
            Entrar al Lab 3D
          </span>
        </Link>
      </div>
    </header>
  )
}
