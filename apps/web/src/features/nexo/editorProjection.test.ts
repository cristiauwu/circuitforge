import {
  BREADBOARD_CONTACTS,
  type Component,
  createEmptyProject,
  type Project,
  type Rotation,
} from '@circuitforge/netlist'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { CATALOG_INDEX } from '../../lib/fixtures/components'
import { EDITABLE_TYPE_IDS, isEditableType } from './capabilities'
import {
  type AnchorsByType,
  deriveWireSegments,
  findProjectPosition,
  MODEL_FOOTPRINTS,
  MODEL_SCALE,
  pinWorld,
  projectRotationToWorld,
  projectToWorld,
  worldToProject,
} from './editorProjection'
import { createProjectModel } from './models'

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected test fixture item')
  return value
}

function component(
  id: string,
  typeId = 'resistor',
  x = 0,
  y = 0,
  rotation: Rotation = 0,
): Component {
  return {
    id,
    typeId,
    position: { x, y, rotation },
    params: {},
    pins: ['a', 'b'].map((pinId) => ({ pinId, type: 'passive', netId: null })),
  }
}
function project(components: Component[]): Project {
  const { wires: _wires, ...legacy } = createEmptyProject('projection-test', 'Projection test')
  return { ...legacy, components } // Net-only legacy snapshots intentionally omit wires.
}
const anchors: AnchorsByType = {
  resistor: { a: { x: -1, y: 0.25, z: 0 }, b: { x: 1, y: 0.25, z: 0 } },
}

describe('Nexo project coordinates', () => {
  it('maps domain +y to world -z without using the component rotation as position', () => {
    expect(MODEL_SCALE).toBe(1 / 24)
    expect(projectToWorld({ x: 48, y: -72, rotation: 90 })).toEqual({ x: 2, y: 0, z: 3 })
    expect(projectRotationToWorld(90)).toBe(Math.PI / 2)
  })

  it('round-trips on-grid positive and negative coordinates', () => {
    for (const x of [-240, -24, 0, 24, 240])
      for (const y of [-240, -24, 0, 24, 240]) {
        expect(worldToProject(projectToWorld({ x, y }))).toEqual({ x, y })
      }
  })

  it('snaps world movement to the domain 24-unit grid and normalizes negative zero', () => {
    expect(worldToProject({ x: 1.3, z: -2.6 })).toEqual({ x: 24, y: 72 })
    expect(worldToProject({ x: -0.1, z: 0.1 })).toEqual({ x: 0, y: 0 })
  })

  it.each([0, 90, 180, 270])(
    'pin transform matches THREE positive Y rotation at %s degrees',
    (rotation) => {
      const pose = { x: 96, y: -48, rotation }
      const anchor = { x: -1.2, y: 0.7, z: 0.8 }
      const group = new THREE.Group()
      const origin = projectToWorld(pose)
      group.position.set(origin.x, origin.y, origin.z)
      group.rotation.y = projectRotationToWorld(rotation)
      group.updateMatrixWorld(true)
      const actual = group.localToWorld(new THREE.Vector3(anchor.x, anchor.y, anchor.z))
      const derived = pinWorld(pose, anchor)
      expect(derived.x).toBeCloseTo(actual.x, 12)
      expect(derived.y).toBeCloseTo(actual.y, 12)
      expect(derived.z).toBeCloseTo(actual.z, 12)
      expect(anchor).toEqual({ x: -1.2, y: 0.7, z: 0.8 })
    },
  )
})

