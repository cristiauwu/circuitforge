import { Link } from 'react-router-dom'
import { formatRelative, PROJECTS } from '@/lib/fixtures/projects'
import { Chip, RevealText } from '@/ui'

/**
 * Proyectos (documento de diseño sección 4).
 *
 * La lista incluye el estado vacio como caso de primera clase: un proyecto nuevo
 * no tiene nada, y una pantalla en blanco obliga al usuario a adivinar que hacer.
 *
 * El botón «Nuevo proyecto» esta deshabilitado en esta etapa: crear un proyecto
 * necesita persistencia, que llega con el backend. Se muestra deshabilitado en
 * vez de esconderse para que la acción sea previsible.
 */
export function ProjectsPage() {
  const isEmpty = PROJECTS.length === 0

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="cf-eyebrow mb-2">Tus circuitos</p>
          <RevealText
            text="Proyectos"
            as="h1"
            className="mb-1 text-xl font-semibold tracking-tight text-text-strong"
          />
          <p className="text-sm text-text-secondary">
            Tus circuitos guardados. Abre uno para seguir editándolo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Chip disabled title="Disponible con el backend">
            Nuevo proyecto
          </Chip>
        </div>
      </header>

      {isEmpty ? (
        <EmptyProjects />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <li key={project.id}>
              {/*
                `cf-tile` da el relleno tenue de la referencia sin coste de GPU.
                El hover eleva 2px con la curva firma: es el mismo movimiento que
                la referencia aplica a sus tarjetas, pero con `transform` y no con
                `width`/`height`, que provocaria layout thrashing.
              */}
              <Link
                to={`/compartido/${project.id}`}
                viewTransition
                className="cf-tile h-full no-underline hover:-translate-y-0.5"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate text-md font-medium text-text">{project.name}</h2>
                  {!project.owned && (
                    <span className="shrink-0 rounded-pill border border-hairline px-2.5 py-0.5 text-2xs text-text-muted">
                      Solo lectura
                    </span>
                  )}
                </div>

                <p className="mb-4 flex-1 text-sm leading-snug text-text-secondary">
                  {project.summary}
                </p>

                <div className="flex items-center gap-3 border-t border-hairline pt-3">
                  <span className="cf-mono text-2xs text-text-muted">
                    {project.componentCount} componentes
                  </span>
                  <span aria-hidden="true" className="size-1 rounded-full bg-text-muted" />
                  <span className="cf-mono text-2xs text-text-muted">{project.netCount} nets</span>
                  <span className="ml-auto text-2xs text-text-muted">
                    {formatRelative(project.updatedAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Estado vacio: la primera vez que se entra no hay ningún proyecto. */
function EmptyProjects() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-hairline-strong bg-surface px-6 py-20 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-text-muted"
      >
        <path d="M12 5v14M5 12h14" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      <h2 className="text-md font-medium text-text">Todavía no tienes proyectos</h2>
      <p className="max-w-[44ch] text-sm text-text-muted">
        Crea el primero desde el editor: coloca una fuente, una resistencia y un LED, y guardalo
        para volver a el después.
      </p>
      <Link
        to="/editor"
        viewTransition
        className="text-sm font-medium text-accent no-underline hover:text-accent-hover"
      >
        Ir al editor
      </Link>
    </div>
  )
}
