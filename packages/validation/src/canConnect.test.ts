/**
 * Pruebas de `canConnect` (RF-1.4, validación en tiempo real) y de las reglas que
 * la primera batería no cubría (V-4, V-6) más el caso de error de `connectPins`.
 *
 * Separado de `validate.test.ts` para mantener cada archivo enfocado: allí se prueba
 * el contrato de `validateCircuit`, aquí la API de tiempo real y las reglas que
 * dependen del catálogo.
 */

import type { Project } from '@circuitforge/netlist'
import { connectPins, createEmptyProject } from '@circuitforge/netlist'
import { describe, expect, it } from 'vitest'
import { emptyProject } from './fixtures.js'
import type { Catalog, CatalogEntry } from './rules.js'
import { canConnect, ruleV4, ruleV5, ruleV6, validateCircuit } from './validate.js'

/** Catálogo mínimo, con terminales de carga pasivos y una fuente identificable. */
function catalog(): Catalog {
  const entries: CatalogEntry[] = [
    {
      typeId: 'led',
      category: 'semiconductor',
      pins: [
        { id: 'anode', type: 'passive' },
        { id: 'cathode', type: 'passive' },
      ],
      maxVoltage: 2.2,
    },
    {
      typeId: 'mcu',
      category: 'mcu',
      pins: [
        { id: '5V', type: 'power' },
        { id: 'GND', type: 'gnd' },
        { id: 'D13', type: 'digital' },
      ],
      maxVoltage: 5.5,
    },
    {
      typeId: 'dc_source',
      category: 'source',
      pins: [
        { id: 'positive', type: 'power' },
        { id: 'negative', type: 'gnd' },
      ],
    },
    {
      typeId: 'resistor',
      category: 'passive',
      pins: [
        { id: 'a', type: 'passive' },
        { id: 'b', type: 'passive' },
      ],
    },
  ]
  return new Map(entries.map((e) => [e.typeId, e]))
}

/** Proyecto con dos componentes y sus pines sin conectar. */
function twoComponents(): Project {
  const base = createEmptyProject('p', 'test')
  return {
    ...base,
    components: [
      {
        id: 'U1',
        typeId: 'mcu',
        position: { x: 0, y: 0, rotation: 0 },
        params: {},
        pins: [
          { pinId: '5V', type: 'power', netId: null },
          { pinId: 'GND', type: 'gnd', netId: null },
          { pinId: 'D13', type: 'digital', netId: null },
        ],
      },
      {
        id: 'D1',
        typeId: 'led',
        position: { x: 40, y: 0, rotation: 0 },
        params: {},
        pins: [
          { pinId: 'anode', type: 'power', netId: null },
          { pinId: 'cathode', type: 'gnd', netId: null },
        ],
      },
    ],
  }
}

/** Snapshot antiguo: el LED aún conserva power/gnd, sin migrarlo al leer. */
function legacyCircuit(): Project {
  const p = twoComponents()
  p.components.push(
    {
      id: 'V1',
      typeId: 'dc_source',
      position: { x: 0, y: 0, rotation: 0 },
      params: {},
      pins: [
        { pinId: 'positive', type: 'power', netId: null },
        { pinId: 'negative', type: 'gnd', netId: null },
      ],
    },
    {
      id: 'R1',
      typeId: 'resistor',
      position: { x: 0, y: 0, rotation: 0 },
      params: {},
      pins: [
        { pinId: 'a', type: 'power', netId: null },
        { pinId: 'b', type: 'gnd', netId: null },
      ],
    },
  )
  return p
}

function wire(p: Project, a: string, b: string): Project {
  const [componentA = '', pinA = ''] = a.split(':')
  const [componentB = '', pinB = ''] = b.split(':')
  return connectPins(
    p,
    { componentId: componentA, pinId: pinA },
    { componentId: componentB, pinId: pinB },
  )
}

function reversedCircuit(): Project {
  return wire(wire(legacyCircuit(), 'D1:anode', 'V1:negative'), 'D1:cathode', 'V1:positive')
}

