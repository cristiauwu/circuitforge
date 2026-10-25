/**
 * Un componente colocado en la escena.
 *
 * **Lee su posicion del store, no la guarda.** El netlist es la fuente de verdad
 * (D-1): arrastrar actualiza el proyecto y el render es consecuencia. Guardar la
 * posicion aqui romperia el undo/redo y crearia dos verdades que se desincronizan.
 */

/*
 * El componente de texto de drei se importa con ALIAS.
 *
 * `Text` a secas colisiona con el constructor `Text` del DOM: en el JSX, React
 * resolvia el global del navegador en vez del import y lanzaba
 * `Failed to construct 'Text': Please use the 'new' operator`. El alias elimina
 * la ambiguedad y deja claro en cada uso que es el de la escena 3D.
 */
import { Text as SceneText } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useCallback } from 'react'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { CATALOG_INDEX } from '@/lib/fixtures/components'
import { basePinPosition } from './pinGeometry'
import { ScenePin } from './ScenePin'
import { SymbolSprite } from './SymbolSprite'
import { resolveTokenColor } from './tokenColor'
import { useDragComponent } from './useDragComponent'
import type { OrthoCamera, Viewport } from './useGridSnap'
import { screenToSnappedWorld } from './useGridSnap'
import { useWiring } from './useWiring'

export interface SceneComponentProps {
  componentId: string
  camera: OrthoCamera
  viewport: Viewport
}

