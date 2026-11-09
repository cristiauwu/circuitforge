import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { createProjectLayer } from './editor3d'
import { createProjectController } from './projectController'

const cleanups: (() => void)[] = []
beforeEach(() => useEditorStore.getState().reset())
afterEach(() => {
  for (const dispose of cleanups.splice(0)) dispose()
})

function setup(aspect = 1) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100)
  camera.position.set(7, 12, 9)
  const controls = {
    enabled: true,
    target: new THREE.Vector3(),
    minDistance: 7,
    maxDistance: 25,
    update: () => {
      camera.lookAt(controls.target)
      camera.updateMatrixWorld()
    },
  }
  const layer = createProjectLayer({
    scene,
    camera,
    canvas: new EventTarget() as HTMLCanvasElement,
    controls: controls as unknown as OrbitControls,
    invalidate: vi.fn(),
    onSelect: vi.fn(),
    onPin: vi.fn(),
    onDragStart: vi.fn(),
    onDragPreview: vi.fn(),
    onDragCommit: vi.fn(),
    onDragCancel: vi.fn(),
  })
  const controller = createProjectController((snapshot) => layer.update(snapshot))
  cleanups.push(() => {
    controller.dispose()
    layer.dispose()
  })
  layer.update(controller.getSnapshot())
  layer.setActive(true)
  return { scene, camera, controls, layer, controller }
}

function projectRoot(scene: THREE.Scene) {
  const root = scene.getObjectByName('Nexo · proyecto editable')
  if (!root) throw new Error('Expected owned project geometry')
  return root
}

function expectBoundsInCamera(bounds: THREE.Box3, camera: THREE.PerspectiveCamera) {
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera)
        expect(Math.abs(point.x)).toBeLessThan(1)
        expect(Math.abs(point.y)).toBeLessThan(1)
        expect(Math.abs(point.z)).toBeLessThan(1)
      }
}

describe('project layer framing', () => {
  it.each([0.25, 1, 2])(
    'frames distant parts and raised physical wires at aspect %s without project mutation',
    (aspect) => {
      const { scene, camera, controls, layer, controller } = setup(aspect)
      const first = controller.add('resistor', { x: -12000, y: -5000 })
      const second = controller.add('led', { x: 16000, y: 9000 })
      if (!first || !second) throw new Error('Expected editable parts')
      controller.pin({ componentId: first, pinId: 'a' })
      controller.pin({ componentId: second, pinId: 'anode' })
      const root = projectRoot(scene)
      const wires = root.children[1]
      expect(wires?.children).toHaveLength(1)
      if (!wires) throw new Error('Expected physical wires')
      const wireBounds = new THREE.Box3().setFromObject(wires)
      const bounds = layer.bounds()
      expect(bounds.containsBox(wireBounds)).toBe(true)
      expect(bounds.max.y).toBeGreaterThan(layer.bounds(first).max.y)
      const before = JSON.stringify(controller.getSnapshot())
      for (const top of [false, true]) {
        if (top) camera.position.copy(controls.target).add(new THREE.Vector3(0, 16.55, 0.01))
        layer.frameProject()
        expectBoundsInCamera(bounds, camera)
      }
      expect(JSON.stringify(controller.getSnapshot())).toBe(before)
      bounds.makeEmpty()
      expect(layer.bounds().isEmpty()).toBe(false)
    },
  )

  it('returns empty owned bounds and frames an empty project safely', () => {
    const { camera, layer } = setup(0.3)
    expect(layer.bounds().isEmpty()).toBe(true)
    layer.frameProject()
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true)
  })
})

describe('project layer physical breadboard geometry', () => {
  it('keeps dense contact selection to one highlight draw call and renders only physical cables', () => {
    const { scene, controller } = setup()
    const board = controller.add('breadboard')
    const resistor = controller.add('resistor')
    if (!board || !resistor) throw new Error('Expected editable models')
    controller.pin({ componentId: board, pinId: 'a1' })
    const root = projectRoot(scene)
    const highlight = root.children.find((child) => child instanceof THREE.InstancedMesh)
    expect(highlight).toBeInstanceOf(THREE.InstancedMesh)
    if (!(highlight instanceof THREE.InstancedMesh)) throw new Error('Expected instanced highlight')
    expect(highlight.count).toBe(5)
    expect(controller.pin({ componentId: resistor, pinId: 'a' })?.kind).toBe('connected')
    expect(highlight.count).toBe(0)
    const wires = root.children[1]
    expect(wires?.children).toHaveLength(1)
    const model = root.children[0]?.children.find((child) => child.userData.componentId === board)
    expect(
      model?.children.filter(
        (child) => child instanceof THREE.Group && child.children.length === 0,
      ),
    ).toHaveLength(1)
    controller.pin({ componentId: board, pinId: 'rail_top_positive_1' })
    expect(highlight.count).toBe(30)
    controller.cancel()
    expect(highlight.count).toBe(0)
  })

  it.each([0.35, 1, 2])('locates the whole rotated board within aspect %s', (aspect) => {
    const { scene, camera, layer, controller, controls } = setup(aspect)
    const board = controller.add('breadboard', { x: 240, y: -120 })
    if (!board) throw new Error('Expected editable board')
    controller.rotate()
    layer.locate(board)
    const model = projectRoot(scene).children[0]?.children.find(
      (child) => child.userData.componentId === board,
    )
    if (!model) throw new Error('Expected breadboard geometry')
    const bounds = new THREE.Box3().setFromObject(model)
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const point = new THREE.Vector3(x, y, z).project(camera)
          expect(Math.abs(point.x)).toBeLessThan(1)
          expect(Math.abs(point.y)).toBeLessThan(1)
        }
    expect(camera.position.distanceTo(controls.target)).toBeLessThanOrEqual(controls.maxDistance)
  })
})
