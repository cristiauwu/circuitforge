import { Link, useSearchParams } from 'react-router-dom'

/**
 * Comparador de fondos — pagina de trabajo, no de producto.
 *
 * Existe para poder elegir entre las tres alternativas viendolas, no leyendo una
 * descripcion. Se monta en `/variantes` y se elimina cuando la eleccion este
 * hecha: no es una ruta del producto y no deberia llegar a produccion.
 *
 * # Por que el estado vive en la URL
 *
 * El fondo lo pinta el SHELL, no esta pagina: montar aqui una segunda capa de
 * atmosfera deja la anterior visible por debajo. Medido: con las dos, el
 * documento tenia dos contenedores `[data-backdrop]` y las pistas de placa
 * seguian viendose bajo la onda del osciloscopio.
 *
 * Asi que la variante activa se lee de `?fondo=`, que el shell consulta. Tiene dos
 * ventajas sobre elevarlo con contexto: el enlace es compartible —util para
 * ensenar una opcion concreta— y el estado sobrevive a una recarga.
 *
 * Cada opcion se muestra sobre contenido real (titular, texto y botones) porque
 * un fondo solo se puede juzgar contra lo que tiene encima: aislado se ve bien
 * cualquiera.
 */

const OPTIONS = [
  {
    key: 'pcb',
    name: 'Pistas de placa',
    why: 'El más característico. Pistas ortogonales con chaflanes a 45° y vías, como el cobre de una placa real.',
  },
  {
    key: 'scope',
    name: 'Señal de osciloscopio',
    why: 'El más atmosférico. Retícula de instrumento y una onda que respira. Dice «aquí se mide algo».',
  },
  {
    key: 'grid',
    name: 'Retícula de ingeniería',
    why: 'El más sobrio. Tres escalas de rejilla y marcas de regla. No compite con el contenido.',
  },
] as const

/** Clave valida de una alternativa. */
type BackdropKey = (typeof OPTIONS)[number]['key']

/** Lee la variante activa de la URL, con `pcb` por defecto. */
function useBackdropFromUrl(): BackdropKey {
  const [params] = useSearchParams()
  const raw = params.get('fondo')
  return OPTIONS.find((o) => o.key === raw)?.key ?? 'pcb'
}

export function BackdropLab() {
  const active = useBackdropFromUrl()
  const current = OPTIONS.find((o) => o.key === active) ?? OPTIONS[0]

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-8 px-6 py-16">
        <p className="cf-eyebrow">Comparador de fondos · temporal</p>

        <h1 className="cf-text-gradient text-center text-3xl leading-tight font-semibold tracking-tight">
          Elige el fondo del sitio
        </h1>

        {/*
          Selector por enlaces, no por botones: al vivir el estado en la URL, cada
          opcion es un destino real. Asi el navegador puede volver atras y el
          enlace se puede compartir.
        */}
        <nav
          className="cf-glass flex flex-wrap items-center justify-center gap-1 p-1.5"
          aria-label="Alternativas de fondo"
        >
          {OPTIONS.map((option) => (
            <Link
              key={option.key}
              to={`/variantes?fondo=${option.key}`}
              aria-current={active === option.key ? 'page' : undefined}
              className={
                active === option.key
                  ? 'rounded-pill bg-text px-5 py-2.5 text-sm font-medium text-bg no-underline'
                  : 'rounded-pill px-5 py-2.5 text-sm font-medium text-text-secondary no-underline transition-colors duration-fast hover:bg-[var(--cf-fill-dim)] hover:text-text'
              }
            >
              {option.name}
            </Link>
          ))}
        </nav>

        {/* Contenido de prueba, el mismo en las tres */}
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="text-2xl font-semibold text-text-strong">Diseña circuitos</h2>
          <p className="max-w-md text-md leading-relaxed text-text-secondary">
            Coloca componentes sobre un lienzo con cuadrícula, cablea sus pines y observa tensiones,
            corrientes y potencia sin instalar nada.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="cf-glow inline-flex h-11 items-center rounded-pill bg-accent px-6 text-sm font-medium text-on-accent">
              Entrar al editor
            </span>
            <span className="inline-flex h-11 items-center rounded-pill border border-hairline px-5 text-sm font-medium text-text-secondary">
              Ver la biblioteca
            </span>
          </div>
        </div>

        {/* Explicación de la activa */}
        <div className="cf-glass max-w-xl p-5">
          <p className="cf-eyebrow mb-2">{current.name}</p>
          <p className="text-sm leading-relaxed text-text-secondary">{current.why}</p>
        </div>
      </div>
    </div>
  )
}
