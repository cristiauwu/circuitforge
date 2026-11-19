/**
 * @circuitforge/web — Store de simulación con ejecución en Web Worker (RF-2.4).
 *
 * Mantiene el estado de la simulación eléctrica activa, los resultados de
 * tensión/corriente/potencia calculados por MNA y el estado de error si el
 * circuito es singular o carece de referencia GND.
 */

import type { Project } from '@circuitforge/netlist'
import type { DCResult, SolverResult } from '@circuitforge/solver'
import { create } from 'zustand'
import { simulationClient } from './simulationClient'

export interface TelemetryMetrics {
  readonly mainVoltage: number
  readonly totalCurrentA: number
  readonly totalPowerW: number
}

export function computeTelemetryMetrics(result: SolverResult | null): TelemetryMetrics {
  if (!result || !result.ok) {
    return { mainVoltage: 0, totalCurrentA: 0, totalPowerW: 0 }
  }
  const maxVoltage = Math.max(0, ...Object.values(result.voltages))
  let totalCurrent = 0
  for (const current of Object.values(result.currents)) {
    if (current < 0) {
      totalCurrent += Math.abs(current)
    }
  }
  let totalPower = 0
  for (const p of Object.values(result.power)) {
    if (p > 0) totalPower += p
  }
  return {
    mainVoltage: maxVoltage,
    totalCurrentA: totalCurrent,
    totalPowerW: totalPower,
  }
}

export interface SimulationState {
  isRunning: boolean
  isSolving: boolean
  result: SolverResult | null
  metrics: TelemetryMetrics
  error: string | null
  durationMs: number

  toggleRunning: () => void
  setRunning: (running: boolean) => void
  execute: (project: Project) => Promise<DCResult>
  reset: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  isSolving: false,
  result: null,
  metrics: { mainVoltage: 0, totalCurrentA: 0, totalPowerW: 0 },
  error: null,
  durationMs: 0,

  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }))
  },

  setRunning: (running: boolean) => {
    set({ isRunning: running })
  },

  execute: async (project: Project): Promise<DCResult> => {
    set({ isSolving: true })
    try {
      const { result, durationMs } = await simulationClient.solve(project)
      if (result.ok) {
        set({
          isSolving: false,
          result,
          metrics: computeTelemetryMetrics(result),
          error: null,
          durationMs,
        })
      } else {
        set({
          isSolving: false,
          result: null,
          metrics: { mainVoltage: 0, totalCurrentA: 0, totalPowerW: 0 },
          error: result.error,
          durationMs,
        })
      }
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido en simulación'
      set({
        isSolving: false,
        result: null,
        metrics: { mainVoltage: 0, totalCurrentA: 0, totalPowerW: 0 },
        error: errorMsg,
        durationMs: 0,
      })
      return { ok: false, error: errorMsg }
    }
  },

  reset: () => {
    set({
      isRunning: false,
      isSolving: false,
      result: null,
      metrics: { mainVoltage: 0, totalCurrentA: 0, totalPowerW: 0 },
      error: null,
      durationMs: 0,
    })
  },
}))
