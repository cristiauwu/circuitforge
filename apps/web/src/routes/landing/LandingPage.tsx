import { Link } from 'react-router-dom'
import { CircuitAssembly } from '@/features/landing/CircuitAssembly'
import {
  useAssemblyTimeline,
  usePrefersReducedMotion,
} from '@/features/landing/useAssemblyTimeline'
import { cx } from '@/lib/cx'
import { RevealText } from '@/ui'

/**
 * Portada (documento de diseño sección 3).
 *
 * Es la **única** superficie en modo Persuade del producto. Todo lo que viene
 * detras de `/editor` es una herramienta: paneles densos, texto legible,
 * información por encima de espectaculo. Esa frontera esta en DESIGN.md sección 5.
 *
 * El circuito se ensambla y de ahi sale el texto. La secuencia completa dura
 * 3.4 s y se salta entera con `prefers-reduced-motion`.
 */
export function LandingPage() {
  const reduced = usePrefersReducedMotion()
  const state = useAssemblyTimeline(reduced)

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Cuadrícula de fondo, disuelta en los bordes */}
      <div
        aria-hidden="true"
        className="cf-grid-bg cf-grid-fade pointer-events-none absolute inset-0 opacity-40"
      />

      {/* Resplandor calido detras del circuito: da profundidad sin sombra (V-2) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at center, rgb(255 107 53 / 0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        {/* ---------------------------------------------------------------- */}
        {/* El circuito                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="mb-4 w-full">
          <CircuitAssembly state={state} className="mx-auto" />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Titular: revelado letra por letra (M-1)                            */}
        {/* ---------------------------------------------------------------- */}
        <RevealText
          text="Diseña circuitos"
          as="h1"
          immediate={reduced}
          className="text-center text-3xl font-semibold leading-tight tracking-tight text-text"
        />

        <RevealText
          text="y simula su comportamiento"
          as="p"
          immediate={reduced}
          delay={8}
          className={cx(
            'mb-6 text-center text-xl font-medium leading-tight tracking-tight',
            'text-text-secondary',
          )}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Descripción y llamada a la acción                                  */}
        {/* ---------------------------------------------------------------- */}
        <p
          className={cx(
            'cf-fade-up mb-8 max-w-lg text-center text-md leading-relaxed text-text-secondary',
            state.cta && 'is-visible',
          )}
        >
          Coloca componentes sobre un lienzo con cuadrícula, cablea sus pines y observa tensiones,
          corrientes y potencia sin instalar nada.
        </p>

        <div
          className={cx(
            'cf-fade-up flex flex-col items-center gap-3 sm:flex-row',
            state.cta && 'is-visible',
          )}
        >
          <Link
            to="/editor"
            viewTransition
            className={cx(
              'cf-btn inline-flex h-11 items-center justify-center rounded-sm px-6',
              'bg-accent text-md font-medium leading-none text-[#10161f] no-underline',
              'transition-[background-color,transform] duration-instant ease-inout',
              'hover:bg-accent-hover active:scale-[0.97]',
            )}
          >
            <span className="cf-btn__roll">
              <span className="cf-btn__text">Entrar al editor</span>
              <span className="cf-btn__text" aria-hidden="true">
                Entrar al editor
              </span>
            </span>
          </Link>

          <Link
            to="/biblioteca"
            viewTransition
            className={cx(
              'inline-flex h-11 items-center justify-center rounded-sm px-5',
              'text-md font-medium text-text-secondary no-underline',
              'transition-colors duration-fast ease-inout hover:text-text',
            )}
          >
            Ver la biblioteca
          </Link>
        </div>

        {/* Cifras del alcance, en monoespaciada porque son valores */}
        <dl
          className={cx(
            'cf-fade-up mt-12 grid grid-cols-3 gap-8 text-center',
            state.cta && 'is-visible',
          )}
        >
          {[
            { value: '60', label: 'componentes' },
            { value: '9', label: 'categorías' },
            { value: '<10%', label: 'error en DC' },
          ].map((item) => (
            <div key={item.label}>
              <dt className="sr-only">{item.label}</dt>
              <dd className="cf-mono text-xl font-medium text-signal">{item.value}</dd>
              <dd className="text-xs text-text-muted">{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
