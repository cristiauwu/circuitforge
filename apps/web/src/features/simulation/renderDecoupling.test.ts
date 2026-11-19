/**
 * @circuitforge/web — Tests de desacoplamiento de render loop y telemetría (Tarea T-1).
 *
 * Demuestra que la actualización de resultados MNA y métricas de simulación
 * no dispara re-renders en componentes padre o suscriptores desacoplados.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProject } from '@circuitforge/netlist'
import { computeTelemetryMetrics, useSimulationStore } from './useSimulationStore'
import { useErcStore } from './useErcStore'

describe('Tarea T-1: Desacoplamiento del Render Loop y Telemetría', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset()
    useErcStore.getState().reset()
  })

  it('calcula métricas de telemetría de forma pura y aislada', () => {
    const mockResult = {
      ok: true as const,
      voltages: { N1: 5.0, N2: 2.5, GND: 0 },
      currents: { V1_branch: -0.02, R1_branch: 0.02 },
      power: { V1: -0.1, R1: 0.05, R2: 0.05 },
    }

    const metrics = computeTelemetryMetrics(mockResult)
    expect(metrics.mainVoltage).toBe(5.0)
    expect(metrics.totalCurrentA).toBeCloseTo(0.02, 5)
    expect(metrics.totalPowerW).toBeCloseTo(0.1, 5)
  })

  it('no notifica a suscriptores de isRunning cuando cambian las métricas MNA', () => {
    let lastRunning = useSimulationStore.getState().isRunning
    const runningListener = vi.fn()
    const metricsListener = vi.fn()

    // Suscripción atómica con verificación de cambio por valor primitivo
    const unsub = useSimulationStore.subscribe((state) => {
      if (state.isRunning !== lastRunning) {
        lastRunning = state.isRunning
        runningListener(state.isRunning)
      }
      metricsListener(state.metrics)
    })

    // Despachar 10 actualizaciones consecutivas de simulación MNA
    for (let i = 1; i <= 10; i++) {
      useSimulationStore.setState({
        metrics: {
          mainVoltage: 5.0 + i * 0.1,
          totalCurrentA: 0.02 + i * 0.001,
          totalPowerW: 0.1 + i * 0.005,
        },
      })
    }

    // El listener de isRunning jamás debió registrar cambio
    expect(runningListener).toHaveBeenCalledTimes(0)
    // El listener de métricas registró las 10 actualizaciones
    expect(metricsListener).toHaveBeenCalledTimes(10)

    unsub()
  })

  it('aísla el store de ERC frente a fluctuaciones de simulación que no alteren reglas', () => {
    let project = createEmptyProject('erc-test', 'Test ERC')
    project = {
      ...project,
      components: [
        {
          id: 'R1',
          typeId: 'resistor',
          position: { x: 0, y: 0, rotation: 0 },
          params: { resistance: 1000 },
          pins: [
            { pinId: '1', type: 'passive', netId: 'N1' },
            { pinId: '2', type: 'passive', netId: 'GND' },
          ],
        },
      ],
      nets: [
        { id: 'N1', pins: [{ componentId: 'R1', pinId: '1' }] },
        { id: 'GND', pins: [{ componentId: 'R1', pinId: '2' }] },
      ],
    }

    // Sincronizar proyecto inicial
    useErcStore.getState().syncWithProject(project)
    const initialViolations = useErcStore.getState().violations

    // Simular actualización de tensiones por debajo del límite de sobretensión
    useErcStore.getState().syncWithProject(project, { N1: 3.3, GND: 0 })
    const updatedViolations = useErcStore.getState().violations

    expect(updatedViolations.length).toBe(initialViolations.length)
  })
})
