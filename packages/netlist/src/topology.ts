import { BREADBOARD_GROUPS, BREADBOARD_TYPE_ID } from './breadboard.js'
import { validateParameterValue } from './componentRegistry.js'
import { validateMount } from './mounting.js'
import type { Component, Net, PinEndpoint, Project, Wire } from './types.js'

/** Ideal manual contact states only. Coils, ICs and passive loads are never shorts. */
export function getInternalContactPairs(
  component: Component,
): readonly (readonly [string, string])[] {
  const p = component.params
  const stateKey: Readonly<Record<string, string>> = {
    switch_spst: 'closed',
    switch_spdt: 'position',
    pushbutton: 'pressed',
    dip_switch_4: 'closedMask',
    reed_switch: 'closed',
    rotary_encoder: 'pressed',
    relay_spdt: 'energized',
    keypad_4x4: 'key',
  }
  const key = stateKey[component.typeId]
  if (key && p[key] !== undefined && !validateParameterValue(component.typeId, key, p[key]))
    throw new Error(`Estado de contacto inválido: ${component.id}.${key}`)
  switch (component.typeId) {
    case 'switch_spst':
      return p.closed === true ? [['a', 'b']] : []
    case 'switch_spdt':
      return [['common', p.position === 'throw_b' ? 'throw_b' : 'throw_a']]
    case 'pushbutton':
      return p.pressed === true ? [['a', 'b']] : []
    case 'dip_switch_4':
      return typeof p.closedMask === 'number' &&
        Number.isInteger(p.closedMask) &&
        p.closedMask >= 0 &&
        p.closedMask <= 15
        ? [0, 1, 2, 3]
            .filter((bit) => (Number(p.closedMask) & (1 << bit)) !== 0)
            .map((bit) => [`a${bit + 1}`, `b${bit + 1}`] as const)
        : []
    case 'reed_switch':
      return p.closed === true ? [['a', 'b']] : []
    case 'rotary_encoder':
      return p.pressed === true ? [['SW1', 'SW2']] : []
    case 'relay_spdt':
      return [['COM', p.energized === true ? 'NO' : 'NC']]
    case 'keypad_4x4': {
      const key =
        typeof p.key === 'string' && /^(?:[1-9]|1[0-6])$/.test(p.key) ? Number(p.key) - 1 : -1
      return key >= 0 ? [[`R${Math.floor(key / 4) + 1}`, `C${(key % 4) + 1}`]] : []
    }
    default:
      return []
  }
}

/** Collision-safe key, including for imported identifiers containing punctuation. */
export const endpointKey = (pin: PinEndpoint): string =>
  JSON.stringify([pin.componentId, pin.pinId])
export const sameEndpoint = (a: PinEndpoint, b: PinEndpoint): boolean =>
  endpointKey(a) === endpointKey(b)
export const sameWireEndpoints = (wire: Wire, a: PinEndpoint, b: PinEndpoint): boolean =>
  (sameEndpoint(wire.from, a) && sameEndpoint(wire.to, b)) ||
  (sameEndpoint(wire.from, b) && sameEndpoint(wire.to, a))

function wireSequence(project: Project): number {
  return Math.max(
    1,
    project.nextWireSeq ?? 1,
    ...(project.wires ?? []).map((wire) => Number(/^W(\d+)$/.exec(wire.id)?.[1] ?? 0) + 1),
  )
}

/** Materialize legacy net stars ONCE, before editing topology, never internal strips. */
export function materializeWires(project: Project): Project {
  if (project.wires !== undefined) return project
  let nextWireSeq = wireSequence(project)
  const wires: Wire[] = []
  for (const net of project.nets) {
    const from = net.pins[0]
    if (!from) continue
    for (const to of net.pins.slice(1)) {
      if (!sameEndpoint(from, to) && !wires.some((wire) => sameWireEndpoints(wire, from, to))) {
        wires.push({ id: `W${nextWireSeq++}`, from: { ...from }, to: { ...to } })
      }
    }
  }
  return { ...project, wires, nextWireSeq }
}

