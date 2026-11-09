import { describe, expect, it } from 'vitest'
import { BREADBOARD_CONTACTS } from './breadboard.js'
import { COMPONENT_INDEX, getDefaultParameters } from './componentRegistry.js'
import { buildMount, getMountFootprint, resolveMountedPose, validateMount } from './mounting.js'
import { connectPins, createEmptyProject, removeComponent, removeWire } from './netlist.js'
import { arePinsConnected, getInternalContactPairs, recomputeNets } from './topology.js'
import type { Component, Project, Rotation } from './types.js'

function component(typeId: string, id = typeId): Component {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new Error(typeId)
  return {
    id,
    typeId,
    position: { x: 0, y: 0, rotation: 0 },
    params: getDefaultParameters(typeId),
    pins: definition.pins.map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
  }
}
function fixture(typeId = 'resistor'): Project {
  return {
    ...createEmptyProject('mount', 'Mount'),
    components: [component('breadboard', 'BB1'), component(typeId, 'X1')],
  }
}
const endpoint = (componentId: string, pinId: string) => ({ componentId, pinId })

describe('canonical mechanical mounts', () => {
  it.each([
    'resistor',
    'led',
    'diode',
    'capacitor',
    'capacitor_ceramic',
    'inductor',
    'ldr',
    'bjt_npn',
  ])('mounts ALL pins of %s without adding physical cables', (typeId) => {
    const base = fixture(typeId)
    const before = JSON.stringify(base)
    const mount = buildMount(base, 'X1', 'BB1', 'a1', 0)
    const next = recomputeNets({ ...base, mounts: [mount] })
    expect(mount.contacts).toHaveLength(base.components[1]?.pins.length ?? 0)
    expect(next.wires).toEqual([])
    for (const pin of mount.contacts)
      expect(
        arePinsConnected(next, endpoint('X1', pin.pinId), endpoint('BB1', pin.contactId)),
      ).toBe(true)
    expect(JSON.stringify(base)).toBe(before)
    expect(next.components[1]?.pins.every((pin) => pin.netId !== null)).toBe(true)
  })

  it('rejects unsupported, missing pins, off-board and channel-gap contacts', () => {
    expect(() => buildMount(fixture('arduino_uno'), 'X1', 'BB1', 'a1', 0)).toThrow()
    const missing = fixture('bjt_npn')
    const child = missing.components[1]
    if (child) child.pins = child.pins.slice(0, 2)
    expect(() => buildMount(missing, 'X1', 'BB1', 'a1', 0)).toThrow()
    expect(() => buildMount(fixture(), 'X1', 'BB1', 'a27', 0)).toThrow()
    expect(() => buildMount(fixture('led'), 'X1', 'BB1', 'e5', 270)).toThrow()
    expect(() => buildMount(fixture(), 'X1', 'BB1', 'unknown', 0)).toThrow()
    expect(getMountFootprint('breadboard')).toBeUndefined()
  })

  it('occupancy is one component leg per hole, board-scoped; cables may share holes', () => {
    let base = fixture('led')
    base.components.push(component('resistor', 'R1'), component('breadboard', 'BB2'))
    base = connectPins(base, endpoint('BB1', 'a1'), endpoint('R1', 'a'))
    base.mounts = [buildMount(base, 'X1', 'BB1', 'a1', 0)]
    expect(() => buildMount(base, 'R1', 'BB1', 'a1', 0)).toThrow(/ocupado/)
    expect(buildMount(base, 'R1', 'BB2', 'a1', 0).contacts[0]?.contactId).toBe('a1')
    expect(buildMount(base, 'X1', 'BB1', 'a1', 0)).toEqual(base.mounts[0])
  })

  it('rejects forged, incomplete, duplicated and multiply-owned contact maps', () => {
    const base = fixture()
    const mount = buildMount(base, 'X1', 'BB1', 'a1', 0)
    for (const contacts of [
      mount.contacts.slice(0, 1),
      [
        { pinId: 'a', contactId: 'a1' },
        { pinId: 'b', contactId: 'a2' },
      ],
      [mount.contacts[0], mount.contacts[0]],
    ]) {
      expect(() =>
        validateMount(base, { ...mount, contacts: contacts as typeof mount.contacts }),
      ).toThrow()
    }
    expect(() => recomputeNets({ ...base, mounts: [mount, mount] })).toThrow()
  })

  it.each([0, 90, 180, 270] as Rotation[])(
    'resolves board rotation %s using exact world contact centroid and domain +y=-z',
    (rotation) => {
      const base = fixture()
      const board = base.components[0]
      if (!board) throw new Error('board')
      board.position = { x: 96, y: -48, rotation }
      base.mounts = [buildMount(base, 'X1', 'BB1', 'a1', 0)]
      const pose = resolveMountedPose(base, 'X1')
      const contacts =
        base.mounts[0]?.contacts.map((pin) =>
          BREADBOARD_CONTACTS.find((contact) => contact.pinId === pin.contactId),
        ) ?? []
      const x = contacts.reduce((sum, contact) => sum + (contact?.x ?? 0), 0) / contacts.length
      const z = contacts.reduce((sum, contact) => sum + (contact?.z ?? 0), 0) / contacts.length
      const theta = (rotation * Math.PI) / 180
      expect((pose?.x ?? 0) / 24).toBeCloseTo(4 + x * Math.cos(theta) + z * Math.sin(theta))
      expect(-(pose?.y ?? 0) / 24).toBeCloseTo(2 - x * Math.sin(theta) + z * Math.cos(theta))
      expect(pose?.rotation).toBe(rotation)
      expect(pose?.elevation).toBe(0.555)
    },
  )

  it.each([0, 90, 180, 270] as Rotation[])(
    'rotates footprints %s without inventing a channel contact',
    (rotation) => {
      const base = fixture('led')
      const mount = buildMount(base, 'X1', 'BB1', 'c15', rotation)
      const a = BREADBOARD_CONTACTS.find(
        (contact) => contact.pinId === mount.contacts[0]?.contactId,
      )
      const b = BREADBOARD_CONTACTS.find(
        (contact) => contact.pinId === mount.contacts[1]?.contactId,
      )
      const theta = (rotation * Math.PI) / 180
      expect((b?.x ?? 0) - (a?.x ?? 0)).toBeCloseTo(0.16 * Math.cos(theta))
      expect((b?.z ?? 0) - (a?.z ?? 0)).toBeCloseTo(-0.16 * Math.sin(theta))
    },
  )

  it('deleting a board preserves child world pose/elevation and external wires only', () => {
    let base = fixture()
    base.components.push(component('led', 'D1'))
    const board = base.components[0]
    if (board) board.position = { x: 48, y: 72, rotation: 90 }
    base.mounts = [buildMount(base, 'X1', 'BB1', 'a1', 0)]
    base = connectPins(base, endpoint('X1', 'a'), endpoint('D1', 'anode'))
    base = connectPins(base, endpoint('BB1', 'a8'), endpoint('D1', 'cathode'))
    const pose = resolveMountedPose(base, 'X1')
    const next = removeComponent(base, 'BB1')
    expect(next.mounts).toEqual([])
    expect(next.wires).toHaveLength(1)
    expect(next.components.find((item) => item.id === 'X1')).toMatchObject({
      position: { x: pose?.x, y: pose?.y, rotation: pose?.rotation },
      elevation: pose?.elevation,
    })
    expect(arePinsConnected(next, endpoint('X1', 'a'), endpoint('D1', 'anode'))).toBe(true)
    expect(
      next.components.find((item) => item.id === 'D1')?.pins.find((pin) => pin.pinId === 'cathode')
        ?.netId,
    ).toBeNull()
  })

  it('removing a redundant external wire retains mounted connectivity, then detaches cleanly', () => {
    let base = fixture()
    base.mounts = [buildMount(base, 'X1', 'BB1', 'a1', 0)]
    base = connectPins(base, endpoint('X1', 'a'), endpoint('BB1', 'b1'))
    const wire = base.wires?.[0]
    if (!wire) throw new Error('wire')
    const next = removeWire(base, wire.id)
    expect(arePinsConnected(next, endpoint('X1', 'a'), endpoint('BB1', 'b1'))).toBe(true)
    expect(recomputeNets({ ...next, mounts: [] }).nets).toEqual([])
  })

  it('legacy missing mounts is empty; mounting does not convert derived strips to cables', () => {
    let base = fixture()
    base = connectPins(base, endpoint('X1', 'a'), endpoint('BB1', 'a1'))
    const { mounts, wires, ...legacy } = base
    expect(mounts).toEqual([])
    expect(wires).toHaveLength(1)
    base = legacy
    const before = JSON.stringify(base)
    const mount = buildMount(base, 'X1', 'BB1', 'c5', 0)
    const next = recomputeNets({ ...base, mounts: [mount] })
    expect(next.wires?.length).toBeGreaterThan(0)
    expect(JSON.stringify(base)).toBe(before)
    expect(recomputeNets(next).wires).toEqual(next.wires)
  })
})

