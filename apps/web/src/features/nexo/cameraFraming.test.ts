import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { frameCameraBounds } from './cameraFraming'

function setup(aspect: number, top = false) {
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100)
  const controls = {
    target: new THREE.Vector3(),
    minDistance: 7,
    maxDistance: 25,
    update() {
      camera.lookAt(this.target)
      camera.updateMatrixWorld()
    },
  }
  if (top) camera.position.set(0, 16.55, 0.01)
  else camera.position.set(7.4, 12.4, 9.5)
  return { camera, controls }
}

function expectContained(camera: THREE.PerspectiveCamera, bounds: THREE.Box3) {
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera)
        expect(Math.abs(point.x)).toBeLessThan(1)
        expect(Math.abs(point.y)).toBeLessThan(1)
        expect(Math.abs(point.z)).toBeLessThan(1)
      }
}

describe('project camera framing', () => {
  it.each([0.2, 0.35, 1, 2.5])(
    'fits distant whole-project bounds at aspect %s in perspective and top',
    (aspect) => {
      for (const top of [false, true]) {
        const { camera, controls } = setup(aspect, top)
        const bounds = new THREE.Box3(
          new THREE.Vector3(-250, 0, -80),
          new THREE.Vector3(400, 12, 150),
        )
        const original = bounds.clone()
        const direction = camera.position.clone().normalize()
        frameCameraBounds(camera, controls, bounds)
        expectContained(camera, bounds)
        expect(bounds.equals(original)).toBe(true)
        expect(controls.target.equals(bounds.getCenter(new THREE.Vector3()))).toBe(true)
        expect(
          camera.position.clone().sub(controls.target).normalize().distanceTo(direction),
        ).toBeLessThan(1e-12)
        expect(camera.position.distanceTo(controls.target)).toBeLessThanOrEqual(
          controls.maxDistance,
        )
        expect(camera.far).toBeGreaterThan(100)
      }
    },
  )

  it('uses a finite empty-project default without changing the supplied box', () => {
    const { camera, controls } = setup(0.25, true)
    const bounds = new THREE.Box3()
    frameCameraBounds(camera, controls, bounds)
    expect(bounds.isEmpty()).toBe(true)
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true)
    expect(controls.target.toArray().every(Number.isFinite)).toBe(true)
    expectContained(
      camera,
      new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 0.5, 2)),
    )
  })

  it('preserves target, orbit and extra zoom-out on resize; expands only when needed', () => {
    const { camera, controls } = setup(2)
    const bounds = new THREE.Box3(new THREE.Vector3(-4, 0, -3), new THREE.Vector3(4, 2, 3))
    frameCameraBounds(camera, controls, bounds)
    controls.target.add(new THREE.Vector3(0.3, 0, 0.2))
    camera.position.copy(controls.target).add(new THREE.Vector3(-60, 80, 40))
    controls.update()
    const target = controls.target.clone()
    const position = camera.position.clone()
    const direction = camera.position.clone().sub(target).normalize()
    frameCameraBounds(camera, controls, bounds, true)
    expect(camera.position.distanceTo(position)).toBeLessThan(1e-12)
    camera.aspect = 0.1
    frameCameraBounds(camera, controls, bounds, true)
    expect(controls.target.equals(target)).toBe(true)
    expect(camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(
      1e-12,
    )
    expectContained(camera, bounds)
  })

  it('recovers a zero camera offset and zero-size bounds without NaN', () => {
    const { camera, controls } = setup(1)
    camera.position.copy(controls.target)
    frameCameraBounds(camera, controls, new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()))
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true)
    expect(camera.position.distanceTo(controls.target)).toBeGreaterThan(0)
  })
})
