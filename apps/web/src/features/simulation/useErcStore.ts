/**
 * @circuitforge/web — Store atómico y desacoplado de diagnósticos ERC (V-1..V-6).
 *
 * Mantiene la lista de violaciones eléctricas fuera del ciclo de renderizado
 * principal de React para permitir actualizaciones sin re-renderizar el editor 3D.
 */

import type { Project } from '@circuitforge/netlist'
import { CATALOG_INDEX } from '@/lib/fixtures/components'
import { validateCircuit, type Violation } from '@circuitforge/validation'
import { create } from 'zustand'

export interface ErcState {
  violations: readonly Violation[]
  violationsCount: number
  hasError: boolean
  syncWithProject: (project: Project | null, netVoltages?: Readonly<Record<string, number>>) => void
  reset: () => void
}

export const useErcStore = create<ErcState>((set) => ({
  violations: [],
  violationsCount: 0,
  hasError: false,

  syncWithProject: (project, netVoltages) => {
    if (!project) {
      set({ violations: [], violationsCount: 0, hasError: false })
      return
    }
    const violations = validateCircuit(
      netVoltages ? { ...project, netVoltages } : project,
      CATALOG_INDEX,
    )
    const violationsCount = violations.length
    const hasError = violations.some((v) => v.severity === 'error')
    set({ violations, violationsCount, hasError })
  },

  reset: () => {
    set({ violations: [], violationsCount: 0, hasError: false })
  },
}))
