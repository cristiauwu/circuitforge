import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'
import { buildDipPackage } from './integratedCircuits'
import { buildTo220Package } from './power'

const TYPES = new Set([
  'diode_zener',
  'diode_schottky',
  'bridge_rectifier',
  'bjt_pnp',
  'mosfet_n',
  'mosfet_p',
  'led_rgb',
  'photodiode',
  'optocoupler_pc817',
])

export function buildSemiconductorModel(typeId: string, tools: ModelTools): boolean {
  if (!TYPES.has(typeId)) return false
  if (typeId === 'optocoupler_pc817') {
    buildDipPackage(typeId, 'PC817', tools)
    return true
  }
  if (typeId === 'mosfet_n' || typeId === 'mosfet_p') {
    buildTo220Package(typeId, typeId === 'mosfet_n' ? 'N-MOS' : 'P-MOS', tools)
    return true
  }
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new RangeError(`Missing component definition: ${typeId}`)
  const {
    group,
    mesh,
    geometry,
    standard,
    box,
    slab,
    tube,
    anchors,
    material,
    print,
    labelTexture,
  } = tools
  const pearl = standard('#e4dfd0', 0.62)
  const cylinder = (
    surface: THREE.Material,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    name: string,
  ) =>
    mesh(
      group,
      geometry(new THREE.CylinderGeometry(radius, radius, height, 32)),
      surface,
      x,
      y,
      z,
      name,
    )
  const lead = (index: number, start: [number, number, number], end: [number, number, number]) => {
    const pin = definition.pins[index]
    if (!pin) throw new RangeError(`Missing terminal ${index} for ${typeId}`)
    const terminal = tube(
      group,
      tools.solder,
      [start, [end[0], start[1], end[2]], end],
      0.027,
      `Terminal ${pin.id}`,
    )
    terminal.userData.freeLead = true
    terminal.userData.pinId = pin.id
    terminal.userData.bodyAnchor = start
    anchors[pin.id] = new THREE.Vector3(...end)
  }
  const text = (value: string, width: number, depth: number, y: number) =>
    print(
      group,
      width,
      depth,
      y,
      labelTexture(768, 256, (ctx) => {
        ctx.fillStyle = '#e8e2d5'
        ctx.textAlign = 'center'
        ctx.font = 'bold 92px monospace'
        ctx.fillText(value, 384, 170)
      }),
    )

  if (typeId === 'diode_zener' || typeId === 'diode_schottky') {
    const zener = typeId === 'diode_zener'
    const radius = zener ? 0.135 : 0.195
    const length = zener ? 0.65 : 0.94
    const surface = zener
      ? material(
          new THREE.MeshPhysicalMaterial({
            color: '#bf6637',
            roughness: 0.24,
            metalness: 0,
            transparent: true,
            opacity: 0.79,
            clearcoat: 0.8,
          }),
        )
      : tools.graphite
    const body = cylinder(
      surface,
      radius,
      length,
      0,
      0.3,
      0,
      zener ? 'Ampolla de vidrio Zener' : 'Encapsulado axial Schottky',
    )
    body.rotation.z = Math.PI / 2
    if (zener) {
      const die = cylinder(
        tools.chip,
        0.068,
        0.23,
        0,
        0.3,
        0,
        'Unión de silicio visible bajo el vidrio',
      )
      die.rotation.z = Math.PI / 2
    }
    const band = cylinder(
      zener ? tools.graphite : pearl,
      radius + 0.004,
      zener ? 0.075 : 0.12,
      length / 2 - 0.14,
      0.3,
      0,
      'Banda de identificación de cátodo',
    )
    band.rotation.z = Math.PI / 2
    lead(0, [-length / 2, 0.3, 0], [-1.05, 0.025, 0])
    lead(1, [length / 2, 0.3, 0], [1.05, 0.025, 0])
    if (!zener) text('SCHOTTKY', 0.75, 0.19, 0.501)
    return true
  }

  if (typeId === 'bridge_rectifier') {
    slab(
      group,
      tools.graphite,
      1.4,
      1.24,
      0.48,
      0.09,
      0.25,
      'Puente rectificador negro de cuatro terminales',
    )
    box(group, tools.chip, 0, 0.32, 0, 1.42, 0.04, 1.26, 'Línea de moldeo del puente')
    definition.pins.forEach((_, index) => {
      const x = index < 2 ? -0.47 : 0.47
      const z = index % 2 === 0 ? -0.47 : 0.47
      lead(index, [x, 0.3, z], [x * 1.5, 0.025, z * 1.7])
    })
    text('BRIDGE', 0.92, 0.27, 0.759)
    const legend = print(
      group,
      1.18,
      1.06,
      0.761,
      labelTexture(768, 640, (ctx) => {
        ctx.fillStyle = '#e8e2d5'
        ctx.font = 'bold 58px monospace'
        ctx.textAlign = 'center'
        definition.pins.forEach((pin, index) => {
          const mark = pin.id === 'positive' ? '+' : pin.id === 'negative' ? '−' : '~'
          ctx.fillText(mark, index < 2 ? 100 : 668, index % 2 === 0 ? 110 : 565)
        })
      }),
    )
    if (legend) legend.name = 'Marcas de polaridad del puente'
    return true
  }

  if (typeId === 'bjt_pnp') {
    const shape = new THREE.Shape()
    shape.moveTo(-0.33, 0.13)
    shape.lineTo(0.33, 0.13)
    shape.lineTo(0.33, -0.02)
    shape.absarc(0, -0.02, 0.33, 0, Math.PI, true)
    shape.closePath()
    const shell = geometry(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.57,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        bevelSegments: 2,
        steps: 1,
      }),
    )
    shell.rotateX(-Math.PI / 2)
    mesh(group, shell, tools.graphite, 0, 0.5, 0, 'Transistor PNP TO-92 con cara plana')
    definition.pins.forEach((_, index) => {
      const x = (index - 1) * 0.25
      lead(index, [x, 0.51, 0], [x * 1.32, 0.025, 0.24])
    })
    text('PNP', 0.47, 0.19, 1.096)
    return true
  }

  // Both optical parts have clear lenses, but the detector is a flat window over a dark die.
  const detector = typeId === 'photodiode'
  const lens = material(
    new THREE.MeshPhysicalMaterial({
      color: detector ? '#adbdc8' : '#e4e2da',
      roughness: 0.13,
      metalness: 0,
      transparent: true,
      opacity: detector ? 0.48 : 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      depthWrite: false,
    }),
  )
  cylinder(lens, 0.37, 0.085, 0, 0.33, 0, 'Brida de resina óptica')
  cylinder(
    lens,
    0.32,
    detector ? 0.35 : 0.56,
    0,
    detector ? 0.53 : 0.65,
    0,
    detector ? 'Ventana cilíndrica transparente de fotodiodo' : 'Cápsula transparente RGB',
  )
  if (detector) {
    box(group, tools.metal, 0, 0.49, 0, 0.38, 0.04, 0.3, 'Soporte de la unión fotosensible')
    box(
      group,
      standard('#24383f', 0.16, 0.18),
      0,
      0.52,
      0,
      0.25,
      0.015,
      0.23,
      'Área fotosensible de silicio',
    )
    tube(
      group,
      tools.gold,
      [
        [-0.15, 0.53, 0],
        [-0.08, 0.62, 0],
        [0, 0.535, 0],
      ],
      0.009,
      'Hilo de unión del detector',
    )
    cylinder(lens, 0.32, 0.035, 0, 0.722, 0, 'Ventana óptica plana')
  } else {
    mesh(
      group,
      geometry(new THREE.SphereGeometry(0.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
      lens,
      0,
      0.93,
      0,
      'Cúpula hemisférica del LED RGB',
    )
    const colors = ['#be554c', '#66a47d', '#537fbc']
    colors.forEach((color, index) => {
      const x = (index - 1) * 0.13
      box(group, tools.metal, x, 0.53, 0, 0.1, 0.07, 0.22, 'Copa reflectora de canal RGB')
      box(
        group,
        standard(color, 0.3),
        x,
        0.574,
        0,
        0.075,
        0.02,
        0.07,
        'Dado emisor RGB sin alimentación',
      )
      tube(
        group,
        tools.gold,
        [
          [x, 0.58, 0],
          [x, 0.7, 0.09],
          [x, 0.4, 0.16],
        ],
        0.008,
        'Hilo de unión de canal RGB',
      )
    })
  }
  definition.pins.forEach((_, index) => {
    const x = (index - (definition.pins.length - 1) / 2) * (detector ? 0.36 : 0.22)
    lead(index, [x, 0.34, 0], [x, 0.025, detector ? 0 : 0.13])
  })
  return true
}
