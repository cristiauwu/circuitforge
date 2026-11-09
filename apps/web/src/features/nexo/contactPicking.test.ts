import { BREADBOARD_CONTACTS, BREADBOARD_PITCH } from '@circuitforge/netlist'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { pickBreadboardContact } from './contactPicking'
import { createProjectModel } from './models'

const anchors = Object.fromEntries(
  BREADBOARD_CONTACTS.map((contact) => [
    contact.pinId,
    new THREE.Vector3(contact.x, 0.305, contact.z),
  ]),
)
const contact = BREADBOARD_CONTACTS[0]
if (!contact) throw new Error('Expected canonical breadboard contacts')
function anchorFor(pinId: string): THREE.Vector3 {
  const anchor = anchors[pinId]
  if (!anchor) throw new Error(`Missing anchor ${pinId}`)
  return anchor
}
function topRay(point: THREE.Vector3) {
  return new THREE.Ray(point.clone().add(new THREE.Vector3(0, 10, 0)), new THREE.Vector3(0, -1, 0))
}

describe('dense breadboard contact picking', () => {
  it('chooses every exact physical contact including all rails', () => {
    const group = new THREE.Group()
    group.updateMatrixWorld(true)
    for (const point of BREADBOARD_CONTACTS) {
      expect(pickBreadboardContact(topRay(anchorFor(point.pinId)), group, anchors)?.pinId).toBe(
        point.pinId,
      )
    }
  })

  it('picks real model holes above their own body and is occluded by an overlapping model', () => {
    const board = createProjectModel('breadboard')
    const blocker = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial(),
    )
    try {
      board.group.traverse((child) => {
        if (child instanceof THREE.InstancedMesh) child.raycast = () => {}
      })
      board.group.position.set(1, 0, -2)
      board.group.rotation.y = Math.PI / 2
      board.group.updateMatrixWorld(true)
      const raycaster = new THREE.Raycaster()
      for (const point of BREADBOARD_CONTACTS) {
        const anchor = board.anchors[point.pinId]
        if (!anchor) throw new Error(`Missing model hole ${point.pinId}`)
        const world = board.group.localToWorld(anchor.clone())
        raycaster.ray.copy(topRay(world))
        const hits = raycaster.intersectObject(board.group, true)
        expect(
          pickBreadboardContact(raycaster.ray, board.group, board.anchors, hits[0]?.distance)
            ?.pinId,
        ).toBe(point.pinId)
      }
      const anchor = board.anchors[contact.pinId]
      if (!anchor) throw new Error('Expected model contact')
      const world = board.group.localToWorld(anchor.clone())
      blocker.position.copy(world).add(new THREE.Vector3(0, 0.3, 0))
      blocker.updateMatrixWorld(true)
      raycaster.ray.copy(topRay(world))
      const hits = raycaster.intersectObjects([board.group, blocker], true)
      expect(
        pickBreadboardContact(raycaster.ray, board.group, board.anchors, hits[0]?.distance),
      ).toBeNull()
    } finally {
      board.dispose()
      blocker.geometry.dispose()
      blocker.material.dispose()
    }
  })

  it('selects the nearest pitch-sized cell, not a neighbouring oversized sphere', () => {
    const group = new THREE.Group()
    const anchor = anchorFor(contact.pinId)
    const point = anchor.clone().add(new THREE.Vector3(BREADBOARD_PITCH * 0.49, 0, 0))
    expect(pickBreadboardContact(topRay(point), group, anchors)?.pinId).toBe(contact.pinId)
  })

  it('follows translated and rotated board anchors exactly', () => {
    const group = new THREE.Group()
    group.position.set(4, 0, -3)
    group.rotation.y = Math.PI / 2
    group.updateMatrixWorld(true)
    const world = group.localToWorld(anchorFor(contact.pinId).clone())
    expect(pickBreadboardContact(topRay(world), group, anchors)).toEqual({
      pinId: contact.pinId,
      distance: 10,
    })
  })

  it('does not select through a nearer component body, even within lead tolerance', () => {
    const group = new THREE.Group()
    const ray = topRay(anchorFor(contact.pinId))
    expect(pickBreadboardContact(ray, group, anchors, 9.99)).toBeNull()
    expect(pickBreadboardContact(ray, group, anchors, 10.001)?.pinId).toBe(contact.pinId)
  })

  it('rejects center trench, outside cells, missing anchors, parallel and rearward rays', () => {
    const group = new THREE.Group()
    expect(pickBreadboardContact(topRay(new THREE.Vector3(0, 0.305, 0)), group, anchors)).toBeNull()
    expect(
      pickBreadboardContact(topRay(new THREE.Vector3(20, 0.305, 20)), group, anchors),
    ).toBeNull()
    expect(pickBreadboardContact(topRay(anchorFor(contact.pinId)), group, {})).toBeNull()
    expect(
      pickBreadboardContact(
        new THREE.Ray(new THREE.Vector3(0, 5, 0), new THREE.Vector3(1, 0, 0)),
        group,
        anchors,
      ),
    ).toBeNull()
    expect(
      pickBreadboardContact(
        new THREE.Ray(new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, 1, 0)),
        group,
        anchors,
      ),
    ).toBeNull()
  })
})