describe('derived wires', () => {
  it('renders only explicit cable pairs, never breadboard conductive group star segments', () => {
    const board = component('BB1', 'breadboard')
    board.pins = BREADBOARD_CONTACTS.map(({ pinId }) => ({ pinId, type: 'passive', netId: 'N1' }))
    const value = project([board, component('R1', 'resistor', 96)])
    value.nets = [
      {
        id: 'N1',
        pins: ['a1', 'b1', 'c1', 'd1', 'e1'].map((pinId) => ({ componentId: 'BB1', pinId })),
      },
    ]
    value.wires = [
      {
        id: 'W1',
        from: { componentId: 'R1', pinId: 'a' },
        to: { componentId: 'BB1', pinId: 'b1' },
      },
    ]
    const model = createProjectModel('breadboard')
    try {
      const allAnchors = { ...anchors, breadboard: model.anchors }
      const segments = deriveWireSegments(value, allAnchors)
      expect(segments).toHaveLength(1)
      expect(required(segments[0]).to).toEqual(model.anchors.b1)
      expect(required(segments[0]).netId).toBe('W1')
      value.wires = []
      expect(deriveWireSegments(value, allAnchors)).toEqual([])
    } finally {
      model.dispose()
    }
  })

  it('skips missing explicit cable endpoints without inventing origins or suppressing valid cables', () => {
    const value = project([component('R1'), component('R2', 'resistor', 48)])
    value.wires = [
      {
        id: 'W2',
        from: { componentId: 'missing', pinId: 'a' },
        to: { componentId: 'R2', pinId: 'b' },
      },
      { id: 'W1', from: { componentId: 'R1', pinId: 'a' }, to: { componentId: 'R2', pinId: 'b' } },
    ]
    expect(deriveWireSegments(value, anchors)).toEqual([
      { netId: 'W1', from: { x: -1, y: 0.25, z: 0 }, to: { x: 3, y: 0.25, z: 0 } },
    ])
  })
  it('derives stable full endpoint pairs independent of net and component order', () => {
    const value = project([
      component('R3', 'resistor', 96),
      component('R1'),
      component('R2', 'resistor', 48, 24, 90),
    ])
    value.nets = [
      {
        id: 'N2',
        pins: [
          { componentId: 'R3', pinId: 'b' },
          { componentId: 'R1', pinId: 'b' },
        ],
      },
      {
        id: 'N1',
        pins: [
          { componentId: 'R3', pinId: 'a' },
          { componentId: 'R2', pinId: 'a' },
          { componentId: 'R1', pinId: 'a' },
        ],
      },
    ]
    const before = JSON.stringify(value)
    const result = deriveWireSegments(value, anchors)
    expect(result).toHaveLength(3)
    expect(result.map((segment) => segment.netId)).toEqual(['N1', 'N1', 'N2'])
    expect(required(result[0]).from).toEqual({ x: -1, y: 0.25, z: 0 })
    expect(required(result[0]).to.x).toBeCloseTo(2)
    expect(required(result[0]).to.z).toBeCloseTo(0)
    expect(required(result[1]).to).toEqual({ x: 3, y: 0.25, z: 0 })
    expect(JSON.stringify(value)).toBe(before)
    value.components.reverse()
    value.nets.reverse()
    value.nets.forEach((net) => {
      net.pins.reverse()
    })
    expect(deriveWireSegments(value, anchors)).toEqual(result)
    expect(required(result[0]).from).not.toBe(required(result[1]).from)
  })

  it('does not invent partial cables when any endpoint, model or logical pin is missing', () => {
    const value = project([component('R1'), component('R2'), component('R3', 'unknown')])
    const valid = [
      { componentId: 'R1', pinId: 'a' },
      { componentId: 'R2', pinId: 'a' },
    ]
    for (const invalid of [
      { componentId: 'missing', pinId: 'a' },
      { componentId: 'R1', pinId: 'missing' },
      { componentId: 'R3', pinId: 'a' },
    ]) {
      value.nets = [{ id: 'N1', pins: [...valid, invalid] }]
      expect(deriveWireSegments(value, anchors)).toEqual([])
    }
    value.nets = [{ id: 'N1', pins: valid }]
    required(value.components[1]).pins = []
    expect(deriveWireSegments(value, anchors)).toEqual([])
  })

  it('ignores singleton nets and duplicate endpoint references', () => {
    const value = project([component('R1'), component('R2')])
    value.nets = [
      {
        id: 'N1',
        pins: [
          { componentId: 'R1', pinId: 'a' },
          { componentId: 'R1', pinId: 'a' },
        ],
      },
    ]
    expect(deriveWireSegments(value, anchors)).toEqual([])
    required(value.nets[0]).pins.push({ componentId: 'R2', pinId: 'b' })
    expect(deriveWireSegments(value, anchors)).toHaveLength(1)
  })
})

