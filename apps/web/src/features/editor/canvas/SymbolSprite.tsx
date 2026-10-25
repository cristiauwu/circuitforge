/**
 * Simbolo de un componente, dibujado con geometria de la escena.
 *
 * # Por que no `<Html>` de drei
 *
 * La primera version anclaba un nodo DOM al mundo con `<Html transform>`. Es
 * comodo —reutiliza los SVG de React tal cual— pero se midio y el resultado fue
 * concluyente:
 *
 *     con nodos <Html>  ->  66.7 ms por frame  (~15 fps)
 *     sin nodos <Html>  ->  13.0 ms por frame  (~77 fps)
 *
 * Los nodos DOM eran el **80 % del coste de render**. Cada `<Html transform>`
 * sincroniza el `transform` CSS de su nodo con la camara en cada frame, y con 22
 * nodos eso domina el presupuesto: el limite de 16.67 ms para 60 fps se superaba
 * por cuatro.
 *
 * # Por que tampoco `<Svg>` de drei
 *
 * `<Svg>` **no acepta hijos**: su API exige `src: string`, una URL a un archivo
 * SVG que parsea internamente. No sirve para dibujar paths que ya estan en
 * memoria sin escribir 22 archivos y servirlos por red.
 * Fuente: `drei/core/Svg.d.ts` — `interface SvgProps { src: string; ... }`
 *
 * # La solucion
 *
 * Trazar el simbolo con **`<Line>` de drei**, que por dentro usa `Line2` y
 * `LineMaterial` de three-stdlib. Importa cual se usa: el `<line>` nativo de
 * three con `lineBasicMaterial` **ignora `linewidth` en WebGL** —todas las lineas
 * salen de 1 px— y un esquematico necesita trazo visible. `LineMaterial` si
 * respeta el grosor.
 *
 * Fuente: `drei/core/Line.d.ts` — `LineProps { points, lineWidth, color, ... }`
 *
 * Los 22 simbolos se describen como datos (segmentos y arcos) en el sistema del
 * viewBox original `32 x 24`, asi que la notacion esquematica se conserva: la
 * resistencia sigue siendo un zigzag, el LED un triangulo con barra, el
 * transistor un circulo con la flecha del emisor hacia fuera.
 */

import { Line } from '@react-three/drei'
import { useMemo } from 'react'

export interface SymbolSpriteProps {
  typeId: string
  /** Ancho del simbolo en unidades de mundo. */
  width?: number
}

/** Tamano del simbolo, en unidades de mundo (dos celdas de rejilla de ancho). */
const SYMBOL_WIDTH = 44

/** El viewBox original de los simbolos: 32 de ancho por 24 de alto. */
const VIEW_W = 32
const VIEW_H = 24

/** Grosor del trazo, en unidades del viewBox. */
const STROKE_WIDTH = 0.6

/**
 * Descripcion vectorial de un simbolo, en el sistema del viewBox.
 *
 * Las coordenadas Y crecen hacia ABAJO, como en el viewBox original, y se
 * invierten al dibujar porque la escena tiene el eje Y hacia arriba.
 */
interface Glyph {
  /** Segmentos rectos: [x1, y1, x2, y2]. */
  lines?: [number, number, number, number][]
  /** Cuerpos: [x, y, ancho, alto]. */
  rects?: [number, number, number, number][]
  /** Circulos: [cx, cy, radio]. */
  circles?: [number, number, number][]
  /** Arcos: [cx, cy, radio, anguloInicio, anguloFin] en grados. */
  arcs?: [number, number, number, number, number][]
}

/**
 * Los 22 simbolos, en notacion esquematica.
 *
 * Dibujados sobre la rejilla de 2 unidades del viewBox para que escalen nitido.
 */
