import type { PinEndpoint } from '@circuitforge/netlist'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { EDITABLE_TYPE_IDS } from './capabilities'
import { findProjectPosition } from './editorProjection'
import { createProjectController, type ProjectController } from './projectController'

const state = () => useEditorStore.getState()
const controllers: ProjectController[] = []
function setup() {
  const onChange = vi.fn()
  const controller = createProjectController(onChange)
  controllers.push(controller)
  return { controller, onChange }
}
function add(controller: ProjectController, typeId = 'resistor') {
  const id = controller.add(typeId)
  if (id === null) throw new Error(`Could not add ${typeId}`)
  return id
}
const endpoint = (componentId: string, pinId: string): PinEndpoint => ({ componentId, pinId })

beforeEach(() => state().reset())
afterEach(() => {
  for (const controller of controllers.splice(0)) controller.dispose()
})

describe('project controller', () => {
  it('batches mount edits, cancels transients and blocks free movement of mounted children', () => {
    const onChange = vi.fn()
    const onMessage = vi.fn()
    const controller = createProjectController(onChange, onMessage)
    controllers.push(controller)
    const board = add(controller, 'breadboard')
    const child = add(controller)
    controller.pin(endpoint(child, 'a'))
    controller.beginDrag(child)
    controller.previewDrag({ x: 120, y: 120 })
    const historyBefore = state().history.past.length
    onChange.mockClear()
    expect(controller.mountComponent(child, board, 'a5')).toEqual({ ok: true })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot()).toMatchObject({ preview: null, wiring: { pending: null } })
    expect(state().history.past).toHaveLength(historyBefore + 1)
    const mountedProject = state().project
    controller.select(child)
    controller.beginDrag(child)
    controller.previewDrag({ x: 999, y: 999 })
    controller.commitDrag()
    controller.rotate()
    expect(state().project).toBe(mountedProject)
    expect(onMessage).toHaveBeenCalledTimes(2)
    expect(controller.mountComponent(child, board, 'a10')).toEqual({ ok: true })
    expect(state().project.mounts?.[0]?.anchorContactId).toBe('a10')
    controller.undo()
    expect(state().project.mounts?.[0]?.anchorContactId).toBe('a5')
    controller.redo()
    expect(state().project.mounts?.[0]?.anchorContactId).toBe('a10')
    expect(controller.unmountComponent(child)).toEqual({ ok: true })
    expect(state().project.mounts ?? []).toHaveLength(0)
    expect(state().project.components.find((item) => item.id === child)?.elevation).toBeGreaterThan(
      0,
    )
  })

  it('updates validated parameters with one publication and one history record', () => {
    const { controller, onChange } = setup()
    const id = add(controller)
    controller.pin(endpoint(id, 'a'))
    const before = state().history.past.length
    onChange.mockClear()
    expect(controller.updateParameter(id, 'resistance', 330)).toEqual({ ok: true })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(state().history.past).toHaveLength(before + 1)
    expect(controller.getSnapshot().wiring.pending).toBeNull()
    expect(state().project.components.find((item) => item.id === id)?.params.resistance).toBe(330)
    const project = state().project
    expect(controller.updateParameter(id, 'resistance', -1).ok).toBe(false)
    expect(state().project).toBe(project)
  })

  it('uses the existing singleton project without reset or DOM access', () => {
    const id = state().addComponent('led', { x: 12, y: 24 })
    const project = state().project
    const { controller, onChange } = setup()
    expect(controller.getSnapshot()).toMatchObject({
      project,
      selectedId: id,
      wiring: { pending: null, error: null },
      preview: null,
      canUndo: true,
      canRedo: false,
    })
    expect(controller.getSnapshot().project).toBe(project)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps snapshot identity stable and previous snapshots unchanged', () => {
    const { controller, onChange } = setup()
    const initial = controller.getSnapshot()
    expect(controller.getSnapshot()).toBe(initial)
    expect(Object.isFrozen(initial)).toBe(true)
    controller.select(null)
    controller.cancelDrag()
    expect(controller.getSnapshot()).toBe(initial)
    const id = add(controller)
    const selected = controller.getSnapshot()
    expect(selected).not.toBe(initial)
    expect(initial.project.components).toHaveLength(0)
    expect(initial.selectedId).toBeNull()
    controller.select(id)
    expect(controller.getSnapshot()).toBe(selected)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it.each(EDITABLE_TYPE_IDS)(
    'adds supported %s with projection placement and selects it',
    (typeId) => {
      const { controller } = setup()
      const expectedPosition = findProjectPosition(state().project.components, typeId)
      const id = add(controller, typeId)
      expect(state().project.components[0]).toMatchObject({
        id,
        typeId,
        position: { ...expectedPosition, rotation: 0 },
      })
      expect(controller.getSnapshot().selectedId).toBe(id)
      expect(state().history.past).toHaveLength(1)
    },
  )

  it('rejects unavailable tools and nonfinite coordinates without editing', () => {
    const { controller, onChange } = setup()
    const initial = controller.getSnapshot()
    for (const typeId of ['wire', '', '__proto__', 'unknown']) {
      expect(controller.add(typeId)).toBeNull()
    }
    expect(controller.add('led', { x: Number.NaN, y: 0 })).toBeNull()
    expect(controller.getSnapshot()).toBe(initial)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('selects safely, rotates, removes and exposes undo/redo', () => {
    const { controller } = setup()
    const id = controller.add('resistor', { x: 48, y: 72 })
    controller.select(null)
    const history = state().history
    controller.rotate()
    controller.remove()
    expect(state().history).toBe(history)
    controller.select('missing')
    expect(controller.getSnapshot().selectedId).toBeNull()
    controller.select(id)
    controller.rotate()
    expect(state().project.components[0]?.position.rotation).toBe(90)
    controller.undo()
    expect(state().project.components[0]?.position.rotation).toBe(0)
    expect(controller.getSnapshot().canRedo).toBe(true)
    controller.redo()
    expect(state().project.components[0]?.position.rotation).toBe(90)
    controller.remove()
    expect(controller.getSnapshot().selectedId).toBeNull()
    expect(state().project.components).toHaveLength(0)
    controller.undo()
    expect(state().project.components[0]?.id).toBe(id)
    expect(controller.getSnapshot().selectedId).toBeNull()
  })

  it('sanitizes stale selection after external undo without rewriting the store', () => {
    const { controller } = setup()
    const id = add(controller)
    state().undo()
    expect(state().selectedId).toBe(id)
    expect(controller.getSnapshot().selectedId).toBeNull()
    state().redo()
    expect(controller.getSnapshot().selectedId).toBe(id)
  })

  it('connects pins with one final notification, never an intermediate pending snapshot', () => {
    const { controller, onChange } = setup()
    const resistor = add(controller)
    const led = add(controller, 'led')
    const first = endpoint(resistor, 'a')
    expect(controller.pin(first)?.kind).toBe('selected')
    const pendingSnapshot = controller.getSnapshot()
    first.pinId = 'mutated outside controller'
    expect(pendingSnapshot.wiring.pending?.pinId).toBe('a')
    onChange.mockClear()
    expect(controller.pin(endpoint(led, 'anode'))?.kind).toBe('connected')
    expect(onChange).toHaveBeenCalledTimes(1)
    const final = controller.getSnapshot()
    expect(final.project.nets).toHaveLength(1)
    expect(final.wiring).toEqual({ pending: null, error: null })
    expect(onChange.mock.calls[0]?.[0]).toBe(final)
    expect(pendingSnapshot.wiring.pending).toEqual(endpoint(resistor, 'a'))
    expect(pendingSnapshot.project.nets).toHaveLength(0)
  })

  it('preserves exact physical hole wires in snapshots and removes one with undo/redo', () => {
    const { controller, onChange } = setup()
    const board = add(controller, 'breadboard')
    const resistor = add(controller)
    controller.pin(endpoint(resistor, 'a'))
    expect(controller.pin(endpoint(board, 'a1'))?.kind).toBe('connected')
    controller.pin(endpoint(board, 'e1'))
    expect(controller.pin(endpoint(resistor, 'b'))?.kind).toBe('connected')
    const connected = controller.getSnapshot()
    expect(connected.project).toBe(state().project)
    expect(connected.project.wires).toHaveLength(2)
    expect(connected.project.wires?.[0]).toMatchObject({
      from: endpoint(resistor, 'a'),
      to: endpoint(board, 'a1'),
    })
    const wireId = connected.project.wires?.[0]?.id
    if (!wireId) throw new Error('Expected persisted wire')
    const historyLength = state().history.past.length
    onChange.mockClear()
    controller.removeWire(wireId)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().project.wires).toHaveLength(1)
    expect(state().history.past).toHaveLength(historyLength + 1)
    const removed = controller.getSnapshot()
    controller.removeWire('missing')
    expect(controller.getSnapshot()).toBe(removed)
    controller.undo()
    expect(controller.getSnapshot().project.wires).toEqual(connected.project.wires)
    controller.redo()
    expect(controller.getSnapshot().project.wires).toHaveLength(1)
    expect(connected.project.wires).toHaveLength(2)
    controller.dispose()
    controller.removeWire(controller.getSnapshot().project.wires?.[0]?.id ?? '')
    expect(state().project.wires).toHaveLength(1)
  })

  it('retains the origin and rejection until retry succeeds or cancels', () => {
    const { controller } = setup()
    const source = add(controller, 'dc_source')
    const ground = add(controller, 'gnd_ref')
    const resistor = add(controller)
    const sourcePin = state()
      .project.components.find((c) => c.id === source)
      ?.pins.find((p) => p.type === 'power')
    const groundPin = state().project.components.find((c) => c.id === ground)?.pins[0]
    if (!sourcePin || !groundPin) throw new Error('Expected power and ground fixtures')
    const first = endpoint(source, sourcePin.pinId)
    controller.pin(first)
    const history = state().history
    expect(controller.pin(endpoint(ground, groundPin.pinId))?.kind).toBe('rejected')
    expect(controller.getSnapshot().wiring.pending).toEqual(first)
    expect(controller.getSnapshot().wiring.error).toBeTruthy()
    expect(state().history).toBe(history)
    expect(controller.pin(endpoint(resistor, 'a'))?.kind).toBe('connected')
    controller.pin(first)
    expect(controller.pin(first)?.kind).toBe('cancelled')
    expect(controller.getSnapshot().wiring.pending).toBeNull()
    controller.pin(first)
    controller.cancel()
    expect(controller.getSnapshot().wiring).toEqual({ pending: null, error: null })
  })

  it('rejects missing pin endpoints and clears pending if its component disappears', () => {
    const { controller } = setup()
    const id = add(controller)
    const selected = controller.getSnapshot()
    expect(controller.pin(endpoint(id, 'missing'))).toBeNull()
    expect(controller.pin(endpoint('missing', 'a'))).toBeNull()
    expect(controller.getSnapshot()).toBe(selected)
    controller.pin(endpoint(id, 'a'))
    state().removeComponent(id)
    expect(controller.getSnapshot().wiring.pending).toBeNull()
    state().undo()
    expect(controller.getSnapshot().wiring.pending).toBeNull()
  })

  it('previews drag without editing and commits exactly one move history entry', () => {
    const { controller, onChange } = setup()
    const id = controller.add('resistor', { x: 0, y: 0 }) as string
    const originalProject = state().project
    const history = state().history
    controller.select(null)
    controller.beginDrag(id)
    const initialDrag = controller.getSnapshot()
    expect(initialDrag.selectedId).toBe(id)
    controller.previewDrag({ x: 24, y: 48 })
    const firstPreview = controller.getSnapshot()
    const position = { x: 96, y: 120 }
    controller.previewDrag(position)
    position.x = 999
    expect(state().project).toBe(originalProject)
    expect(state().history).toBe(history)
    expect(initialDrag.preview?.position).toEqual({ x: 0, y: 0 })
    expect(firstPreview.preview?.position).toEqual({ x: 24, y: 48 })
    expect(controller.getSnapshot().preview?.position).toEqual({ x: 96, y: 120 })
    onChange.mockClear()
    controller.commitDrag()
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot().preview).toBeNull()
    expect(state().project.components[0]?.position).toMatchObject({ x: 96, y: 120 })
    expect(state().history.past).toHaveLength(history.past.length + 1)
    controller.undo()
    expect(state().project).toBe(originalProject)
    controller.redo()
    expect(state().project.components[0]?.position.x).toBe(96)
  })

  it('does not record canceled, unchanged, missing or invalid drags', () => {
    const { controller } = setup()
    const id = add(controller)
    const history = state().history
    controller.beginDrag('missing')
    controller.previewDrag({ x: 5, y: 5 })
    controller.commitDrag()
    expect(controller.getSnapshot().preview).toBeNull()
    controller.beginDrag(id)
    const initialDrag = controller.getSnapshot()
    controller.previewDrag({ x: Number.POSITIVE_INFINITY, y: 0 })
    expect(controller.getSnapshot()).toBe(initialDrag)
    controller.commitDrag()
    expect(state().history).toBe(history)
    controller.beginDrag(id)
    controller.previewDrag({ x: 240, y: 480 })
    controller.cancelDrag()
    expect(controller.getSnapshot().preview).toBeNull()
    expect(state().history).toBe(history)
    controller.beginDrag(id)
    controller.previewDrag({ x: 240, y: 480 })
    controller.cancel()
    expect(controller.getSnapshot().preview).toBeNull()
    expect(state().history).toBe(history)
  })

  it('clears drag preview on external deletion and undo cancels all transient state', () => {
    const { controller } = setup()
    const id = add(controller)
    controller.beginDrag(id)
    controller.previewDrag({ x: 240, y: 480 })
    state().removeComponent(id)
    expect(controller.getSnapshot().preview).toBeNull()
    controller.commitDrag()
    controller.undo()
    controller.pin(endpoint(id, 'a'))
    controller.beginDrag(id)
    controller.undo()
    expect(controller.getSnapshot()).toMatchObject({
      preview: null,
      wiring: { pending: null, error: null },
      selectedId: null,
    })
  })

  it('disposes its subscription and stops actions without resetting shared data', () => {
    const { controller, onChange } = setup()
    const id = add(controller)
    const snapshot = controller.getSnapshot()
    onChange.mockClear()
    controller.dispose()
    controller.dispose()
    expect(controller.add('led')).toBeNull()
    controller.select(null)
    controller.rotate()
    controller.remove()
    controller.undo()
    controller.redo()
    controller.pin(endpoint(id, 'a'))
    controller.beginDrag(id)
    controller.previewDrag({ x: 12, y: 24 })
    controller.commitDrag()
    controller.cancelDrag()
    controller.cancel()
    expect(state().project).toBe(snapshot.project)
    state().addComponent('led', { x: 0, y: 0 })
    expect(controller.getSnapshot()).toBe(snapshot)
    expect(onChange).not.toHaveBeenCalled()
  })
})