describe('canConnect', () => {
  it('blocks a power-to-gnd connection and explains the rule', () => {
    // RF-1.4: cortocircuito entre VCC y GND → bloqueo.
    const p = twoComponents()
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: '5V' },
      { componentId: 'U1', pinId: 'GND' },
      catalog(),
    )

    expect(result.allowed).toBe(false)
    expect(result.violation?.rule).toBe('V-1')
    expect(result.violation?.severity).toBe('error')
  })

  it('allows two power pins because V-2 is only a warning', () => {
    const p = legacyCircuit()
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: '5V' },
      { componentId: 'V1', pinId: 'positive' },
      catalog(),
    )

    expect(result.allowed).toBe(true)
    expect(validateCircuit(wire(p, 'U1:5V', 'V1:positive'), catalog())).toContainEqual(
      expect.objectContaining({ rule: 'V-2', severity: 'warning' }),
    )
  })

  it('allows a valid digital connection', () => {
    const p = twoComponents()
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: 'D13' },
      { componentId: 'D1', pinId: 'anode' },
      catalog(),
    )

    expect(result.allowed).toBe(true)
    expect(result.violation).toBeUndefined()
  })

  it('fails closed when a pin does not exist', () => {
    // Unknown topology is not evidence that a cable is safe.
    const p = twoComponents()
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: 'NOPE' },
      { componentId: 'U1', pinId: '5V' },
      catalog(),
    )

    expect(result.allowed).toBe(false)
  })

  it('allows legacy passive terminals on either rail but blocks a real merged short', () => {
    let p = wire(legacyCircuit(), 'V1:positive', 'R1:b')
    expect(
      canConnect(
        p,
        { componentId: 'V1', pinId: 'negative' },
        { componentId: 'R1', pinId: 'a' },
        catalog(),
      ),
    ).toEqual({ allowed: true })
    p = wire(p, 'V1:negative', 'R1:a')
    const before = JSON.stringify(p)
    const result = canConnect(
      p,
      { componentId: 'R1', pinId: 'a' },
      { componentId: 'R1', pinId: 'b' },
      catalog(),
    )
    expect(result.allowed).toBe(false)
    expect(result.violation?.rule).toBe('V-1')
    expect(JSON.stringify(p)).toBe(before)
  })

  it('is pure: does not mutate the project it inspects', () => {
    const p = twoComponents()
    const before = JSON.stringify(p)
    canConnect(
      p,
      { componentId: 'U1', pinId: 'D13' },
      { componentId: 'D1', pinId: 'anode' },
      catalog(),
    )

    expect(JSON.stringify(p)).toBe(before)
  })
})

