/**
 * Operaciones puras sobre el netlist.
 *
 * Todas las funciones devuelven un `Project` nuevo y nunca mutan la entrada
 * (el store de Zustand depende de esto para el undo/redo).
 */

import type { Component, Net, PinEndpoint, Project } from './types.js'

/** Versión de esquema actual. Coincide con `schemaVersion` del spec (§5). */
export const SCHEMA_VERSION = 1

/** Marca temporal ISO para `metadata.updatedAt`. */
function now(): string {
  return new Date().toISOString()
}

/**
 * Devuelve el proyecto con los metadatos actualizados.
 *
 * El tipo del parche admite `undefined` en las propiedades opcionales porque
 * `exactOptionalPropertyTypes` distingue "propiedad ausente" de "propiedad presente
 * con valor undefined". Aquí queremos permitir pasar `nextNetSeq: undefined` para
 * conservar el valor previo sin ramificar en cada llamador.
 */
function withMetadata(
  project: Project,
  patch: Omit<Partial<Project>, 'metadata'> & { nextNetSeq?: number | undefined },
): Project {
  return { ...project, ...patch, metadata: { ...project.metadata, updatedAt: now() } }
}

/** Busca un componente por id. */
function findComponent(project: Project, componentId: string): Component | undefined {
  return project.components.find((c) => c.id === componentId)
}

/** ¿Existe el componente y tiene ese pin? */
function hasPin(project: Project, endpoint: PinEndpoint): boolean {
  const component = findComponent(project, endpoint.componentId)
  return component?.pins.some((p) => p.pinId === endpoint.pinId) ?? false
}

/** Lee el `netId` actual de un pin. `null` si no está conectado. */
function netIdOf(project: Project, endpoint: PinEndpoint): string | null {
  const component = findComponent(project, endpoint.componentId)
  const pin = component?.pins.find((p) => p.pinId === endpoint.pinId)
  return pin?.netId ?? null
}

