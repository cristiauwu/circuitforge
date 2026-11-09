/** Web compatibility adapter over the DOM-free domain component registry. */

import type {
  Category,
  ComponentDefinition,
  ComponentPinDefinition,
  ParameterDefinition,
} from '@circuitforge/netlist'
import { COMPONENT_DEFINITIONS } from '@circuitforge/netlist'

export interface CatalogFixture {
  typeId: string
  name: string
  category: Category
  description: string
  pins: ComponentPinDefinition[]
  parameters: ParameterDefinition[]
  referencePrefix: string
  footprint: ComponentDefinition['footprint']
  visualFamily: string
  electronic: boolean
  /** Compatibility view of the first numeric parameter; not a second source of defaults. */
  primaryParam?: { name: string; unit: string; value: number }
}

export const CATEGORY_LABELS: Record<Category, string> = {
  passive: 'Pasivos',
  semiconductor: 'Semiconductores',
  mcu: 'Microcontroladores',
  sensor: 'Sensores',
  actuator: 'Actuadores',
  esc: 'ESC',
  source: 'Fuentes',
  battery: 'Baterías',
  connectivity: 'Conectividad',
}

export const CATEGORIES: Category[] = [
  'passive',
  'semiconductor',
  'mcu',
  'sensor',
  'actuator',
  'esc',
  'source',
  'battery',
  'connectivity',
]

export const CATALOG: CatalogFixture[] = COMPONENT_DEFINITIONS.map((definition) => {
  const primary = definition.parameters.find((parameter) => parameter.kind === 'number')
  return {
    ...definition,
    ...(primary
      ? {
          primaryParam: {
            name: primary.label,
            unit: primary.unit ?? '',
            value: primary.defaultValue,
          },
        }
      : {}),
  }
})

export const CATALOG_INDEX = new Map(CATALOG.map((component) => [component.typeId, component]))

export function byCategory(category: Category | 'all'): CatalogFixture[] {
  return category === 'all'
    ? CATALOG
    : CATALOG.filter((component) => component.category === category)
}

export function searchCatalog(query: string): CatalogFixture[] {
  const q = normalize(query)
  if (!q) return CATALOG
  return CATALOG.filter(
    (component) => normalize(component.name).includes(q) || normalize(component.typeId).includes(q),
  )
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
