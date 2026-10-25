/**
 * @circuitforge/netlist — tipos e invariantes del circuito.
 *
 * Paquete raíz de la jerarquía de dependencias: no importa nada del proyecto.
 * Ver `docs/specs/2026-10-25-circuitforge-stack.md` §4.
 */

export { connectPins, createEmptyProject, SCHEMA_VERSION } from './netlist.js'
export type {
  Category,
  Component,
  Net,
  ParamValue,
  PinEndpoint,
  PinRef,
  PinType,
  Position,
  Project,
  ProjectMetadata,
  Rotation,
} from './types.js'
