import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

const NexoScene = lazy(() =>
  import('@/features/nexo/NexoScene').then((module) => ({ default: module.NexoScene })),
)

export function LandingPage() {
  return (
    <div className="nx-landing">
      <section className="nx-hero" aria-labelledby="hero-title">
        <div className="nx-hero-copy">
          <h1 id="hero-title">
            Las ideas
            <br />
            necesitan
            <br />
            <span>conexiones.</span>
          </h1>
          <p>
            Un espacio para pensar con las manos. Explora componentes, conecta posibilidades y dale
            forma a tu próximo circuito.
          </p>
          <div className="nx-hero-actions">
            <Link className="nx-button nx-button-primary" to="/editor">
              Entrar al laboratorio
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M4 12h16m-7-7 7 7-7 7" />
              </svg>
            </Link>
            <a className="nx-button" href="#idea">
              Conoce el espacio
            </a>
          </div>
        </div>
        <figure className="nx-hero-object">
          <Suspense
            fallback={
              <div className="nx-hero-scene" role="status">
                Preparando el modelo ilustrativo…
              </div>
            }
          >
            <NexoScene mode="hero" className="nx-hero-scene" />
          </Suspense>
          <figcaption className="nx-caption">
            <strong>ESP32</strong>
            <span>Una placa. Un punto de partida.</span>
          </figcaption>
        </figure>
        <div className="nx-hero-bottom">
          <span>Electrónica, sin un único camino.</span>
          <span>Arrastra para girar · Ctrl/Cmd + rueda para acercar</span>
          <span>Modelo propio ilustrativo</span>
        </div>
      </section>
      <section className="nx-section nx-idea" id="idea" aria-labelledby="idea-title">
        <h2 className="nx-section-title" id="idea-title">
          No empieces
          <br />
          por una plantilla.
          <br />
          <em>Empieza por una idea.</em>
        </h2>
        <div className="nx-idea-copy">
          <p>
            Puedes llegar con una placa, con una pregunta o con las dos. Encuentra una pieza y
            empieza a construir a tu ritmo.
          </p>
          <div className="nx-paths">
            <Link className="nx-button" to="/biblioteca">
              Quiero explorar componentes
            </Link>
            <Link className="nx-button" to="/editor?help=idea">
              Tengo una idea en mente
            </Link>
          </div>
          <p className="nx-muted">
            El montaje es editable. La simulación eléctrica, la ejecución de firmware y el asistente
            de IA todavía no están conectados.
          </p>
        </div>
      </section>
      <footer className="nx-footer">
        <Link className="nx-brand nx-footer-brand" to="/" aria-label="Nexo, inicio">
          nexo
        </Link>
        <p>De la curiosidad a lo que viene.</p>
        <span className="nx-muted">Nombre provisional</span>
      </footer>
    </div>
  )
}