describe('ideal contact state providers', () => {
  it.each([
    ['switch_spst', 'closed', true, [['a', 'b']]],
    ['pushbutton', 'pressed', true, [['a', 'b']]],
    ['reed_switch', 'closed', true, [['a', 'b']]],
    ['switch_spdt', 'position', 'throw_b', [['common', 'throw_b']]],
    [
      'dip_switch_4',
      'closedMask',
      5,
      [
        ['a1', 'b1'],
        ['a3', 'b3'],
      ],
    ],
    ['rotary_encoder', 'pressed', true, [['SW1', 'SW2']]],
    ['relay_spdt', 'energized', true, [['COM', 'NO']]],
    ['keypad_4x4', 'key', '16', [['R4', 'C4']]],
  ] as const)('%s only joins declared manual contacts', (typeId, key, value, expected) => {
    const item = component(typeId)
    item.params[key] = value
    expect(getInternalContactPairs(item)).toEqual(expected)
    const next = recomputeNets({ ...createEmptyProject('state', 'State'), components: [item] })
    for (const [a, b] of expected)
      expect(arePinsConnected(next, endpoint(item.id, a), endpoint(item.id, b))).toBe(true)
    expect(next.wires).toEqual([])
  })
  it('opens/breaks contacts and never unions transistor/IC/passive/relay coil', () => {
    for (const typeId of ['resistor', 'bjt_npn', 'led', 'ne555']) {
      const item = COMPONENT_INDEX.has(typeId) ? component(typeId) : undefined
      if (item) expect(getInternalContactPairs(item)).toEqual([])
    }
    expect(getInternalContactPairs(component('relay_spdt'))).toEqual([['COM', 'NC']])
    expect(getInternalContactPairs(component('switch_spst'))).toEqual([])
    const malformed = component('switch_spst')
    malformed.params.closed = 'bad'
    expect(() => recomputeNets({ ...fixture(), components: [malformed] })).toThrow(/inválido/)
  })
})
