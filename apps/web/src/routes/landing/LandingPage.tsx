import { Link } from 'react-router-dom'
import { CircuitAssembly } from '@/features/landing/CircuitAssembly'
import {
  useAssemblyTimeline,
  usePrefersReducedMotion,
} from '@/features/landing/useAssemblyTimeline'
import { cx } from '@/lib/cx'

/**
 * Portada — la unica superficie en modo Persuade.
 *
 * ADOPTA el lenguaje de la referencia en vez de imitarlo de lejos:
 *
 * 1. **Grano sobre negro.** iyo.ai no tiene una superficie lisa: tiene textura.
 *    Es lo que separa "fondo oscuro" de "material oscuro".
 * 2. **Tipografia con dos pesos de color en el mismo bloque.** La referencia hace
 *    "We make agentic / computers you can talk to" con una parte en blanco y otra
 *    en gris, sin cambiar de tamano. Es jerarquia barata y muy suya.
 * 3. **Etiqueta eyebrow** en versalitas micro con tracking amplio.
 * 4. **Pildoras** para todo lo accionable.
 *
 * La secuencia del circuito se conserva: es identidad del producto, no del sitio
 * de referencia.
 */

const STATS = [
  { value: '60', label: 'componentes' },
  { value: '9', label: 'categorías' },
  { value: '<10%', label: 'error en DC' },
]

export function LandingPage() {
  const reduced = usePrefersReducedMotion()
  const state = useAssemblyTimeline(reduced)

  return (
    <div className="cf-grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Cuadricula tenue, por debajo del grano */}
      <div
        aria-hidden="true"
        className="cf-grid-bg cf-grid-fade pointer-events-none absolute inset-0 opacity-25"
      />

      {/* Resplandor calido: profundidad sin sombra */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at center, rgb(255 107 53 / 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        {/* Eyebrow — la etiqueta micro de la referencia */}
        <p className={cx('cf-eyebrow mb-6', state.cta && 'cf-in')}>Simulador de circuitos · v0.1</p>

        {/* El circuito */}
        <div className="mb-8 w-full">
          <CircuitAssembly state={state} className="mx-auto" />
        </div>

        {/*
          Titular con DOS niveles de contraste en el mismo bloque, como la
          referencia: la primera linea en blanco, la segunda atenuada. El bloque
          completo entra con un desplazamiento, sin revelado letra por letra —
          ese patron se reserva a los titulares de seccion para no gastar el
          efecto en la primera pantalla.
        */}
        <h1
          className={cx(
            'mb-5 text-center text-3xl leading-tight font-semibold tracking-tight',
            state.title && 'cf-in',
          )}
          data-anim="title"
        >
          <span className="block text-text-strong">Diseña circuitos</span>
          <span className="block text-text-muted">y simula su comportamiento</span>
        </h1>

        <p
          className={cx(
            'mb-9 max-w-lg text-center text-md leading-relaxed text-text-secondary',
            state.cta && 'cf-in',
          )}
          data-anim="desc"
        >
          Coloca componentes sobre un lienzo con cuadrícula, cablea sus pines y observa tensiones,
          corrientes y potencia sin instalar nada.
        </p>

        <div
          className={cx('flex flex-col items-center gap-3 sm:flex-row', state.cta && 'cf-in')}
          data-anim="cta"
        >
          <Link
            to="/editor"
            viewTransition
            className={cx(
              'cf-btn inline-flex h-12 items-center justify-center rounded-pill px-7',
              'bg-accent text-md font-medium leading-none text-on-accent no-underline',
              'transition-[background-color,transform] duration-base ease-out',
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
              'inline-flex h-12 items-center justify-center rounded-pill px-6',
              'border border-hairline text-md font-medium text-text-secondary no-underline',
              'transition-[color,border-color,background-color] duration-fast ease-inout',
              'hover:border-hairline-strong hover:bg-[var(--cf-fill-dim)] hover:text-text',
            )}
          >
            Ver la biblioteca
          </Link>
        </div>

        {/* Cifras del alcance */}
        <dl
          className={cx('mt-14 grid grid-cols-3 gap-10 text-center', state.cta && 'cf-in')}
          data-anim="stats"
        >
          {STATS.map((item) => (
            <div key={item.label}>
              <dt className="sr-only">{item.label}</dt>
              <dd className="cf-mono text-xl font-medium text-text-strong">{item.value}</dd>
              <dd className="cf-eyebrow mt-1">{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
