/**
 * Arrastre de un componente en el lienzo.
 *
 * **Usa pointer events, no mouse events:** cubren raton, lapiz y tactil con un
 * solo camino. Con `mouse*` habria que duplicar todo para movil.
 *
 * **La posicion no se guarda aqui.** El componente de la escena NO tiene estado
 * propio de posicion: la lee del store y el arrastre llama a `moveComponent`. Si
 * se guardara localmente, el undo/redo no funcionaria y el netlist dejaria de
 * ser la fuente de verdad (D-1).
 *
 * **El desfase es lo que hace que el arrastre se sienta bien.** Si al pulsar se
 * centrara el componente bajo el cursor, saltaria. Se guarda la diferencia entre
 * el punto de pulsacion y el centro del componente, y se mantiene durante todo
 * el movimiento.
 */

import type { ThreeEvent } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'

/** Estado del arrastre que no necesita provocar un render. */
interface CaptureTarget extends EventTarget {
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
}

interface DragState {
  /** Desfase entre el punto de pulsacion y el centro del componente, en mundo. */
  offsetX: number
  offsetY: number
  /** Último cliente registrado, para poder cancelar sin perder la posición. */
  pointerId: number
}

export interface DragHandlers {
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void
}

export interface UseDragComponentOptions {
  componentId: string
  /** Posición actual del componente, leída del store. */
  position: { x: number; y: number }
  /** Selecciona el componente. Se llama al pulsar. */
  onSelect: (id: string) => void
  /** Mueve el componente a una posición **ya imantada** a la rejilla. */
  onMove: (id: string, position: { x: number; y: number }) => void
  /** Convierte un punto de pantalla a mundo, imantado. */
  toSnappedWorld: (clientX: number, clientY: number) => { x: number; y: number }
}

export interface UseDragComponentResult {
  handlers: DragHandlers
  /** `true` mientras se está arrastrando. Útil para el estilo. */
  isDragging: boolean
}

export function useDragComponent({
  componentId,
  position,
  onSelect,
  onMove,
  toSnappedWorld,
}: UseDragComponentOptions): UseDragComponentResult {
  const drag = useRef<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      // Detiene la propagación para que el lienzo no interprete el clic como un
      // clic en el vacío (que deseleccionaría justo lo que se acaba de pulsar).
      event.stopPropagation()

      const world = toSnappedWorld(event.nativeEvent.clientX, event.nativeEvent.clientY)

      drag.current = {
        // Desfase: donde estaba el componente menos donde se pulsó. Al sumarlo en
        // cada movimiento, el componente no salta al empezar a arrastrar.
        offsetX: position.x - world.x,
        offsetY: position.y - world.y,
        pointerId: event.nativeEvent.pointerId,
      }

      // La captura hace que los eventos sigan llegando al elemento aunque el
      // puntero salga de él, que es lo que permite arrastrar rápido sin perderlo.
      // La captura debe pasar por R3F para conservar también el objeto del raycast.
      ;(event.target as CaptureTarget | null)?.setPointerCapture(event.pointerId)

      onSelect(componentId)
      setIsDragging(true)
    },
    [componentId, position.x, position.y, toSnappedWorld, onSelect],
  )

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const state = drag.current
      if (state === null) return

      event.stopPropagation()

      const world = toSnappedWorld(event.nativeEvent.clientX, event.nativeEvent.clientY)
      onMove(componentId, {
        x: world.x + state.offsetX,
        y: world.y + state.offsetY,
      })
    },
    [componentId, toSnappedWorld, onMove],
  )

  const onPointerUp = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (drag.current === null) return
    event.stopPropagation()

    ;(event.target as CaptureTarget | null)?.releasePointerCapture(drag.current.pointerId)

    drag.current = null
    setIsDragging(false)
  }, [])

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp },
    isDragging,
  }
}
