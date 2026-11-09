import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="nx-page nx-not-found">
      <p className="nx-caption">404</p>
      <h1>Esta página no existe</h1>
      <p className="nx-muted">
        El enlace puede estar incompleto o haber cambiado. Vuelve al inicio o continúa con tu
        montaje en el laboratorio.
      </p>
      <div className="nx-page-actions">
        <Link className="nx-button nx-button-dark" to="/">
          Volver al inicio
        </Link>
        <Link className="nx-button" to="/editor">
          Abrir el laboratorio
        </Link>
      </div>
    </div>
  )
}
