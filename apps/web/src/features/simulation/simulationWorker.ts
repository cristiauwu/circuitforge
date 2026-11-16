/**
 * @circuitforge/web — Web Worker para la simulación eléctrica MNA en segundo plano (RF-2.4).
 *
 * Corre en un hilo aislado para no bloquear el hilo principal ni degradar los 60 FPS del render 3D.
 */

import type { Project } from '@circuitforge/netlist'
import { solveDC, type DCResult } from '@circuitforge/solver'

export interface SimulationWorkerRequest {
  id: number
  type: 'SOLVE_DC'
  project: Project
}

export interface SimulationWorkerResponse {
  id: number
  type: 'SOLVE_DC_RESULT'
  result: DCResult
  durationMs: number
}

self.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const { id, type, project } = event.data
  if (type === 'SOLVE_DC') {
    const t0 = performance.now()
    const result = solveDC(project)
    const durationMs = performance.now() - t0

    const response: SimulationWorkerResponse = {
      id,
      type: 'SOLVE_DC_RESULT',
      result,
      durationMs,
    }
    self.postMessage(response)
  }
}
