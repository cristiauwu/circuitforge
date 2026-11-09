import type { ParamValue, PinEndpoint, Project, Rotation } from '@circuitforge/netlist'
import {
  EMPTY_WIRING,
  type PinClickOutcome,
  resolvePinClick,
  type WiringState,
} from '@/features/editor/canvas/wiringState'
import {
  type CanvasPosition,
  selectCanRedo,
  selectCanUndo,
  useEditorStore,
} from '@/lib/editor/useEditorStore'
import { isEditableType } from './capabilities'
import { findProjectPosition } from './editorProjection'

export interface ProjectSnapshot {
  readonly project: Project
  readonly selectedId: string | null
  readonly wiring: WiringState
  readonly preview: Readonly<{
    componentId: string
    position: Readonly<CanvasPosition>
  }> | null
  readonly canUndo: boolean
  readonly canRedo: boolean
}

const finitePosition = (position: CanvasPosition): boolean =>
  Number.isFinite(position.x) && Number.isFinite(position.y)

/** DOM-free adapter: persistent edits belong to the shared store, gestures do not. */
export function createProjectController(
  onChange: (snapshot: ProjectSnapshot) => void,
  onMessage?: (message: string) => void,
) {
  let wiring: WiringState = EMPTY_WIRING
  let preview: ProjectSnapshot['preview'] = null
  let disposed = false
  let batchDepth = 0

  const hasPin = (project: Project, endpoint: PinEndpoint): boolean =>
    project.components.some(
      (component) =>
        component.id === endpoint.componentId &&
        component.pins.some((pin) => pin.pinId === endpoint.pinId),
    )

  function readSnapshot(): ProjectSnapshot {
    const state = useEditorStore.getState()
    if (wiring.pending && !hasPin(state.project, wiring.pending)) wiring = EMPTY_WIRING
    if (preview && !state.project.components.some((c) => c.id === preview?.componentId)) {
      preview = null
    }
    return Object.freeze({
      project: state.project,
      selectedId: state.project.components.some((c) => c.id === state.selectedId)
        ? state.selectedId
        : null,
      wiring,
      preview,
      canUndo: selectCanUndo(state),
      canRedo: selectCanRedo(state),
    })
  }

  let snapshot = readSnapshot()

  function publish() {
    if (disposed || batchDepth > 0) return
    const next = readSnapshot()
    if (
      next.project === snapshot.project &&
      next.selectedId === snapshot.selectedId &&
      next.wiring === snapshot.wiring &&
      next.preview === snapshot.preview &&
      next.canUndo === snapshot.canUndo &&
      next.canRedo === snapshot.canRedo
    )
      return
    snapshot = next
    onChange(snapshot)
  }

  // Store actions notify synchronously. Publish only after the whole gesture transition,
  // particularly connectPins, has finished updating its local wiring state.
  function batch<T>(action: () => T): T {
    batchDepth += 1
    try {
      return action()
    } finally {
      batchDepth -= 1
      publish()
    }
  }

  const unsubscribe = useEditorStore.subscribe(publish)

  function clearTransient() {
    wiring = EMPTY_WIRING
    preview = null
  }

  return {
    getSnapshot: (): ProjectSnapshot => snapshot,

    add(typeId: string, position?: CanvasPosition): string | null {
      if (disposed || !isEditableType(typeId)) return null
      const target =
        position ?? findProjectPosition(useEditorStore.getState().project.components, typeId)
      if (!finitePosition(target)) return null
      return batch(() => {
        preview = null
        return useEditorStore.getState().addComponent(typeId, target)
      })
    },

    mountComponent(
      componentId: string,
      boardId: string,
      anchorContactId: string,
      rotation: Rotation = 0,
    ) {
      if (disposed) return { ok: false, error: 'Editor cerrado.' }
      return batch(() => {
        clearTransient()
        return useEditorStore
          .getState()
          .mountComponent(componentId, boardId, anchorContactId, rotation)
      })
    },

    unmountComponent(componentId: string) {
      if (disposed) return { ok: false, error: 'Editor cerrado.' }
      return batch(() => {
        clearTransient()
        return useEditorStore.getState().unmountComponent(componentId)
      })
    },

    updateParameter(componentId: string, name: string, value: ParamValue) {
      if (disposed) return { ok: false, error: 'Editor cerrado.' }
      return batch(() => {
        clearTransient()
        return useEditorStore.getState().updateParameter(componentId, name, value)
      })
    },

    select(id: string | null) {
      if (disposed) return
      const state = useEditorStore.getState()
      const selected = id !== null && state.project.components.some((c) => c.id === id) ? id : null
      if (state.selectedId !== selected) state.selectComponent(selected)
    },

    rotate() {
      const id = snapshot.selectedId
      if (disposed || id === null) return
      if (snapshot.project.mounts?.some((mount) => mount.componentId === id)) {
        onMessage?.('Usa Reposicionar montaje para girar este componente montado.')
        return
      }
      batch(() => {
        preview = null
        useEditorStore.getState().rotateComponent(id)
      })
    },

    remove() {
      const id = snapshot.selectedId
      if (disposed || id === null) return
      batch(() => {
        preview = null
        useEditorStore.getState().removeComponent(id)
      })
    },

    removeWire(id: string) {
      if (disposed) return
      const state = useEditorStore.getState()
      if (!state.project.wires?.some((wire) => wire.id === id)) return
      batch(() => state.removeWire?.(id))
    },

    undo() {
      if (disposed) return
      batch(() => {
        clearTransient()
        useEditorStore.getState().undo()
      })
    },

    redo() {
      if (disposed) return
      batch(() => {
        clearTransient()
        useEditorStore.getState().redo()
      })
    },

    pin(endpoint: PinEndpoint): PinClickOutcome | null {
      if (disposed || !hasPin(useEditorStore.getState().project, endpoint)) return null
      return batch(() => {
        const outcome = resolvePinClick(
          wiring,
          Object.freeze({ ...endpoint }),
          useEditorStore.getState().connectPins,
        )
        wiring = Object.freeze(outcome.state)
        return outcome
      })
    },

    cancel() {
      if (disposed) return
      clearTransient()
      publish()
    },

    beginDrag(id: string) {
      if (disposed) return
      const state = useEditorStore.getState()
      const component = state.project.components.find((c) => c.id === id)
      if (!component) return
      if (state.project.mounts?.some((mount) => mount.componentId === id)) {
        onMessage?.(
          'Este componente está montado. Usa Reposicionar montaje o Desmontar para moverlo.',
        )
        return
      }
      batch(() => {
        preview = Object.freeze({
          componentId: id,
          position: Object.freeze({ x: component.position.x, y: component.position.y }),
        })
        if (state.selectedId !== id) state.selectComponent(id)
      })
    },

    previewDrag(position: CanvasPosition) {
      if (disposed || !preview || !finitePosition(position)) return
      if (preview.position.x === position.x && preview.position.y === position.y) return
      preview = Object.freeze({ ...preview, position: Object.freeze({ ...position }) })
      publish()
    },

    commitDrag() {
      if (disposed || !preview) return
      const drag = preview
      batch(() => {
        preview = null
        const state = useEditorStore.getState()
        const component = state.project.components.find((c) => c.id === drag.componentId)
        if (
          component &&
          (component.position.x !== drag.position.x || component.position.y !== drag.position.y)
        )
          state.moveComponent(drag.componentId, drag.position)
      })
    },

    cancelDrag() {
      if (disposed || !preview) return
      preview = null
      publish()
    },

    dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
    },
  }
}

export type ProjectController = ReturnType<typeof createProjectController>
