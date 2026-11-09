import { Link } from 'react-router-dom'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { PROJECTS } from '@/lib/fixtures/projects'

export function ProjectsPage() {
  const project = useEditorStore((state) => state.project)

  return (
    <div className="nx-page">
      <header className="nx-page-heading">
        <h1>Proyectos</h1>
        <p className="nx-muted">Tu espacio de trabajo actual y circuitos de referencia para diseñar.</p>
      </header>
      <section className="nx-section nx-project-session" aria-labelledby="session-title">
        <div>
          <span className="nx-badge">Sesión activa de laboratorio</span>
          <h2 className="nx-section-title" id="session-title">
            {project.name}
          </h2>
          <p className="nx-project-meta">
            {project.components.length} componentes · {project.nets.length} conexiones
          </p>
          <p className="nx-muted">
            {project.components.length
              ? 'Montaje en curso. Puedes continuar trabajando en el espacio 3D o añadir nuevas conexiones.'
              : 'Espacio de trabajo listo para nuevos componentes. Abre el laboratorio para comenzar.'}
          </p>
          <p className="nx-muted">
            El circuito se conserva y sincroniza en memoria durante toda tu sesión de trabajo.
          </p>
        </div>
        <div className="nx-page-actions">
          <Link className="nx-button nx-button-dark cf-btn__roll" to="/editor">
            <span className="cf-btn__text">
              {project.components.length ? 'Continuar en el laboratorio' : 'Abrir el laboratorio'}
            </span>
            <span className="cf-btn__text" aria-hidden="true">
              {project.components.length ? 'Ir al espacio 3D' : 'Comenzar montaje'}
            </span>
          </Link>
          <Link className="nx-button cf-btn__roll" to="/biblioteca">
            <span className="cf-btn__text">Explorar componentes</span>
            <span className="cf-btn__text" aria-hidden="true">Ver catálogo</span>
          </Link>
        </div>
      </section>
      <section className="nx-section" aria-labelledby="examples-title">
        <h2 className="nx-section-title" id="examples-title">
          Circuitos de referencia
        </h2>
        <p className="nx-muted">
          Diseños y topologías de conexión recomendadas para replicar y expandir en el laboratorio.
        </p>
        <ul className="nx-project-list">
          {PROJECTS.map((example) => (
            <li className="nx-catalog-row" key={example.id}>
              <div className="nx-catalog-copy">
                <span className="nx-badge">Circuito de Referencia Verificado</span>
                <h3>{example.name}</h3>
                <p className="nx-muted">{example.summary}</p>
                <p className="nx-project-meta">
                  {example.componentCount} componentes previstos · {example.netCount} conexiones
                  previstas
                </p>
              </div>
              <Link className="nx-button cf-btn__roll" to={`/compartido/${example.id}`}>
                <span className="cf-btn__text">Examinar circuito</span>
                <span className="cf-btn__text" aria-hidden="true">Ver especificación</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
