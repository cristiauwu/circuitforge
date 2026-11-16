import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject, connectPins, type Project } from '@circuitforge/netlist'
import { useSimulationStore } from './useSimulationStore'

function addComp(
  project: Project,
  id: string,
  typeId: string,
  pins: { pinId: string; type: 'passive' | 'power' | 'gnd' }[],
  params: Record<string, number | string | boolean> = {},
): Project {
  return {
    ...project,
    components: [
      ...project.components,
      {
        id,
        typeId,
        position: { x: 0, y: 0, rotation: 0 },
        params,
        pins: pins.map((p) => ({ ...p, netId: null })),
      },
    ],
  }
}

describe('useSimulationStore', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset()
  })

  it('inicializa con estado inactivo y sin resultados', () => {
    const s = useSimulationStore.getState()
    expect(s.isRunning).toBe(false)
    expect(s.isSolving).toBe(false)
    expect(s.result).toBeNull()
    expect(s.error).toBeNull()
  })

  it('permite alternar isRunning', () => {
    useSimulationStore.getState().toggleRunning()
    expect(useSimulationStore.getState().isRunning).toBe(true)

    useSimulationStore.getState().toggleRunning()
    expect(useSimulationStore.getState().isRunning).toBe(false)
  })

  it('ejecuta simulación DC resolviendo tensiones y corrientes', async () => {
    let p = createEmptyProject('sim-test', 'Circuito de prueba')
    p = addComp(p, 'V1', 'dc_source', [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ], { voltage: 9 })
    p = addComp(p, 'R1', 'resistor', [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ], { resistance: 1000 })
    p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

    p = connectPins(p, { componentId: 'V1', pinId: 'positive' }, { componentId: 'R1', pinId: 'a' })
    p = connectPins(p, { componentId: 'R1', pinId: 'b' }, { componentId: 'GND1', pinId: 'gnd' })
    p = connectPins(p, { componentId: 'GND1', pinId: 'gnd' }, { componentId: 'V1', pinId: 'negative' })

    const res = await useSimulationStore.getState().execute(p)
    expect(res.ok).toBe(true)

    const state = useSimulationStore.getState()
    expect(state.error).toBeNull()
    expect(state.result).not.toBeNull()
    expect(state.result?.currents['V1']).toBeDefined()
    expect(Math.abs(state.result!.currents['V1']!)).toBeCloseTo(0.009, 3)
  })

  it('captura errores si el circuito no tiene referencia de tierra', async () => {
    let p = createEmptyProject('no-gnd', 'Circuito sin tierra')
    p = addComp(p, 'R1', 'resistor', [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ], { resistance: 220 })

    const res = await useSimulationStore.getState().execute(p)
    expect(res.ok).toBe(false)

    const state = useSimulationStore.getState()
    expect(state.result).toBeNull()
    expect(state.error).toContain('tierra')
  })
})
