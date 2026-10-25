/**
 * Fondo C — Retícula de ingeniería.
 *
 * # Por que
 *
 * La tercera alternativa es la mas sobria, y por eso la mas segura bajo
 * contenido denso. Es una retícula con **marcas de medida** en los bordes, como
 * el papel milimetrado de una libreta de planos o la regla de un programa de CAD.
 *
 * Su virtud es que no compite: no tiene color, no tiene formas reconocibles y no
 * atrae la mirada. Da estructura y sensacion de instrumento sin decorar.
 *
 * # Reglas
 *
 *  - Rejilla progresiva: 1 unidad, 5 unidades y 25 unidades. Tres niveles es lo
 *    que usa el papel milimetrado real; con dos se pierde la referencia y con
 *    cuatro se vuelve ruido.
 *  - **Marcas de regla** en los cuatro bordes, cada cinco unidades mayores. Son
 *    lo que convierte una rejilla en un instrumento de medida.
 *  - **Cruces de referencia** en las intersecciones mayores, como en una hoja de
 *    calibracion.
 */

import { useMemo } from 'react'

export interface EngineeringGridProps {
  opacity?: number
}

const W = 1440
const H = 900

/** Las tres escalas de la retícula, en unidades. */
const UNIT = 8
const MEDIUM = UNIT * 5
const MAJOR = UNIT * 25

/** Longitud de las marcas de regla, en px. */
const TICK = 10

/**
 * Dibuja las marcas de regla de un borde.
 *
 * @param horizontal `true` para el borde superior e inferior.
 */
function buildTicks(horizontal: boolean): { pos: number; major: boolean }[] {
  const length = horizontal ? W : H
  const step = horizontal ? MEDIUM : MEDIUM
  const ticks: { pos: number; major: boolean }[] = []

  for (let pos = 0; pos <= length; pos += step) {
    ticks.push({ pos, major: pos % (step * 5) === 0 })
  }
  return ticks
}

export function EngineeringGrid({ opacity = 1 }: EngineeringGridProps) {
  const vertical = useMemo(() => buildTicks(true), [])
  const horizontal = useMemo(() => buildTicks(false), [])

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="grid-fade" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="50%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0.05" />
        </radialGradient>
        <mask id="grid-mask">
          <rect width="100%" height="100%" fill="url(#grid-fade)" />
        </mask>

        {/* Resplandor de las marcas de calibracion */}
        <filter id="grid-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g mask="url(#grid-mask)">
        {/*
          Tres niveles de rejilla, como el papel milimetrado. Los tres juntos dan
          la sensacion de instrumento; con uno solo seria una textura.
        */}
        <g stroke="var(--cf-text-muted)">
          {/* Milímetro: cuadricula fina */}
          <g strokeWidth="0.4" opacity="0.14">
            {Array.from({ length: Math.floor(W / UNIT) + 1 }, (_, i) => i * UNIT).map((x) => (
              <line key={`u-${x}`} x1={x} y1={0} x2={x} y2={H} />
            ))}
            {Array.from({ length: Math.floor(H / UNIT) + 1 }, (_, i) => i * UNIT).map((y) => (
              <line key={`v-${y}`} x1={0} y1={y} x2={W} y2={y} />
            ))}
          </g>

          {/* Media: cada 5 unidades */}
          <g strokeWidth="0.7" opacity="0.2">
            {Array.from({ length: Math.floor(W / MEDIUM) + 1 }, (_, i) => i * MEDIUM).map((x) => (
              <line key={`m-${x}`} x1={x} y1={0} x2={x} y2={H} />
            ))}
            {Array.from({ length: Math.floor(H / MEDIUM) + 1 }, (_, i) => i * MEDIUM).map((y) => (
              <line key={`n-${y}`} x1={0} y1={y} x2={W} y2={y} />
            ))}
          </g>

          {/* Mayor: cada 25 unidades */}
          <g strokeWidth="1" opacity="0.26">
            {Array.from({ length: Math.floor(W / MAJOR) + 1 }, (_, i) => i * MAJOR).map((x) => (
              <line key={`M-${x}`} x1={x} y1={0} x2={x} y2={H} />
            ))}
            {Array.from({ length: Math.floor(H / MAJOR) + 1 }, (_, i) => i * MAJOR).map((y) => (
              <line key={`N-${y}`} x1={0} y1={y} x2={W} y2={y} />
            ))}
          </g>
        </g>

        {/*
          Cruces de calibracion en las intersecciones mayores. Son marcas cortas
          en aspa, como las de una hoja de registro: refuerzan la lectura de
          "esto es una superficie de medida" sin anadir una sola forma grande.

          El resplandor (`filter`) es lo que separa esta opcion de ser una simple
          cuadricula: sin el, las aspas se leen como parte de la retícula; con el,
          se leen como marcas iluminadas sobre el papel.
        */}
        <g stroke="var(--cf-accent)" strokeWidth="1.2" opacity="0.55" filter="url(#grid-glow)">
          {Array.from({ length: Math.floor(W / MAJOR) + 1 }, (_, i) => i * MAJOR).flatMap((x) =>
            Array.from({ length: Math.floor(H / MAJOR) + 1 }, (_, j) => j * MAJOR).map((y) => (
              <g key={`x-${x}-${y}`}>
                <line x1={x - 5} y1={y} x2={x + 5} y2={y} />
                <line x1={x} y1={y - 5} x2={x} y2={y + 5} />
              </g>
            )),
          )}
        </g>

        {/* Marcas de regla en los cuatro bordes */}
        <g stroke="var(--cf-text-muted)" strokeWidth="1" opacity="0.4">
          {vertical.map((tick) => (
            <g key={`top-${tick.pos}`}>
              <line x1={tick.pos} y1={0} x2={tick.pos} y2={tick.major ? TICK : TICK / 2} />
              <line x1={tick.pos} y1={H} x2={tick.pos} y2={H - (tick.major ? TICK : TICK / 2)} />
            </g>
          ))}
          {horizontal.map((tick) => (
            <g key={`left-${tick.pos}`}>
              <line x1={0} y1={tick.pos} x2={tick.major ? TICK : TICK / 2} y2={tick.pos} />
              <line x1={W} y1={tick.pos} x2={W - (tick.major ? TICK : TICK / 2)} y2={tick.pos} />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}
