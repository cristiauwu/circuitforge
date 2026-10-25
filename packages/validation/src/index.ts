/**
 * @circuitforge/validation — reglas de conexión V-1..V-6 (D-4).
 *
 * Sin dependencias de React ni del DOM: es testeable en Node y usable desde el
 * editor y el Web Worker.
 */

export type {
  Catalog,
  CatalogEntry,
  ConnectCheck,
  ProjectWithVoltages,
  RuleId,
  Severity,
  Violation,
} from './rules.js'

export {
  canConnect,
  RULE_MESSAGES,
  RULE_SEVERITY,
  ruleV1,
  ruleV2,
  ruleV3,
  ruleV4,
  ruleV5,
  ruleV6,
  sortViolations,
  validateCircuit,
} from './validate.js'
