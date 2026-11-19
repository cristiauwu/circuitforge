/**
 * @circuitforge/web — FSM Determinista para Trazado de Cables y Gestos (Tarea T-3).
 *
 * Formaliza la máquina de estados finitos que gobierna las interacciones de montaje,
 * trazado de cables eléctricos, atracción magnética a terminales y manipulación 3D.
 *
 * Invariante no negociable: Ningún evento de puntero fuera de límites, pérdida de foco
 * (blur) o pulsación de Escape puede dejar cables huérfanos o estados inconsistentes.
 */

import type { PinEndpoint } from '@circuitforge/netlist'
import type { CanvasPosition } from '@/lib/editor/useEditorStore'

// ─── Estados Finitos (Union Discriminada) ───────────────────────────────────

export type EditorFSMState =
  | { readonly type: 'IDLE' }
  | {
      readonly type: 'HOVERING_PIN'
      readonly endpoint: PinEndpoint
      readonly snapPosition?: CanvasPosition | undefined
    }
  | {
      readonly type: 'DRAGGING_WIRE'
      readonly from: PinEndpoint
      readonly currentPosition: CanvasPosition
      readonly hoverTarget?: PinEndpoint | null | undefined
      readonly error?: string | null | undefined
    }
  | {
      readonly type: 'SNAPPED_MAGNETIC'
      readonly from: PinEndpoint
      readonly to: PinEndpoint
      readonly snapPosition: CanvasPosition
    }
  | {
      readonly type: 'DRAGGING_COMPONENT'
      readonly componentId: string
      readonly initialPosition: CanvasPosition
      readonly currentPosition: CanvasPosition
    }
  | {
      readonly type: 'MOUNTING_PART'
      readonly componentId: string
      readonly boardId: string
      readonly targetContactId: string
    }

// ─── Eventos del Grafo de Interacción ───────────────────────────────────────

export type EditorFSMEvent =
  | {
      readonly kind: 'PIN_HOVER'
      readonly endpoint: PinEndpoint
      readonly position?: CanvasPosition | undefined
    }
  | { readonly kind: 'PIN_UNHOVER'; readonly endpoint: PinEndpoint }
  | { readonly kind: 'PIN_CLICK'; readonly endpoint: PinEndpoint }
  | {
      readonly kind: 'WIRE_MOVE'
      readonly position: CanvasPosition
      readonly hoverTarget?: PinEndpoint | null | undefined
    }
  | {
      readonly kind: 'MAGNETIC_SNAP'
      readonly targetEndpoint: PinEndpoint
      readonly snapPosition: CanvasPosition
    }
  | { readonly kind: 'MAGNETIC_UNSNAP'; readonly position: CanvasPosition }
  | {
      readonly kind: 'COMPONENT_DRAG_START'
      readonly componentId: string
      readonly position: CanvasPosition
    }
  | { readonly kind: 'COMPONENT_DRAG_MOVE'; readonly position: CanvasPosition }
  | { readonly kind: 'COMPONENT_DRAG_END' }
  | {
      readonly kind: 'MOUNT_START'
      readonly componentId: string
      readonly boardId: string
      readonly targetContactId: string
    }
  | { readonly kind: 'MOUNT_END' }
  | { readonly kind: 'ESCAPE' }
  | { readonly kind: 'WINDOW_BLUR' }
  | { readonly kind: 'POINTER_CANCEL' }

export interface ConnectResult {
  readonly ok: boolean
  readonly message?: string | undefined
}

export type ConnectFunction = (from: PinEndpoint, to: PinEndpoint) => ConnectResult

export function isSamePin(a: PinEndpoint, b: PinEndpoint): boolean {
  return a.componentId === b.componentId && a.pinId === b.pinId
}

export const INITIAL_FSM_STATE: EditorFSMState = Object.freeze({ type: 'IDLE' })

function transitionFromIdle(
  state: EditorFSMState & { type: 'IDLE' },
  event: EditorFSMEvent,
): EditorFSMState {
  if (event.kind === 'PIN_HOVER') {
    return Object.freeze({
      type: 'HOVERING_PIN',
      endpoint: event.endpoint,
      snapPosition: event.position,
    })
  }
  if (event.kind === 'PIN_CLICK') {
    return Object.freeze({
      type: 'DRAGGING_WIRE',
      from: event.endpoint,
      currentPosition: { x: 0, y: 0 },
      error: null,
    })
  }
  if (event.kind === 'COMPONENT_DRAG_START') {
    return Object.freeze({
      type: 'DRAGGING_COMPONENT',
      componentId: event.componentId,
      initialPosition: event.position,
      currentPosition: event.position,
    })
  }
  if (event.kind === 'MOUNT_START') {
    return Object.freeze({
      type: 'MOUNTING_PART',
      componentId: event.componentId,
      boardId: event.boardId,
      targetContactId: event.targetContactId,
    })
  }
  return state
}

function transitionFromHoveringPin(
  state: EditorFSMState & { type: 'HOVERING_PIN' },
  event: EditorFSMEvent,
): EditorFSMState {
  if (event.kind === 'PIN_UNHOVER' && isSamePin(state.endpoint, event.endpoint)) {
    return INITIAL_FSM_STATE
  }
  if (event.kind === 'PIN_HOVER') {
    return Object.freeze({
      type: 'HOVERING_PIN',
      endpoint: event.endpoint,
      snapPosition: event.position,
    })
  }
  if (event.kind === 'PIN_CLICK') {
    return Object.freeze({
      type: 'DRAGGING_WIRE',
      from: event.endpoint,
      currentPosition: state.snapPosition ?? { x: 0, y: 0 },
      error: null,
    })
  }
  if (event.kind === 'COMPONENT_DRAG_START') {
    return Object.freeze({
      type: 'DRAGGING_COMPONENT',
      componentId: event.componentId,
      initialPosition: event.position,
      currentPosition: event.position,
    })
  }
  return state
}

