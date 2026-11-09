import type { Component, PinEndpoint, Project } from '@circuitforge/netlist'
import { COMPONENT_DEFINITIONS } from '@circuitforge/netlist'

/** Domain units per world unit. Domain +y becomes world -z. */
export const MODEL_SCALE = 1 / 24
export const PROJECT_GRID = 24
export interface ProjectPoint {
  x: number
  y: number
}
export interface ProjectPose extends ProjectPoint {
  rotation?: number
}
export interface WorldPoint {
  x: number
  y: number
  z: number
}
export type ModelAnchors = Readonly<Record<string, WorldPoint>>
export type AnchorsByType = Readonly<Record<string, ModelAnchors>>
export interface WireSegment {
  netId: string
  from: WorldPoint
  to: WorldPoint
}
export interface ModelFootprint {
  width: number
  depth: number
}

/** Conservative domain-space rectangles, including terminal labels and leads. */
export const MODEL_FOOTPRINTS: Readonly<Record<string, ModelFootprint>> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map(({ typeId, footprint }) => [typeId, footprint]),
)

export function projectToWorld(position: ProjectPose): WorldPoint {
  return { x: position.x * MODEL_SCALE, y: 0, z: -position.y * MODEL_SCALE }
}

/** Positive domain clockwise rotation is positive THREE.Group.rotation.y. */
export function projectRotationToWorld(rotation = 0): number {
  return (rotation * Math.PI) / 180
}

export function worldToProject(position: Pick<WorldPoint, 'x' | 'z'>): ProjectPoint {
  const snap = (value: number) => Math.round(value / PROJECT_GRID) * PROJECT_GRID || 0
  return { x: snap(position.x / MODEL_SCALE), y: snap(-position.z / MODEL_SCALE) }
}

/** Local anchors are already world-sized: rotate, then translate; never rescale twice. */
export function pinWorld(position: ProjectPose, anchor: WorldPoint): WorldPoint {
  const origin = projectToWorld(position)
  const radians = projectRotationToWorld(position.rotation)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: origin.x + anchor.x * cos + anchor.z * sin,
    y: anchor.y,
    z: origin.z - anchor.x * sin + anchor.z * cos,
  }
}

/** Explicit cables take precedence; only legacy snapshots without wires derive a net star. */
export function deriveWireSegments(project: Project, anchorsByType: AnchorsByType): WireSegment[] {
  const components = new Map(project.components.map((component) => [component.id, component]))
  const locate = (endpoint: PinEndpoint) => endpointWorld(components, anchorsByType, endpoint)
  if (project.wires !== undefined) {
    return [...project.wires]
      .sort((a, b) => compareIds(a.id, b.id))
      .flatMap((wire) => {
        const from = locate(wire.from)
        const to = locate(wire.to)
        if (!from || !to) return []
        const pin = components
          .get(wire.from.componentId)
          ?.pins.find((item) => item.pinId === wire.from.pinId)
        return [{ netId: pin?.netId ?? wire.id, from, to }]
      })
  }
  return legacyWireSegments(project, locate)
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function endpointWorld(
  components: ReadonlyMap<string, Component>,
  anchorsByType: AnchorsByType,
  endpoint: PinEndpoint,
): WorldPoint | undefined {
  const component = components.get(endpoint.componentId)
  const anchor = component && anchorsByType[component.typeId]?.[endpoint.pinId]
  if (!component || !anchor || !component.pins.some((pin) => pin.pinId === endpoint.pinId))
    return undefined
  if (![anchor.x, anchor.y, anchor.z].every(Number.isFinite)) return undefined
  return pinWorld(component.position, anchor)
}

/** A missing endpoint invalidates the entire legacy net: never invent a partial cable. */
function legacyWireSegments(
  project: Project,
  locate: (endpoint: PinEndpoint) => WorldPoint | undefined,
): WireSegment[] {
  const result: WireSegment[] = []
  const compare = compareIds
  for (const net of [...project.nets].sort((a, b) => compare(a.id, b.id))) {
    const endpoints = [...net.pins].sort(
      (a, b) => compare(a.componentId, b.componentId) || compare(a.pinId, b.pinId),
    )
    const seen = new Set<string>()
    const points: WorldPoint[] = []
    let complete = true
    for (const endpoint of endpoints) {
      const key = JSON.stringify([endpoint.componentId, endpoint.pinId])
      if (seen.has(key)) continue
      seen.add(key)
      const point = locate(endpoint)
      if (!point) {
        complete = false
        break
      }
      points.push(point)
    }
    const [root, ...others] = points
    if (!complete || !root) continue
    for (const point of others) {
      result.push({ netId: net.id, from: { ...root }, to: { ...point } })
    }
  }
  return result
}

function footprint(typeId: string, rotation = 0): ModelFootprint {
  const dimensions = MODEL_FOOTPRINTS[typeId] ?? { width: 120, depth: 120 }
  const angle = projectRotationToWorld(rotation)
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  return {
    width: Math.round((dimensions.width * cos + dimensions.depth * sin) * 1e6) / 1e6,
    depth: Math.round((dimensions.width * sin + dimensions.depth * cos) * 1e6) / 1e6,
  }
}

/** First free rectangle on an expanding square grid, with one grid-cell clearance. */
export function findProjectPosition(
  components: readonly Component[],
  typeId: string,
): ProjectPoint {
  const next = footprint(typeId)
  const occupied = components.map((component) => ({
    ...component.position,
    ...footprint(component.typeId, component.position.rotation),
  }))
  const free = (x: number, y: number) =>
    occupied.every(
      (other) =>
        Math.abs(x - other.x) >= (next.width + other.width) / 2 + PROJECT_GRID ||
        Math.abs(y - other.y) >= (next.depth + other.depth) / 2 + PROJECT_GRID,
    )
  if (free(0, 0)) return { x: 0, y: 0 }
  for (let radius = 1; ; radius++) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue
        if (free(x * PROJECT_GRID, y * PROJECT_GRID))
          return { x: x * PROJECT_GRID, y: y * PROJECT_GRID }
      }
    }
  }
}
