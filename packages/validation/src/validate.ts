/**
 * Implementación de las reglas V-1..V-6 (spec §5.2) y del chequeo en tiempo real.
 *
 * Cada regla es una función pura `(project, catalog) => Violation[]`.
 * `validateCircuit` las recolecta. Ninguna lanza: ante datos incompletos devuelven
 * lista vacía (Review Focus #1 y #5).
 */

import type { Net, PinEndpoint, PinRef, PinType, Project } from '@circuitforge/netlist'
import {
  BREADBOARD_TYPE_ID,
  connectPins,
  getInternalContactPairs,
  recomputeNets,
} from '@circuitforge/netlist'
import type {
  Catalog,
  CatalogEntry,
  ConnectCheck,
  ProjectWithVoltages,
  RuleId,
  Severity,
  Violation,
} from './rules.js'

/** Mensajes en español para la interfaz (RNF-10). */
export const RULE_MESSAGES: Record<RuleId, string> = {
  'V-1': 'Cortocircuito entre alimentación y tierra',
  'V-2': 'Pines incompatibles',
  'V-3': 'Conexión suelta',
  'V-4': 'Polaridad invertida',
  'V-5': 'Componente sin conectar por completo',
  'V-6': 'Tensión por encima del máximo del pin',
}

/** Severidad de cada regla: solo V-1 bloquea (spec §5.2). */
export const RULE_SEVERITY: Record<RuleId, Severity> = {
  'V-1': 'error',
  'V-2': 'warning',
  'V-3': 'warning',
  'V-4': 'warning',
  'V-5': 'warning',
  'V-6': 'warning',
}

/** Construye una violación con el mensaje y la severidad canónicos. */
function violation(rule: RuleId, extra: Partial<Violation> = {}): Violation {
  return { rule, severity: RULE_SEVERITY[rule], message: RULE_MESSAGES[rule], ...extra }
}

/** Solo estas cargas tuvieron terminales power/gnd en snapshots antiguos. */
const LEGACY_PASSIVE_TYPES = new Set([
  'resistor',
  'inductor',
  'led',
  'diode',
  'capacitor',
  'ldr',
  'potentiometer',
  'bjt_npn',
])

/** Resuelve sin migrar el proyecto ni aplicar overrides arbitrarios del catálogo. */
function effectivePinType(typeId: string, pin: PinRef, catalog: Catalog): PinType {
  if (
    LEGACY_PASSIVE_TYPES.has(typeId) &&
    catalog.get(typeId)?.pins.some((p) => p.id === pin.pinId && p.type === 'passive')
  ) {
    return 'passive'
  }
  return pin.type
}

/** Índice efectivo por endpoint completo; nunca modifica los PinRef del proyecto. */
function pinIndex(project: Project, catalog: Catalog): Map<string, PinRef> {
  const index = new Map<string, PinRef>()
  for (const component of project.components) {
    for (const pin of component.pins) {
      index.set(JSON.stringify([component.id, pin.pinId]), {
        ...pin,
        type: effectivePinType(component.typeId, pin, catalog),
      })
    }
  }
  return index
}

/** Resuelve los pines reales de un net. Los ausentes se omiten, no fallan. */
function netPinRefs(net: Net, index: Map<string, PinRef>): PinRef[] {
  const result: PinRef[] = []
  for (const endpoint of net.pins) {
    const pin = index.get(JSON.stringify([endpoint.componentId, endpoint.pinId]))
    if (pin) result.push(pin)
  }
  return result
}

/**
 * V-1 (error): un net contiene un pin `power` y un pin `gnd` directamente.
 *
 * Es la única regla que **bloquea** (RF-1.4): unir alimentación con tierra sin carga
 * produce un cortocircuito.
 */
export function ruleV1(input: Project, catalog: Catalog): Violation[] {
  const project =
    (input.mounts?.length ?? 0) > 0 ||
    input.components.some(
      (component) =>
        component.typeId === BREADBOARD_TYPE_ID || getInternalContactPairs(component).length > 0,
    )
      ? recomputeNets(input)
      : input
  const index = pinIndex(project, catalog)
  const out: Violation[] = []

  for (const net of project.nets) {
    const pins = netPinRefs(net, index)
    const hasPower = pins.some((p) => p.type === 'power')
    const hasGnd = pins.some((p) => p.type === 'gnd')
    if (hasPower && hasGnd) out.push(violation('V-1', { netId: net.id }))
  }
  return out
}

/** Pares de tipos de pin que no deben compartir net (spec §5.2, V-2). */
const INCOMPATIBLE_PAIRS: readonly (readonly [PinType, PinType])[] = [
  ['digital', 'power'],
  ['analog', 'power'],
  ['digital', 'gnd'],
  ['pwm', 'gnd'],
] as const

/**
 * V-2 (warning): dos pines `power` en el mismo net, o un par incompatible.
 */
