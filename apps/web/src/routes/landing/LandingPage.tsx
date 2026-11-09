import { lazy, Suspense, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SceneAPI } from '@/features/nexo/NexoScene'
import { RevealText } from '@/ui/RevealText'

const NexoScene = lazy(() =>
  import('@/features/nexo/NexoScene').then((module) => ({ default: module.NexoScene })),
)

export function LandingPage() {
  const [sceneApi, setSceneApi] = useState<SceneAPI | null>(null)
  const [selectedBoard, setSelectedBoard] = useState<'uno' | 'esp32'>('uno')
  const [activeFocus, setActiveFocus] = useState<'board' | 'breadboard' | 'led' | 'wire'>('board')
  const [isLedOn, setIsLedOn] = useState(true)
  const [viewMode, setViewMode] = useState<'perspective' | 'top'>('perspective')

  const handleBoardChange = useCallback(
    (board: 'uno' | 'esp32') => {
      setSelectedBoard(board)
      setActiveFocus('board')
      sceneApi?.setBoard(board)
      sceneApi?.locate(board)
    },
    [sceneApi],
  )

  const handleFocusChange = useCallback(
    (target: 'board' | 'breadboard' | 'led' | 'wire') => {
      setActiveFocus(target)
      if (!sceneApi) return
      if (target === 'board') {
        sceneApi.locate(selectedBoard)
      } else {
        sceneApi.locate(target)
      }
    },
    [sceneApi, selectedBoard],
  )

  const handleToggleLed = useCallback(() => {
    setIsLedOn((prev) => {
      const next = !prev
      sceneApi?.setLed(next)
      return next
    })
  }, [sceneApi])

  const handleToggleView = useCallback(
    (view: 'perspective' | 'top') => {
      setViewMode(view)
      sceneApi?.setView(view)
    },
    [sceneApi],
  )

  const handleSceneReady = useCallback(
    (api: SceneAPI | null) => {
      setSceneApi(api)
      if (api) {
        api.setBoard('uno')
        api.setLed(true)
      }
    },
    [],
  )

  return (
    <div className="nx-landing">
      {/* ── SECCIÓN 1: HERO CON INSPECCIÓN ESPACIAL 3D ─────────────── */}
      <section className="nx-hero" aria-labelledby="hero-title">
        <div className="nx-hero-copy">
          <div className="nx-feature-chip" style={{ width: 'fit-content', marginBottom: '16px' }}>
            <span className="nx-hud-badge-dot" />
            <span>Laboratorio 3D interactivo en tiempo real</span>
          </div>

          <RevealText
            as="h1"
            text="Diseña circuitos en 3D interactivo."
            className="nx-hero-title"
          />

          <p>
            Explora, conecta y valida microcontroladores, protoboards y más de 70 componentes
            electrónicos reales. Simulación espacial con verificación eléctrica continua
            directamente en tu navegador.
          </p>

          <div className="nx-hero-actions">
            <Link className="nx-button nx-button-primary cf-glow" to="/editor">
              <span className="cf-btn__roll">
                <span className="cf-btn__text">Abrir laboratorio 3D</span>
                <span className="cf-btn__text" aria-hidden="true">
                  Abrir laboratorio 3D
                </span>
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                style={{ width: 16, height: 16, flexShrink: 0 }}
              >
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>

            <Link className="nx-button" to="/biblioteca">
              <span className="cf-btn__roll">
                <span className="cf-btn__text">Catálogo de componentes</span>
                <span className="cf-btn__text" aria-hidden="true">
                  Catálogo de componentes
                </span>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="nx-hero-features">
            <div className="nx-feature-chip">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="8" cy="8" r="6" />
                <path d="M5 8l2 2 4-4" />
              </svg>
              <span>73 componentes</span>
            </div>
            <div className="nx-feature-chip">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 2v12M2 8h12" />
              </svg>
              <span>Reglas ERC en vivo</span>
            </div>
            <div className="nx-feature-chip">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 4h10M3 8h10M3 12h6" />
              </svg>
              <span>Exportación C++</span>
            </div>
            <div className="nx-feature-chip">
              <span>Sin instalación</span>
            </div>
          </div>
        </div>

        {/* ── LIENZO 3D CON HUD FLOTANTE (ESTILO NOOMO LABS) ─────────── */}
        <figure className="nx-hero-object">
          <Suspense
            fallback={
              <div className="nx-hero-scene" role="status" style={{ display: 'grid', placeItems: 'center', color: 'var(--nx-muted)' }}>
                <span>Iniciando motor Three.js PBR…</span>
              </div>
            }
          >
            <NexoScene mode="hero" className="nx-hero-scene" onReady={handleSceneReady} />
          </Suspense>

          {/* HUD Flotante Translúcido */}
          <div className="nx-hero-hud" role="region" aria-label="Controles de inspección 3D">
            <div className="nx-hud-header">
              <div className="nx-hud-title">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
                <span>Inspección Espacial 3D</span>
              </div>
              <span className="nx-hud-badge">
                <span className="nx-hud-badge-dot" />
                <span>PBR 60 FPS</span>
              </span>
            </div>

            {/* Selector de Placa */}
            <div className="nx-hud-group">
              <span className="nx-hud-label">Placa de desarrollo:</span>
              <div className="nx-hud-pills">
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={selectedBoard === 'uno'}
                  onClick={() => handleBoardChange('uno')}
                >
                  Arduino UNO R3
                </button>
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={selectedBoard === 'esp32'}
                  onClick={() => handleBoardChange('esp32')}
                >
                  ESP32 NodeMCU
                </button>
              </div>
            </div>

            {/* Enfoque de Cámara */}
            <div className="nx-hud-group">
              <span className="nx-hud-label">Punto de enfoque:</span>
              <div className="nx-hud-pills">
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={activeFocus === 'board'}
                  onClick={() => handleFocusChange('board')}
                >
                  Microcontrolador
                </button>
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={activeFocus === 'breadboard'}
                  onClick={() => handleFocusChange('breadboard')}
                >
                  Protoboard
                </button>
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={activeFocus === 'led'}
                  onClick={() => handleFocusChange('led')}
                >
                  LED
                </button>
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={activeFocus === 'wire'}
                  onClick={() => handleFocusChange('wire')}
                >
                  Cables
                </button>
              </div>
            </div>

            {/* Controles de Vista y Señal */}
            <div className="nx-hud-group">
              <div className="nx-hud-pills" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={isLedOn}
                  onClick={handleToggleLed}
                  title="Conmuta la alimentación del LED de prueba"
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: isLedOn ? '#00f0ff' : 'var(--nx-faint)',
                      boxShadow: isLedOn ? '0 0 8px #00f0ff' : 'none',
                    }}
                  />
                  <span>LED {isLedOn ? '5V ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  className="nx-hud-pill"
                  aria-pressed={viewMode === 'top'}
                  onClick={() => handleToggleView(viewMode === 'perspective' ? 'top' : 'perspective')}
                  title="Alterna entre perspectiva isométrica y vista cenital"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                  <span>{viewMode === 'perspective' ? 'Cenital' : '3D Órbita'}</span>
                </button>

                <button
                  type="button"
                  className="nx-hud-pill"
                  onClick={() => sceneApi?.reset()}
                  title="Restaura la cámara a la posición inicial"
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            <div className="nx-hud-footer">
              <span>Arrastra para rotar · Rueda para zoom</span>
              <span>Render PBR WebGL</span>
            </div>
          </div>
        </figure>

        <div className="nx-hero-bottom">
          <span>CircuitForge &bull; Entorno 3D de ingeniería de hardware</span>
          <span>73 componentes modelados &bull; Validación eléctrica en tiempo real</span>
        </div>
      </section>

      {/* ── SECCIÓN 2: PILARES TECNOLÓGICOS (3 CARDS GLASSMORPHISM) ─ */}
      <section className="nx-section nx-idea" id="idea" aria-labelledby="idea-title">
        <h2 className="nx-section-title" id="idea-title">
          La ingeniería electrónica
          <br />
          merece un espacio
          <br />
          <em>interactivo y preciso.</em>
        </h2>

        <div className="nx-idea-copy">
          <p>
            CircuitForge combina el realismo de un laboratorio físico con la agilidad del diseño
            digital. Ensambla sobre protoboard, verifica tensiones y exporta esquemas sin tocar un
            soldador.
          </p>

          <div className="nx-pillars-grid">
            <article className="nx-pillar-card">
              <div className="nx-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                </svg>
              </div>
              <h3>Montaje Espacial en Protoboard</h3>
              <p>
                Coloca componentes con snap magnético sobre 830 puntos de contacto.
                Detección física de pines, polaridad visual y cables con curvas dinámicas.
              </p>
            </article>

            <article className="nx-pillar-card">
              <div className="nx-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3>Verificación Eléctrica ERC</h3>
              <p>
                Análisis continuo de reglas de diseño: previene sobrecorrientes, cortocircuitos
                y polaridades invertidas antes de conectar el hardware físico.
              </p>
            </article>

            <article className="nx-pillar-card">
              <div className="nx-pillar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
                </svg>
              </div>
              <h3>Netlist SPICE y Código C++</h3>
              <p>
                Generación automática de netlists formales y esqueletos de firmware listos para
                Arduino IDE o PlatformIO con un solo clic.
              </p>
            </article>
          </div>

          <div className="nx-paths">
            <Link className="nx-button" to="/biblioteca">
              <span className="cf-btn__roll">
                <span className="cf-btn__text">Explorar los 73 componentes</span>
                <span className="cf-btn__text" aria-hidden="true">
                  Explorar los 73 componentes
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="nx-button nx-button-primary" to="/editor">
              <span className="cf-btn__roll">
                <span className="cf-btn__text">Iniciar laboratorio en blanco</span>
                <span className="cf-btn__text" aria-hidden="true">
                  Iniciar laboratorio en blanco
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="nx-button" to="/proyectos">
              <span className="cf-btn__roll">
                <span className="cf-btn__text">Gestionar mis proyectos</span>
                <span className="cf-btn__text" aria-hidden="true">
                  Gestionar mis proyectos
                </span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER DE IDENTIDAD ─────────────────────────────────────── */}
      <footer className="nx-footer">
        <div>
          <Link className="nx-brand nx-footer-brand" to="/" aria-label="CircuitForge, inicio">
            nexo
          </Link>
          <p style={{ marginTop: '6px', color: 'var(--nx-muted)' }}>
            CircuitForge &bull; Entorno interactivo de diseño y simulación electrónica en 3D.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--nx-muted)', fontSize: '12px' }}>
          <span>73 componentes activos</span>
          <span>&copy; 2026 CircuitForge</span>
        </div>
      </footer>
    </div>
  )
}
