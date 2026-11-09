import { Link, useParams } from 'react-router-dom'
import { findProject } from '@/lib/fixtures/projects'

export function SharedPage() {
  const { id } = useParams<{ id: string }>()
  const project = id ? findProject(id) : undefined

  if (!project) {
    return (
      <div className="nx-page nx-not-found">
        <h1>No encontramos este proyecto</h1>
        <p className="nx-muted">
          {id
            ? `No hay una ficha disponible para «${id}». Comprueba el enlace o vuelve a los ejemplos.`
            : 'El enlace no incluye un identificador de proyecto.'}
        </p>
        <Link className="nx-button nx-button-dark" to="/proyectos">
          Volver a proyectos
        </Link>
      </div>
    )
  }

  return (
    <div className="nx-page">
      <header className="nx-page-heading">
        <span className="nx-badge">Ejemplo · Ficha informativa</span>
        <h1>{project.name}</h1>
        <p className="nx-muted">{project.summary}</p>
      </header>
      <section className="nx-section" aria-labelledby="details-title">
        <h2 className="nx-section-title" id="details-title">
          La idea del circuito
        </h2>
        <dl className="nx-details">
          <div>
            <dt>Componentes previstos</dt>
            <dd>{project.componentCount}</dd>
          </div>
          <div>
            <dt>Conexiones previstas</dt>
            <dd>{project.netCount}</dd>
          </div>
          <div>
            <dt>Fecha de la ficha</dt>
            <dd>
              <time dateTime={project.updatedAt}>
                {new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(
                  new Date(project.updatedAt),
                )}
              </time>
            </dd>
          </div>
          <div>
            <dt>Disponibilidad</dt>
            <dd>Solo información</dd>
          </div>
        </dl>
      </section>
      <section className="nx-empty" aria-labelledby="availability-title">
        <h2 id="availability-title">Este ejemplo no incluye un montaje</h2>
        <p className="nx-muted">
          La ficha contiene una descripción, no un netlist cargable. No podemos mostrar conexiones,
          validar el circuito ni confirmar resultados eléctricos a partir de estos datos.
        </p>
        <p className="nx-muted">
          Puedes explorar las piezas y construir tu propia versión. Tu sesión actual no se modifica
          al abrir esta ficha.
        </p>
        <div className="nx-page-actions">
          <Link className="nx-button nx-button-dark" to="/biblioteca">
            Explorar las piezas
          </Link>
          <Link className="nx-button" to="/proyectos">
            Volver a proyectos
          </Link>
        </div>
      </section>
    </div>
  )
}