export function ruleV2(project: Project, catalog: Catalog): Violation[] {
  const index = pinIndex(project, catalog)
  const out: Violation[] = []

  for (const net of project.nets) {
    const pins = netPinRefs(net, index)
    const powerCount = net.pins.filter((endpoint) => {
      const component = project.components.find((item) => item.id === endpoint.componentId)
      const pin = index.get(JSON.stringify([endpoint.componentId, endpoint.pinId]))
      if (!component || pin?.type !== 'power') return false
      const role = catalog
        .get(component.typeId)
        ?.pins.find((item) => item.id === endpoint.pinId)?.powerRole
      // Legacy metadata has no role: retain its historical source warning.
      return role === undefined || role === 'output'
    }).length

    // Dos pines power en el mismo net → posible conflicto entre fuentes.
    if (powerCount > 1) {
      out.push(violation('V-2', { netId: net.id }))
      continue
    }

    const types = new Set<PinType>(pins.map((p) => p.type))
    if (INCOMPATIBLE_PAIRS.some(([a, b]) => types.has(a) && types.has(b))) {
      out.push(violation('V-2', { netId: net.id }))
    }
  }
  return out
}

/** V-3 (warning): net con un solo pin. Review Focus #2. */
export function ruleV3(project: Project, _catalog: Catalog): Violation[] {
  return project.nets
    .filter((net) => net.pins.length === 1)
    .map((net) => violation('V-3', { netId: net.id }))
}

/** Un endpoint ambiguo o ausente no aporta evidencia de polaridad. */
function directNet(project: Project, componentId: string, pinId: string): Net | undefined {
  const nets = project.nets.filter((net) =>
    net.pins.some((p) => p.componentId === componentId && p.pinId === pinId),
  )
  return nets.length === 1 ? nets[0] : undefined
}

/** Categoría y ambos terminales confirmados: una tierra sola o un MCU no son fuente. */
function isExternalSource(entry: CatalogEntry): boolean {
  return (
    (entry.category === 'source' || entry.category === 'battery') &&
    entry.pins.some((p) => p.type === 'power') &&
    entry.pins.some((p) => p.type === 'gnd')
  )
}

function hasSourceTerminal(
  net: Net,
  source: Project['components'][number],
  entry: CatalogEntry,
  type: 'power' | 'gnd',
): boolean {
  return net.pins.some(
    (endpoint) =>
      endpoint.componentId === source.id &&
      entry.pins.some((pin) => pin.id === endpoint.pinId && pin.type === type) &&
      source.pins.some((pin) => pin.pinId === endpoint.pinId && pin.type === type),
  )
}

/**
 * V-4 (warning): ambos terminales del mismo LED/diodo están invertidos en dos
 * nets distintos conectados directamente a una misma fuente externa de catálogo.
 * No deduce tensiones ni recorre resistencias; sin evidencia suficiente se omite.
 */
export function ruleV4(project: Project, catalog: Catalog): Violation[] {
  const sources = project.components.filter((component) => {
    const entry = catalog.get(component.typeId)
    return entry !== undefined && isExternalSource(entry)
  })
  const out: Violation[] = []

  for (const component of project.components) {
    if (component.typeId !== 'led' && component.typeId !== 'diode') continue
    const entry = catalog.get(component.typeId)
    const anode = entry?.pins.find((pin) => /^anode$/i.test(pin.id))
    const cathode = entry?.pins.find((pin) => /^cathode$/i.test(pin.id))
    if (!anode || !cathode) continue
    if (
      !component.pins.some((pin) => pin.pinId === anode.id) ||
      !component.pins.some((pin) => pin.pinId === cathode.id)
    )
      continue

    const anodeNet = directNet(project, component.id, anode.id)
    const cathodeNet = directNet(project, component.id, cathode.id)
    if (!anodeNet || !cathodeNet || anodeNet.id === cathodeNet.id) continue

    const reversed = sources.some((source) => {
      if (source.id === component.id) return false
      const sourceEntry = catalog.get(source.typeId)
      return (
        sourceEntry !== undefined &&
        hasSourceTerminal(anodeNet, source, sourceEntry, 'gnd') &&
        hasSourceTerminal(cathodeNet, source, sourceEntry, 'power')
      )
    })
    if (reversed) {
      out.push(violation('V-4', { netId: cathodeNet.id, componentId: component.id }))
    }
  }
  return out
}

/**
 * V-5 (warning): componente con pines requeridos sin net.
 *
 * Solo evalúa componentes presentes en el catálogo. Un `typeId` desconocido se ignora
 * silenciosamente (Review Focus #5): no es tarea del validador reportar catálogos
 * incompletos.
 */
export function ruleV5(project: Project, catalog: Catalog): Violation[] {
  const out: Violation[] = []

  for (const component of project.components) {
    const entry = catalog.get(component.typeId)
    if (!entry || component.typeId === BREADBOARD_TYPE_ID) continue
    if (
      entry.pins.some(
        (definition) =>
          definition.required !== false &&
          !component.pins.some((pin) => pin.pinId === definition.id && pin.netId !== null),
      )
    ) {
      out.push(violation('V-5', { componentId: component.id }))
    }
  }
  return out
}

