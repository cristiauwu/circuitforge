/**
 * @circuitforge/solver — DC circuit solver via Modified Nodal Analysis.
 *
 * Public API surface. Import from `@circuitforge/solver`.
 */

export { solve, zeros, zeroVec } from './matrix.js'
export type { Matrix } from './matrix.js'
export { solveDC } from './mna.js'
export type { BranchCurrents, DCResult, NodeVoltages, SolverError, SolverResult } from './mna.js'

// Modelos conductuales (RF-2.3)
export {
  computeLdrResistance,
  computeNtcResistance,
  modelBatteryUnderLoad,
  decodeServoPulse,
  encodeServoAngle,
  readDhtSensor,
} from './behavioral.js'
export type {
  LdrModelOptions,
  NtcModelOptions,
  BatteryModelOptions,
  BatteryTerminalState,
  ServoAngleResult,
  DhtTelemetry,
} from './behavioral.js'

// Kernel digital y temporal (RF-2.2)
export {
  evaluateLogicLevel,
  computePwmAverageVoltage,
  isPwmHighAt,
  DigitalKernel,
} from './digital.js'
export type {
  LogicLevel,
  LogicThresholds,
  PwmSignal,
  DigitalPinState,
} from './digital.js'