describe('authored model coverage', () => {
  it('keeps browser label planes inside the placement footprint and disposes their textures', () => {
    const ctx = new Proxy({}, { get: () => () => {} })
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) })
    try {
      for (const typeId of EDITABLE_TYPE_IDS) {
        const model = createProjectModel(typeId)
        const textureDisposals: ReturnType<typeof vi.spyOn>[] = []
        model.group.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return
          const material = object.material
          if (!(material instanceof THREE.MeshBasicMaterial) || !material.map) return
          textureDisposals.push(vi.spyOn(material.map, 'dispose'))
        })
        const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3())
        const footprint = required(MODEL_FOOTPRINTS[typeId])
        expect(size.x, `${typeId} labeled width`).toBeLessThanOrEqual(footprint.width * MODEL_SCALE)
        expect(size.z, `${typeId} labeled depth`).toBeLessThanOrEqual(footprint.depth * MODEL_SCALE)
        expect(textureDisposals.length).toBeGreaterThan(0)
        model.dispose()
        for (const dispose of textureDisposals) expect(dispose).toHaveBeenCalledTimes(1)
      }
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it.each(EDITABLE_TYPE_IDS)(
    '%s has exactly the catalog pins, finite anchors and a conservative footprint',
    (typeId) => {
      const model = createProjectModel(typeId)
      try {
        const fixture = required(CATALOG_INDEX.get(typeId))
        expect(Object.keys(model.anchors).sort()).toEqual(fixture.pins.map((pin) => pin.id).sort())
        for (const anchor of Object.values(model.anchors)) {
          expect([anchor.x, anchor.y, anchor.z].every(Number.isFinite)).toBe(true)
        }
        const bounds = new THREE.Box3().setFromObject(model.group)
        const size = bounds.getSize(new THREE.Vector3())
        const footprint = required(MODEL_FOOTPRINTS[typeId])
        expect(size.x).toBeLessThanOrEqual(footprint.width * MODEL_SCALE)
        expect(size.z).toBeLessThanOrEqual(footprint.depth * MODEL_SCALE)
        expect(bounds.min.y).toBeCloseTo(0, 5)
        expect(model.group.children.length).toBeGreaterThan(0)
        expect(isEditableType(typeId)).toBe(true)
      } finally {
        model.dispose()
      }
    },
  )

  it('uses one capability list and rejects unknown types without a fallback model', () => {
    expect(new Set(EDITABLE_TYPE_IDS).size).toBe(EDITABLE_TYPE_IDS.length)
    expect(Object.keys(MODEL_FOOTPRINTS).sort()).toEqual([...EDITABLE_TYPE_IDS].sort())
    expect(isEditableType('lipo_3s')).toBe(true)
    expect(isEditableType('unknown_component')).toBe(false)
    expect(isEditableType('toString')).toBe(false)
    expect(() => createProjectModel('unknown_component')).toThrow(RangeError)
  })

  it('takes all 420 dense contact coordinates and IDs from the domain source without recentering', () => {
    const model = createProjectModel('breadboard')
    try {
      expect(model.contactPicking?.mesh.count).toBe(420)
      expect(model.contactPicking?.pinIds).toEqual(
        BREADBOARD_CONTACTS.map((contact) => contact.pinId),
      )
      for (const contact of BREADBOARD_CONTACTS) {
        expect(model.anchors[contact.pinId]).toEqual(new THREE.Vector3(contact.x, 0.305, contact.z))
      }
      const holes = required(model.contactPicking).mesh
      const matrix = new THREE.Matrix4()
      BREADBOARD_CONTACTS.forEach((contact, index) => {
        holes.getMatrixAt(index, matrix)
        const position = new THREE.Vector3().setFromMatrixPosition(matrix)
        expect(position.x).toBeCloseTo(contact.x, 6)
        expect(position.z).toBeCloseTo(contact.z, 6)
      })
    } finally {
      model.dispose()
    }
  })

  it.each(EDITABLE_TYPE_IDS)(
    '%s owns and disposes its resources once, without touching another instance',
    (typeId) => {
      const first = createProjectModel(typeId)
      const second = createProjectModel(typeId)
      const collect = (group: THREE.Group) => {
        const resources = new Set<
          THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.InstancedMesh
        >()
        const collectSurface = (surface: THREE.Material) => {
          resources.add(surface)
          for (const value of Object.values(surface)) {
            if (value instanceof THREE.Texture) resources.add(value)
          }
        }
        group.traverse((object) => {
          if (object instanceof THREE.InstancedMesh) resources.add(object)
          if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
          resources.add(object.geometry)
          const surfaces = Array.isArray(object.material) ? object.material : [object.material]
          surfaces.forEach(collectSurface)
        })
        return resources
      }
      const firstResources = collect(first.group)
      const secondResources = collect(second.group)
      expect([...firstResources].some((resource) => secondResources.has(resource))).toBe(false)
      const firstSpies = [...firstResources].map((resource) => vi.spyOn(resource, 'dispose'))
      const secondSpies = [...secondResources].map((resource) => vi.spyOn(resource, 'dispose'))
      first.dispose()
      first.dispose()
      expect(first.group.children).toHaveLength(0)
      for (const spy of firstSpies) expect(spy).toHaveBeenCalledTimes(1)
      for (const spy of secondSpies) expect(spy).not.toHaveBeenCalled()
      expect(second.group.children.length).toBeGreaterThan(0)
      second.dispose()
      for (const spy of secondSpies) expect(spy).toHaveBeenCalledTimes(1)
    },
  )
})

