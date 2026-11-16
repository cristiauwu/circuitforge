/**
 * @circuitforge/web — Cliente asíncrono para el Web Worker de simulación.
 *
 * Despacha tareas de MNA al Web Worker y resuelve la promesa correspondiente.
 * Si el entorno no soporta Workers (e.g. Node/Vitest), ejecuta solveDC de forma síncrona.
 */

import type { Project } from '@circuitforge/netlist'
import { solveDC, type DCResult } from '@circuitforge/solver'
import type { SimulationWorkerRequest, SimulationWorkerResponse } from './simulationWorker'

export interface SimulationExecution {
  result: DCResult
  durationMs: number
}

class SimulationClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, (res: SimulationExecution) => void>()

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./simulationWorker.ts', import.meta.url), {
          type: 'module',
        })
        this.worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
          const { id, result, durationMs } = event.data
          const resolve = this.pending.get(id)
          if (resolve) {
            this.pending.delete(id)
            resolve({ result, durationMs })
          }
        }
      } catch {
        this.worker = null
      }
    }
  }

  async solve(project: Project): Promise<SimulationExecution> {
    if (this.worker) {
      const id = this.nextId++
      return new Promise<SimulationExecution>((resolve) => {
        this.pending.set(id, resolve)
        const req: SimulationWorkerRequest = {
          id,
          type: 'SOLVE_DC',
          project,
        }
        this.worker!.postMessage(req)
      })
    }

    // Fallback síncrono para pruebas en Vitest o entornos sin Worker
    const t0 = performance.now()
    const result = solveDC(project)
    return { result, durationMs: performance.now() - t0 }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pending.clear()
  }
}

export const simulationClient = new SimulationClient()
