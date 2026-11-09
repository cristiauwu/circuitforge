import * as THREE from 'three'

interface FramingControls {
  target: THREE.Vector3
  minDistance: number
  maxDistance: number
  update(): unknown
}

const defaultBounds = new THREE.Box3(
  new THREE.Vector3(-2.85, -0.05, -2.9),
  new THREE.Vector3(3.15, 0.95, 3.1),
)

/** A bounding sphere fits at every orbit angle, including a near-vertical top view. */
export function frameCameraBounds(
  camera: THREE.PerspectiveCamera,
  controls: FramingControls,
  bounds: THREE.Box3,
  onlyExpand = false,
): void {
  const sphere = (bounds.isEmpty() ? defaultBounds : bounds).getBoundingSphere(new THREE.Sphere())
  const direction = camera.position.clone().sub(controls.target)
  const currentDistance = direction.length()
  if (!currentDistance) direction.set(7.4, 12.4, 9.5)
  direction.normalize()
  // Resizing preserves the user's target, orientation and zoom unless content would clip.
  const radius =
    Math.max(0.01, sphere.radius) + (onlyExpand ? sphere.center.distanceTo(controls.target) : 0)
  const halfVerticalFov = THREE.MathUtils.degToRad(camera.getEffectiveFOV() / 2)
  const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * camera.aspect)
  const distance = (radius * 1.18) / Math.sin(Math.min(halfVerticalFov, halfHorizontalFov))
  if (!onlyExpand) {
    controls.target.copy(sphere.center)
    controls.minDistance = Math.max(1.5, sphere.radius * 1.5)
  }
  const nextDistance = Math.max(controls.minDistance, distance, onlyExpand ? currentDistance : 0)
  controls.maxDistance = Math.max(25, nextDistance * 1.4)
  camera.position.copy(controls.target).addScaledVector(direction, nextDistance)
  // Distant project parts must not disappear behind the old, hero-sized far plane.
  camera.near = Math.min(0.1, Math.max(0.001, (nextDistance - radius) / 2))
  camera.far = Math.max(100, controls.maxDistance + radius * 2)
  camera.updateProjectionMatrix()
  controls.update()
}
