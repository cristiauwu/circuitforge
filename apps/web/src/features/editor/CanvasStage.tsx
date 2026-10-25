import { useState } from 'react'
import { SchematicSymbol } from '@/ui'

/**
 * Lienzo del editor (documento de diseño sección 4).
 *
 * **Es CSS, no WebGL.** three.js se difiere hasta que haya geometría real que
 * renderizar; en esta etapa el lienzo es una cuadrícula con componentes
 * colocados. Esto es el único punto de cambio cuando entre R3F.
 *
 * El lienzo tiene `data-lenis-prevent` en el futuro (el zoom y el paneo no pueden
 * pasar por un interpolador de scroll), pero como esta etapa no usa Lenis, se
 * documenta en el comentario y no se anade el atributo sin consumidor.
 *
 * Los componentes de ejemplo estan **colocados a mano** para que la pantalla se
 * vea real: son la vista derivada de un netlist que aun no existe.
 */

interface PlacedComponent {
  id: string
  name: string
  /**
   * Clave de la ficha en la biblioteca. Determina el simbolo esquematico que se
   * dibuja; un `typeId` desconocido cae en el simbolo generico.
   */
  typeId: string
  x: number
  y: number
  pins: { id: string; type: 'power' | 'gnd' | 'digital' | 'pwm' }[]
}

/** Circuito de ejemplo: fuente + resistencia + LED + Arduino. */
const PLACED: PlacedComponent[] = [
  {
    id: 'V1',
    name: 'Fuente DC',
    typeId: 'dc_source',
    x: 120,
    y: 120,
    pins: [
      { id: '+', type: 'power' },
      { id: '-', type: 'gnd' },
    ],
  },
  {
    id: 'R1',
    name: 'Resistencia',
    typeId: 'resistor',
    x: 320,
    y: 120,
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'power' },
    ],
  },
  {
    id: 'D1',
    name: 'LED',
    typeId: 'led',
    x: 520,
    y: 120,
    pins: [
      { id: 'A', type: 'power' },
      { id: 'K', type: 'gnd' },
    ],
  },
  {
    id: 'U1',
    name: 'Arduino UNO',
    typeId: 'arduino_uno',
    x: 240,
    y: 320,
    pins: [
      { id: '5V', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'D13', type: 'digital' },
      { id: 'D9', type: 'pwm' },
    ],
  },
]

/** Cable entre dos componentes, en coordenadas del lienzo. */
interface Wire {
  from: { x: number; y: number }
  to: { x: number; y: number }
  live: boolean
}

const WIRES: Wire[] = [
  { from: { x: 120, y: 120 }, to: { x: 320, y: 120 }, live: true },
  { from: { x: 320, y: 120 }, to: { x: 520, y: 120 }, live: true },
  { from: { x: 520, y: 120 }, to: { x: 240, y: 320 }, live: false },
  { from: { x: 120, y: 120 }, to: { x: 240, y: 320 }, live: false },
]

