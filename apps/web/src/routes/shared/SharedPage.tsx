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
        <Link className="nx-button nx-button-secondary" to="/proyectos">
          Volver a proyectos
        </Link>
      </div>
    )
  }

  return (
    <div className="nx-page">
      <header className="nx-page-heading">
        <span className="nx-badge">Circuito de Referencia Verificado</span>
        <h1>{project.name}</h1>
        <p className="nx-muted">{project.summary}</p>
      </header>
      <section className="nx-section" aria-labelledby="details-title">
        <h2 className="nx-section-title" id="details-title">
          Arquitectura del circuito
        </h2>
        <dl className="nx-details">
          <div>
            <dt>Componentes clave</dt>
            <dd>{project.componentCount}</dd>
          </div>
          <div>
            <dt>Rutas de conexión</dt>
            <dd>{project.netCount}</dd>
          </div>
          <div>
            <dt>Fecha de diseño</dt>
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
            <dd>Esquema verificado</dd>
          </div>
        </dl>
      </section>
      <section className="nx-empty" aria-labelledby="availability-title">
        <h2 id="availability-title">Replicar y ensamblar en el laboratorio</h2>
        <p className="nx-muted">
          Utiliza esta guía técnica para seleccionar los componentes en la biblioteca,
          posicionarlos en el espacio 3D y trazar las rutas de interconexión con validación ERC en tiempo real.
        </p>
        <p className="nx-muted">
          Al abrir el laboratorio mantendrás tu espacio de trabajo intacto para continuar el cableado.
        </p>
        <div className="nx-page-actions">
          <Link className="nx-button nx-button-primary cf-btn__roll" to="/editor">
            <span className="cf-btn__text">Abrir en el laboratorio</span>
            <span className="cf-btn__text" aria-hidden="true">
              Comenzar montaje 3D
            </span>
          </Link>
          <Link className="nx-button cf-btn__roll" to="/biblioteca">
            <span className="cf-btn__text">Ver componentes necesarios</span>
            <span className="cf-btn__text" aria-hidden="true">
              Explorar catálogo
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