describe('footprint-aware placement', () => {
  it('places an empty project at origin and is deterministic without mutating inputs', () => {
    expect(findProjectPosition([], 'esp32')).toEqual({ x: 0, y: 0 })
    const items = [component('U1', 'esp32')]
    const before = JSON.stringify(items)
    expect(findProjectPosition(items, 'esp32')).toEqual(findProjectPosition(items, 'esp32'))
    expect(findProjectPosition(items, 'esp32')).not.toEqual({ x: 0, y: 0 })
    expect(JSON.stringify(items)).toBe(before)
  })

  it('avoids large rotated rectangles plus clearance for repeated placement', () => {
    const items: Component[] = [component('U1', 'esp32', 0, 0, 90)]
    for (let i = 0; i < 20; i++) {
      const typeId = i % 2 ? 'esp32' : 'arduino_uno'
      const next = findProjectPosition(items, typeId)
      expect(Math.abs(next.x % 24)).toBe(0)
      expect(Math.abs(next.y % 24)).toBe(0)
      const dimensions = required(MODEL_FOOTPRINTS[typeId])
      for (const item of items) {
        const size = required(MODEL_FOOTPRINTS[item.typeId])
        const rotated = item.position.rotation % 180 !== 0
        const width = rotated ? size.depth : size.width
        const depth = rotated ? size.width : size.depth
        expect(
          Math.abs(next.x - item.position.x) >= (dimensions.width + width) / 2 + 24 ||
            Math.abs(next.y - item.position.y) >= (dimensions.depth + depth) / 2 + 24,
        ).toBe(true)
      }
      items.push(component(`U${i + 2}`, typeId, next.x, next.y))
    }
  })
})
