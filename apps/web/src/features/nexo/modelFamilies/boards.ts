import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

/** Authored package studies; terminal identity/order belongs exclusively to the registry. */
export function buildBoardModel(typeId: string, tools: ModelTools): boolean {
  if (!['arduino_nano', 'raspberry_pi_pico', 'attiny85'].includes(typeId)) return false
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) return false
  const {
    group,
    anchors,
    geometry,
    mesh,
    box,
    slab,
    tube,
    standard,
    print,
    labelTexture,
    graphite,
    chip,
    metal,
    gold,
    holeMaterial,
    ceramic,
  } = tools
  const pins = definition.pins
  const label = (value: string, width: number, depth: number, y: number, z = 0) => {
    const ink = print(
      group,
      width,
      depth,
      y,
      labelTexture(768, 256, (ctx) => {
        ctx.fillStyle = '#e4e9d9'
        ctx.textAlign = 'center'
        ctx.font = 'bold 70px monospace'
        ctx.fillText(value, 384, 150)
      }),
    )
    if (ink) ink.position.z = z
  }
  if (typeId === 'attiny85') {
    slab(group, graphite, 0.94, 1.38, 0.4, 0.09, 0.19, 'ATtiny85 · encapsulado DIP-8')
    const notch = mesh(
      group,
      geometry(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 24)),
      holeMaterial,
      0,
      0.616,
      -0.68,
      'Muesca de orientación',
    )
    notch.scale.z = 0.65
    pins.forEach(({ id }, index) => {
      const side = index < pins.length / 2 ? -1 : 1
      const row = side < 0 ? index : pins.length - 1 - index
      const z = (row - 1.5) * 0.31
      const end = new THREE.Vector3(side * 0.82, 0.03, z)
      tube(
        group,
        metal,
        [[side * 0.43, 0.35, z], [side * 0.76, 0.32, z], end.toArray()],
        0.032,
        `Terminal ${id}`,
      )
      anchors[id] = end
    })
    label('ATtiny85', 0.8, 0.36, 0.621)
    return true
  }
  const pico = typeId === 'raspberry_pi_pico'
  const width = pico ? 1.8 : 1.72
  const depth = pico ? 5.45 : 4.65
  const board = standard(pico ? '#337756' : '#28657c', 0.61, 0.08)
  slab(
    group,
    board,
    width,
    depth,
    0.12,
    0.07,
    0.12,
    pico ? 'PCB Pico alargado' : 'PCB Nano compacto',
  )
  const half = pins.length / 2
  const pitch = (depth - 0.55) / (half - 1)
  pins.forEach(({ id }, index) => {
    const side = index < half ? -1 : 1
    const row = side < 0 ? index : pins.length - 1 - index
    const z = -depth / 2 + 0.275 + row * pitch
    const x = side * (pico ? width / 2 : width / 2 - 0.13)
    if (pico) {
      // Gold half-annulus plus dark half-bore: edge castellations, not a second header row.
      const pad = mesh(
        group,
        geometry(new THREE.RingGeometry(0.048, 0.105, 12, 1, 0, Math.PI)),
        gold,
        x,
        0.265,
        z,
        `Contacto almenado ${id}`,
      )
      pad.rotation.x = -Math.PI / 2
      pad.rotation.z = side < 0 ? -Math.PI / 2 : Math.PI / 2
      mesh(
        group,
        geometry(new THREE.CylinderGeometry(0.047, 0.047, 0.14, 12)),
        holeMaterial,
        x,
        0.2,
        z,
        'Taladro metalizado abierto en canto',
      )
      anchors[id] = new THREE.Vector3(x, 0.27, z)
    } else {
      box(group, graphite, x, 0.32, z, 0.23, 0.15, pitch * 0.92, 'Separador del encabezado')
      box(group, gold, x, 0.325, z, 0.045, 0.65, 0.045, `Terminal ${id}`)
      anchors[id] = new THREE.Vector3(x, 0, z)
    }
  })
  const usbZ = -depth / 2 + 0.4
  box(
    group,
    metal,
    0,
    0.42,
    usbZ,
    pico ? 0.65 : 0.72,
    0.35,
    0.68,
    pico ? 'Conector micro USB' : 'Conector mini USB',
  )
  box(group, holeMaterial, 0, 0.42, usbZ - 0.347, 0.5, 0.22, 0.016, 'Boca del conector USB')
  box(group, graphite, 0, 0.38, usbZ - 0.358, 0.37, 0.065, 0.018, 'Lengüeta de conector USB')
  const processor = box(
    group,
    chip,
    0,
    0.34,
    0.12,
    pico ? 0.65 : 0.68,
    0.16,
    pico ? 0.65 : 0.68,
    pico ? 'RP2040 QFN' : 'ATmega328P TQFP',
  )
  if (!pico) processor.rotation.y = Math.PI / 4
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      box(
        group,
        metal,
        side * 0.39,
        0.29,
        -0.14 + i * 0.085,
        0.07,
        0.035,
        0.035,
        'Patilla de procesador',
      )
      box(group, ceramic, side * 0.4, 0.29, 0.95 + i * 0.11, 0.14, 0.08, 0.065, 'Desacoplo SMD')
    }
  const crystal = slab(group, metal, 0.35, 0.58, 0.11, 0.08, 0.26, 'Resonador de cuarzo')
  crystal.position.set(pico ? 0.38 : 0, 0.26, -0.75)
  box(group, graphite, 0, 0.31, depth / 2 - 0.5, 0.36, 0.13, 0.28, 'Pulsador de placa')
  box(group, metal, 0, 0.39, depth / 2 - 0.5, 0.19, 0.04, 0.15, 'Actuador de pulsador')
  label(pico ? 'PICO · RP2040' : 'NANO', 1.03, 0.28, 0.263, 0.72)
  return true
}
