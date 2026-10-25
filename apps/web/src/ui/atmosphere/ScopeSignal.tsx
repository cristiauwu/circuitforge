/**
 * Fondo B — Señal de osciloscopio.
 *
 * # Por que
 *
 * La segunda alternativa tambien viene del dominio, pero del otro lado del
 * oficio: no el soporte fisico (la placa) sino **la medicion**. Un osciloscopio
 * es el instrumento que lee el circuito, y su firma visual es inconfundible: una
 * traza sobre una retícula con divisiones, con una onda que se desplaza.
 *
 * Es menos literal que la placa y mas atmosferico, asi que convive mejor con el
 * contenido: se lee como "aqui se mide algo" sin dibujar objetos concretos.
 *
 * # Reglas
 *
 *  - La retícula tiene divisiones mayores y menores, como la pantalla de un
 *    osciloscopio real (5 divisiones mayores, 5 subdivisiones cada una).
 *  - La onda es una suma de dos senoidales de frecuencia distinta: una simple se
 *    ve mecanica, dos dan un batido organico, que es lo que se observa en una
 *    senal real con ruido.
 *  - Las lineas de fuga son las de los canales, mas tenues.
 */

import { useMemo } from 'react'

export interface ScopeSignalProps {
  opacity?: number
}

/** Ancho del lienzo logico. El SVG escala con `slice`. */
const W = 1440
const H = 900

/** Divisiones mayores de la retícula, como en un osciloscopio. */
const DIVISIONS_X = 10
const DIVISIONS_Y = 6

/** Subdivisiones por division. */
const SUBDIVISIONS = 5

/**
 * Genera la traza de la onda.
 *
 * Dos senoidales superpuestas con amplitudes y frecuencias distintas producen un
 * batido: la onda "respira" en lugar de repetirse. La tercera componente, de
 * frecuencia alta y amplitud minima, hace de ruido de medida.
 */
function buildWave(phase: number): string {
  const points: string[] = []
  const steps = 240

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = t * W
    // Batido de dos frecuencias + ruido de alta frecuencia muy leve
    const y =
      H / 2 +
      Math.sin(t * Math.PI * 4 + phase) * 96 +
      Math.sin(t * Math.PI * 9 + phase * 0.7) * 34 +
      Math.sin(t * Math.PI * 47 + phase * 2.1) * 4

    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return points.join(' ')
}

export function ScopeSignal({ opacity = 1 }: ScopeSignalProps) {
  const cellW = W / (DIVISIONS_X * SUBDIVISIONS)
  const cellH = H / (DIVISIONS_Y * SUBDIVISIONS)

  const minorX = useMemo(
    () => Array.from({ length: DIVISIONS_X * SUBDIVISIONS + 1 }, (_, i) => i * cellW),
    [cellW],
  )
  const minorY = useMemo(
    () => Array.from({ length: DIVISIONS_Y * SUBDIVISIONS + 1 }, (_, i) => i * cellH),
    [cellH],
  )

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="scope-fade" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="60%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="scope-mask">
          <rect width="100%" height="100%" fill="url(#scope-fade)" />
        </mask>

        {/*
          El resplandor del fosforo: un desenfoque sobre la traza. Es lo que
          distingue una traza de osciloscopio de una linea cualquiera.
        */}
        <filter id="scope-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g mask="url(#scope-mask)">
        {/* Retícula menor */}
        <g stroke="var(--cf-signal)" strokeWidth="0.5" opacity="0.16">
          {minorX.map((x) => (
            <line key={`mx-${x}`} x1={x} y1={0} x2={x} y2={H} />
          ))}
          {minorY.map((y) => (
            <line key={`my-${y}`} x1={0} y1={y} x2={W} y2={y} />
          ))}
        </g>

        {/* Retícula mayor */}
        <g stroke="var(--cf-signal)" strokeWidth="1" opacity="0.3">
          {Array.from({ length: DIVISIONS_X + 1 }, (_, i) => (i * W) / DIVISIONS_X).map((x) => (
            <line key={`Mx-${x}`} x1={x} y1={0} x2={x} y2={H} />
          ))}
          {Array.from({ length: DIVISIONS_Y + 1 }, (_, i) => (i * H) / DIVISIONS_Y).map((y) => (
            <line key={`My-${y}`} x1={0} y1={y} x2={W} y2={y} />
          ))}
        </g>

        {/* Canal 1: la onda principal, con resplandor */}
        <polyline
          points={buildWave(0)}
          fill="none"
          stroke="var(--cf-signal)"
          strokeWidth="2"
          opacity="0.5"
          filter="url(#scope-glow)"
        />

        {/* Canal 2: una onda mas tenue y desfasada, como una segunda sonda */}
        <polyline
          points={buildWave(Math.PI * 1.4)}
          fill="none"
          stroke="var(--cf-accent)"
          strokeWidth="1.2"
          opacity="0.28"
        />

        {/* Linea base del canal */}
        <line
          x1={0}
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="var(--cf-signal)"
          strokeWidth="0.8"
          opacity="0.22"
        />
      </g>
    </svg>
  )
}
