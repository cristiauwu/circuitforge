import { BREADBOARD_CONTACTS, BREADBOARD_PITCH } from '@circuitforge/netlist'
import * as THREE from 'three'

/** One local plane and pitch-sized cells, rather than hundreds of overlapping hit spheres. */
export function pickBreadboardContact(
  ray: THREE.Ray,
  group: THREE.Object3D,
  anchors: Readonly<Record<string, THREE.Vector3>>,
  nearestBodyDistance = Number.POSITIVE_INFINITY,
): { pinId: string; distance: number } | null {
  const first = BREADBOARD_CONTACTS[0]
  const firstAnchor = first && anchors[first.pinId]
  if (!firstAnchor) return null
  const inverse = group.matrixWorld.clone().invert()
  const localRay = ray.clone().applyMatrix4(inverse)
  const point = localRay.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -firstAnchor.y),
    new THREE.Vector3(),
  )
  if (!point) return null
  const distance = point.clone().applyMatrix4(group.matrixWorld).distanceTo(ray.origin)
  // Dense contacts never inherit the decorative-lead tolerance used for larger terminals.
  if (distance > nearestBodyDistance + 1e-6) return null
  let nearest: { pinId: string; distance: number } | null = null
  let nearestSquared = Number.POSITIVE_INFINITY
  const halfPitch = BREADBOARD_PITCH / 2
  for (const contact of BREADBOARD_CONTACTS) {
    const anchor = anchors[contact.pinId]
    if (!anchor) continue
    const dx = point.x - anchor.x
    const dz = point.z - anchor.z
    if (Math.abs(dx) > halfPitch + 1e-9 || Math.abs(dz) > halfPitch + 1e-9) continue
    const squared = dx * dx + dz * dz
    if (squared < nearestSquared) {
      nearestSquared = squared
      nearest = { pinId: contact.pinId, distance }
    }
  }
  return nearest
}
