import { cx } from '@/lib/cx'
import { type AssemblyState, isConducting } from './useAssemblyTimeline'

/**
 * Circuito que se ensambla solo (documento de diseño sección 3).
 *
 * Un lazo con fuente de 5 V, resistencia limitadora, LED y retorno a tierra. Es
 * el circuito canonico de la electrónica de aprendizaje y el mismo que el OE-1
 * usa como criterio de aceptacion: "fuente + resistencia + LED".
 *
 * Decisiones:
 *
 * 1. **Es decorativo (`aria-hidden`).** El titular y el botón son los elementos
 *    reales. Describir el circuito letra a letra seria ruido para un lector de
 *    pantalla, no información.
 * 2. **CSS y SVG puros, sin WebGL.** three.js se difiere hasta que el lienzo del
 *    editor tenga geometría real. Aquí no compite por GPU.
 * 3. **Coordenadas en rejilla de 4 px.** Los cables llegan exactamente a los
 *    pines; en un esquemático un desfase de 1 px se ve sucio.
 * 4. **El pulso usa `animateMotion` sobre el lazo completo** para que recorra el
 *    camino real de la corriente, no un segmento recto.
 */

const WIRE_WIDTH = 1.5

/** Camino del lazo completo, reutilizado por el pulso y por el retorno. */
const LOOP_PATH = 'M 64 48 H 132 M 180 48 H 228 M 268 48 H 292 V 152 H 64 V 132'

interface CircuitAssemblyProps {
  state: AssemblyState
  className?: string
}

export function CircuitAssembly({ state, className }: CircuitAssemblyProps) {
  const conducting = isConducting(state)

  return (
    <svg
      viewBox="0 0 320 200"
      className={cx('w-full max-w-[520px]', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/*
          Halo del LED. Los stops usan el token `--cf-error` en vez de un hex: en
          un SVG hay que referenciar la custom property con `var()`, que funciona
          en atributos de presentacion porque `stop-color` es una propiedad CSS.
        */}
        <radialGradient id="cf-led-halo">
          <stop offset="0%" stopColor="var(--cf-error)" stopOpacity="0.5" />
          <stop offset="55%" stopColor="var(--cf-error)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--cf-error)" stopOpacity="0" />
        </radialGradient>

        <filter id="cf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ---------------------------------------------------------------- */}
      {/* Halo del LED — debajo de todo, brilla con la corriente             */}
      {/* ---------------------------------------------------------------- */}
      <g
        className="cf-led__halo"
        style={{ '--cf-current-ratio': conducting ? 1 : 0 } as React.CSSProperties}
      >
        <circle cx="248" cy="48" r="34" fill="url(#cf-led-halo)" />
      </g>

      {/* ---------------------------------------------------------------- */}
      {/* Cables — se trazan con stroke-dashoffset al llegar su turno        */}
      {/* ---------------------------------------------------------------- */}

      <path
        d="M 64 48 H 132"
        fill="none"
        stroke={state.wireToResistor ? 'var(--cf-accent)' : 'var(--cf-text-muted)'}
        strokeWidth={WIRE_WIDTH}
        strokeLinecap="round"
        className={cx('cf-wire cf-trace', state.wireToResistor && 'is-drawn')}
        data-live={state.wireToResistor}
        style={{ '--len': 68 } as React.CSSProperties}
      />

      <path
        d="M 180 48 H 228"
        fill="none"
        stroke={state.wireToLed ? 'var(--cf-accent)' : 'var(--cf-text-muted)'}
        strokeWidth={WIRE_WIDTH}
        strokeLinecap="round"
        className={cx('cf-wire cf-trace', state.wireToLed && 'is-drawn')}
        data-live={state.wireToLed}
        style={{ '--len': 48 } as React.CSSProperties}
      />

      <path
        d="M 268 48 H 292 V 152 H 64 V 132"
        fill="none"
        stroke={conducting ? 'var(--cf-accent)' : 'var(--cf-text-muted)'}
        strokeWidth={WIRE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx('cf-wire cf-trace', state.wireToGround && 'is-drawn')}
        data-live={conducting}
        /*
          `--len` debe ser >= la longitud real del trazo, o el trazo queda cortado:
          con stroke-dasharray = N, el segmento N..longitud cae en el hueco del
          patron y no se pinta. Este path mide 24 + 104 + 228 + 20 = 376.
        */
        style={{ '--len': 376 } as React.CSSProperties}
      />

      {/* Pulso de corriente: recorre el lazo en el sentido de la corriente */}
      {state.pulse && (
        <circle r="2.5" fill="var(--cf-signal)" filter="url(#cf-glow)">
          <animateMotion dur="2.6s" repeatCount="indefinite" path={LOOP_PATH} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.08;0.88;1"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* V1 — fuente de 5 V                                                 */}
      {/* ---------------------------------------------------------------- */}
      <g className={cx('cf-node', state.source && 'is-visible')}>
        <circle
          cx="48"
          cy="48"
          r="16"
          fill="var(--cf-surface)"
          stroke="var(--cf-hairline-strong)"
          strokeWidth="1"
        />
        <text
          x="48"
          y="53"
          textAnchor="middle"
          className="cf-mono"
          fontSize="12"
          fill="var(--cf-error)"
          fontWeight="500"
        >
          +
        </text>
        <text
          x="48"
          y="80"
          textAnchor="middle"
          className="cf-mono"
          fontSize="8"
          fill="var(--cf-text-muted)"
        >
          V1 5V
        </text>
      </g>

      {/* ---------------------------------------------------------------- */}
      {/* R1 — resistencia en notacion zigzag                                */}
      {/* ---------------------------------------------------------------- */}
      <g className={cx('cf-node', state.resistor && 'is-visible')}>
        <path
          d="M 132 48 l 5 -7 6 14 6 -14 6 14 6 -14 5 7"
          fill="none"
          stroke="var(--cf-text)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="156"
          y="80"
          textAnchor="middle"
          className="cf-mono"
          fontSize="8"
          fill="var(--cf-text-muted)"
        >
          R1 220R
        </text>
      </g>

      {/* ---------------------------------------------------------------- */}
      {/* D1 — LED: triangulo, barra de catodo y flechas de emision          */}
      {/* ---------------------------------------------------------------- */}
      <g className={cx('cf-node', state.led && 'is-visible')}>
        <path
          d="M 228 40 L 228 56 L 244 48 Z"
          fill={conducting ? 'var(--cf-error)' : 'var(--cf-surface-alt)'}
          stroke="var(--cf-text)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="transition-[fill] duration-base ease-inout"
        />
        <path
          d="M 244 40 L 244 56"
          stroke="var(--cf-text)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 234 32 l 5 -5 M 240 34 l 5 -5"
          stroke="var(--cf-error)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={conducting ? 1 : 0.25}
          className="transition-opacity duration-base ease-inout"
        />
        <text
          x="248"
          y="80"
          textAnchor="middle"
          className="cf-mono"
          fontSize="8"
          fill="var(--cf-text-muted)"
        >
          D1 LED
        </text>
      </g>

      {/* ---------------------------------------------------------------- */}
      {/* GND — referencia de 0 V                                            */}
      {/* ---------------------------------------------------------------- */}
      <g className={cx('cf-node', state.source && 'is-visible')}>
        <path
          d="M 52 132 H 76 M 56 138 H 72 M 60 144 H 68"
          stroke="var(--cf-text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="64"
          y="162"
          textAnchor="middle"
          className="cf-mono"
          fontSize="8"
          fill="var(--cf-text-muted)"
        >
          GND
        </text>
      </g>
    </svg>
  )
}
