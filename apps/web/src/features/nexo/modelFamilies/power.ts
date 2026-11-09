import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

/** TO-220 package shared only by parts that actually use this encapsulation. */
export function buildTo220Package(typeId: string, partName: string, tools: ModelTools): void {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new RangeError(`Missing component definition: ${typeId}`)
  const { group, box, slab, geometry, mesh, anchors, tube, labelTexture, print } = tools
  slab(group, tools.graphite, 1.05, 0.43, 0.95, 0.055, 0.47, `Cuerpo TO-220 ${partName}`)

  // The fixing hole is cut into the metal tab, so it remains a real opening from every view.
  const tab = new THREE.Shape()
  tab.moveTo(-0.5, 0)
  tab.lineTo(0.5, 0)
  tab.lineTo(0.5, 1.22)
  tab.quadraticCurveTo(0.5, 1.3, 0.42, 1.3)
  tab.lineTo(-0.42, 1.3)
  tab.quadraticCurveTo(-0.5, 1.3, -0.5, 1.22)
  tab.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 1.03, 0.125, 0, Math.PI * 2, true)
  tab.holes.push(hole)
  mesh(
    group,
    geometry(
      new THREE.ExtrudeGeometry(tab, { depth: 0.075, bevelEnabled: false, curveSegments: 20 }),
    ),
    tools.brushedMetal,
    0,
    0.65,
    -0.265,
    'Aleta disipadora con orificio de fijación',
  )
  box(group, tools.chip, 0, 0.54, 0.01, 1.08, 0.07, 0.46, 'Costura del encapsulado')
  definition.pins.forEach((pin, index) => {
    const x = (index - (definition.pins.length - 1) / 2) * 0.32
    const start: [number, number, number] = [x, 0.48, 0]
    const end: [number, number, number] = [x, 0.025, 0.37]
    const terminal = tube(
      group,
      tools.solder,
      [start, [x, 0.2, 0.08], end],
      0.035,
      `Terminal ${pin.id}`,
    )
    terminal.userData.freeLead = true
    terminal.userData.pinId = pin.id
    terminal.userData.bodyAnchor = start
    anchors[pin.id] = new THREE.Vector3(...end)
  })
  const marking = print(
    group,
    0.89,
    0.64,
    0,
    labelTexture(768, 512, (ctx) => {
      ctx.fillStyle = '#e6e3d7'
      ctx.textAlign = 'center'
      ctx.font = 'bold 100px monospace'
      ctx.fillText(partName, 384, 230)
      ctx.font = '50px monospace'
      ctx.fillText('TO-220', 384, 350)
    }),
  )
  if (marking) {
    marking.rotation.x = 0
    marking.position.set(0, 1.02, 0.252)
    marking.name = `Identificación ${partName}`
  }
}

