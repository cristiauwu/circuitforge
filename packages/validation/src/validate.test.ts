import { describe, expect, it } from 'vitest'
import { emptyProject, projectWithNet } from './fixtures.js'
import { validateCircuit } from './validate.js'

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
