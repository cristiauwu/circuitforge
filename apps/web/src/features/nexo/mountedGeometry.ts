import * as THREE from 'three'
import type { ProjectModel } from './models'

/** Per-instance formed legs. Original geometry remains owned by the source model. */
export function createMountedGeometry(model: ProjectModel) {
  const exits = new Map<string, THREE.Vector3>()
  const remove: THREE.Object3D[] = []
  model.group.traverse((child) => {
    if (child.userData.freeLead) {
      remove.push(child)
      const point = child.userData.bodyAnchor as number[] | undefined
      const pin = child.userData.pinId as string | undefined
      if (point && pin) exits.set(pin, new THREE.Vector3(point[0], point[1], point[2]))
    }
    if (child.name.startsWith('Pin lógico ')) remove.push(child)
  })
  for (const child of remove) child.removeFromParent()
  const legs = new THREE.Group()
  legs.name = 'Patas formadas de montaje · sin cables virtuales'
  model.group.add(legs)
  const material = new THREE.MeshStandardMaterial({
    color: '#aeb9bd',
    roughness: 0.33,
    metalness: 0.85,
  })
  let signature = ''
  let disposed = false
  function clear() {
    for (const child of [...legs.children]) {
      if (child instanceof THREE.Mesh) child.geometry.dispose()
      child.removeFromParent()
    }
  }
  return {
    update(targets: Readonly<Record<string, THREE.Vector3>>): boolean {
      const next = JSON.stringify(
        Object.entries(targets).map(([pin, p]) => [
          pin,
          ...p.toArray().map((v) => Math.round(v * 1e10) / 1e10),
        ]),
      )
      if (next === signature) return false
      signature = next
      clear()
      for (const [pinId, target] of Object.entries(targets)) {
        const start = exits.get(pinId)
        if (!start) throw new Error(`Missing formed-leg body exit for ${pinId}`)
        // A short horizontal shoulder and vertical insertion; the final point is the exact hole.
        const bend = new THREE.Vector3(target.x, Math.max(start.y, target.y + 0.14), target.z)
        const shoulder = start.clone().lerp(bend, 0.5)
        shoulder.y = start.y
        const curve = new THREE.CatmullRomCurve3([start.clone(), shoulder, bend, target.clone()])
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.023, 8, false), material)
        mesh.name = `Pata montada ${pinId}`
        mesh.userData = {
          pinId,
          mountedLead: true,
          terminalTip: target.toArray(),
          bodyAnchor: start.toArray(),
          componentId: model.group.userData.componentId,
        }
        mesh.castShadow = true
        legs.add(mesh)
        model.anchors[pinId] = target.clone()
      }
      return true
    },
    dispose() {
      if (disposed) return
      disposed = true
      clear()
      legs.removeFromParent()
      material.dispose()
    },
  }
}
export type MountedGeometry = ReturnType<typeof createMountedGeometry>
