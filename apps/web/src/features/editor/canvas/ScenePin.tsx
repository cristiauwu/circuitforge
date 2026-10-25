/**
 * Un pin clicable en la escena.
 *
 * Es el punto de conexion: el usuario pulsa uno, luego otro, y se crea el cable.
 *
 * # Por que una malla y no el trazo del simbolo
 *
 * El simbolo se dibuja con `<Line>` de drei, que por dentro usa `Line2`: un
 * objeto de lineas con su propio material, y **no participa bien del raycasting**
 * de Three.js para zonas de tamaño fiable. Un objetivo de 5 unidades de radio en
 * una linea de 2 px de grosor es practicamente imposible de pulsar. Por eso el
 * pin lleva una **malla circular invisible** encima: es lo que da un area de
 * impacto comoda.
 *
 * # El clic no debe arrastrar
 *
 * `stopPropagation` es imprescindible. Sin el, el pointerdown llega al grupo del
 * componente, que empieza un arrastre: el usuario intenta cablear y mueve el
 * componente de sitio. Es el tipo de fallo que hace que la funcion parezca "no
 * funcionar" cuando en realidad funciona mal.
 */

import type { PinEndpoint } from '@circuitforge/netlist'
import type { ThreeEvent } from '@react-three/fiber'
import { PIN_HIT_RADIUS } from './pinGeometry'
import { resolveTokenColor } from './tokenColor'

/**
 * Colores de pin, resueltos de los tokens del sistema.
 *
 * Se resuelven UNA vez a nivel de modulo y no en cada render: `getComputedStyle`
 * fuerza recalculo de estilos, y con 22 componentes por 5 pines serian cientos de
 * lecturas por fotograma. El valor de un token no cambia en toda la sesion.
 *
 * **Por que hay que resolverlos:** Three.js no entiende `var(--cf-accent)`. Sin
 * esto, cada pin escribia `THREE.Color: Unknown color model` en consola y caia a
 * un color por defecto.
 */
const COLORS = {
  accent: resolveTokenColor('--cf-accent', 0xff6b35),
  signal: resolveTokenColor('--cf-signal', 0x22d3ee),
  muted: resolveTokenColor('--cf-text-muted', 0x6b6b70),
  text: resolveTokenColor('--cf-text', 0xdddee3),
} as const

export interface ScenePinProps {
  endpoint: PinEndpoint
  /** Posicion local dentro del grupo del componente. */
  position: [number, number, number]
  /** `true` si es el pin de origen del cableado en curso. */
  isPending: boolean
  /** `true` si ya pertenece a un net. */
  isConnected: boolean
  /** `true` si un cable esta en curso (para mostrar los destinos posibles). */
  wiring: boolean
  onActivate: (endpoint: PinEndpoint) => void
}

export function ScenePin({
  endpoint,
  position,
  isPending,
  isConnected,
  wiring,
  onActivate,
}: ScenePinProps) {
  /**
   * Radio visual del punto.
   *
   * El pin de origen se agranda y los demas se atenuan mientras se cablea: asi el
   * usuario ve donde empezo y donde puede terminar sin tener que recordarlo.
   */
  const radius = isPending ? PIN_HIT_RADIUS * 1.15 : PIN_HIT_RADIUS * 0.62

  const color = isPending ? COLORS.accent : isConnected ? COLORS.signal : COLORS.muted

  const opacity = isPending ? 1 : wiring ? 0.85 : isConnected ? 0.9 : 0.55

  return (
    <group position={position}>
      {/*
        Malla de impacto. Es invisible a proposito: lo que se ve es el circulo de
        abajo; esto solo existe para que el clic tenga un area razonable.

        `biome-ignore` es un falso positivo documentado: la regla
        `noStaticElementInteractions` existe para elementos HTML sin rol, y aqui
        el elemento es un `<mesh>` de Three.js. No es un nodo del DOM, no entra en
        el arbol de accesibilidad y no acepta `role` ni `tabIndex`. La
        accesibilidad del cableado se resuelve en HTML —el aviso con
        `role="status"` y el boton de cancelar—, no en la escena 3D.
      */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: <mesh> de Three.js no es un elemento DOM ni acepta rol */}
      <mesh
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          // Detiene el evento para que NO llegue al grupo del componente y no
          // empiece un arrastre.
          event.stopPropagation()
          event.nativeEvent.stopPropagation()
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation()
          onActivate(endpoint)
        }}
      >
        <circleGeometry args={[PIN_HIT_RADIUS, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Punto visible */}
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[radius, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>

      {/*
        Halo del pin de origen: un anillo que lo distingue de los demas y que
        comunica "el cable empieza aqui".
      */}
      {isPending && (
        <mesh position={[0, 0, 0.04]}>
          <ringGeometry args={[PIN_HIT_RADIUS * 1.3, PIN_HIT_RADIUS * 1.7, 24]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}

      {/*
        Punto de destino posible: mientras se cablea, los pines libres ganan un
        aro tenue que dice "aqui puedo llegar".
      */}
      {wiring && !isPending && (
        <mesh position={[0, 0, 0.04]}>
          <ringGeometry args={[PIN_HIT_RADIUS * 0.95, PIN_HIT_RADIUS * 1.25, 20]} />
          <meshBasicMaterial color={COLORS.text} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