const GLYPHS: Record<string, Glyph> = {
  // ── Pasivos ──────────────────────────────────────────────────────────
  resistor: {
    lines: [
      [2, 12, 6, 12],
      [6, 12, 8, 7],
      [8, 7, 11, 17],
      [11, 17, 14, 7],
      [14, 7, 17, 17],
      [17, 17, 20, 7],
      [20, 7, 22, 12],
      [22, 12, 26, 12],
    ],
  },
  capacitor: {
    lines: [
      [2, 12, 13, 12],
      [19, 12, 30, 12],
      [13, 5, 13, 19],
      [19, 5, 19, 19],
    ],
  },
  inductor: {
    lines: [
      [2, 12, 5, 12],
      [25, 12, 30, 12],
    ],
    arcs: [
      [7.5, 12, 2.5, 180, 360],
      [12.5, 12, 2.5, 180, 360],
      [17.5, 12, 2.5, 180, 360],
      [22.5, 12, 2.5, 180, 360],
    ],
  },
  potentiometer: {
    lines: [
      [2, 12, 6, 12],
      [6, 12, 8, 8],
      [8, 8, 11, 16],
      [11, 16, 14, 8],
      [14, 8, 17, 16],
      [17, 16, 20, 8],
      [20, 8, 22, 12],
      [22, 12, 26, 12],
      [16, 2, 16, 6],
      [13.5, 4.5, 16, 7],
      [16, 7, 18.5, 4.5],
    ],
  },

  // ── Semiconductores ──────────────────────────────────────────────────
  led: {
    lines: [
      [2, 12, 10, 12],
      [10, 5, 10, 19],
      [10, 5, 19, 12],
      [10, 19, 19, 12],
      [19, 5, 19, 19],
      [19, 12, 30, 12],
      [23, 6, 26, 3],
      [26, 8, 29, 5],
    ],
  },
  diode: {
    lines: [
      [2, 12, 10, 12],
      [10, 5, 10, 19],
      [10, 5, 19, 12],
      [10, 19, 19, 12],
      [19, 5, 19, 19],
      [19, 12, 30, 12],
    ],
  },
  bjt_npn: {
    circles: [[16, 12, 9]],
    lines: [
      [2, 12, 9, 12],
      [9, 6, 9, 18],
      [9, 9, 16, 4],
      [9, 15, 16, 20],
      [13, 11, 16, 9],
      [16, 9, 16.5, 12.5],
    ],
  },

  // ── Microcontroladores ───────────────────────────────────────────────
  arduino_uno: {
    rects: [[8, 4, 16, 16]],
    lines: [
      [12, 4, 12, 2],
      [16, 4, 16, 2],
      [20, 4, 20, 2],
      [12, 20, 12, 22],
      [16, 20, 16, 22],
      [20, 20, 20, 22],
      [8, 8, 6, 8],
      [8, 12, 6, 12],
      [8, 16, 6, 16],
      [24, 8, 26, 8],
      [24, 12, 26, 12],
      [24, 16, 26, 16],
    ],
    circles: [[12, 8, 1]],
  },
  esp32: {
    rects: [[8, 4, 16, 16]],
    lines: [
      [12, 4, 12, 2],
      [16, 4, 16, 2],
      [20, 4, 20, 2],
      [12, 20, 12, 22],
      [16, 20, 16, 22],
      [20, 20, 20, 22],
      [8, 8, 6, 8],
      [8, 12, 6, 12],
      [8, 16, 6, 16],
      [24, 8, 26, 8],
      [24, 12, 26, 12],
      [24, 16, 26, 16],
    ],
    circles: [[12, 8, 1]],
  },

  // ── Sensores ─────────────────────────────────────────────────────────
  ldr: {
    lines: [
      [8, 12, 12, 12],
      [12, 12, 14, 8],
      [14, 8, 17, 16],
      [17, 16, 20, 8],
      [20, 8, 22, 12],
      [22, 12, 26, 12],
      [4, 4, 8, 8],
      [9, 3, 12, 7],
    ],
  },
  dht22: {
    rects: [[8, 4, 16, 16]],
    lines: [
      [12, 4, 12, 2],
      [20, 4, 20, 2],
      [12, 20, 12, 22],
      [20, 20, 20, 22],
      [8, 8, 6, 8],
      [8, 16, 6, 16],
      [24, 8, 26, 8],
      [24, 16, 26, 16],
    ],
    circles: [[16, 12, 3]],
  },
  ultrasonic_hc_sr04: {
    rects: [[4, 5, 24, 14]],
    circles: [
      [11, 12, 3],
      [21, 12, 3],
    ],
  },

  // ── Actuadores ───────────────────────────────────────────────────────
  servo: {
    rects: [[6, 6, 18, 12]],
    lines: [
      [15, 10, 15, 6],
      [24, 12, 30, 12],
      [2, 12, 6, 12],
    ],
    circles: [[15, 12, 2]],
  },
  dc_motor: {
    circles: [[16, 12, 9]],
    lines: [
      [12, 15, 12, 9],
      [12, 9, 16, 13],
      [16, 13, 20, 9],
      [20, 9, 20, 15],
    ],
  },
  buzzer: {
    lines: [
      [10, 6, 10, 18],
      [10, 12, 2, 12],
      [10, 6, 2, 12],
      [10, 18, 2, 12],
      [22, 8, 24, 10],
      [24, 10, 24, 14],
      [24, 14, 22, 16],
    ],
  },

  // ── ESC ──────────────────────────────────────────────────────────────
  esc_30a: {
    rects: [[8, 5, 16, 14]],
    lines: [
      [2, 9, 8, 9],
      [2, 15, 8, 15],
      [24, 12, 30, 12],
      [13, 10, 19, 10],
      [13, 14, 19, 14],
    ],
  },

  // ── Fuentes ──────────────────────────────────────────────────────────
  dc_source: {
    circles: [[16, 12, 9]],
    lines: [
      [12, 12, 20, 12],
      [16, 8, 16, 16],
      [25, 12, 30, 12],
      [2, 12, 7, 12],
    ],
  },
  gnd_ref: {
    lines: [
      [16, 2, 16, 9],
      [6, 9, 26, 9],
      [9, 14, 23, 14],
      [12, 19, 20, 19],
    ],
  },

  // ── Baterias ─────────────────────────────────────────────────────────
  battery_9v: {
    lines: [
      [2, 12, 12, 12],
      [20, 12, 30, 12],
      [12, 5, 12, 19],
      [20, 8, 20, 16],
      [14, 6, 17, 6],
      [15.5, 4.5, 15.5, 7.5],
    ],
  },
  lipo_3s: {
    lines: [
      [2, 12, 12, 12],
      [20, 12, 30, 12],
      [12, 5, 12, 19],
      [20, 8, 20, 16],
      [14, 6, 17, 6],
      [15.5, 4.5, 15.5, 7.5],
    ],
  },

  // ── Conectividad ─────────────────────────────────────────────────────
  i2c_oled: {
    rects: [[3, 5, 26, 14]],
    lines: [
      [7, 9, 17, 9],
      [7, 12, 21, 12],
      [7, 15, 14, 15],
    ],
  },
  spi_flash: {
    rects: [[9, 4, 14, 16]],
    lines: [
      [13, 4, 13, 2],
      [17, 4, 17, 2],
      [13, 20, 13, 22],
      [17, 20, 17, 22],
      [9, 9, 7, 9],
      [9, 15, 7, 15],
      [23, 9, 25, 9],
      [23, 15, 25, 15],
    ],
    circles: [[20, 7, 1]],
  },
}