function transitionFromDraggingWire(
  state: EditorFSMState & { type: 'DRAGGING_WIRE' },
  event: EditorFSMEvent,
  connect?: ConnectFunction,
): EditorFSMState {
  if (event.kind === 'WIRE_MOVE') {
    return Object.freeze({
      ...state,
      currentPosition: event.position,
      hoverTarget: event.hoverTarget ?? null,
    })
  }
  if (event.kind === 'MAGNETIC_SNAP') {
    return Object.freeze({
      type: 'SNAPPED_MAGNETIC',
      from: state.from,
      to: event.targetEndpoint,
      snapPosition: event.snapPosition,
    })
  }
  if (event.kind === 'PIN_CLICK') {
    if (isSamePin(state.from, event.endpoint)) {
      return INITIAL_FSM_STATE
    }
    if (connect) {
      const outcome = connect(state.from, event.endpoint)
      if (outcome.ok) {
        return INITIAL_FSM_STATE
      }
      return Object.freeze({
        ...state,
        hoverTarget: null,
        error: outcome.message ?? 'Conexión eléctrica incompatible.',
      })
    }
    return INITIAL_FSM_STATE
  }
  return state
}

function transitionFromSnappedMagnetic(
  state: EditorFSMState & { type: 'SNAPPED_MAGNETIC' },
  event: EditorFSMEvent,
  connect?: ConnectFunction,
): EditorFSMState {
  if (event.kind === 'MAGNETIC_UNSNAP') {
    return Object.freeze({
      type: 'DRAGGING_WIRE',
      from: state.from,
      currentPosition: event.position,
      hoverTarget: null,
      error: null,
    })
  }
  if (event.kind === 'WIRE_MOVE') {
    return Object.freeze({
      type: 'DRAGGING_WIRE',
      from: state.from,
      currentPosition: event.position,
      hoverTarget: event.hoverTarget ?? null,
      error: null,
    })
  }
  if (event.kind === 'PIN_CLICK') {
    if (isSamePin(state.from, event.endpoint)) {
      return INITIAL_FSM_STATE
    }
    if (connect) {
      const outcome = connect(state.from, event.endpoint)
      if (outcome.ok) {
        return INITIAL_FSM_STATE
      }
      return Object.freeze({
        type: 'DRAGGING_WIRE',
        from: state.from,
        currentPosition: state.snapPosition,
        hoverTarget: null,
        error: outcome.message ?? 'Conexión eléctrica incompatible.',
      })
    }
    return INITIAL_FSM_STATE
  }
  return state
}

function transitionFromDraggingComponent(
  state: EditorFSMState & { type: 'DRAGGING_COMPONENT' },
  event: EditorFSMEvent,
): EditorFSMState {
  if (event.kind === 'COMPONENT_DRAG_MOVE') {
    return Object.freeze({
      ...state,
      currentPosition: event.position,
    })
  }
  if (event.kind === 'COMPONENT_DRAG_END') {
    return INITIAL_FSM_STATE
  }
  return state
}

function transitionFromMountingPart(
  state: EditorFSMState & { type: 'MOUNTING_PART' },
  event: EditorFSMEvent,
): EditorFSMState {
  if (event.kind === 'MOUNT_END') {
    return INITIAL_FSM_STATE
  }
  return state
}

/**
 * Función pura de transición de la FSM de interacción del editor.
 */
export function transitionFSM(
  state: EditorFSMState,
  event: EditorFSMEvent,
  connect?: ConnectFunction,
): EditorFSMState {
  if (event.kind === 'ESCAPE' || event.kind === 'WINDOW_BLUR' || event.kind === 'POINTER_CANCEL') {
    return INITIAL_FSM_STATE
  }

  switch (state.type) {
    case 'IDLE':
      return transitionFromIdle(state, event)
    case 'HOVERING_PIN':
      return transitionFromHoveringPin(state, event)
    case 'DRAGGING_WIRE':
      return transitionFromDraggingWire(state, event, connect)
    case 'SNAPPED_MAGNETIC':
      return transitionFromSnappedMagnetic(state, event, connect)
    case 'DRAGGING_COMPONENT':
      return transitionFromDraggingComponent(state, event)
    case 'MOUNTING_PART':
      return transitionFromMountingPart(state, event)
  }
}

/**
 * Gestor reactivo de la FSM de interacción con historial y callbacks.
 */
export function createEditorFSM(
  connect?: ConnectFunction,
  onStateChange?: (state: EditorFSMState) => void,
) {
  let currentState: EditorFSMState = INITIAL_FSM_STATE

  return {
    getState: (): EditorFSMState => currentState,

    dispatch(event: EditorFSMEvent): EditorFSMState {
      const nextState = transitionFSM(currentState, event, connect)
      if (nextState !== currentState) {
        currentState = nextState
        onStateChange?.(currentState)
      }
      return currentState
    },

    reset(): void {
      currentState = INITIAL_FSM_STATE
      onStateChange?.(currentState)
    },
  }
}