describe('ruleV4 — polaridad', () => {
  it('warns for both reversed terminals on distinct direct source nets, without blocking', () => {
    const p = wire(legacyCircuit(), 'D1:anode', 'V1:negative')
    expect(
      canConnect(
        p,
        { componentId: 'D1', pinId: 'cathode' },
        { componentId: 'V1', pinId: 'positive' },
        catalog(),
      ),
    ).toEqual({ allowed: true })

    const reversed = wire(p, 'D1:cathode', 'V1:positive')
    expect(ruleV4(reversed, catalog())).toEqual([
      expect.objectContaining({ rule: 'V-4', severity: 'warning', componentId: 'D1' }),
    ])
    expect(validateCircuit(reversed, catalog()).filter((v) => v.rule === 'V-1')).toEqual([])
  })

  it('warns for current passive diode terminals as well as legacy LED terminals', () => {
    const p = reversedCircuit()
    p.components = p.components.map((component) =>
      component.id === 'D1'
        ? {
            ...component,
            typeId: 'diode',
            pins: component.pins.map((pin) => ({ ...pin, type: 'passive' })),
          }
        : component,
    )
    const entries = new Map(catalog())
    entries.set('diode', {
      typeId: 'diode',
      category: 'semiconductor',
      pins: [
        { id: 'anode', type: 'passive' },
        { id: 'cathode', type: 'passive' },
      ],
    })
    expect(ruleV4(p, entries)).toContainEqual(
      expect.objectContaining({ componentId: 'D1', severity: 'warning' }),
    )
  })

  it('requires both rails of the same external source', () => {
    const p = legacyCircuit()
    const source = p.components.find((component) => component.id === 'V1')
    if (!source) throw new Error('Fixture requires V1')
    p.components.push({ ...source, id: 'V2', pins: source.pins.map((pin) => ({ ...pin })) })
    const split = wire(wire(p, 'D1:anode', 'V1:negative'), 'D1:cathode', 'V2:positive')
    expect(ruleV4(split, catalog())).toEqual([])
  })

  it('does not infer inversion from a cathode alone or its legacy type', () => {
    const p = wire(legacyCircuit(), 'D1:cathode', 'V1:positive')
    expect(ruleV4(p, catalog())).toEqual([])
    expect(ruleV4(twoComponents(), catalog())).toEqual([])
  })

  it('does not warn for normal polarity or missing catalog evidence', () => {
    const normal = wire(
      wire(legacyCircuit(), 'D1:anode', 'V1:positive'),
      'D1:cathode',
      'V1:negative',
    )
    expect(ruleV4(normal, catalog())).toEqual([])
    expect(ruleV4(reversedCircuit(), new Map())).toEqual([])
    const noSource = new Map(catalog())
    noSource.delete('dc_source')
    expect(ruleV4(reversedCircuit(), noSource)).toEqual([])
  })

  it('does not treat MCU supply inputs as an external source', () => {
    const p = wire(wire(legacyCircuit(), 'D1:anode', 'U1:GND'), 'D1:cathode', 'U1:5V')
    expect(ruleV4(p, catalog())).toEqual([])
  })

  it('recognizes catalog source and battery categories but not a ground reference', () => {
    for (const category of ['source', 'battery']) {
      const p = reversedCircuit()
      p.components = p.components.map((c) =>
        c.id === 'V1' ? { ...c, typeId: 'custom_supply' } : c,
      )
      const entries = new Map(catalog())
      entries.set('custom_supply', {
        typeId: 'custom_supply',
        category,
        pins: [
          { id: 'positive', type: 'power' },
          { id: 'negative', type: 'gnd' },
        ],
      })
      expect(ruleV4(p, entries)).toHaveLength(1)
      entries.set('custom_supply', {
        typeId: 'custom_supply',
        category,
        pins: [{ id: 'negative', type: 'gnd' }],
      })
      expect(ruleV4(p, entries)).toEqual([])
    }
  })

  it('uses both terminals of the same diode, not pinIds from two different LEDs', () => {
    const p = legacyCircuit()
    const diode = p.components.find((component) => component.id === 'D1')
    if (!diode) throw new Error('Fixture requires D1')
    p.components.push({ ...diode, id: 'D2', pins: diode.pins.map((pin) => ({ ...pin })) })
    const split = wire(wire(p, 'D1:anode', 'V1:negative'), 'D2:cathode', 'V1:positive')
    expect(ruleV4(split, catalog())).toEqual([])
    const oneReversed = wire(split, 'D1:cathode', 'V1:positive')
    expect(ruleV4(oneReversed, catalog()).map((v) => v.componentId)).toEqual(['D1'])
  })

  it('does not traverse a resistor or infer polarity on one shorted net', () => {
    const p = wire(
      wire(wire(legacyCircuit(), 'D1:anode', 'V1:negative'), 'D1:cathode', 'R1:a'),
      'R1:b',
      'V1:positive',
    )
    expect(ruleV4(p, catalog())).toEqual([])
    const shorted = wire(reversedCircuit(), 'V1:positive', 'V1:negative')
    expect(ruleV4(shorted, catalog())).toEqual([])
    expect(validateCircuit(shorted, catalog())).toContainEqual(
      expect.objectContaining({ rule: 'V-1' }),
    )
  })

  it('does not mutate a legacy project or catalog while checking polarity', () => {
    const p = reversedCircuit()
    const entries = catalog()
    const before = JSON.stringify([p, [...entries]])
    ruleV4(p, entries)
    validateCircuit(p, entries)
    expect(JSON.stringify([p, [...entries]])).toBe(before)
  })
})

