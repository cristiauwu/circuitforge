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
 *    Es lo que separa "fondo oscuro" de "material oscuro". Lo aporta la capa de
 *    atmosfera del shell, que es continua entre rutas.
 * 2. **Tipografia con dos pesos de color en el mismo bloque.** La referencia hace
 *    "We make agentic / computers you can talk to" con una parte en blanco y otra
 *    en gris, sin cambiar de tamano. Es jerarquia barata y muy suya.
 * 3. **Etiqueta eyebrow** en versalitas micro con tracking amplio.
 * 4. **Pildoras** para todo lo accionable, con brillo al pasar.
 *
 * La secuencia del circuito se conserva: es identidad del producto, no del sitio
 * de referencia.
 *
 * **Sobre la entrada del texto.** Los bloques usan `.cf-enter`, que es una
 * animacion CSS pura con `animation-fill-mode: both`. Antes dependian de clases
 * que anadia un `useEffect` con temporizadores: medido en el navegador, la
 * portada pasaba casi tres segundos con el titular y los botones en
 * `opacity: 0`. Con la animacion en CSS el contenido no puede quedarse invisible
 * — el CSS siempre llega, y si el JavaScript fallara la peor consecuencia seria
 * no tener animacion.
 */

const STATS = [
  { value: '60', label: 'componentes' },
  { value: '9', label: 'categorías' },
  { value: '<10%', label: 'error en DC' },
]

/** Retardos de entrada, en ms. Escalonados de 90 en 90 para dar ritmo. */
const DELAY = {
  eyebrow: '0ms',
  circuit: '90ms',
  title: '180ms',
  desc: '270ms',
  cta: '360ms',
  stats: '450ms',
} as const

export function LandingPage() {
  const reduced = usePrefersReducedMotion()
  const state = useAssemblyTimeline(reduced)

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Cuadricula tenue, por debajo del grano */}
      <div
        aria-hidden="true"
        className="cf-grid-bg cf-grid-fade pointer-events-none absolute inset-0 opacity-25"
      />

      {/*
        Resplandor calido detras del circuito. Es "luz", no sombra: da
        profundidad sin proyectar silueta oscura sobre el fondo.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[560px] w-[880px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgb(255 107 53 / 0.1) 0%, transparent 68%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        {/* Eyebrow — la etiqueta micro de la referencia */}
        <p className="cf-eyebrow cf-enter mb-6" style={{ ['--d' as string]: DELAY.eyebrow }}>
          Simulador de circuitos · v0.1
        </p>

        {/* El circuito */}
        <div className="cf-enter-pop mb-8 w-full" style={{ ['--d' as string]: DELAY.circuit }}>
          <CircuitAssembly state={state} className="mx-auto" />
        </div>

        {/*
          Titular con DOS niveles de contraste en el mismo bloque, como la
          referencia: la primera linea clara, la segunda atenuada.

          `aria-label` en el h1 y `aria-hidden` en las lineas: dos `<span>` en
          `display: block` NO producen separacion en el texto accesible, asi que
          el lector de pantalla anunciaba "circuitosy simula" como una sola
          palabra. Con el label explicito recibe la frase completa y espaciada.

          El degradado del titular (`cf-text-gradient`) le da peso visual sin
          subir el tamano ni el peso de fuente.
        */}
        <h1
          className="cf-text-gradient cf-enter mb-5 text-center text-3xl leading-tight font-semibold tracking-tight"
          style={{ ['--d' as string]: DELAY.title }}
          aria-label="Diseña circuitos y simula su comportamiento"
        >
          <span aria-hidden="true" className="block text-text-strong">
            Diseña circuitos
          </span>
          <span aria-hidden="true" className="block text-text-muted">
            y simula su comportamiento
          </span>
        </h1>

        <p
          className="cf-enter mb-9 max-w-lg text-center text-md leading-relaxed text-text-secondary"
          style={{ ['--d' as string]: DELAY.desc }}
        >
          Coloca componentes sobre un lienzo con cuadrícula, cablea sus pines y observa tensiones,
          corrientes y potencia sin instalar nada.
        </p>

        <div
          className="cf-enter flex flex-col items-center gap-3 sm:flex-row"
          style={{ ['--d' as string]: DELAY.cta }}
        >
          <Link
            to="/editor"
            viewTransition
            className={cx(
              'cf-btn cf-shine cf-glow inline-flex h-12 items-center justify-center rounded-pill px-7',
              'bg-accent text-md font-medium leading-none text-on-accent no-underline',
              'transition-[background-color,transform,box-shadow] duration-base ease-out',
              'hover:-translate-y-px hover:bg-accent-hover active:translate-y-0 active:scale-[0.97]',
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
              'cf-shine inline-flex h-12 items-center justify-center rounded-pill px-6',
              'border border-hairline text-md font-medium text-text-secondary no-underline',
              'transition-[color,border-color,background-color,transform] duration-fast ease-inout',
              'hover:-translate-y-px hover:border-hairline-strong hover:bg-[var(--cf-fill-dim)] hover:text-text',
            )}
          >
            Ver la biblioteca
          </Link>
        </div>

        {/* Cifras del alcance */}
        <dl
          className="cf-enter mt-14 grid grid-cols-3 gap-10 text-center"
          style={{ ['--d' as string]: DELAY.stats }}
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