interface CanvasStageProps {
  /** Id del componente seleccionado, o `null`. */
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CanvasStage({ selectedId, onSelect }: CanvasStageProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="cf-grain relative min-h-0 flex-1 overflow-hidden rounded-xl border border-hairline bg-bg">
      {/* Cuadrícula. Se disuelve en los bordes para no competir con el contenido. */}
      <div aria-hidden="true" className="cf-grid-bg cf-grid-fade absolute inset-0 opacity-60" />

      {/* Barra de estado flotante, en píldora con glass */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="cf-mono rounded-pill border border-hairline bg-[var(--cf-fill)] px-3 py-1 text-2xs text-text-muted backdrop-blur-md">
          1200 × 800 px
        </span>
        <span className="cf-mono rounded-pill border border-hairline bg-[var(--cf-fill)] px-3 py-1 text-2xs text-text-muted backdrop-blur-md">
          rejilla 24 px
        </span>
      </div>

      {/* Indicador de simulación detenida */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-pill border border-hairline bg-[var(--cf-fill)] px-3 py-1 backdrop-blur-md">
        <span className="size-1.5 rounded-full bg-text-muted" aria-hidden="true" />
        <span className="cf-eyebrow">Simulación detenida</span>
      </div>

      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 900 600"
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label="Lienzo del circuito"
      >
        {/* Cables, debajo de los componentes */}
        <g>
          {WIRES.map((wire, index) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: los cables no tienen id estable en la vista
              key={index}
              d={`M ${wire.from.x} ${wire.from.y} C ${(wire.from.x + wire.to.x) / 2} ${wire.from.y}, ${(wire.from.x + wire.to.x) / 2} ${wire.to.y}, ${wire.to.x} ${wire.to.y}`}
              fill="none"
              stroke={wire.live ? 'var(--cf-accent)' : 'var(--cf-text-muted)'}
              strokeWidth="2"
              strokeLinecap="round"
              opacity={wire.live ? 0.9 : 0.5}
            />
          ))}
        </g>

        {/* Componentes */}
        {PLACED.map((component) => {
          const isSelected = selectedId === component.id
          const isHovered = hovered === component.id
          return (
            <g
              key={component.id}
              transform={`translate(${component.x} ${component.y})`}
              className="cursor-pointer"
              onClick={() => onSelect(isSelected ? null : component.id)}
              onMouseEnter={() => setHovered(component.id)}
              onMouseLeave={() => setHovered(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(isSelected ? null : component.id)
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${component.name} ${component.id}`}
            >
              {/* Cuerpo */}
              <rect
                x="-52"
                y="-30"
                width="104"
                height="60"
                rx="16"
                fill="var(--cf-surface)"
                stroke={isSelected ? 'var(--cf-accent)' : 'var(--cf-hairline-strong)'}
                strokeWidth={isSelected ? 2 : 1}
                className="transition-[stroke] duration-fast ease-inout"
              />

              {/* Resalte al pasar el ratón, sin mover el componente */}
              {isHovered && !isSelected && (
                <rect
                  x="-52"
                  y="-30"
                  width="104"
                  height="60"
                  rx="16"
                  fill="var(--cf-accent-veil)"
                  pointerEvents="none"
                />
              )}

              {/*
                Identificador, arriba del cuerpo.
                Medido antes: estaba en y=-14 y el simbolo en y=2, con cajas que
                se solapaban 8px. Ahora el id vive fuera del rect (y=-38) y el
                simbolo dentro (y=6), sin contacto.
              */}
              <text
                x="0"
                y="-38"
                textAnchor="middle"
                className="cf-mono pointer-events-none"
                fontSize="11"
                fill="var(--cf-signal)"
                fontWeight="500"
              >
                {component.id}
              </text>

              {/*
                Simbolo esquematico real, anidado en el SVG del lienzo.
                Centrado en el cuerpo (el rect va de -52,-30 a 52,30): 44x30
                unidades deja aire a los lados y no toca ni el id (y=-38) ni el
                nombre (y=24). `color` hereda del grupo para que el estado
                seleccionado lo tinte sin duplicar el dibujo.
              */}
              <SchematicSymbol
                typeId={component.typeId}
                x={-22}
                y={-12}
                width={44}
                height={30}
                className="pointer-events-none text-text-secondary"
              />

              {/*
                Nombre, DENTRO del cuerpo (y=24). Antes estaba en y=44, fuera del
                rect, y colisionaba con las etiquetas de los pines: medido, el
                nombre caia en 564-577 y "5V"/"GND"/"D13" en 567-579, la misma
                franja. Dentro del cuerpo no hay nada con lo que chocar.
              */}
              <text
                x="0"
                y="24"
                textAnchor="middle"
                className="pointer-events-none"
                fontSize="10"
                fill="var(--cf-text-muted)"
              >
                {component.name}
              </text>

              {/* Pines: circulo sobre el borde inferior, etiqueta por debajo */}
              {component.pins.map((pin, pinIndex) => {
                const offset = (pinIndex - (component.pins.length - 1) / 2) * 22
                return (
                  <g key={pin.id} transform={`translate(${offset} 30)`}>
                    <circle
                      r="3.5"
                      fill="var(--cf-bg)"
                      stroke="var(--cf-hairline-strong)"
                      strokeWidth="1.5"
                      className="pointer-events-none"
                    />
                    <text
                      y="15"
                      textAnchor="middle"
                      className="cf-mono pointer-events-none"
                      fontSize="9"
                      fill="var(--cf-text-muted)"
                    >
                      {pin.id}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
