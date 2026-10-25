/**
 * Geometria de pines.
 *
 * Calcula donde cae cada pin de un componente en coordenadas de mundo. Es la
 * base del cableado: un cable necesita los dos extremos exactos, y si el calculo
 * esta mal el cable sale del aire o atraviesa el simbolo.
 *
 * **Todo aqui es puro.** No toca React ni Three.js, asi que se prueba sin
 * navegador. Es la parte del cableado donde de verdad hay logica: el resto es
 * manejo de eventos.
 *
 * # Convencion de ejes
 *
 * El mundo tiene el **eje Y hacia arriba** (convencion de Three.js); la pantalla
 * lo tiene hacia abajo. Por eso una rotacion "en sentido horario" en pantalla es
 * **negativa** en matemáticas, y esa inversion esta en la formula.
 */

/** Tamano por defecto de un componente, en unidades de mundo. */
export const COMPONENT_SIZE = { width: 48, height: 36 } as const

/** Radio de la zona clicable de un pin, en unidades de mundo. */
export const PIN_HIT_RADIUS = 5

/** Posicion en coordenadas de mundo. */
export interface PinPosition {
  x: number
  y: number
}

/** Lo minimo que `pinWorldPosition` necesita saber de un componente. */
export interface PositionedComponent {
  position: {
    x: number
    y: number
    rotation: number
  }
}

/** Tamano de un componente. */
export interface ComponentSize {
  width: number
  height: number
}

/**
 * Rota un punto alrededor de un centro.
 *
 * @param point Punto a rotar.
 * @param center Centro de rotacion.
 * @param degrees Grados **en sentido horario en pantalla**. La conversion al
 *   sentido matematico (antihorario, Y hacia arriba) se hace aqui: por eso el
 *   angulo entra negado.
 */
export function rotateAround(
  point: PinPosition,
  center: PinPosition,
  degrees: number,
): PinPosition {
  if (degrees === 0) return { x: point.x, y: point.y }

  const radians = (-degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  }
}

/**
 * Posicion base de un pin con el componente SIN rotar.
 *
 * Los pines se reparten a lo largo del **borde inferior**, equiespaciados. Se
 * eligio el borde inferior y no el superior porque el nombre del componente se
 * dibuja debajo: poner los pines ahi los haria chocar con la etiqueta.
 *
 * El reparto usa `(index + 1) / (count + 1)` en vez de `index / (count - 1)`
 * para que los pines **nunca caigan en las esquinas**: con el segundo reparto,
 * un componente de dos pines los pondria justo en los vertices, y el cable
 * saldria del borde exacto del simbolo en vez de desde una zona reconocible.
 */
export function basePinPosition(
  component: PositionedComponent,
  pinIndex: number,
  pinCount: number,
  size: ComponentSize = COMPONENT_SIZE,
): PinPosition {
  const { x, y } = component.position

  if (pinCount === 0) return { x, y }

  // Fraccion a lo largo del borde: nunca 0 ni 1, siempre dentro.
  const fraction = (pinIndex + 1) / (pinCount + 1)

  return {
    x: x - size.width / 2 + size.width * fraction,
    y: y - size.height / 2,
  }
}

/**
 * Posicion de un pin en coordenadas de mundo, con la rotacion aplicada.
 *
 * @param component Componente del netlist. Solo se lee `position`.
 * @param pinIndex Indice del pin dentro del componente.
 * @param pinCount Cuantos pines tiene.
 * @param size Tamano del cuerpo. Por defecto 48 x 36.
 */
export function pinWorldPosition(
  component: PositionedComponent,
  pinIndex: number,
  pinCount: number,
  size: ComponentSize = COMPONENT_SIZE,
): PinPosition {
  const base = basePinPosition(component, pinIndex, pinCount, size)
  const center = { x: component.position.x, y: component.position.y }
  return rotateAround(base, center, component.position.rotation)
}

/**
 * Posicion del pin de un componente del proyecto, buscandolo por su id.
 *
 * Es la funcion que usa el cableado: `PinEndpoint` identifica el pin por
 * `componentId` + `pinId`, y aqui se traduce a coordenadas.
 *
 * @returns La posicion, o `null` si el componente o el pin no existen. Devolver
 *   `null` en vez de lanzar permite dibujar un cable huerfano sin romper la
 *   escena: un net puede referenciar un pin que ya no esta si el proyecto viene
 *   de una fuente externa.
 */
export function pinPositionOf(
  components: readonly {
    id: string
    position: { x: number; y: number; rotation: number }
    pins: readonly { pinId: string }[]
  }[],
  componentId: string,
  pinId: string,
  size: ComponentSize = COMPONENT_SIZE,
): PinPosition | null {
  const component = components.find((c) => c.id === componentId)
  if (!component) return null

  const index = component.pins.findIndex((p) => p.pinId === pinId)
  if (index === -1) return null

  return pinWorldPosition(component, index, component.pins.length, size)
}

/**
 * Punto de control de la curva de un cable.
 *
 * Un cable recto entre dos pines que estan a la misma altura se confunde con una
 * pista de la reticula; uno que sale en vertical y luego gira se lee como un
 * cable. El punto de control se desplaza **hacia abajo** porque los pines viven
 * en el borde inferior: el cable sale del pin, cae, y va al otro.
 *
 * La altura del codo crece con la distancia horizontal, con un tope: en un cable
 * corto un codo grande haria un rizo absurdo.
 */
export function wireControlPoint(from: PinPosition, to: PinPosition): PinPosition {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)

  // El codo crece con la distancia pero no pasa de 90 unidades.
  const sag = Math.min(24 + distance * 0.35, 90)

  return {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - sag,
  }
}

/**
 * Convierte un punto de control en los puntos de una curva de Bezier cuadratica.
 *
 * Se muestrea la curva en vez de usar una primitiva de curva porque el cable se
 * dibuja con `<Line>` de drei, que consume listas de puntos. Con 24 muestras la
 * curva es indistinguible de una real a la escala del lienzo.
 */
export function sampleQuadraticBezier(
  from: PinPosition,
  control: PinPosition,
  to: PinPosition,
  segments = 24,
): [number, number, number][] {
  const points: [number, number, number][] = []

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const inv = 1 - t

    // Bezier cuadratica: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const x = inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x
    const y = inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y

    points.push([x, y, 0])
  }

  return points
}