/** Build actual conductive components. Idle strips remain known but unactivated. */
function topology(project: Project): {
  groups: PinEndpoint[][]
  active: Set<string>
  root: (key: string) => string
} {
  const parent = new Map<string, string>()
  const endpoints = new Map<string, PinEndpoint>()
  for (const component of project.components) {
    for (const pin of component.pins) {
      const endpoint = { componentId: component.id, pinId: pin.pinId }
      const key = endpointKey(endpoint)
      if (parent.has(key)) throw new Error(`Duplicate pin: ${component.id}.${pin.pinId}`)
      parent.set(key, key)
      endpoints.set(key, endpoint)
    }
  }
  const root = (key: string): string => {
    const value = parent.get(key)
    if (value === undefined) throw new Error(`Unknown pin: ${endpoints.get(key)?.pinId ?? key}`)
    if (value === key) return key
    const result = root(value)
    parent.set(key, result)
    return result
  }
  const join = (a: PinEndpoint, b: PinEndpoint): void => {
    parent.set(root(endpointKey(b)), root(endpointKey(a)))
  }
  for (const component of project.components) {
    if (component.typeId !== BREADBOARD_TYPE_ID) continue
    const ids = new Set(component.pins.map((pin) => pin.pinId))
    for (const group of BREADBOARD_GROUPS) {
      const pins = group.pinIds.filter((id) => ids.has(id))
      const first = pins[0]
      if (first === undefined) continue
      for (const pinId of pins.slice(1))
        join({ componentId: component.id, pinId: first }, { componentId: component.id, pinId })
    }
  }
  const activeEndpoints: string[] = []
  for (const component of project.components) {
    for (const [a, b] of getInternalContactPairs(component)) {
      // Legacy partial components do not fabricate absent terminals.
      if (
        !component.pins.some((pin) => pin.pinId === a) ||
        !component.pins.some((pin) => pin.pinId === b)
      )
        continue
      const from = { componentId: component.id, pinId: a }
      const to = { componentId: component.id, pinId: b }
      join(from, to)
      activeEndpoints.push(endpointKey(from), endpointKey(to))
    }
  }
  for (const mount of project.mounts ?? []) {
    validateMount(project, mount)
    for (const contact of mount.contacts) {
      const from = { componentId: mount.componentId, pinId: contact.pinId }
      const to = { componentId: mount.boardId, pinId: contact.contactId }
      join(from, to)
      activeEndpoints.push(endpointKey(from), endpointKey(to))
    }
  }
  const explicit = materializeWires(project).wires ?? []
  const wireIds = new Set<string>()
  for (const wire of explicit) {
    if (wireIds.has(wire.id)) throw new Error(`Duplicate wire id: ${wire.id}`)
    wireIds.add(wire.id)
    if (sameEndpoint(wire.from, wire.to)) throw new Error('Invalid self wire')
    join(wire.from, wire.to)
    activeEndpoints.push(endpointKey(wire.from), endpointKey(wire.to))
  }
  const groups = new Map<string, PinEndpoint[]>()
  for (const [key, endpoint] of endpoints) {
    const id = root(key)
    const group = groups.get(id) ?? []
    group.push(endpoint)
    groups.set(id, group)
  }
  return { groups: [...groups.values()], active: new Set(activeEndpoints.map(root)), root }
}

/** Includes implicit strips, even when their idle contacts have netId:null. */
export function arePinsConnected(project: Project, a: PinEndpoint, b: PinEndpoint): boolean {
  const graph = topology(project)
  return graph.root(endpointKey(a)) === graph.root(endpointKey(b))
}

/** Recompute net membership from cables + internal conductors; preserve surviving ids.
 * A split keeps an old id on at most one part. New ids never reuse historical ids.
 */
export function recomputeNets(input: Project, preferredNetId?: string): Project {
  // Persist the original stars before expanding strips: otherwise a second edit
  // could mistake newly derived infrastructure contacts for authored cables.
  const project = materializeWires(input)
  const graph = topology(project)
  let nextNetSeq = Math.max(
    1,
    project.nextNetSeq ?? 1,
    ...project.nets.map((net) => Number(/^N(\d+)$/.exec(net.id)?.[1] ?? 0) + 1),
    ...project.components.flatMap((c) =>
      c.pins.map((pin) => Number(/^N(\d+)$/.exec(pin.netId ?? '')?.[1] ?? 0) + 1),
    ),
  )
  const oldMembership = new Map<string, string>()
  for (const net of project.nets)
    for (const pin of net.pins) oldMembership.set(endpointKey(pin), net.id)
  const used = new Set<string>()
  const netByPin = new Map<string, string>()
  const nets: Net[] = []
  for (const pins of graph.groups) {
    const first = pins[0]
    if (!first || !graph.active.has(graph.root(endpointKey(first)))) continue
    const candidates = pins
      .map((pin) => oldMembership.get(endpointKey(pin)))
      .filter((id): id is string => id !== undefined)
    const id =
      (preferredNetId && candidates.includes(preferredNetId) && !used.has(preferredNetId)
        ? preferredNetId
        : candidates.find((candidate) => !used.has(candidate))) ?? `N${nextNetSeq++}`
    used.add(id)
    nets.push({ id, pins })
    for (const pin of pins) netByPin.set(endpointKey(pin), id)
  }
  return {
    ...project,
    nets,
    nextNetSeq,
    components: project.components.map((component) => ({
      ...component,
      pins: component.pins.map((pin) => ({
        ...pin,
        netId: netByPin.get(endpointKey({ componentId: component.id, pinId: pin.pinId })) ?? null,
      })),
    })),
  }
}

/** Allocate a cable id without recycling ids after removal. */
export function appendWire(project: Project, from: PinEndpoint, to: PinEndpoint): Project {
  const materialized = materializeWires(project)
  const seq = wireSequence(materialized)
  return {
    ...materialized,
    wires: [...(materialized.wires ?? []), { id: `W${seq}`, from: { ...from }, to: { ...to } }],
    nextWireSeq: seq + 1,
  }
}
