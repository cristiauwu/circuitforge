/**
 * Pruebas de los casos límite de `connectPins` más allá del camino feliz.
 *
 * La primera batería cubre crear, mergear, rechazar y pureza. Aquí se prueban
 * los casos de error y los detalles del merge que aquella no verificaba.
 */

import type { Project } from '@circuitforge/netlist'
import { describe, expect, it } from 'vitest'
import { connectPins, createEmptyProject } from './netlist.js'

/** Añade al proyecto un componente con los pines indicados. */
function withPins(p: Project, componentId: string, pinIds: string[]): Project {
  return {
    ...p,
    components: [
      ...p.components,
      {
        id: componentId,
        typeId: 'resistor',
        position: { x: 0, y: 0, rotation: 0 },
        params: {},
        pins: pinIds.map((pinId) => ({ pinId, type: 'power' as const, netId: null })),
      },
    ],
  }
}

describe('connectPins — casos límite', () => {
  it('throws a descriptive error for an unknown component', () => {
    const p = withPins(createEmptyProject('p', 't'), 'R1', ['a'])
    expect(() =>
      connectPins(p, { componentId: 'NOPE', pinId: 'a' }, { componentId: 'R1', pinId: 'a' }),
    ).toThrow(/Unknown pin: NOPE\.a/)
  })

  it('throws a descriptive error for an unknown pin', () => {
    const p = withPins(createEmptyProject('p', 't'), 'R1', ['a'])
    expect(() =>
      connectPins(p, { componentId: 'R1', pinId: 'zzz' }, { componentId: 'R1', pinId: 'a' }),
    ).toThrow(/Unknown pin: R1\.zzz/)
  })

  it('rejects connecting a pin to itself', () => {
    const p = withPins(createEmptyProject('p', 't'), 'R1', ['a'])
    expect(() =>
      connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R1', pinId: 'a' }),
    ).toThrow(/already connected/)
  })

  it('keeps the pin of the absorbed net pointing at the surviving net', () => {
    // R1.a — R2.a (N1). Luego R3.a — R4.a (N2). Luego unir N1 y N2.
    let p = createEmptyProject('p', 't')
    p = withPins(p, 'R1', ['a'])
    p = withPins(p, 'R2', ['a'])
    p = withPins(p, 'R3', ['a'])
    p = withPins(p, 'R4', ['a'])

    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    p = connectPins(p, { componentId: 'R3', pinId: 'a' }, { componentId: 'R4', pinId: 'a' })
    expect(p.nets).toHaveLength(2)

    // Mergear los dos nets existentes.
    p = connectPins(p, { componentId: 'R2', pinId: 'a' }, { componentId: 'R3', pinId: 'a' })

    expect(p.nets).toHaveLength(1)
    expect(p.nets[0]?.pins).toHaveLength(4)

    // Los cuatro pines deben apuntar al net superviviente.
    const survivingId = p.nets[0]?.id
    for (const component of p.components) {
      expect(component.pins[0]?.netId).toBe(survivingId)
    }
  })

  it('never leaves a pin on two nets after a merge (invariante fundamental)', () => {
    let p = createEmptyProject('p', 't')
    for (const id of ['R1', 'R2', 'R3']) p = withPins(p, id, ['a'])

    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    p = connectPins(p, { componentId: 'R2', pinId: 'a' }, { componentId: 'R3', pinId: 'a' })

    // Contar en cuántos nets aparece cada pin: debe ser exactamente uno.
    const appearances = new Map<string, number>()
    for (const net of p.nets) {
      for (const pin of net.pins) {
        const key = `${pin.componentId}:${pin.pinId}`
        appearances.set(key, (appearances.get(key) ?? 0) + 1)
      }
    }
    for (const count of appearances.values()) {
      expect(count).toBe(1)
    }
  })

  it('assigns sequential net ids without reusing a deleted one', () => {
    let p = createEmptyProject('p', 't')
    for (const id of ['R1', 'R2', 'R3', 'R4']) p = withPins(p, id, ['a'])

    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    p = connectPins(p, { componentId: 'R3', pinId: 'a' }, { componentId: 'R4', pinId: 'a' })
    expect(p.nets.map((n) => n.id).sort()).toEqual(['N1', 'N2'])

    // Mergear N2 dentro de N1 → queda N1; el siguiente net debe ser N3, no N2.
    p = connectPins(p, { componentId: 'R2', pinId: 'a' }, { componentId: 'R3', pinId: 'a' })
    expect(p.nets).toHaveLength(1)

    p = withPins(p, 'R5', ['a'])
    p = withPins(p, 'R6', ['a'])
    p = connectPins(p, { componentId: 'R5', pinId: 'a' }, { componentId: 'R6', pinId: 'a' })

    // N3, no N2: los ids no se reciclan tras un merge.
    expect(p.nets.map((n) => n.id)).toContain('N3')
  })

  it('creates a project with a valid schema version and timestamps', () => {
    const p = createEmptyProject('proj-1', 'Mi circuito')

    expect(p.id).toBe('proj-1')
    expect(p.name).toBe('Mi circuito')
    expect(p.schemaVersion).toBe(1)
    expect(p.components).toEqual([])
    expect(p.nets).toEqual([])
    expect(() => new Date(p.metadata.createdAt)).not.toThrow()
    expect(Number.isNaN(Date.parse(p.metadata.createdAt))).toBe(false)
  })
})
