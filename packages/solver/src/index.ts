/**
 * @circuitforge/solver — DC circuit solver via Modified Nodal Analysis.
 *
 * Public API surface. Import from `@circuitforge/solver`.
 */

export { solve, zeros, zeroVec } from './matrix.js'
export type { Matrix } from './matrix.js'
export { solveDC } from './mna.js'
export type { BranchCurrents, DCResult, NodeVoltages, SolverError, SolverResult } from './mna.js'
