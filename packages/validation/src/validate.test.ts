import { describe, expect, it } from 'vitest'
import { emptyProject, projectWithNet } from './fixtures.js'
import type { Catalog } from './rules.js'
import { ruleV1, ruleV2, ruleV5, validateCircuit } from './validate.js'

describe('registry validation metadata', () => {
  it('V-2 counts power output sources, not consumer VCC inputs, with a legacy fallback', () => {
    const p = projectWithNet([
      { componentId: 'V1', pinId: 'VCC', type: 'power' },
      { componentId: 'U1', pinId: 'VCC', type: 'power' },
      { componentId: 'U2', pinId: 'VCC', type: 'power' },
    ])
    p.components = p.components.map((component) => ({
      ...component,
      typeId: component.id === 'V1' ? 'source' : 'consumer',
    }))
    const catalog: Catalog = new Map([
      [
        'source',
        {
          typeId: 'source',
          category: 'source',
          pins: [{ id: 'VCC', type: 'power', powerRole: 'output' }],
        },
      ],
      [
        'consumer',
        {
          typeId: 'consumer',
          category: 'mcu',
          pins: [{ id: 'VCC', type: 'power', powerRole: 'input' }],
        },
      ],
    ])
    expect(ruleV2(p, catalog)).toEqual([])
    expect(ruleV2(p, new Map())).toHaveLength(1)
    const outputs = p.components.map((component) => ({ ...component, typeId: 'source' }))
    expect(ruleV2({ ...p, components: outputs }, catalog)).toHaveLength(1)
  })

  it('V-1 still rejects consumer power input shorted to ground', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: 'VCC', type: 'power' },
      { componentId: 'U1', pinId: 'GND', type: 'gnd' },
    ])
    p.components = p.components.map((component) => ({ ...component, typeId: 'consumer' }))
    const catalog: Catalog = new Map([
      [
        'consumer',
        {
          typeId: 'consumer',
          category: 'mcu',
          pins: [
            { id: 'VCC', type: 'power', powerRole: 'input' },
            { id: 'GND', type: 'gnd', powerRole: 'reference' },
          ],
        },
      ],
    ])
    expect(ruleV1(p, catalog)).toHaveLength(1)
  })

  it('V-5 skips optional pins but detects missing required pins', () => {
    const p = projectWithNet([{ componentId: 'U1', pinId: 'VCC', type: 'power' }])
    p.components = p.components.map((component) => ({
      ...component,
      typeId: 'consumer',
      pins: [...component.pins, { pinId: 'D0', type: 'digital', netId: null }],
    }))
    const catalog: Catalog = new Map([
      [
        'consumer',
        {
          typeId: 'consumer',
          category: 'mcu',
          pins: [
            { id: 'VCC', type: 'power' },
            { id: 'D0', type: 'digital', required: false },
          ],
        },
      ],
    ])
    expect(ruleV5(p, catalog)).toEqual([])
    const missing = {
      ...p,
      components: p.components.map((component) => ({
        ...component,
        pins: component.pins.filter((pin) => pin.pinId !== 'VCC'),
      })),
    }
    expect(ruleV5(missing, catalog)).toHaveLength(1)
  })
})

describe('validateCircuit', () => {
  it('V-1: blocks a net holding both power and gnd', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: '5V', type: 'power' },
      { componentId: 'U1', pinId: 'GND', type: 'gnd' },
    ])

    expect(validateCircuit(p, new Map())).toContainEqual(
      expect.objectContaining({ rule: 'V-1', severity: 'error' }),
    )
  })

  it('V-2: warns when connecting digital to power', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: 'D13', type: 'digital' },
      { componentId: 'PS1', pinId: 'OUT', type: 'power' },
    ])

    expect(validateCircuit(p, new Map())).toContainEqual(
      expect.objectContaining({ rule: 'V-2', severity: 'warning' }),
    )
  })

  it('V-3: warns on a net with a single pin', () => {
    // Review Focus #2: net huérfano / componente aislado.
    const p = projectWithNet([{ componentId: 'R1', pinId: 'a', type: 'power' }])

    expect(validateCircuit(p, new Map())).toContainEqual(
      expect.objectContaining({ rule: 'V-3', severity: 'warning' }),
    )
  })

  it.each(['resistor', 'inductor', 'led', 'diode'])(
    'resolves legacy %s pin types from passive catalog pins without mutation',
    (typeId) => {
      const p = projectWithNet([
        { componentId: 'X1', pinId: 'a', type: 'power' },
        { componentId: 'X1', pinId: 'b', type: 'gnd' },
        { componentId: 'U1', pinId: '5V', type: 'power' },
      ])
      p.components = p.components.map((c) => (c.id === 'X1' ? { ...c, typeId } : c))
      const catalog: Catalog = new Map([
        [
          typeId,
          {
            typeId,
            category: 'passive',
            pins: [
              { id: 'a', type: 'passive' },
              { id: 'b', type: 'passive' },
            ],
          },
        ],
      ])
      const before = JSON.stringify([p, [...catalog]])
      expect(ruleV1(p, catalog)).toEqual([])
      expect(ruleV2(p, catalog)).toEqual([])
      expect(JSON.stringify([p, [...catalog]])).toBe(before)
    },
  )

  it('does not override unknown types, missing pins, or non-passive catalog types', () => {
    const p = projectWithNet([
      { componentId: 'X1', pinId: 'a', type: 'power' },
      { componentId: 'U1', pinId: 'GND', type: 'gnd' },
    ])
    const check = (typeId: string, pins: { id: string; type: string }[]) => {
      p.components = p.components.map((c) => (c.id === 'X1' ? { ...c, typeId } : c))
      const catalog: Catalog = new Map([[typeId, { typeId, category: 'passive', pins }]])
      expect(ruleV1(p, catalog)).toHaveLength(1)
    }
    check('unknown', [{ id: 'a', type: 'passive' }])
    check('resistor', [{ id: 'other', type: 'passive' }])
    check('resistor', [{ id: 'a', type: 'digital' }])
    expect(ruleV1(p, new Map())).toHaveLength(1)
  })

  it('does not hide a real short when legacy passive terminals share its net', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: '5V', type: 'power' },
      { componentId: 'U1', pinId: 'GND', type: 'gnd' },
      { componentId: 'R1', pinId: 'a', type: 'power' },
    ])
    p.components = p.components.map((c) => (c.id === 'R1' ? { ...c, typeId: 'resistor' } : c))
    const catalog: Catalog = new Map([
      [
        'resistor',
        {
          typeId: 'resistor',
          category: 'passive',
          pins: [{ id: 'a', type: 'passive' }],
        },
      ],
    ])
    expect(ruleV1(p, catalog)).toHaveLength(1)
  })

  it('returns no violations for an empty project', () => {
    // Review Focus #1: circuito vacío no debe lanzar ni dividir por cero.
    expect(validateCircuit(emptyProject(), new Map())).toEqual([])
  })

  it('does not throw when a typeId is absent from the catalog', () => {
    // Review Focus #5: typeId inexistente no debe corromper el estado.
    const p = projectWithNet([], [{ id: 'X1', typeId: 'unknown_type' }])

    expect(() => validateCircuit(p, new Map())).not.toThrow()
  })
})
