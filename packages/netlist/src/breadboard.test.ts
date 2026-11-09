import { describe, expect, it } from 'vitest'
import { BREADBOARD_CONTACTS, BREADBOARD_GROUPS } from './breadboard.js'
import {
  connectPins,
  createEmptyProject,
  disconnectPins,
  removeComponent,
  removeWire,
} from './netlist.js'
import { arePinsConnected, materializeWires, recomputeNets } from './topology.js'
import type { Component, PinEndpoint, Project } from './types.js'

const ep = (componentId: string, pinId = 'a'): PinEndpoint => ({ componentId, pinId })
function fixture(): Project {
  const board: Component = {
    id: 'BB1',
    typeId: 'breadboard',
    params: {},
    position: { x: 0, y: 0, rotation: 0 },
    pins: BREADBOARD_CONTACTS.map(({ pinId }) => ({ pinId, type: 'passive', netId: null })),
  }
  return {
    ...createEmptyProject('p', 'test'),
    components: [
      board,
      ...['R1', 'R2', 'R3', 'R4'].map(
        (id): Component => ({
          id,
          typeId: 'resistor',
          params: {},
          position: { x: 0, y: 0, rotation: 0 },
          pins: [{ pinId: 'a', type: 'passive', netId: null }],
        }),
      ),
    ],
  }
}
const pinNet = (p: Project, e: PinEndpoint) =>
  p.components.find((c) => c.id === e.componentId)?.pins.find((pin) => pin.pinId === e.pinId)?.netId

