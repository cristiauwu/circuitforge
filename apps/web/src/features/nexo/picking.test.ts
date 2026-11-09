import { createEmptyProject, type PinEndpoint, type Project } from '@circuitforge/netlist'
import { describe, expect, it } from 'vitest'
import { projectWireConnections, resolveComponentPick } from './editor3d'

const hit = (distance: number, componentId: string, pinEndpoint?: PinEndpoint) => ({
  distance,
  object: { userData: { componentId, ...(pinEndpoint ? { pinEndpoint } : {}) } },
})
const resistorPin = { componentId: 'R1', pinId: 'b' }
const ledPin = { componentId: 'D1', pinId: 'anode' }

describe('physical wire rendering input', () => {
  const a = { componentId: 'BB1', pinId: 'a1' }
  const e = { componentId: 'BB1', pinId: 'e1' }
  const r = { componentId: 'R1', pinId: 'a' }
  const project = (): Project => ({
    ...createEmptyProject('test', 'Test'),
    components: [
      {
        id: 'BB1',
        typeId: 'breadboard',
        position: { x: 0, y: 0, rotation: 0 },
        pins: [],
        params: {},
      },
    ],
    nets: [{ id: 'net1', pins: [a, e, r] }],
  })

  it('renders only explicit wire endpoints, not additional conductive net members', () => {
    const physical = [{ id: 'wire1', from: e, to: r }]
    expect(projectWireConnections({ ...project(), wires: physical })).toBe(physical)
    expect(projectWireConnections({ ...project(), wires: [] })).toEqual([])
  })

  it('keeps legacy star fallback but never draws a conductive strip as a cable', () => {
    const legacy = project()
    Reflect.deleteProperty(legacy, 'wires')
    expect(projectWireConnections(legacy)).toEqual([{ id: 'net1', from: a, to: r }])
  })
})

describe('component picking and terminal occlusion', () => {
  it('promotes R1.b over its overlapping decorative lead', () => {
    expect(
      resolveComponentPick([
        hit(16.8107659, 'R1'),
        hit(16.84056495, 'R1', resistorPin),
        hit(16.92976958, 'R1', resistorPin),
      ]),
    ).toEqual({ componentId: 'R1', pin: resistorPin })
  })

  it('keeps a top-view LED dome click as component selection', () => {
    expect(resolveComponentPick([hit(10, 'D1'), hit(10.75, 'D1', ledPin)])).toEqual({
      componentId: 'D1',
      pin: null,
    })
  })

  it('keeps a LED body click as component selection', () => {
    expect(resolveComponentPick([hit(10, 'D1'), hit(10.061, 'D1', ledPin)])).toEqual({
      componentId: 'D1',
      pin: null,
    })
  })

  it('allows a directly visible LED terminal', () => {
    expect(resolveComponentPick([hit(10, 'D1', ledPin), hit(10.1, 'D1')])).toEqual({
      componentId: 'D1',
      pin: ledPin,
    })
  })

  it('never promotes a terminal from a component behind another one', () => {
    expect(resolveComponentPick([hit(10, 'R1'), hit(10.01, 'D1', ledPin)])).toEqual({
      componentId: 'R1',
      pin: null,
    })
  })

  it('returns no selection for empty hits', () => {
    expect(resolveComponentPick([])).toBeNull()
  })
})