/** Extrae el número de un id con forma `N<dígitos>`. `0` si no encaja. */
function netSeqOf(id: string | null): number {
  if (id === null) return 0
  const match = /^N(\d+)$/.exec(id)
  if (!match?.[1]) return 0
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * Genera el siguiente id de net: "N1", "N2", …
 *
 * Usa el contador monótono `nextNetSeq`. Si no está presente (proyecto construido a
 * mano), lo deriva del mayor sufijo visible — aproximación conservadora que nunca
 * reutiliza un id **visible**.
 */
function nextNetId(project: Project): string {
  if (typeof project.nextNetSeq === 'number' && project.nextNetSeq > 0) {
    return `N${project.nextNetSeq}`
  }

  let max = 0
  const consider = (id: string | null): void => {
    const n = netSeqOf(id)
    if (n > max) max = n
  }
  for (const net of project.nets) consider(net.id)
  for (const component of project.components) {
    for (const pin of component.pins) consider(pin.netId)
  }
  return `N${max + 1}`
}

/** Avanza el contador de nets tras consumir `usedId`. */
function bumpNetSeq(project: Project, usedId: string): number {
  return Math.max(project.nextNetSeq ?? 0, netSeqOf(usedId) + 1)
}

/** Devuelve una copia del componente con el `netId` de un pin actualizado. */
function withPinNet(component: Component, pinId: string, netId: string): Component {
  return {
    ...component,
    pins: component.pins.map((p) => (p.pinId === pinId ? { ...p, netId } : p)),
  }
}

/** Aplica `netId` a un pin dentro de la lista de componentes (inmutable). */
function setPinNet(components: Component[], endpoint: PinEndpoint, netId: string): Component[] {
  return components.map((c) =>
    c.id === endpoint.componentId ? withPinNet(c, endpoint.pinId, netId) : c,
  )
}

/** Aplica `netId` a varios pines en cadena. */
function setPinsNet(components: Component[], endpoints: PinEndpoint[], netId: string): Component[] {
  return endpoints.reduce((acc, endpoint) => setPinNet(acc, endpoint, netId), components)
}

/** Predicado para deduplicar pines por `componentId:pinId`. */
function uniquePin(pin: PinEndpoint, index: number, all: PinEndpoint[]): boolean {
  const key = `${pin.componentId}:${pin.pinId}`
  return all.findIndex((p) => `${p.componentId}:${p.pinId}` === key) === index
}

/** Añade pines a un net existente, sin duplicados. */
function addPinsToNet(net: Net, pins: PinEndpoint[]): Net {
  return { ...net, pins: [...net.pins, ...pins].filter(uniquePin) }
}

/**
 * Crea un proyecto vacío válido.
 *
 * @param id Identificador del proyecto.
 * @param name Nombre visible.
 */
export function createEmptyProject(id: string, name: string): Project {
  const stamp = now()
  return {
    id,
    name,
    schemaVersion: SCHEMA_VERSION,
    components: [],
    nets: [],
    metadata: { createdAt: stamp, updatedAt: stamp, author: '' },
    nextNetSeq: 1,
  }
}

/**
 * Caso en que al menos un extremo está suelto: un net absorbe al otro, o se crea uno.
 */
function connectToFreeOrExisting(
  project: Project,
  a: PinEndpoint,
  b: PinEndpoint,
  netA: string | null,
  netB: string | null,
): Project {
  const isNewNet = netA === null && netB === null
  const targetId = netA ?? netB ?? nextNetId(project)
  const existing = project.nets.find((n) => n.id === targetId)

  const nets = existing
    ? project.nets.map((n) => (n.id === targetId ? addPinsToNet(n, [a, b]) : n))
    : [...project.nets, { id: targetId, pins: [a, b] }]

  return withMetadata(project, {
    components: setPinsNet(project.components, [a, b], targetId),
    nets,
    // Si no se consumió un id nuevo, se propaga el contador sin cambios.
    ...(isNewNet ? { nextNetSeq: bumpNetSeq(project, targetId) } : {}),
  })
}

/**
 * Caso en que ambos extremos están en nets distintos: mergea el segundo en el primero.
 *
 * Mueve todos los pines del net absorbido al superviviente, reasigna sus `netId` y
 * elimina el net absorbido.
 */
function mergeNets(
  project: Project,
  a: PinEndpoint,
  b: PinEndpoint,
  netA: string,
  netB: string,
): Project {
  const target = project.nets.find((n) => n.id === netA)
  const absorbed = project.nets.find((n) => n.id === netB)
  if (!target || !absorbed) {
    throw new Error(`Inconsistent net state: ${netA} / ${netB}`)
  }

  const absorbedPins = absorbed.pins
  const components = setPinsNet(project.components, [...absorbedPins, a, b], netA)

  const nets = project.nets
    .filter((n) => n.id !== netB)
    .map((n) => (n.id === netA ? addPinsToNet(n, [...absorbedPins, a, b]) : n))

  return withMetadata(project, {
    components,
    nets,
    // El merge no consume un id nuevo, pero el contador se propaga para no perderlo.
    ...(project.nextNetSeq === undefined ? { nextNetSeq: bumpNetSeq(project, netA) } : {}),
  })
}

/** Valida los extremos y lanza si la conexión no tiene sentido. */
function assertConnectable(project: Project, a: PinEndpoint, b: PinEndpoint): void {
  if (!hasPin(project, a)) {
    throw new Error(`Unknown pin: ${a.componentId}.${a.pinId}`)
  }
  if (!hasPin(project, b)) {
    throw new Error(`Unknown pin: ${b.componentId}.${b.pinId}`)
  }
  // Mismo pin dos veces. Se comprueba por identidad de extremo y no por `netId`:
  // si el pin está suelto, ambos `netId` son `null` y la comparación de nets no lo
  // detectaría, dejando el pin duplicado dentro del net (viola el invariante).
  if (a.componentId === b.componentId && a.pinId === b.pinId) {
    throw new Error(
      `Pins are already connected on the same net (same pin ${a.componentId}.${a.pinId})`,
    )
  }

  const netA = netIdOf(project, a)
  if (netA !== null && netA === netIdOf(project, b)) {
    throw new Error(`Pins are already connected on the same net (${netA})`)
  }
}

/**
 * Conecta dos pines creando o mergeando un net.
 *
 * Semántica (ver Task 1 del plan):
 * - Ambos pines sin net → crea un net nuevo con los dos.
 * - Uno con net, otro sin net → añade el suelto al net existente.
 * - Ambos en nets distintos → **mergea**: mueve todos los pines del segundo
 *   al primero y elimina el segundo net.
 * - Ambos en el **mismo** net, o el mismo pin dos veces → lanza: ya están conectados.
 *
 * Es pura: nunca muta `project`. Usa *structural sharing* para que el store
 * pueda comparar por referencia.
 *
 * @throws {Error} si un pin no existe o si los dos extremos ya están conectados.
 */
export function connectPins(project: Project, a: PinEndpoint, b: PinEndpoint): Project {
  assertConnectable(project, a, b)

  const netA = netIdOf(project, a)
  const netB = netIdOf(project, b)

  if (netA === null || netB === null) {
    return connectToFreeOrExisting(project, a, b, netA, netB)
  }
  return mergeNets(project, a, b, netA, netB)
}
