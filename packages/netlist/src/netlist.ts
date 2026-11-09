/** Pure immutable circuit edits. Physical wires are authoritative; nets are derived. */

import { resolveMountedPose } from './mounting.js'
import {
  appendWire,
  materializeWires,
  recomputeNets,
  sameEndpoint,
  sameWireEndpoints,
} from './topology.js'
import type { PinEndpoint, Project } from './types.js'

export const SCHEMA_VERSION = 1
const stamp = (project: Project): Project => ({
  ...project,
  metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
})

export function createEmptyProject(id: string, name: string): Project {
  const createdAt = new Date().toISOString()
  return {
    id,
    name,
    schemaVersion: SCHEMA_VERSION,
    components: [],
    nets: [],
    wires: [],
    mounts: [],
    nextNetSeq: 1,
    nextWireSeq: 1,
    metadata: { createdAt, updatedAt: createdAt, author: '' },
  }
}

function assertPin(project: Project, endpoint: PinEndpoint): void {
  if (
    !project.components
      .find((component) => component.id === endpoint.componentId)
      ?.pins.some((pin) => pin.pinId === endpoint.pinId)
  ) {
    throw new Error(`Unknown pin: ${endpoint.componentId}.${endpoint.pinId}`)
  }
}

/** Add a physical cable, permitting redundant paths but never exact/reversed duplicates
 * or self-connections. Internal conductors are not emitted as wires. Electrical
 * safety policy belongs to validation.canConnect, which must run before UI edits.
 */
export function connectPins(project: Project, a: PinEndpoint, b: PinEndpoint): Project {
  assertPin(project, a)
  assertPin(project, b)
  const base = materializeWires(project)
  if (sameEndpoint(a, b) || base.wires?.some((wire) => sameWireEndpoints(wire, a, b))) {
    throw new Error('Pins are already connected on the same net (duplicate wire or same pin)')
  }
  const preferredNetId = project.components
    .find((component) => component.id === a.componentId)
    ?.pins.find((pin) => pin.pinId === a.pinId)?.netId
  return stamp(recomputeNets(appendWire(base, a, b), preferredNetId ?? undefined))
}

/** Remove one physical wire and split nets if no alternate path survives.
 * Unknown ids are a no-op, including on legacy snapshots.
 */
export function removeWire(project: Project, wireId: string): Project {
  const base = materializeWires(project)
  if (!base.wires?.some((wire) => wire.id === wireId)) return project
  return stamp(recomputeNets({ ...base, wires: base.wires.filter((wire) => wire.id !== wireId) }))
}

/** Disconnect the physical cable between two endpoints, not their implicit strip. */
export function disconnectPins(project: Project, a: PinEndpoint, b: PinEndpoint): Project {
  const base = materializeWires(project)
  const wire = base.wires?.find((candidate) => sameWireEndpoints(candidate, a, b))
  return wire ? removeWire(base, wire.id) : project
}

/** Remove a component AND its incident cables before rebuilding all connectivity.
 * In particular, deleting infrastructure must never leave an outside-pin phantom net.
 */
export function removeComponent(project: Project, componentId: string): Project {
  if (!project.components.some((component) => component.id === componentId)) return project
  const base = materializeWires(project)
  return stamp(
    recomputeNets({
      ...base,
      components: base.components
        .filter((component) => component.id !== componentId)
        .map((component) => {
          if (
            !base.mounts?.some(
              (mount) => mount.boardId === componentId && mount.componentId === component.id,
            )
          )
            return component
          const pose = resolveMountedPose(base, component.id)
          if (!pose) return component
          return {
            ...component,
            position: { x: pose.x, y: pose.y, rotation: pose.rotation },
            elevation: pose.elevation,
          }
        }),
      mounts: (base.mounts ?? []).filter(
        (mount) => mount.componentId !== componentId && mount.boardId !== componentId,
      ),
      wires: (base.wires ?? []).filter(
        (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId,
      ),
    }),
  )
}
