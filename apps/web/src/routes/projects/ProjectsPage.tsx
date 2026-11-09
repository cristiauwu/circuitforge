import { Link } from 'react-router-dom'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { PROJECTS } from '@/lib/fixtures/projects'

export function ProjectsPage() {
  const project = useEditorStore((state) => state.project)

  return (
    <div className="nx-page">
      <header className="nx-page-heading">
        <h1>Proyectos</h1>
        <p className="nx-muted">Tu montaje de esta sesión y algunas ideas para explorar.</p>
      </header>
      <section className="nx-section nx-project-session" aria-labelledby="session-title">
        <div>
          <span className="nx-badge">Sesión actual · Sin guardar</span>
          <h2 className="nx-section-title" id="session-title">
            {project.name}
          </h2>
          <p className="nx-project-meta">
            {project.components.length} componentes · {project.nets.length} conexiones
          </p>
          <p className="nx-muted">
            {project.components.length
              ? 'Puedes continuar donde lo dejaste. Abrir el laboratorio no reemplaza tu montaje.'
              : 'Tu mesa está vacía. Abre el laboratorio o elige una pieza en la biblioteca.'}
          </p>
          <p className="nx-muted">
            El proyecto se conserva al navegar, pero no al recargar o cerrar esta página.
          </p>
        </div>
        <div className="nx-page-actions">
          <Link className="nx-button nx-button-dark" to="/editor">
            {project.components.length ? 'Continuar en el laboratorio' : 'Abrir el laboratorio'}
          </Link>
          <Link className="nx-button" to="/biblioteca">
            Explorar componentes
          </Link>
        </div>
      </section>
      <section className="nx-section" aria-labelledby="examples-title">
        <h2 className="nx-section-title" id="examples-title">
          Ejemplos para inspirarte
        </h2>
        <p className="nx-muted">
          Son fichas de referencia, no proyectos guardados ni circuitos que se puedan cargar.
        </p>
        <ul className="nx-project-list">
          {PROJECTS.map((example) => (
            <li className="nx-catalog-row" key={example.id}>
              <div className="nx-catalog-copy">
                <span className="nx-badge">Ejemplo · Solo información</span>
                <h3>{example.name}</h3>
                <p className="nx-muted">{example.summary}</p>
                <p className="nx-project-meta">
                  {example.componentCount} componentes previstos · {example.netCount} conexiones
                  previstas
                </p>
              </div>
              <Link className="nx-button" to={`/compartido/${example.id}`}>
                Ver ficha del ejemplo
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
