/**
 * @circuitforge/solver — DC circuit solver via Modified Nodal Analysis.
 *
 * Public API surface. Import from `@circuitforge/solver`.
 */

export type {
  BatteryModelOptions,
  BatteryTerminalState,
  DhtTelemetry,
  LdrModelOptions,
  NtcModelOptions,
  ServoAngleResult,
} from './behavioral.js'
// Modelos conductuales (RF-2.3)
export {
  computeLdrResistance,
  computeNtcResistance,
  decodeServoPulse,
  encodeServoAngle,
  modelBatteryUnderLoad,
  readDhtSensor,
} from './behavioral.js'
export type {
  DigitalPinState,
  LogicLevel,
  LogicThresholds,
  PwmSignal,
} from './digital.js'
// Kernel digital y temporal (RF-2.2)
export {
  computePwmAverageVoltage,
  DigitalKernel,
  evaluateLogicLevel,
  isPwmHighAt,
} from './digital.js'
export type { Matrix } from './matrix.js'
export { solve, zeros, zeroVec } from './matrix.js'
export type { BranchCurrents, DCResult, NodeVoltages, SolverError, SolverResult } from './mna.js'
export { solveDC } from './mna.js'
export type {
  BenchmarkReport,
  NodeComparison,
  SuiteSummaryReport,
} from './spiceBenchmark.js'
export {
  buildMillmanCircuit,
  buildOpposingSourcesCircuit,
  buildR2RLadderCircuit,
  buildVoltageDividerCircuit,
  buildWheatstoneBridgeCircuit,
  runBenchmark,
  runGroundTruthSuite,
} from './spiceBenchmark.js'
export type { SpiceExportOptions, SpiceExportResult } from './spiceExport.js'
// Validación Ground-Truth SPICE y exportación .cir (Tarea T-5)
export { exportSpiceNetlist } from './spiceExport.js'