/**
 * ¿Algún pin de este net supera la tensión máxima de su componente?
 *
 * Extraído de `ruleV6` para mantener baja la complejidad ciclomática: mezclar el
 * recorrido de nets, la búsqueda de componentes y la comparación de umbrales en una
 * sola función la volvía difícil de leer y de probar.
 */
function netExceedsPinVoltage(
  net: Net,
  voltage: number,
  project: Project,
  catalog: Catalog,
): boolean {
  return net.pins.some((endpoint) => {
    const component = project.components.find((c) => c.id === endpoint.componentId)
    if (!component) return false

    const entry = catalog.get(component.typeId)
    if (!entry || typeof entry.maxVoltage !== 'number') return false

    return Math.abs(voltage) > entry.maxVoltage
  })
}

/**
 * V-6 (warning): tensión del net por encima de la máxima admisible.
 *
 * Requiere tensiones nodales resueltas (salida del solver) y que el catálogo declare
 * `maxVoltage`. Sin ambos datos la regla no se pronuncia — es preferible no avisar
 * que avisar en falso.
 */
export function ruleV6(project: Project, catalog: Catalog): Violation[] {
  const voltages = (project as ProjectWithVoltages).netVoltages
  if (!voltages) return []

  const out: Violation[] = []
  for (const net of project.nets) {
    const voltage = voltages[net.id]
    if (typeof voltage !== 'number' || !Number.isFinite(voltage)) continue
    if (netExceedsPinVoltage(net, voltage, project, catalog)) {
      out.push(violation('V-6', { netId: net.id }))
    }
  }
  return out
}

/** Todas las reglas, en orden determinista de ejecución. */
const RULES: readonly ((project: Project, catalog: Catalog) => Violation[])[] = [
  ruleV1,
  ruleV2,
  ruleV3,
  ruleV4,
  ruleV5,
  ruleV6,
] as const

/**
 * Ejecuta todas las reglas sobre un proyecto.
 *
 * @param project Circuito a validar. Puede estar vacío.
 * @param catalog Catálogo indexado por `typeId`. Puede estar vacío.
 * @returns Lista de violaciones, ordenadas por severidad (`error` primero) y luego
 *          por regla. Nunca lanza.
 */
export function validateCircuit(input: Project, catalog: Catalog): Violation[] {
  let project = input
  if (project.components.length === 0 && project.nets.length === 0) return []
  if (
    (project.mounts?.length ?? 0) > 0 ||
    project.components.some(
      (component) =>
        component.typeId === BREADBOARD_TYPE_ID || getInternalContactPairs(component).length > 0,
    )
  ) {
    try {
      project = recomputeNets(project)
    } catch {
      // Diagnostics remain best-effort; canConnect uses the strict blocking rule.
    }
  }

  const violations: Violation[] = []
  for (const rule of RULES) {
    try {
      violations.push(...rule(project, catalog))
    } catch {
      // Una regla nunca debe tumbar la validación completa (Review Focus #5).
    }
  }
  return sortViolations(violations)
}

/** Ordena: `error` antes que `warning`, luego por id de regla. */
export function sortViolations(violations: Violation[]): Violation[] {
  const weight: Record<Severity, number> = { error: 0, warning: 1 }
  return [...violations].sort((a, b) => {
    const bySeverity = weight[a.severity] - weight[b.severity]
    if (bySeverity !== 0) return bySeverity
    return a.rule.localeCompare(b.rule)
  })
}

/**
 * Comprueba si dos pines pueden conectarse (RF-1.4, tiempo real).
 *
 * Evalúa el net **hipotético** resultante en vez de las reglas completas: solo
 * importan V-1 y V-2 para decidir. Devuelve `allowed: false` únicamente cuando la
 * violación es de severidad `error`; una advertencia no impide conectar.
 *
 * Toma `PinEndpoint` (componente + pin) y no `PinRef`: un `PinRef` no identifica a
 * qué componente pertenece, así que no permite localizar el pin de forma unívoca.
 *
 * @returns `{ allowed }` siempre. Si no se permite, incluye la violación causante.
 */
export function canConnect(
  project: Project,
  a: PinEndpoint,
  b: PinEndpoint,
  catalog: Catalog,
): ConnectCheck {
  try {
    const hypothetical = connectPins(project, a, b)
    // Call the blocking rule directly: validateCircuit intentionally catches rule
    // failures for diagnostics, but a safety decision must fail closed instead.
    const blocking = ruleV1(hypothetical, catalog)[0]
    return blocking ? { allowed: false, violation: blocking } : { allowed: true }
  } catch {
    // Unknown/ambiguous topology is not proof that a connection is safe.
    return { allowed: false }
  }
}
