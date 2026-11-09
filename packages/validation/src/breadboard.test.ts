import type { Component, Project } from '@circuitforge/netlist'
import { BREADBOARD_CONTACTS, connectPins, createEmptyProject } from '@circuitforge/netlist'
import { describe, expect, it } from 'vitest'
import type { Catalog } from './rules.js'
import { canConnect, ruleV1, ruleV5, validateCircuit } from './validate.js'

const ep = (componentId: string, pinId: string) => ({ componentId, pinId })
const board: Component = {
  id: 'BB1',
  typeId: 'breadboard',
  params: {},
  position: { x: 0, y: 0, rotation: 0 },
  pins: BREADBOARD_CONTACTS.map(({ pinId }) => ({ pinId, type: 'passive', netId: null })),
}
function fixture(): Project {
  return {
    ...createEmptyProject('p', 'test'),
    components: [
      board,
      {
        id: 'V1',
        typeId: 'dc_source',
        params: {},
        position: { x: 0, y: 0, rotation: 0 },
        pins: [
          { pinId: 'positive', type: 'power', netId: null },
          { pinId: 'negative', type: 'gnd', netId: null },
        ],
      },
    ],
  }
}
const catalog: Catalog = new Map([
  [
    'breadboard',
    {
      typeId: 'breadboard',
      category: 'connectivity',
      pins: BREADBOARD_CONTACTS.map(({ pinId }) => ({ id: pinId, type: 'passive' })),
    },
  ],
  [
    'dc_source',
    {
      typeId: 'dc_source',
      category: 'source',
      pins: [
        { id: 'positive', type: 'power' },
        { id: 'negative', type: 'gnd' },
      ],
    },
  ],
])

describe('breadboard safety', () => {
  it('does not let punctuation collisions hide real source types', () => {
    const component = (
      id: string,
      pinId: string,
      type: 'power' | 'passive' | 'gnd',
    ): Component => ({
      id,
      typeId: 'unknown',
      params: {},
      position: { x: 0, y: 0, rotation: 0 },
      pins: [{ pinId, type, netId: null }],
    })
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        component('V:pos', 'x', 'power'),
        component('V', 'pos:x', 'passive'),
        component('G', 'g', 'gnd'),
      ],
    }
    expect(canConnect(p, ep('V:pos', 'x'), ep('G', 'g'), new Map())).toMatchObject({
      allowed: false,
      violation: { rule: 'V-1' },
    })
  })
  it('ignores unused infrastructure holes and unpowered rail markings', () => {
    expect(ruleV5({ ...fixture(), components: [board] }, catalog)).toEqual([])
    expect(ruleV1(fixture(), catalog)).toEqual([])
    expect(
      canConnect(fixture(), ep('V1', 'negative'), ep('BB1', 'rail_top_positive_1'), catalog)
        .allowed,
    ).toBe(true)
  })
  it.each([
    ['a1', 'e1'],
    ['f30', 'j30'],
    ['rail_top_positive_1', 'rail_top_positive_30'],
    ['rail_top_negative_1', 'rail_top_negative_30'],
    ['rail_bottom_positive_1', 'rail_bottom_positive_30'],
    ['rail_bottom_negative_1', 'rail_bottom_negative_30'],
  ])('rejects source short through continuous conductor %s/%s before mutation', (a, b) => {
    const p = connectPins(fixture(), ep('V1', 'positive'), ep('BB1', a))
    const before = JSON.stringify(p)
    expect(canConnect(p, ep('V1', 'negative'), ep('BB1', b), catalog)).toMatchObject({
      allowed: false,
      violation: { rule: 'V-1' },
    })
    expect(JSON.stringify(p)).toBe(before)
  })
  it.each([
    ['a1', 'f1'],
    ['a1', 'a2'],
    ['rail_top_positive_1', 'rail_top_negative_1'],
  ])('does not bridge isolated contacts %s/%s', (a, b) => {
    const p = connectPins(fixture(), ep('V1', 'positive'), ep('BB1', a))
    expect(canConnect(p, ep('V1', 'negative'), ep('BB1', b), catalog).allowed).toBe(true)
  })
  it('checks imported legacy nets with strips as well as explicit-wire circuits', () => {
    const { wires: _wires, ...legacy } = fixture()
    const p: Project = {
      ...legacy,
      nets: [
        { id: 'N1', pins: [ep('V1', 'positive'), ep('BB1', 'a1')] },
        { id: 'N2', pins: [ep('V1', 'negative'), ep('BB1', 'e1')] },
      ],
    }
    expect(validateCircuit(p, catalog)).toContainEqual(expect.objectContaining({ rule: 'V-1' }))
  })
  it('fails closed on malformed topology without weakening normal net validation', () => {
    const p: Project = {
      ...fixture(),
      wires: [{ id: 'W1', from: ep('NOPE', 'a'), to: ep('BB1', 'a1') }],
    }
    expect(canConnect(p, ep('V1', 'positive'), ep('BB1', 'f1'), catalog).allowed).toBe(false)
    const unknownOverride: Catalog = new Map([
      [
        'dc_source',
        {
          typeId: 'dc_source',
          category: 'source',
          pins: [
            { id: 'positive', type: 'passive' },
            { id: 'negative', type: 'passive' },
          ],
        },
      ],
    ])
    expect(
      canConnect(fixture(), ep('V1', 'positive'), ep('V1', 'negative'), unknownOverride).allowed,
    ).toBe(false)
  })
})
