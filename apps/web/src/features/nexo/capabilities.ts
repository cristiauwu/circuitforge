import { COMPONENT_DEFINITIONS, COMPONENT_INDEX } from '@circuitforge/netlist'

/** Every registered type has an authored family model and logical terminal anchors. */
export const EDITABLE_TYPE_IDS: readonly string[] = COMPONENT_DEFINITIONS.map(
  (definition) => definition.typeId,
)

export type EditableTypeId = (typeof EDITABLE_TYPE_IDS)[number]

export function isEditableType(typeId: string): typeId is EditableTypeId {
  return COMPONENT_INDEX.has(typeId)
}
