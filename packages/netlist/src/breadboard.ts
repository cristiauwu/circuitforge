/** Canonical 30-row breadboard geometry and electrical infrastructure.
 * Rows run along local x; columns along local z. The center channel isolates
 * a–e from f–j. Each of the four power rails is CONTINUOUS across all 30 holes
 * (no midpoint break). Rail labels are markings, never voltage sources.
 */
export const BREADBOARD_TYPE_ID = 'breadboard'
export const BREADBOARD_PITCH = 0.16

export interface BreadboardContact {
  readonly pinId: string
  readonly groupId: string
  readonly x: number
  readonly z: number
}

export interface BreadboardGroup {
  readonly id: string
  readonly pinIds: readonly string[]
}

const columns = [
  ['a', -0.96],
  ['b', -0.8],
  ['c', -0.64],
  ['d', -0.48],
  ['e', -0.32],
  ['f', 0.32],
  ['g', 0.48],
  ['h', 0.64],
  ['i', 0.8],
  ['j', 0.96],
] as const
const rails = [
  ['rail_top_positive', -1.6],
  ['rail_top_negative', -1.44],
  ['rail_bottom_negative', 1.44],
  ['rail_bottom_positive', 1.6],
] as const
const contacts: BreadboardContact[] = []
for (let row = 1; row <= 30; row++) {
  const x = Number(((row - 15.5) * BREADBOARD_PITCH).toFixed(2))
  for (const [column, z] of columns) {
    contacts.push(
      Object.freeze({
        pinId: `${column}${row}`,
        groupId: `strip_${column <= 'e' ? 'ae' : 'fj'}_${row}`,
        x,
        z,
      }),
    )
  }
  for (const [rail, z] of rails) {
    contacts.push(Object.freeze({ pinId: `${rail}_${row}`, groupId: rail, x, z }))
  }
}
export const BREADBOARD_CONTACTS: readonly BreadboardContact[] = Object.freeze(contacts)
const groups = new Map<string, string[]>()
for (const contact of contacts) {
  const pins = groups.get(contact.groupId) ?? []
  pins.push(contact.pinId)
  groups.set(contact.groupId, pins)
}
export const BREADBOARD_GROUPS: readonly BreadboardGroup[] = Object.freeze(
  [...groups].map(([id, pinIds]) => Object.freeze({ id, pinIds: Object.freeze(pinIds) })),
)
