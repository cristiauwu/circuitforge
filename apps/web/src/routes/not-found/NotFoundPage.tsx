import { Link } from 'react-router-dom'

/**
 * 404 (documento de diseño sección 4).
 *
 * Deliberadamente **fuera del sistema visual de la herramienta**: usa el mismo
 * layout pero sin la densidad ni los paneles. Una ruta que no existe no es una
 * pantalla del producto y fingir que lo es confunde mas que ayuda.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="cf-mono text-3xl font-medium text-text-muted">404</p>
      <h1 className="text-xl font-semibold text-text">Esta página no existe</h1>
      <p className="max-w-[44ch] text-sm text-text-secondary">
        El enlace puede estar roto o el proyecto que buscabas pudo eliminarse.
      </p>
      <div className="mt-2 flex items-center gap-4">
        <Link
          to="/"
          viewTransition
          className="text-sm font-medium text-accent no-underline hover:text-accent-hover"
        >
          Ir a la portada
        </Link>
        <Link
          to="/editor"
          viewTransition
          className="text-sm font-medium text-accent no-underline hover:text-accent-hover"
        >
          Abrir el editor
        </Link>
      </div>
    </div>
  )
}
