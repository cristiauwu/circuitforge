import {
  buildMount,
  COMPONENT_DEFINITIONS,
  type Component,
  type Project,
  type Rotation,
} from '@circuitforge/netlist'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { resolveInstancePose } from './instancePose'
import { createProjectModel } from './models'
import { createMountedGeometry } from './mountedGeometry'

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test fixture value')
  return value
}

function component(id: string, typeId: string): Component {
  const def = required(COMPONENT_DEFINITIONS.find((item) => item.typeId === typeId))
  return {
    id,
    typeId,
    params: {},
    pins: def.pins.map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
    position: { x: 96, y: -48, rotation: 0 },
  }
}
function setPose(
  model: ReturnType<typeof createProjectModel>,
  project: Project,
  item: Component,
  preview?: Parameters<typeof resolveInstancePose>[2],
) {
  const pose = resolveInstancePose(project, item, preview)
  model.group.position.set(pose.x, pose.y, pose.z)
  model.group.rotation.y = pose.rotation
  model.group.updateMatrixWorld(true)
}

describe('formed mounted geometry', () => {
  it.each([
    'resistor',
    'led',
    'diode',
    'capacitor',
    'capacitor_ceramic',
    'inductor',
    'ldr',
    'bjt_npn',
  ])('%s forms every leg into the exact rotated board contact', (typeId) => {
    for (const rotation of [0, 90, 180, 270] as Rotation[]) {
      const board = component('BB1', 'breadboard')
      board.position.rotation = rotation
      const child = component('C1', typeId)
      const project = { components: [board, child], nets: [], wires: [] } as unknown as Project
      project.mounts = [buildMount(project, child.id, board.id, 'a5', 0)]
      const boardModel = createProjectModel('breadboard')
      const childModel = createProjectModel(typeId)
      const formed = createMountedGeometry(childModel)
      try {
        const preview = { componentId: board.id, position: { x: 240, y: 120 } }
        setPose(boardModel, project, board, preview)
        setPose(childModel, project, child, preview)
        const targets: Record<string, THREE.Vector3> = {}
        for (const pin of required(project.mounts[0]).contacts)
          targets[pin.pinId] = childModel.group.worldToLocal(
            boardModel.group.localToWorld(required(boardModel.anchors[pin.contactId]).clone()),
          )
        expect(formed.update(targets)).toBe(true)
        expect(formed.update(targets)).toBe(false)
        const leadMeshes: THREE.Mesh[] = []
        childModel.group.traverse((node) => {
          expect(node.userData.freeLead).not.toBe(true)
          if (node.userData.mountedLead) leadMeshes.push(node as THREE.Mesh)
        })
        expect(leadMeshes).toHaveLength(child.pins.length)
        for (const pin of required(project.mounts[0]).contacts) {
          const exact = boardModel.group.localToWorld(
            required(boardModel.anchors[pin.contactId]).clone(),
          )
          const endpoint = childModel.group.localToWorld(
            required(childModel.anchors[pin.pinId]).clone(),
          )
          expect(endpoint.distanceTo(exact)).toBeLessThan(1e-10)
          const mesh = required(leadMeshes.find((lead) => lead.userData.pinId === pin.pinId))
          const positions = mesh.geometry.getAttribute('position')
          const center = new THREE.Vector3()
          // Tube's final ring has 9 vertices. Its center is the path's exact endpoint.
          for (let i = positions.count - 9; i < positions.count - 1; i++)
            center.add(new THREE.Vector3().fromBufferAttribute(positions, i))
          center.multiplyScalar(1 / 8)
          expect(center.distanceTo(required(childModel.anchors[pin.pinId]))).toBeLessThan(1e-6)
        }
        expect(new THREE.Box3().setFromObject(childModel.group).isEmpty()).toBe(false)
        const geometry = required(leadMeshes[0]).geometry
        const dispose = vi.spyOn(geometry, 'dispose')
        formed.dispose()
        formed.dispose()
        expect(dispose).toHaveBeenCalledTimes(1)
      } finally {
        formed.dispose()
        childModel.dispose()
        boardModel.dispose()
      }
    }
  })
})
