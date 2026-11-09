import { BREADBOARD_CONTACTS, BREADBOARD_PITCH, BREADBOARD_TYPE_ID } from './breadboard.js'
import type { Mount, MountedPose, Project, Rotation } from './types.js'

export interface MountFootprintPin {
  readonly pinId: string
  /** Integer contact-grid offsets. Rows increase along x; columns along z. */
  readonly dx: number
  readonly dz: number
}
const pair = (a: string, b: string, span: number): readonly MountFootprintPin[] =>
  Object.freeze([
    Object.freeze({ pinId: a, dx: 0, dz: 0 }),
    Object.freeze({ pinId: b, dx: span, dz: 0 }),
  ])
const FOOTPRINTS: Readonly<Record<string, readonly MountFootprintPin[]>> = Object.freeze({
  resistor: pair('a', 'b', 5),
  diode: pair('anode', 'cathode', 5),
  inductor: pair('a', 'b', 5),
  led: pair('anode', 'cathode', 1),
  capacitor: pair('a', 'b', 1),
  capacitor_ceramic: pair('a', 'b', 1),
  ldr: pair('a', 'b', 1),
  bjt_npn: Object.freeze(
    ['base', 'collector', 'emitter'].map((pinId, dx) => Object.freeze({ pinId, dx, dz: 0 })),
  ),
})
export const MOUNT_ELEVATION = 0.555
export const getMountFootprint = (typeId: string): readonly MountFootprintPin[] | undefined =>
  Object.hasOwn(FOOTPRINTS, typeId) ? FOOTPRINTS[typeId] : undefined

function rotate(x: number, z: number, rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0:
      return [x, z]
    case 90:
      return [z, -x]
    case 180:
      return [-x, -z]
    case 270:
      return [-z, x]
    default:
      throw new Error('Rotación de montaje inválida.')
  }
}
const coordinateKey = (x: number, z: number): string => `${x.toFixed(4)},${z.toFixed(4)}`
const CONTACT_BY_ID = new Map(BREADBOARD_CONTACTS.map((contact) => [contact.pinId, contact]))
const CONTACT_BY_COORDINATE = new Map(
  BREADBOARD_CONTACTS.map((contact) => [coordinateKey(contact.x, contact.z), contact]),
)

/** All pins resolve against actual holes, so channel gaps and off-board poses fail closed.
 * Only component legs occupy holes: any number of authored cable ends may share one.
 * Rebuilding ignores this component's existing mount, permitting atomic repositioning.
 */
export function buildMount(
  project: Project,
  componentId: string,
  boardId: string,
  anchorContactId: string,
  rotation: Rotation,
): Mount {
  const component = project.components.find((item) => item.id === componentId)
  const board = project.components.find((item) => item.id === boardId)
  const footprint = component && getMountFootprint(component.typeId)
  if (!component || !footprint) throw new Error('Este componente no admite montaje en protoboard.')
  if (!board || board.typeId !== BREADBOARD_TYPE_ID || componentId === boardId)
    throw new Error('Protoboard de montaje inválida.')
  if (
    component.pins.length !== footprint.length ||
    footprint.some((pin) => !component.pins.some((item) => item.pinId === pin.pinId))
  )
    throw new Error('El montaje requiere todos los pines del componente.')
  const anchor = CONTACT_BY_ID.get(anchorContactId)
  if (!anchor) throw new Error('Contacto de anclaje desconocido.')
  const occupied = new Set(
    (project.mounts ?? [])
      .filter((mount) => mount.componentId !== componentId && mount.boardId === boardId)
      .flatMap((mount) => mount.contacts.map((contact) => contact.contactId)),
  )
  const contacts = footprint.map((pin) => {
    const [dx, dz] = rotate(pin.dx, pin.dz, rotation)
    const contact = CONTACT_BY_COORDINATE.get(
      coordinateKey(anchor.x + dx * BREADBOARD_PITCH, anchor.z + dz * BREADBOARD_PITCH),
    )
    if (!contact || !board.pins.some((item) => item.pinId === contact.pinId))
      throw new Error('Una pata queda fuera de los contactos de la protoboard.')
    if (occupied.has(contact.pinId))
      throw new Error(`El contacto ${contact.pinId} ya está ocupado por otra pata.`)
    return { pinId: pin.pinId, contactId: contact.pinId }
  })
  if (new Set(contacts.map((contact) => contact.contactId)).size !== contacts.length)
    throw new Error('Dos patas no pueden ocupar el mismo contacto.')
  return { componentId, boardId, anchorContactId, rotation, contacts }
}

/** Imported contact maps are data, never authority: verify against the canonical footprint. */
export function validateMount(project: Project, mount: Mount): void {
  if ((project.mounts ?? []).filter((item) => item.componentId === mount.componentId).length > 1)
    throw new Error('Componente montado más de una vez.')
  const canonical = buildMount(
    project,
    mount.componentId,
    mount.boardId,
    mount.anchorContactId,
    mount.rotation,
  )
  if (
    mount.contacts.length !== canonical.contacts.length ||
    canonical.contacts.some(
      (pin) =>
        mount.contacts.filter(
          (item) => item.pinId === pin.pinId && item.contactId === pin.contactId,
        ).length !== 1,
    )
  )
    throw new Error('Los contactos no corresponden a la huella canónica.')
}

/** Body center is the centroid of the exact mapped contacts. Stored child pose is idle
 * while mounted; moving/rotating a board carries its children without duplicating state.
 */
export function resolveMountedPose(project: Project, componentId: string): MountedPose | undefined {
  const mount = project.mounts?.find((item) => item.componentId === componentId)
  if (!mount) return undefined
  validateMount(project, mount)
  const board = project.components.find((item) => item.id === mount.boardId)
  if (!board) return undefined
  const contacts = mount.contacts.map((pin) => CONTACT_BY_ID.get(pin.contactId))
  const x = contacts.reduce((sum, contact) => sum + (contact?.x ?? 0), 0) / contacts.length
  const z = contacts.reduce((sum, contact) => sum + (contact?.z ?? 0), 0) / contacts.length
  const [dx, dz] = rotate(x, z, board.position.rotation)
  return {
    x: board.position.x + dx * 24,
    y: board.position.y - dz * 24,
    rotation: ((board.position.rotation + mount.rotation) % 360) as Rotation,
    elevation: (board.elevation ?? 0) + MOUNT_ELEVATION,
  }
}