describe('canonical breadboard', () => {
  it('defines 420 unique passive contact locations in 60 strips and 4 continuous rails', () => {
    expect(BREADBOARD_CONTACTS).toHaveLength(420)
    expect(new Set(BREADBOARD_CONTACTS.map((pin) => pin.pinId)).size).toBe(420)
    expect(new Set(BREADBOARD_CONTACTS.map((pin) => `${pin.x}:${pin.z}`)).size).toBe(420)
    expect(BREADBOARD_GROUPS).toHaveLength(64)
    expect(BREADBOARD_GROUPS.filter((group) => group.pinIds.length === 5)).toHaveLength(60)
    expect(BREADBOARD_GROUPS.filter((group) => group.pinIds.length === 30)).toHaveLength(4)
    expect(BREADBOARD_CONTACTS.find((pin) => pin.pinId === 'a1')).toMatchObject({
      x: -2.32,
      z: -0.96,
    })
    expect(BREADBOARD_CONTACTS.find((pin) => pin.pinId === 'j30')).toMatchObject({
      x: 2.32,
      z: 0.96,
    })
    expect([...new Set(BREADBOARD_CONTACTS.map((pin) => pin.x))]).toHaveLength(30)
  })

  it('knows idle strips and full rails without idle nets or center/adjacent/rail leakage', () => {
    const p = fixture()
    expect(recomputeNets(p).nets).toEqual([])
    expect(p.wires).toEqual([])
    for (const [a, b, connected] of [
      ['a1', 'e1', true],
      ['e1', 'f1', false],
      ['a1', 'a2', false],
      ['rail_top_positive_1', 'rail_top_positive_30', true],
      ['rail_top_positive_1', 'rail_top_negative_1', false],
      ['rail_top_positive_1', 'a1', false],
      ['rail_bottom_negative_1', 'rail_bottom_negative_30', true],
    ] as const)
      expect(arePinsConnected(p, ep('BB1', a), ep('BB1', b))).toBe(connected)
  })

  it('reuses same-strip connectivity but records only authored physical cables', () => {
    const p = connectPins(
      connectPins(fixture(), ep('R1'), ep('BB1', 'a1')),
      ep('R2'),
      ep('BB1', 'e1'),
    )
    expect(p.wires).toHaveLength(2)
    expect(p.nets).toHaveLength(1)
    expect(p.nets[0]?.pins).toHaveLength(7)
    expect(pinNet(p, ep('BB1', 'f1'))).toBeNull()
    const jumper = connectPins(p, ep('BB1', 'b1'), ep('BB1', 'd1'))
    expect(jumper.wires).toHaveLength(3)
    expect(jumper.nets).toHaveLength(1)
    expect(() => connectPins(jumper, ep('BB1', 'd1'), ep('BB1', 'b1'))).toThrow(/already connected/)
  })

  it('splits nets when a bridge is removed and keeps every surviving pin reciprocal', () => {
    let p = connectPins(fixture(), ep('R1'), ep('R2'))
    p = connectPins(p, ep('R3'), ep('R4'))
    p = connectPins(p, ep('R2'), ep('R3'))
    const before = JSON.stringify(p)
    const split = removeWire(p, 'W3')
    expect(split.nets).toHaveLength(2)
    expect(split.nets.map((net) => net.id)).toEqual(['N1', 'N3'])
    expect(JSON.stringify(p)).toBe(before)
    expect(split.nextWireSeq).toBe(4)
    for (const net of split.nets)
      for (const pin of net.pins) expect(pinNet(split, pin)).toBe(net.id)
    expect(connectPins(split, ep('R2'), ep('R3')).wires?.at(-1)?.id).toBe('W4')
    expect(removeWire(p, 'missing')).toBe(p)
  })

  it('allows a redundant distinct wire, survives removal through an alternate path', () => {
    let p = connectPins(connectPins(fixture(), ep('R1'), ep('R2')), ep('R2'), ep('R3'))
    p = connectPins(p, ep('R1'), ep('R3'))
    expect(p.wires).toHaveLength(3)
    const disconnected = disconnectPins(p, ep('R2'), ep('R1'))
    expect(disconnected.wires).toHaveLength(2)
    expect(arePinsConnected(disconnected, ep('R1'), ep('R2'))).toBe(true)
  })

  it('deleting infrastructure severs outside pins unless a physical alternate path remains', () => {
    const p = connectPins(
      connectPins(fixture(), ep('R1'), ep('BB1', 'a1')),
      ep('R2'),
      ep('BB1', 'e1'),
    )
    const removed = removeComponent(p, 'BB1')
    expect(removed.nets).toEqual([])
    expect(removed.wires).toEqual([])
    expect(
      removed.components.every((component) => component.pins.every((pin) => pin.netId === null)),
    ).toBe(true)
    const alternate = removeComponent(connectPins(p, ep('R1'), ep('R2')), 'BB1')
    expect(alternate.wires).toHaveLength(1)
    expect(alternate.nets[0]?.pins).toEqual([ep('R1'), ep('R2')])
    expect(p.components).toHaveLength(5)
  })

  it('materializes legacy net stars once before edits, preserving previous connectivity', () => {
    const fresh = fixture()
    const { wires: _wires, ...legacy } = fresh
    const p: Project = { ...legacy, nets: [{ id: 'N8', pins: [ep('R1'), ep('R2'), ep('R3')] }] }
    const before = JSON.stringify(p)
    const materialized = materializeWires(p)
    expect(materialized.wires).toHaveLength(2)
    expect(arePinsConnected(materialized, ep('R2'), ep('R3'))).toBe(true)
    const edited = connectPins(p, ep('R4'), ep('BB1', 'a1'))
    expect(edited.wires).toHaveLength(3)
    expect(edited.nets.map((net) => net.id)).toContain('N8')
    expect(arePinsConnected(edited, ep('R2'), ep('R3'))).toBe(true)
    expect(materializeWires(edited)).toBe(edited)
    expect(JSON.stringify(p)).toBe(before)
  })

  it('never re-materializes derived infrastructure contacts after legacy recompute', () => {
    const { wires: _wires, ...legacy } = fixture()
    const p: Project = { ...legacy, nets: [{ id: 'N1', pins: [ep('R1'), ep('BB1', 'a1')] }] }
    const normalized = recomputeNets(p)
    expect(normalized.wires).toHaveLength(1)
    expect(normalized.nets[0]?.pins).toHaveLength(6)
    expect(recomputeNets(normalized).wires).toHaveLength(1)
    expect(connectPins(normalized, ep('R2'), ep('BB1', 'e1')).wires).toHaveLength(2)
  })

  it('treats explicit empty wires as authoritative over stale derived nets', () => {
    const p: Project = { ...fixture(), nets: [{ id: 'N8', pins: [ep('R1'), ep('R2')] }] }
    expect(recomputeNets(p).nets).toEqual([])
    expect(arePinsConnected(p, ep('R1'), ep('R2'))).toBe(false)
  })
})
