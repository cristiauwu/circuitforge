/**
 * Implementación de las reglas V-1..V-6 (spec §5.2) y del chequeo en tiempo real.
 *
 * Cada regla es una función pura `(project, catalog) => Violation[]`.
 * `validateCircuit` las recolecta. Ninguna lanza: ante datos incompletos devuelven
 * lista vacía (Review Focus #1 y #5).
 */

import type { Net, PinEndpoint, PinRef, PinType, Project } from '@circuitforge/netlist'
import { connectPins } from '@circuitforge/netlist'
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

/** Índice de pines por `componentId:pinId` para resolver tipos de pin. */
function pinIndex(project: Project): Map<string, PinRef> {
  const index = new Map<string, PinRef>()
  for (const component of project.components) {
    for (const pin of component.pins) {
      index.set(`${component.id}:${pin.pinId}`, pin)
    }
  }
  return index
}

/** Resuelve los pines reales de un net. Los ausentes se omiten, no fallan. */
function netPinRefs(net: Net, index: Map<string, PinRef>): PinRef[] {
  const result: PinRef[] = []
  for (const endpoint of net.pins) {
    const pin = index.get(`${endpoint.componentId}:${endpoint.pinId}`)
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
export function ruleV1(project: Project, _catalog: Catalog): Violation[] {
  const index = pinIndex(project)
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
export function ruleV2(project: Project, _catalog: Catalog): Violation[] {
  const index = pinIndex(project)
  const out: Violation[] = []

  for (const net of project.nets) {
    const pins = netPinRefs(net, index)
    const powerCount = pins.filter((p) => p.type === 'power').length

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

/**
 * V-4 (warning): `anode`/`cathode` invertidos respecto a la fuente.
 *
 * Solo se pronuncia cuando el catálogo confirma que el componente es un diodo/LED.
 * Sin esa información se omite en vez de inventar un fallo.
 */
export function ruleV4(project: Project, catalog: Catalog): Violation[] {
  const index = pinIndex(project)
  const out: Violation[] = []

  for (const net of project.nets) {
    const pins = netPinRefs(net, index)
    const cathodeOnPower = pins.find((p) => p.type === 'power' && /cathode/i.test(p.pinId))
    if (!cathodeOnPower) continue

    const endpoint = net.pins.find((e) => e.pinId === cathodeOnPower.pinId)
    if (!endpoint) continue

    const component = project.components.find((c) => c.id === endpoint.componentId)
    if (!component) continue

    const entry: CatalogEntry | undefined = catalog.get(component.typeId)
    if (entry?.pins.some((p) => /anode|cathode/i.test(p.id))) {
      out.push(violation('V-4', { netId: net.id, componentId: component.id }))
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
    if (!entry) continue
    if (component.pins.some((p) => p.netId === null)) {
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
export function validateCircuit(project: Project, catalog: Catalog): Violation[] {
  if (project.components.length === 0 && project.nets.length === 0) return []

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
    const blocking = validateCircuit(hypothetical, catalog).find((v) => v.severity === 'error')
    return blocking ? { allowed: false, violation: blocking } : { allowed: true }
  } catch {
    // Un fallo al construir el net hipotético no debe bloquear la interfaz.
    return { allowed: true }
  }
}
