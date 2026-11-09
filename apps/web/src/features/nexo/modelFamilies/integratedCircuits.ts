import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

const PART_NAMES: Readonly<Record<string, string>> = {
  timer_ne555: 'NE555',
  opamp_lm358: 'LM358',
  comparator_lm393: 'LM393',
  logic_74hc595: '74HC595',
  logic_74hc165: '74HC165',
  logic_74hc00: '74HC00',
}

/** Physical DIP numbering is counter-clockwise; IDs always come from the catalog. */
export function buildDipPackage(typeId: string, partName: string, tools: ModelTools): void {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new RangeError(`Missing component definition: ${typeId}`)
  const { group, geometry, mesh, slab, box, tube, anchors, labelTexture, print } = tools
  const count = definition.pins.length
  const row = count / 2
  const pitch = 0.36
  const length = Math.max(0.93, (row - 1) * pitch + 0.6)
  const depth = 0.83
  slab(
    group,
    tools.graphite,
    length,
    depth,
    0.42,
    0.085,
    0.27,
    `Encapsulado DIP-${count} ${partName}`,
  )
  box(group, tools.chip, 0, 0.33, 0, length + 0.035, 0.035, depth + 0.025, 'Junta de moldeo DIP')

  // A real semicircular orientation recess, rather than a painted substitute.
  const notch = mesh(
    group,
    geometry(new THREE.CylinderGeometry(0.135, 0.135, 0.014, 24, 1, false, 0, Math.PI)),
    tools.holeMaterial,
    -length / 2 + 0.018,
    0.708,
    0,
    'Muesca de orientación del encapsulado',
  )
  notch.rotation.y = Math.PI / 2
  mesh(
    group,
    geometry(new THREE.CylinderGeometry(0.048, 0.048, 0.012, 20)),
    tools.holeMaterial,
    -length / 2 + 0.22,
    0.71,
    0.23,
    'Marca de terminal 1',
  )

  definition.pins.forEach((pin, index) => {
    const firstRow = index < row
    const slot = firstRow ? index : count - index - 1
    const side = firstRow ? 1 : -1
    const x = (slot - (row - 1) / 2) * pitch
    const start: [number, number, number] = [x, 0.4, (side * depth) / 2]
    const end: [number, number, number] = [x, 0.025, side * 0.79]
    const terminal = tube(
      group,
      tools.solder,
      [start, [x, 0.4, side * 0.63], end],
      0.027,
      `Terminal ${pin.id}`,
    )
    terminal.userData.pinNumber = index + 1
    terminal.userData.freeLead = true
    terminal.userData.pinId = pin.id
    terminal.userData.bodyAnchor = start
    anchors[pin.id] = new THREE.Vector3(...end)
  })

  const bodyPrint = print(
    group,
    length * 0.79,
    0.55,
    0.719,
    labelTexture(1024, 320, (ctx) => {
      ctx.fillStyle = '#e3e2d7'
      ctx.textAlign = 'center'
      ctx.font = 'bold 112px monospace'
      ctx.fillText(partName, 512, 155)
      ctx.font = '48px monospace'
      ctx.fillStyle = '#b7beb4'
      ctx.fillText(`DIP-${count}`, 512, 250)
    }),
  )
  if (bodyPrint) bodyPrint.name = `Marcado de fabricante ${partName}`

  // Registry names beside their own lead, including differentiated supplies/grounds.
  const legends = print(
    group,
    length + 0.3,
    2.18,
    0.035,
    labelTexture(1400, 1100, (ctx) => {
      const width = length + 0.3
      ctx.fillStyle = '#d9e6df'
      ctx.font = '38px monospace'
      ctx.textAlign = 'center'
      definition.pins.forEach((pin, index) => {
        const firstRow = index < row
        const slot = firstRow ? index : count - index - 1
        const x = (slot - (row - 1) / 2) * pitch
        ctx.save()
        ctx.translate((x / width + 0.5) * 1400, firstRow ? 1010 : 90)
        ctx.rotate(firstRow ? -Math.PI / 2 : Math.PI / 2)
        ctx.fillText(`${index + 1} ${pin.id}`, 0, 0)
        ctx.restore()
      })
    }),
  )
  if (legends) {
    legends.name = 'Leyendas de terminales del catálogo'
    legends.raycast = () => {}
  }
}

export function buildIntegratedCircuitModel(typeId: string, tools: ModelTools): boolean {
  const partName = PART_NAMES[typeId]
  if (!partName) return false
  buildDipPackage(typeId, partName, tools)
  return true
}
