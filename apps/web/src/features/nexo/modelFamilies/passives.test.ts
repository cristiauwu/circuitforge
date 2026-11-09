import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import type { ModelTools } from '../modelParts'
import { createProjectModel } from '../models'
import { buildControlModel } from './controls'
import { buildPassiveModel } from './passives'

const models: Array<[string, string[]]> = [
  ...[
    'capacitor_ceramic',
    'capacitor_film',
    'thermistor_ntc',
    'varistor_mov',
    'fuse',
    'crystal',
    'switch_spst',
    'pushbutton',
    'reed_switch',
  ].map((id): [string, string[]] => [id, ['a', 'b']]),
  ['transformer', ['primary_a', 'primary_b', 'secondary_a', 'secondary_b']],
  ['switch_spdt', ['common', 'throw_a', 'throw_b']],
  ['dip_switch_4', ['a1', 'b1', 'a2', 'b2', 'a3', 'b3', 'a4', 'b4']],
  ['rotary_encoder', ['A', 'B', 'COM', 'SW1', 'SW2']],
  ['relay_spdt', ['coil_a', 'coil_b', 'COM', 'NO', 'NC']],
]

describe('authored passive and control model families', () => {
  it('declines unknown types without touching the model tools', () => {
    const tools = new Proxy({} as ModelTools, {
      get() {
        throw new Error('Unknown type allocated resources')
      },
    })
    expect(buildPassiveModel('unknown', tools)).toBe(false)
    expect(buildControlModel('unknown', tools)).toBe(false)
  })

  it.each(models)(
    '%s owns exact finite anchors, physical leads, bounded geometry and disposable resources',
    (typeId, pinIds) => {
      const model = createProjectModel(typeId)
      try {
        expect(Object.keys(model.anchors).sort()).toEqual([...pinIds].sort())
        const bounds = new THREE.Box3().setFromObject(model.group)
        const size = bounds.getSize(new THREE.Vector3())
        expect(bounds.isEmpty()).toBe(false)
        expect(size.toArray().every(Number.isFinite)).toBe(true)
        expect(Math.max(size.x, size.z)).toBeGreaterThan(0.6)
        expect(Math.max(size.x, size.z)).toBeLessThan(3)
        for (const pinId of pinIds) {
          const anchor = model.anchors[pinId]
          expect(anchor?.toArray().every(Number.isFinite)).toBe(true)
          const terminal = model.group.getObjectByName(`Terminal ${pinId}`)
          expect(terminal).toBeInstanceOf(THREE.Mesh)
          expect(terminal?.userData).toMatchObject({ freeLead: true, pinId })
          expect(terminal?.userData.bodyAnchor.every(Number.isFinite)).toBe(true)
          if (!anchor || !terminal) throw new Error(`Missing terminal ${pinId}`)
          const tube = (terminal as THREE.Mesh).geometry as THREE.TubeGeometry
          const endpoint = terminal.localToWorld(tube.parameters.path.getPoint(1))
          expect(endpoint.distanceTo(anchor)).toBeLessThan(0.00001)
        }
        const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>()
        model.group.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return
          resources.add(child.geometry)
          for (const material of Array.isArray(child.material)
            ? child.material
            : [child.material]) {
            resources.add(material)
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) resources.add(value)
          }
        })
        const disposals = [...resources].map((resource) => vi.spyOn(resource, 'dispose'))
        model.dispose()
        model.dispose()
        for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1)
      } finally {
        model.dispose()
      }
    },
  )

  it.each([
    ['switch_spst', { closed: false }, { closed: true }, 'Palanca manual'],
    ['switch_spdt', { position: 'throw_a' }, { position: 'throw_b' }, 'Cursor deslizante'],
    ['pushbutton', { pressed: false }, { pressed: true }, 'Émbolo de pulsador'],
    ['dip_switch_4', { closedMask: 0 }, { closedMask: 1 }, 'Selector DIP 1'],
    ['reed_switch', { closed: false }, { closed: true }, 'Lámina ferromagnética B'],
    ['rotary_encoder', { pressed: false }, { pressed: true }, 'Mando circular de encoder'],
    ['relay_spdt', { energized: false }, { energized: true }, 'Armadura móvil del relé'],
  ] as const)(
    '%s depicts manual state without changing pin endpoints',
    (typeId, initial, changed, name) => {
      const first = createProjectModel(typeId, initial)
      const second = createProjectModel(typeId, changed)
      try {
        const before = first.group.getObjectByName(name)
        const after = second.group.getObjectByName(name)
        expect(before).toBeDefined()
        expect(after).toBeDefined()
        if (!before || !after) throw new Error(`Missing manual-state geometry ${name}`)
        expect(
          before.position.equals(after.position) && before.rotation.equals(after.rotation),
        ).toBe(false)
        expect(second.anchors).toEqual(first.anchors)
      } finally {
        first.dispose()
        second.dispose()
      }
    },
  )
})
