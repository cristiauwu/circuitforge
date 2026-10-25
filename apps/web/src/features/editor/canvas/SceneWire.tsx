/**
 * Un cable entre dos pines.
 *
 * Se dibuja como curva de Bezier cuadratica, no como linea recta. No es solo
 * estetica: un cable recto entre dos pines que estan a la misma altura se
 * confunde con una pista de la reticula del lienzo. La curva lo hace legible como
 * cable de inmediato.
 *
 * **Los extremos se recalculan en cada render desde las posiciones de los
 * componentes.** El cable no guarda sus puntos: si el usuario arrastra un
 * componente o lo rota, el cable sigue solo, porque el netlist es la fuente de
 * verdad y el cable es una vista derivada. Guardar los puntos obligaria a
 * mantenerlos sincronizados a mano.
 *
 * # Los tres bugs que hicieron invisible este cable
 *
 * Costo encontrar por que un cable con geometria correcta y material correcto no
 * se veia. Los tres eran independientes y ninguno daba error:
 *
 *  1. **El color.** Se pasaba `'var(--cf-accent)'` al material. `LineMaterial` es
 *     un shader: no entiende CSS y cae al blanco por defecto. Medido: el material
 *     tenia `#ffffff`. Se resuelve con `resolveTokenColor`.
 *
 *  2. **El grosor.** Con `linewidth: 2.4` el cable no se veia; con 4 si. El
 *     grosor se mide en pixeles de la resolucion del material, y 2.4 px de
 *     naranja sobre fondo casi negro queda por debajo del umbral perceptible,
 *     sobre todo al lado de una reticula de lineas claras. Ahora son 5 px.
 *
 *  3. **La falta de invalidacion.** Este es el sutil. El lienzo usa
 *     `frameloop="demand"`, asi que **solo dibuja cuando algo lo invalida**. Drei
 *     calcula la geometria de la linea en un efecto que corre DESPUES del render
 *     del montaje: cuando la escena se dibujo, la geometria todavia no existia, y
 *     nada invalidaba despues. El cable quedaba en la escena, con su material
 *     correcto, **sin haberse dibujado nunca**.
 *
 *     Se confirmo midiendo: forzar `material.needsUpdate = true` **sin cambiar
 *     ningun valor** hacia aparecer el cable. La senal de que el problema no era
 *     el material sino que no se estaba pintando.
 *
 *     La correccion es invalidar explicitamente cuando cambian los puntos.
 */

import { Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { pinPositionOf, sampleQuadraticBezier, wireControlPoint } from './pinGeometry'

/** Componente minimo que el cable necesita para calcular sus extremos. */
export interface WireComponent {
  id: string
  position: { x: number; y: number; rotation: number }
  pins: readonly { pinId: string }[]
}

export interface SceneWireProps {
  components: readonly WireComponent[]
  from: { componentId: string; pinId: string }
  to: { componentId: string; pinId: string }
  /**
   * Color del cable, resuelto a un entero con `resolveTokenColor`.
   *
   * **No acepta un token CSS a proposito.** Three.js no los entiende: recibe un
   * color numerico y una cadena `var(...)` le hace escribir
   * `THREE.Color: Unknown color model` y caer a un valor por defecto. Aceptar la
   * cadena aqui invitaria a repetir el error; exigir el entero obliga a resolverlo
   * donde corresponde.
   */
  color?: number
  /** Resalta el cable (por ejemplo, al pasar el raton por encima). */
  emphasis?: boolean
}

/** Radio del pin, para que el cable nazca en el borde del circulo y no en su centro. */
const PIN_RADIUS = 5

/**
 * Grosor del cable, en pixeles.
 *
 * 5 es el punto donde el cable se lee como el elemento principal del esquematico,
 * que es lo que debe ser: la conexion. Medido: por debajo de 4 desaparece.
 */
const WIRE_WIDTH = 5

/** Grosor cuando el cable esta resaltado. */
const WIRE_WIDTH_EMPHASIS = 7

/** Color de respaldo si el token no se puede resolver. Es el acento del sistema. */
const FALLBACK_COLOR = 0xff6b35

export function SceneWire({
  components,
  from,
  to,
  color = FALLBACK_COLOR,
  emphasis = false,
}: SceneWireProps) {
  /** Invalida la escena: con `frameloop="demand"` es lo que dispara el dibujo. */
  const invalidate = useThree((s) => s.invalidate)

  const points = useMemo(() => {
    const start = pinPositionOf(components, from.componentId, from.pinId)
    const end = pinPositionOf(components, to.componentId, to.pinId)

    // Un net puede referenciar un pin que ya no existe si el proyecto viene de
    // fuera. En ese caso no se dibuja nada en vez de romper la escena: el
    // validador (V-3) es quien reporta el problema.
    if (start === null || end === null) return null

    // El cable se separa un poco del centro del pin para no taparlo.
    const direction = Math.atan2(end.y - start.y, end.x - start.x)
    const offsetStart = {
      x: start.x + Math.cos(direction) * PIN_RADIUS,
      y: start.y + Math.sin(direction) * PIN_RADIUS,
    }
    const offsetEnd = {
      x: end.x - Math.cos(direction) * PIN_RADIUS,
      y: end.y - Math.sin(direction) * PIN_RADIUS,
    }

    const control = wireControlPoint(offsetStart, offsetEnd)
    return sampleQuadraticBezier(offsetStart, control, offsetEnd, 28)
  }, [components, from.componentId, from.pinId, to.componentId, to.pinId])

  /**
   * Invalidacion del cable recien creado.
   *
   * # Por que existe: el cable no aparecia hasta el siguiente re-render
   *
   * Confirmado midiendo: tras crear el net, el cable **no se dibujaba**; al mover
   * un componente —que provoca un render completo— aparecia. La senal de que el
   * problema era de tiempo, no de geometria ni de material.
   *
   * La causa es la combinacion de dos cosas:
   *
   *  1. Drei construye la geometria de la linea en un `useMemo` que depende de
   *     `points`. Al crear el net, ese trabajo corre **despues** del render.
   *  2. El lienzo usa `frameloop="demand"`: sin una invalidacion explicita, three
   *     no vuelve a dibujar. El trabajo del `useMemo` no cuenta como invalidacion.
   *
   * Resultado: el objeto existe en la escena, con su geometria, y nunca se pinta.
   *
   * # Por que dos invalidaciones
   *
   * La primera recoge el caso normal. La segunda, en el fotograma siguiente, es
   * la que importa: drei termina de construir la geometria en su propio efecto, y
   * ese cambio necesita **su** render. Una sola no basta — se probo.
   *
   * El coste es dibujar dos veces una escena que ya estaba en pantalla: nada.
   */
  /*
   * `points` esta en las dependencias A PROPOSITO, aunque el cuerpo no lo lea.
   *
   * Es la unica forma de que el efecto vuelva a correr cuando se crea un cable:
   * `points` pasa de `null` a la lista al aparecer los dos pines, y ese cambio es
   * justo el que necesita su invalidacion. Quitarlo —que es lo que pide la
   * regla— haria que el cable volviera a no dibujarse nunca.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `points` dispara la invalidacion al crearse el cable
  useEffect(() => {
    invalidate()
    const raf = requestAnimationFrame(() => invalidate())
    return () => cancelAnimationFrame(raf)
  }, [invalidate, points])

  if (points === null) return null

  return (
    <Line
      points={points}
      color={color}
      lineWidth={emphasis ? WIRE_WIDTH_EMPHASIS : WIRE_WIDTH}
      /*
       * El cable se dibuja POR ENCIMA del resto.
       *
       * Vive en z = 0, la misma profundidad que la malla de impacto del
       * componente, asi que el test de profundidad podia descartarlo. `depthTest:
       * false` es la solucion directa y ademas es lo correcto en un esquematico:
       * un cable SIEMPRE debe verse, porque es la conexion.
       */
      depthTest={false}
      renderOrder={10}
      transparent
      opacity={emphasis ? 1 : 0.95}
    />
  )
}