describe('ruleV5 — pines sin conectar', () => {
  it('warns for a component known to the catalog with a loose pin', () => {
    const p = twoComponents()
    const violations = ruleV5(p, catalog())

    // U1 tiene 3 pines sueltos y D1 tiene 2 → ambos avisan.
    expect(violations).toHaveLength(2)
    expect(violations.every((v) => v.rule === 'V-5')).toBe(true)
  })

  it('ignores components whose typeId is absent from the catalog', () => {
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        {
          id: 'X1',
          typeId: 'unknown_type',
          position: { x: 0, y: 0, rotation: 0 },
          params: {},
          pins: [{ pinId: 'a', type: 'power', netId: null }],
        },
      ],
    }

    expect(ruleV5(p, catalog())).toEqual([])
  })
})

describe('ruleV6 — sobretensión', () => {
  it('warns when a net voltage exceeds the pin maximum', () => {
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        {
          id: 'D1',
          typeId: 'led',
          position: { x: 0, y: 0, rotation: 0 },
          params: {},
          pins: [{ pinId: 'anode', type: 'power', netId: 'N1' }],
        },
      ],
      nets: [{ id: 'N1', pins: [{ componentId: 'D1', pinId: 'anode' }] }],
      // 9 V sobre un LED con máximo de 2.2 V.
      netVoltages: { N1: 9 },
    } as Project

    expect(ruleV6(p, catalog())).toContainEqual(
      expect.objectContaining({ rule: 'V-6', severity: 'warning' }),
    )
  })

  it('stays silent when no voltages were solved', () => {
    // Sin solver no hay tensiones: la regla no debe inventar un aviso.
    const p = twoComponents()
    expect(ruleV6(p, catalog())).toEqual([])
  })

  it('does not warn when the voltage is within limits', () => {
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        {
          id: 'D1',
          typeId: 'led',
          position: { x: 0, y: 0, rotation: 0 },
          params: {},
          pins: [{ pinId: 'anode', type: 'power', netId: 'N1' }],
        },
      ],
      nets: [{ id: 'N1', pins: [{ componentId: 'D1', pinId: 'anode' }] }],
      netVoltages: { N1: 2.0 },
    } as Project

    expect(ruleV6(p, catalog())).toEqual([])
  })
})

describe('validateCircuit — orden y agregación', () => {
  it('sorts errors before warnings', () => {
    // Un net con power+gnd (V-1, error) y otro net huérfano (V-3, warning).
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        {
          id: 'U1',
          typeId: 'mcu',
          position: { x: 0, y: 0, rotation: 0 },
          params: {},
          pins: [
            { pinId: '5V', type: 'power', netId: 'N1' },
            { pinId: 'GND', type: 'gnd', netId: 'N1' },
            { pinId: 'D13', type: 'digital', netId: 'N2' },
          ],
        },
      ],
      nets: [
        {
          id: 'N1',
          pins: [
            { componentId: 'U1', pinId: '5V' },
            { componentId: 'U1', pinId: 'GND' },
          ],
        },
        { id: 'N2', pins: [{ componentId: 'U1', pinId: 'D13' }] },
      ],
    }

    const violations = validateCircuit(p, catalog())
    expect(violations.length).toBeGreaterThan(1)
    expect(violations[0]?.severity).toBe('error')
    expect(violations[0]?.rule).toBe('V-1')
  })

  it('returns an empty list for a project that is genuinely empty', () => {
    expect(validateCircuit(emptyProject(), new Map())).toEqual([])
  })
})