function buildConverter(typeId: string, buck: boolean, tools: ModelTools): void {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new RangeError(`Missing component definition: ${typeId}`)
  const { group, geometry, mesh, box, slab, standard, tube, anchors, print, labelTexture } = tools
  const width = buck ? 3.65 : 2.8
  const depth = buck ? 2.22 : 1.62
  const pcb = standard(buck ? '#245b6e' : '#355d87', 0.61, 0.12)
  const copper = standard('#b47b41', 0.37, 0.72)
  slab(
    group,
    pcb,
    width,
    depth,
    0.12,
    0.085,
    0.08,
    buck ? 'PCB convertidor reductor LM2596' : 'PCB convertidor elevador MT3608',
  )

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
      geometry(new THREE.CylinderGeometry(radius, radius, height, 28)),
      surface,
      x,
      y,
      z,
      name,
    )
  const torus = (
    surface: THREE.Material,
    radius: number,
    thickness: number,
    x: number,
    y: number,
    z: number,
    name: string,
  ) => {
    const ring = mesh(
      group,
      geometry(new THREE.TorusGeometry(radius, thickness, 8, 32)),
      surface,
      x,
      y,
      z,
      name,
    )
    ring.rotation.x = Math.PI / 2
    return ring
  }

  // Clearly different magnetic assemblies: an exposed toroid on the buck, a shielded choke on the boost.
  if (buck) {
    torus(tools.graphite, 0.46, 0.19, 0.23, 0.47, -0.12, 'Núcleo toroidal de ferrita')
    const winding: number[][] = []
    for (let step = 0; step <= 360; step++) {
      const a = (step / 360) * Math.PI * 2
      const turn = a * 15
      const radius = 0.46 + Math.cos(turn) * 0.205
      winding.push([
        0.23 + Math.cos(a) * radius,
        0.47 + Math.sin(turn) * 0.205,
        -0.12 + Math.sin(a) * radius,
      ])
    }
    tube(group, copper, winding, 0.032, 'Bobinado visible de cobre del inductor')
    for (const x of [-1.13, 1.12]) {
      cylinder(tools.graphite, 0.275, 0.65, x, 0.53, -0.28, 'Capacitor electrolítico de filtrado')
      cylinder(tools.metal, 0.255, 0.025, x, 0.87, -0.28, 'Tapa de capacitor')
      box(group, tools.holeMaterial, x, 0.885, -0.28, 0.33, 0.008, 0.02, 'Venteo de capacitor')
    }
    box(group, tools.chip, -0.6, 0.3, 0.6, 0.82, 0.15, 0.42, 'Regulador de conmutación LM2596')
    box(
      group,
      tools.brushedMetal,
      -0.6,
      0.395,
      0.61,
      0.6,
      0.055,
      0.3,
      'Pestaña térmica del regulador',
    )
    for (let i = 0; i < 5; i++)
      box(
        group,
        tools.solder,
        -0.88 + i * 0.14,
        0.25,
        0.91,
        0.05,
        0.04,
        0.2,
        'Patilla de regulador',
      )
  } else {
    slab(group, tools.graphite, 0.87, 0.85, 0.38, 0.1, 0.21, 'Inductor blindado de potencia')
    const value = print(
      group,
      0.6,
      0.3,
      0.615,
      labelTexture(512, 256, (ctx) => {
        ctx.fillStyle = '#c5c7be'
        ctx.textAlign = 'center'
        ctx.font = 'bold 125px monospace'
        ctx.fillText('220', 256, 170)
      }),
    )
    if (value) value.name = 'Marcado del inductor'
    box(group, tools.chip, -0.7, 0.265, -0.28, 0.35, 0.12, 0.28, 'Controlador SOT-23 MT3608')
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        box(
          group,
          tools.solder,
          -0.82 + i * 0.12,
          0.235,
          -0.28 + side * 0.21,
          0.04,
          0.025,
          0.12,
          'Patilla SOT-23',
        )
    for (const x of [-0.72, 0.72])
      box(group, tools.ceramic, x, 0.265, 0.38, 0.29, 0.13, 0.18, 'Capacitor cerámico de potencia')
  }

  const trimX = buck ? 1.01 : 0.78
  const trimZ = buck ? 0.62 : -0.2
  box(
    group,
    standard('#2857a4', 0.5),
    trimX,
    0.42,
    trimZ,
    0.48,
    0.43,
    0.4,
    'Trimpot multivuelta de ajuste nominal',
  )
  cylinder(tools.gold, 0.105, 0.045, trimX, 0.657, trimZ, 'Tornillo de ajuste de latón')
  box(
    group,
    tools.holeMaterial,
    trimX,
    0.685,
    trimZ,
    0.15,
    0.008,
    0.022,
    'Ranura del tornillo de ajuste',
  )

  definition.pins.forEach((pin, index) => {
    const input = index < 2
    const x = (input ? -1 : 1) * (width / 2 - 0.17)
    const z = (index % 2 === 0 ? -1 : 1) * (depth / 2 - 0.23)
    torus(tools.gold, 0.09, 0.027, x, 0.215, z, `Anillo metalizado ${pin.id}`)
    cylinder(tools.holeMaterial, 0.064, 0.009, x, 0.211, z, `Taladro de terminal ${pin.id}`)
    anchors[pin.id] = new THREE.Vector3(x, 0.23, z)
    tube(
      group,
      copper,
      [
        [x + (input ? 0.13 : -0.13), 0.207, z],
        [x + (input ? 0.4 : -0.4), 0.207, z],
      ],
      0.012,
      `Pista de cobre ${pin.id}`,
    )
  })
  const legends = print(
    group,
    width - 0.15,
    depth - 0.1,
    0.225,
    labelTexture(1400, 900, (ctx) => {
      ctx.fillStyle = '#e3ebe0'
      ctx.font = 'bold 54px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(buck ? 'LM2596' : 'MT3608', 700, 850)
      ctx.font = '40px monospace'
      definition.pins.forEach((pin, index) => {
        ctx.textAlign = index < 2 ? 'left' : 'right'
        ctx.fillText(pin.id, index < 2 ? 45 : 1355, index % 2 === 0 ? 150 : 735)
      })
    }),
  )
  if (legends) {
    legends.name = 'Serigrafía de módulo y terminales del catálogo'
    legends.raycast = () => {}
  }
}

export function buildPowerModel(typeId: string, tools: ModelTools): boolean {
  switch (typeId) {
    case 'regulator_7805':
      buildTo220Package(typeId, 'L7805', tools)
      return true
    case 'regulator_lm317':
      buildTo220Package(typeId, 'LM317', tools)
      return true
    case 'buck_lm2596':
      buildConverter(typeId, true, tools)
      return true
    case 'boost_mt3608':
      buildConverter(typeId, false, tools)
      return true
    default:
      return false
  }
}
