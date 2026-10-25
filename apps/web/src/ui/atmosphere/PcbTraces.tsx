/**
 * Fondo A — Pistas de placa de circuito.
 *
 * # Por que esto y no manchas de color
 *
 * El fondo anterior eran tres halos radiales difusos. Ese recurso es el mas
 * repetido de los ultimos anos: no dice nada del producto y podria pertenecer a
 * cualquier panel de administracion. La guia de frontend lo lista explicitamente
 * entre los patrones de "estetica generada por IA" — *excessive gradients*.
 *
 * Un simulador de circuitos tiene un lenguaje grafico propio y reconocible: la
 * placa. Pistas ortogonales con chaflanes a 45 grados, vias, y almohadillas. Es
 * lo que el usuario esta mirando cuando trabaja, asi que el fondo deja de ser
 * decoracion y pasa a ser contexto.
 *
 * # Reglas del dibujo
 *
 * Las pistas siguen las convenciones reales de una placa:
 *  - **Solo angulos de 0, 45 y 90 grados.** En una placa real no hay curvas
 *    arbitrarias: el enrutado es ortogonal con chaflanes, y respetarlo es lo que
 *    hace que el dibujo se lea como una placa y no como un garabato.
 *  - **Grosor uniforme** por capa, como el ancho de cobre.
 *  - **Vias** (circulos con anillo) donde una pista cambia de capa.
 *
 * # Determinismo
 *
 * Todo se genera con una semilla fija: el dibujo es identico en cada carga. Con
 * azar real, el fondo cambiaria al navegar y se veria como un fallo.
 */

import { useMemo } from 'react'
import { randInt, seededRandom } from './seededRandom'

export interface PcbTracesProps {
  /** Opacidad global del dibujo. */
  opacity?: number
}

/** Semilla del generador. Cambiarla produce otra placa, igual de valida. */
const SEED = 20261025

/** Espaciado base de la retícula donde viven las pistas. */
const UNIT = 40

/**
 * Un punto de la placa, en unidades de retícula.
 * Se trabaja en unidades y se multiplica al dibujar, para que el dibujo sea
 * proporcional y no dependa del tamano del viewport.
 */
interface Point {
  x: number
  y: number
}

/** Una pista: una polilínea ortogonal con chaflanes. */
interface Trace {
  points: Point[]
  /** Grosor relativo: las pistas de alimentacion son mas anchas. */
  weight: number
}

/** Una via: circulo con anillo, donde el enrutado cambia de capa. */
interface Via {
  x: number
  y: number
  r: number
}

/**
 * Genera una pista ortogonal que avanza hacia la derecha.
 *
 * El algoritmo avanza en pasos horizontales y mete un tramo vertical con
 * chaflanes de 45 grados, que es exactamente como se enruta cobre en una placa.
 * Se evita el angulo recto puro: en la practica se chaflana para reducir
 * reflexiones en alta frecuencia, y visualmente es lo que da el aspecto correcto.
 */
function buildTrace(rand: () => number, startY: number, steps: number): Trace {
  const points: Point[] = [{ x: 0, y: startY }]
  let x = 0
  let y = startY

  for (let i = 0; i < steps; i++) {
    // Tramo horizontal
    const run = randInt(rand, 2, 6)
    x += run
    points.push({ x, y })

    // Chaflán de 45 grados hacia arriba o hacia abajo
    if (rand() > 0.35) {
      const dir = rand() > 0.5 ? 1 : -1
      const diag = randInt(rand, 1, 3)
      x += diag
      y += dir * diag
      points.push({ x, y })
    }

    // Tramo vertical puro, a veces
    if (rand() > 0.7) {
      const vert = randInt(rand, 1, 2)
      y += rand() > 0.5 ? vert : -vert
      points.push({ x, y })
    }
  }

  return { points, weight: rand() > 0.8 ? 2.5 : 1.4 }
}

export function PcbTraces({ opacity = 1 }: PcbTracesProps) {
  const { traces, vias } = useMemo(() => {
    const rand = seededRandom(SEED)
    const built: Trace[] = []
    const holes: Via[] = []

    // 14 pistas repartidas por la altura, con separacion irregular para que no
    // se lea como una trama uniforme.
    let y = 2
    for (let i = 0; i < 14; i++) {
      const trace = buildTrace(rand, y, randInt(rand, 4, 9))
      built.push(trace)

      // Vias en algunos de los vertices, no en todos: una via en cada esquina se
      // veria como un patron; en algunos, como una placa real.
      for (const point of trace.points) {
        if (rand() > 0.88) {
          holes.push({ x: point.x, y: point.y, r: rand() > 0.6 ? 1.6 : 1.1 })
        }
      }

      y += randInt(rand, 3, 6)
    }

    return { traces: built, vias: holes }
  }, [])

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${UNIT * 60} ${UNIT * 46}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
      aria-hidden="true"
    >
      <defs>
        {/*
          El degradado hace que las pistas se desvanezcan hacia los bordes: asi el
          dibujo no termina en un corte duro y el contenido del centro manda.
        */}
        <radialGradient id="pcb-fade" cx="50%" cy="45%" r="72%">
          <stop offset="0%" stopColor="white" stopOpacity="0.85" />
          <stop offset="55%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="pcb-mask">
          <rect width="100%" height="100%" fill="url(#pcb-fade)" />
        </mask>
      </defs>

      <g mask="url(#pcb-mask)">
        {traces.map((trace, index) => (
          <polyline
            // biome-ignore lint/suspicious/noArrayIndexKey: las pistas son fijas y se generan una vez
            key={`trace-${index}`}
            points={trace.points.map((p) => `${p.x * UNIT},${p.y * UNIT}`).join(' ')}
            fill="none"
            stroke="var(--cf-accent)"
            strokeWidth={trace.weight}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.5}
          />
        ))}

        {vias.map((via, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: las vias se generan UNA vez con semilla fija y nunca se reordenan ni se filtran, asi que la posicion es su identidad estable
          <g key={`via-${index}`}>
            {/* Anillo de cobre */}
            <circle
              cx={via.x * UNIT}
              cy={via.y * UNIT}
              r={via.r * 4}
              fill="none"
              stroke="var(--cf-accent)"
              strokeWidth={via.r}
              opacity={0.45}
            />
            {/* Taladro */}
            <circle
              cx={via.x * UNIT}
              cy={via.y * UNIT}
              r={via.r * 1.2}
              fill="var(--cf-bg)"
              opacity={0.9}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