export function SceneComponent({ componentId, camera, viewport }: SceneComponentProps) {
  const component = useEditorStore((s) => s.project.components.find((c) => c.id === componentId))
  const isSelected = useEditorStore((s) => s.selectedId === componentId)
  const moveComponent = useEditorStore((s) => s.moveComponent)
  const selectComponent = useEditorStore((s) => s.selectComponent)

  /**
   * Nombre legible del componente, tomado de la ficha de la biblioteca.
   *
   * Se lee de la ficha y no del netlist: `Component` solo guarda `id` y `typeId`,
   * porque el nombre es una etiqueta de presentacion, no un dato del circuito.
   * Guardarlo en el netlist duplicaria lo que ya dice la biblioteca y abriria la
   * puerta a que se desincronicen.
   */
  const fixtureName = component ? CATALOG_INDEX.get(component.typeId)?.name : undefined

  /**
   * Conversion a mundo imantado.
   *
   * El rectangulo del canvas no empieza en (0,0) de la pantalla: hay que restar
   * su origen, o el arrastre se desviaria exactamente lo que mida la cabecera y
   * los paneles laterales.
   */
  const toSnappedWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = document.querySelector('[data-testid="circuit-canvas"] canvas')
      const rect = canvas?.getBoundingClientRect()
      const localX = clientX - (rect?.left ?? 0)
      const localY = clientY - (rect?.top ?? 0)
      return screenToSnappedWorld({ x: localX, y: localY }, camera, viewport)
    },
    [camera, viewport],
  )

  const wiring = useWiring()

  const onSelect = useCallback((id: string) => selectComponent(id), [selectComponent])

  const { handlers, isDragging } = useDragComponent({
    componentId,
    position: component?.position ?? { x: 0, y: 0 },
    onSelect,
    onMove: moveComponent,
    toSnappedWorld,
  })

  if (!component) return null

  const rotationRadians = (component.position.rotation * Math.PI) / 180

  return (
    <group
      position={[component.position.x, component.position.y, 0]}
      rotation={[0, 0, rotationRadians]}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
    >
      {/*
        Zona de impacto del arrastre.

        El simbolo se dibuja con `<Html>`, que vive en el DOM y no participa del
        raycasting de Three.js. Sin una malla invisible detras, no habria nada
        que pulsar: el clic atravesaria el componente y llegaria al lienzo.
      */}
      <mesh>
        <planeGeometry args={[HIT_WIDTH, HIT_HEIGHT]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          // Sin esto, la malla invisible seguiria escribiendo en el buffer de
          // profundidad y ocultaria los cables que pasan por detras.
        />
      </mesh>

      {/* Contorno de seleccion */}
      {isSelected && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[HIT_WIDTH + 8, HIT_HEIGHT + 8]} />
          <meshBasicMaterial
            color={resolveTokenColor('--cf-accent', 0xff6b35)}
            transparent
            opacity={0.18}
          />
        </mesh>
      )}

      <SymbolSprite typeId={component.typeId} />

      {/*
        Pines clicables.

        Se dibujan DENTRO del grupo del componente, asi que heredan su rotacion y
        su posicion: al rotar el componente los pines rotan con el sin ningun
        calculo extra. La posicion de cada uno sale de `basePinPosition` en
        coordenadas LOCALES (relativas al centro), que es justo lo que `<group>`
        espera.

        Orden importante: van DESPUES del simbolo y de la malla de impacto. En
        Three.js el orden de dibujo a igual profundidad lo decide el orden en el
        arbol, y los pines deben quedar por encima del cuerpo para poder pulsarlos.
      */}
      {component.pins.map((pin, index) => {
        const local = basePinPosition(
          { position: { x: 0, y: 0, rotation: 0 } },
          index,
          component.pins.length,
        )
        const endpoint = { componentId: component.id, pinId: pin.pinId }

        return (
          <ScenePin
            key={pin.pinId}
            endpoint={endpoint}
            position={[local.x, local.y, 0.2]}
            isPending={
              wiring.pending?.componentId === component.id && wiring.pending?.pinId === pin.pinId
            }
            isConnected={pin.netId !== null}
            wiring={wiring.pending !== null}
            onActivate={wiring.onPinClick}
          />
        )
      })}

      {/*
        Identificador del componente (R1, D1, U1...).

        Es el `reference designator` de la notacion esquematica: sin el, un plano
        con veinte componentes es ilegible porque no hay forma de nombrarlos. Se
        dibuja con `<SceneText>` de drei, que lo rasteriza en la escena —a diferencia
        de `<Html>`, no crea nodo DOM ni cuesta 60 ms por frame.

        Va ARRIBA del cuerpo, como en cualquier esquematico, no dentro: dentro
        chocaria con el simbolo.
      */}
      <SceneText
        position={[0, HIT_HEIGHT / 2 + 6, 0.1]}
        fontSize={11}
        color={resolveTokenColor('--cf-signal', 0x22d3ee)}
        anchorX="center"
        anchorY="middle"
        // Sin esto, el texto se dibuja con el material por defecto y puede quedar
        // detras de la malla del cuerpo segun el orden de dibujo.
        depthOffset={-1}
        // El texto no intercepta el puntero: el arrastre lo captura la malla.
        raycast={() => null}
      >
        {component.id}
      </SceneText>

      {/*
        Nombre del componente, DEBAJO del cuerpo.

        Se lee de la ficha y no del netlist: `Component` solo guarda `id` y
        `typeId`, porque el nombre es una etiqueta de presentacion, no un dato del
        circuito. Guardarlo en el netlist seria duplicar lo que ya dice la
        biblioteca y abriria la puerta a que se desincronicen.

        En el lienzo SVG anterior el nombre iba DENTRO y colisionaba con las
        etiquetas de los pines (medido: la misma franja). Debajo no hay nada.
      */}
      {fixtureName !== undefined && (
        <SceneText
          position={[0, -HIT_HEIGHT / 2 - 7, 0.1]}
          fontSize={9}
          color={resolveTokenColor('--cf-text-muted', 0x6b6b70)}
          anchorX="center"
          anchorY="middle"
          depthOffset={-1}
          raycast={() => null}
        >
          {fixtureName}
        </SceneText>
      )}

      {/* Marca de arrastre: atenua el simbolo mientras se mueve */}
      {isDragging && (
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[HIT_WIDTH, HIT_HEIGHT]} />
          <meshBasicMaterial
            color={resolveTokenColor('--cf-accent', 0xff6b35)}
            transparent
            opacity={0.08}
          />
        </mesh>
      )}
    </group>
  )
}

/** Zona de impacto del arrastre, en unidades de mundo (2 x 1.5 celdas). */
const HIT_WIDTH = 48
const HIT_HEIGHT = 36

/** Tipo de los handlers de three para el grupo. */
export type GroupPointerHandler = (event: ThreeEvent<PointerEvent>) => void
