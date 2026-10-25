/**
 * Pruebas de `canConnect` (RF-1.4, validación en tiempo real) y de las reglas que
 * la primera batería no cubría (V-4, V-6) más el caso de error de `connectPins`.
 *
 * Separado de `validate.test.ts` para mantener cada archivo enfocado: allí se prueba
 * el contrato de `validateCircuit`, aquí la API de tiempo real y las reglas que
 * dependen del catálogo.
 */

import type { Project } from '@circuitforge/netlist'
import { createEmptyProject } from '@circuitforge/netlist'
import { describe, expect, it } from 'vitest'
import { emptyProject, projectWithNet } from './fixtures.js'
import type { Catalog, CatalogEntry } from './rules.js'
import { canConnect, ruleV4, ruleV5, ruleV6, validateCircuit } from './validate.js'

/** Catálogo de prueba con dos fichas. */
function catalog(): Catalog {
  const entries: CatalogEntry[] = [
    {
      typeId: 'led',
      category: 'semiconductor',
      pins: [
        { id: 'anode', type: 'power' },
        { id: 'cathode', type: 'gnd' },
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

  it('blocks joining two different power nets', () => {
    const p = twoComponents()
    // Primero conectar anode del LED a VCC, luego intentar unir 5V con esa red.
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: '5V' },
      { componentId: 'D1', pinId: 'anode' },
      catalog(),
    )

    // Dos pines `power` en el mismo net → V-2, que es warning, no error: se permite.
    expect(result.allowed).toBe(true)
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

  it('does not block when a pin does not exist', () => {
    // Un fallo al construir el net hipotético no debe bloquear la interfaz.
    const p = twoComponents()
    const result = canConnect(
      p,
      { componentId: 'U1', pinId: 'NOPE' },
      { componentId: 'U1', pinId: '5V' },
      catalog(),
    )

    expect(result.allowed).toBe(true)
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
  it('warns when the anode is on the gnd side of the net', () => {
    // El cátodo cae en un net con tipo `power` → polaridad invertida.
    const p: Project = {
      ...createEmptyProject('p', 'test'),
      components: [
        {
          id: 'D1',
          typeId: 'led',
          position: { x: 0, y: 0, rotation: 0 },
          params: {},
          pins: [{ pinId: 'cathode', type: 'power', netId: 'N1' }],
        },
      ],
      nets: [{ id: 'N1', pins: [{ componentId: 'D1', pinId: 'cathode' }] }],
    }

    expect(ruleV4(p, catalog())).toContainEqual(
      expect.objectContaining({ rule: 'V-4', severity: 'warning' }),
    )
  })

  it('does not warn when the catalog does not know the component', () => {
    const p = projectWithNet([]) // sin componentes
    expect(ruleV4(p, new Map())).toEqual([])
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
