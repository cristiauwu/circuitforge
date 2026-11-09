/**
 * @circuitforge/netlist — tipos e invariantes del circuito.
 *
 * Paquete raíz de la jerarquía de dependencias: no importa nada del proyecto.
 * Ver `docs/specs/2026-10-25-circuitforge-stack.md` §4.
 */

export type { BreadboardContact, BreadboardGroup } from './breadboard.js'
export {
  BREADBOARD_CONTACTS,
  BREADBOARD_GROUPS,
  BREADBOARD_PITCH,
  BREADBOARD_TYPE_ID,
} from './breadboard.js'
export type {
  ComponentDefinition,
  ComponentPinDefinition,
  ParameterDefinition,
} from './componentRegistry.js'
export {
  COMPONENT_DEFINITIONS,
  COMPONENT_INDEX,
  getDefaultParameters,
  validateParameterValue,
} from './componentRegistry.js'
export type { MountFootprintPin } from './mounting.js'
export {
  buildMount,
  getMountFootprint,
  MOUNT_ELEVATION,
  resolveMountedPose,
  validateMount,
} from './mounting.js'
export {
  connectPins,
  createEmptyProject,
  disconnectPins,
  removeComponent,
  removeWire,
  SCHEMA_VERSION,
} from './netlist.js'
export {
  arePinsConnected,
  getInternalContactPairs,
  materializeWires,
  recomputeNets,
} from './topology.js'
export type {
  Category,
  Component,
  Mount,
  MountContact,
  MountedPose,
  Net,
  ParamValue,
  PinEndpoint,
  PinRef,
  PinType,
  Position,
  Project,
  ProjectMetadata,
  Rotation,
  Wire,
} from './types.js'
