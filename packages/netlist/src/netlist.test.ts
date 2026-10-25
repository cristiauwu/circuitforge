import { describe, expect, it } from 'vitest'
import { connectPins, createEmptyProject } from './netlist.js'
import type { Project } from './types.js'

/** Helper: añade un componente con un único pin al proyecto. */
const withPin = (p: Project, componentId: string, pinId: string): Project => ({
  ...p,
  components: [
    ...p.components,
    {
      id: componentId,
      typeId: 'resistor',
      position: { x: 0, y: 0, rotation: 0 },
      params: {},
      pins: [{ pinId, type: 'power', netId: null }],
    },
  ],
})

describe('connectPins', () => {
  it('creates a net joining two unconnected pins', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')

    const result = connectPins(
      p,
      { componentId: 'R1', pinId: 'a' },
      { componentId: 'R2', pinId: 'a' },
    )

    expect(result.nets).toHaveLength(1)
    expect(result.nets[0]?.pins).toHaveLength(2)
    expect(result.components[0]?.pins[0]?.netId).toBe(result.nets[0]?.id)
  })

  it('merges two existing nets instead of creating a second one', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(withPin(p, 'R1', 'a'), 'R2', 'a'), 'R3', 'a')

    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    p = connectPins(p, { componentId: 'R2', pinId: 'a' }, { componentId: 'R3', pinId: 'a' })

    expect(p.nets).toHaveLength(1)
    expect(p.nets[0]?.pins).toHaveLength(3)
  })

  it('rejects a pin already in the target net', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')
    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })

    expect(() =>
      connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' }),
    ).toThrow(/already connected/)
  })

  it('does not mutate the input project', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')

    const before = JSON.stringify(p)
    connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })

    expect(JSON.stringify(p)).toBe(before)
  })
})