/** Simbolo generico: rectangulo con rombo, «bloque no especificado». */
const GENERIC: Glyph = {
  rects: [[6, 5, 20, 14]],
  lines: [
    [16, 8, 19, 12],
    [19, 12, 16, 16],
    [16, 16, 13, 12],
    [13, 12, 16, 8],
    [2, 12, 6, 12],
    [26, 12, 30, 12],
  ],
}

/** Convierte grados a radianes. */
const rad = (deg: number): number => (deg * Math.PI) / 180

export function SymbolSprite({ typeId, width = SYMBOL_WIDTH }: SymbolSpriteProps) {
  const glyph = GLYPHS[typeId] ?? GENERIC
  const points = useMemo(() => toSegmentPoints(glyph), [glyph])

  /*
   * El simbolo se centra en su componente y se escala del sistema del viewBox
   * (32 unidades) al ancho pedido en unidades de mundo.
   */
  const scale = width / VIEW_W
  const offsetX = -VIEW_W / 2
  const offsetY = -VIEW_H / 2

  return (
    <group scale={scale} position={[offsetX * scale, offsetY * scale, 0]}>
      {/*
        UN solo objeto para todo el simbolo, no uno por segmento.

        Con `segments`, drei usa LineSegments2: los puntos se interpretan por
        parejas y se dibujan en **una sola llamada de dibujo** con un unico
        material. La primera version creaba un `<Line>` por segmento —40 objetos
        con 40 shaders para 4 componentes— y medido resultaba mas caro que los
        nodos DOM que venia a sustituir.

        `lineWidth` funciona porque LineSegments2 usa LineMaterial; el `<line>`
        nativo de three lo ignora en WebGL y todas las lineas salen de 1 px.
      */}
      <Line points={points} color="var(--cf-text)" lineWidth={STROKE_WIDTH * 2} segments />
    </group>
  )
}

/**
 * Convierte la descripcion del simbolo en una lista plana de puntos por parejas.
 *
 * `<Line segments>` espera `[a1, b1, a2, b2, ...]`: cada par consecutivo es un
 * segmento independiente. Aplanar aqui permite que todo el simbolo sea un solo
 * objeto, que es lo que hace la diferencia de rendimiento.
 */
function toSegmentPoints(glyph: Glyph): [number, number, number][] {
  // El viewBox tiene el eje Y hacia abajo y la escena hacia arriba.
  const flipY = (y: number): number => VIEW_H - y
  const points: [number, number, number][] = []

  const pushSegment = (x1: number, y1: number, x2: number, y2: number): void => {
    points.push([x1, flipY(y1), 0])
    points.push([x2, flipY(y2), 0])
  }

  for (const [x1, y1, x2, y2] of glyph.lines ?? []) {
    pushSegment(x1, y1, x2, y2)
  }

  // Los rectangulos se descomponen en sus cuatro lados.
  for (const [x, y, w, h] of glyph.rects ?? []) {
    pushSegment(x, y, x + w, y)
    pushSegment(x + w, y, x + w, y + h)
    pushSegment(x + w, y + h, x, y + h)
    pushSegment(x, y + h, x, y)
  }

  // Los circulos y arcos se aproximan con segmentos de recta: a la escala del
  // lienzo, 20 segmentos por circunferencia son indistinguibles de una curva.
  const pushArc = (cx: number, cy: number, r: number, from: number, to: number): void => {
    const steps = 20
    for (let i = 0; i < steps; i++) {
      const a1 = rad(from + ((to - from) * i) / steps)
      const a2 = rad(from + ((to - from) * (i + 1)) / steps)
      pushSegment(
        cx + r * Math.cos(a1),
        cy + r * Math.sin(a1),
        cx + r * Math.cos(a2),
        cy + r * Math.sin(a2),
      )
    }
  }

  for (const [cx, cy, r] of glyph.circles ?? []) {
    pushArc(cx, cy, r, 0, 360)
  }

  for (const [cx, cy, r, from, to] of glyph.arcs ?? []) {
    pushArc(cx, cy, r, from, to)
  }

  return points
}
