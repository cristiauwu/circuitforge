import { BREADBOARD_CONTACTS, type ParamValue } from '@circuitforge/netlist'
import * as THREE from 'three'
import { buildBoardModel } from './modelFamilies/boards'
import { buildControlModel } from './modelFamilies/controls'
import { buildIntegratedCircuitModel } from './modelFamilies/integratedCircuits'
import { buildInterfaceModel } from './modelFamilies/interfaces'
import { buildPassiveModel } from './modelFamilies/passives'
import { buildPowerModel } from './modelFamilies/power'
import { buildSemiconductorModel } from './modelFamilies/semiconductors'
import { buildSensorModel } from './modelFamilies/sensors'
import type { ProjectModel } from './models'

/** Authored geometry only: illustrative proportions and catalog terminals, not hardware pinouts. */
export interface ModelTools {
  params?: Readonly<Record<string, ParamValue>>
  group: THREE.Group
  anchors: Record<string, THREE.Vector3>
  geometry<T extends THREE.BufferGeometry>(value: T): T
  material<T extends THREE.Material>(value: T): T
  standard(
    color: THREE.ColorRepresentation,
    roughness?: number,
    metalness?: number,
  ): THREE.MeshStandardMaterial
  mesh(
    parent: THREE.Object3D,
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
    name?: string,
  ): THREE.Mesh
  box(
    parent: THREE.Object3D,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    name?: string,
  ): THREE.Mesh
  slab(
    parent: THREE.Object3D,
    surface: THREE.Material,
    width: number,
    depth: number,
    thickness: number,
    radius: number,
    y: number,
    name: string,
  ): THREE.Mesh
  tube(
    parent: THREE.Object3D,
    surface: THREE.Material,
    points: number[][],
    radius: number,
    name: string,
  ): THREE.Mesh
  repeated(
    parent: THREE.Object3D,
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    positions: Array<[number, number, number]>,
    name: string,
  ): THREE.InstancedMesh
  labelTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): THREE.CanvasTexture | undefined
  print(
    parent: THREE.Object3D,
    width: number,
    depth: number,
    y: number,
    texture: THREE.CanvasTexture | undefined,
  ): THREE.Mesh | undefined
  graphite: THREE.Material
  chip: THREE.Material
  metal: THREE.Material
  brushedMetal: THREE.Material
  gold: THREE.Material
  solder: THREE.Material
  ceramic: THREE.Material
  holeMaterial: THREE.Material
}

export function buildFamilyModel(typeId: string, tools: ModelTools): boolean {
  return [
    buildPassiveModel,
    buildControlModel,
    buildSemiconductorModel,
    buildIntegratedCircuitModel,
    buildPowerModel,
    buildBoardModel,
    buildSensorModel,
    buildInterfaceModel,
  ].some((build) => build(typeId, tools))
}

export function buildPhysicalModel(
  typeId: string,
  tools: ModelTools,
): ProjectModel['contactPicking'] {
  if (buildFamilyModel(typeId, tools)) return undefined
  const {
    group,
    anchors,
    geometry,
    standard,
    mesh,
    box,
    slab,
    tube,
    repeated,
    labelTexture,
    print,
    graphite,
    chip,
    metal,
    brushedMetal,
    gold,
    solder,
    holeMaterial,
  } = tools
  const pearl = standard('#e7e4d9', 0.62)
  const copper = standard('#a6653c', 0.3, 0.78)
  const pcb = standard('#245855', 0.53, 0.13)
  const cylinder = (
    surface: THREE.Material,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    name: string,
    bottom = radius,
  ) =>
    mesh(
      group,
      geometry(new THREE.CylinderGeometry(radius, bottom, height, 32)),
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
  const lead = (pinId: string, start: [number, number, number], end: [number, number, number]) => {
    const terminal = tube(
      group,
      solder,
      [start, [end[0], start[1], end[2]], end],
      0.023,
      `Terminal ${pinId}`,
    )
    terminal.userData = { freeLead: true, pinId, bodyAnchor: [...start] }
    anchors[pinId] = new THREE.Vector3(...end)
  }
  const text = (value: string, width: number, depth: number, y: number, color = '#d9e6df') =>
    print(
      group,
      width,
      depth,
      y,
      labelTexture(768, 256, (ctx) => {
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.font = 'bold 78px monospace'
        ctx.fillText(value, 384, 155)
      }),
    )
  const header = (pinIds: readonly string[], z: number, y = 0.23, pitch = 0.25) => {
    box(
      group,
      graphite,
      0,
      y,
      z,
      pinIds.length * pitch + 0.08,
      0.2,
      0.25,
      'Separador de terminales',
    )
    pinIds.forEach((pinId, i) => {
      const x = (i - (pinIds.length - 1) / 2) * pitch
      box(group, gold, x, y + 0.05, z + 0.28, 0.045, 0.045, 0.65, `Terminal ${pinId}`)
      anchors[pinId] = new THREE.Vector3(x, y + 0.05, z + 0.605)
    })
  }
  const builders: Record<string, (() => ProjectModel['contactPicking']) | (() => void)> = {
    capacitor: () => {
      cylinder(graphite, 0.43, 1.08, 0, 0.83, 0, 'Funda electrolítica')
      cylinder(metal, 0.405, 0.045, 0, 1.391, 0, 'Tapa de aluminio')
      torus(graphite, 0.405, 0.025, 0, 1.42, 0, 'Reborde engarzado')
      box(group, holeMaterial, 0, 1.419, 0, 0.48, 0.008, 0.018, 'Ranura de venteo')
      box(group, holeMaterial, 0, 1.42, 0, 0.018, 0.008, 0.48)
      mesh(
        group,
        geometry(new THREE.CylinderGeometry(0.435, 0.435, 0.93, 12, 1, true, 0.45, 0.55)),
        pearl,
        0,
        0.81,
        0,
        'Marca de polaridad',
      )
      lead('a', [-0.2, 0.35, 0], [-0.32, 0, 0])
      lead('b', [0.2, 0.35, 0], [0.32, 0, 0])
      text('100 µF', 0.62, 0.22, 1.428, '#35434a')
    },
    diode: () => {
      const body = cylinder(graphite, 0.145, 0.76, 0, 0.25, 0, 'Encapsulado axial de diodo')
      body.rotation.z = Math.PI / 2
      const band = cylinder(pearl, 0.148, 0.105, 0.25, 0.25, 0, 'Banda de cátodo')
      band.rotation.z = Math.PI / 2
      lead('anode', [-0.38, 0.25, 0], [-0.91, 0, 0])
      lead('cathode', [0.38, 0.25, 0], [0.91, 0, 0])
    },
    ldr: () => {
      cylinder(standard('#bc9164', 0.76), 0.41, 0.11, 0, 0.62, 0, 'Disco fotosensible')
      torus(pearl, 0.385, 0.025, 0, 0.684, 0, 'Reborde cerámico')
      const track: number[][] = []
      for (let i = 0; i < 7; i++) {
        const x = -0.27 + i * 0.09
        const reach = Math.sqrt(0.31 ** 2 - x ** 2)
        track.push([x, 0.682, i % 2 ? reach : -reach], [x, 0.682, i % 2 ? -reach : reach])
      }
      tube(group, copper, track, 0.019, 'Pista fotosensible serpentina')
      lead('a', [-0.19, 0.57, 0], [-0.26, 0, 0])
      lead('b', [0.19, 0.57, 0], [0.26, 0, 0])
    },
    potentiometer: () => {
      cylinder(brushedMetal, 0.57, 0.34, 0, 0.36, 0, 'Carcasa circular de potenciómetro')
      cylinder(graphite, 0.5, 0.09, 0, 0.14, 0, 'Base fenólica')
      cylinder(metal, 0.18, 0.49, 0, 0.76, 0, 'Eje moleteado')
      cylinder(graphite, 0.3, 0.26, 0, 1.1, 0, 'Mando de ajuste')
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        box(
          group,
          brushedMetal,
          Math.cos(angle) * 0.29,
          1.1,
          Math.sin(angle) * 0.29,
          0.024,
          0.2,
          0.024,
          'Estría de mando',
        )
      }
      box(group, pearl, 0, 1.238, -0.15, 0.035, 0.012, 0.2, 'Índice de posición')
      for (const [pinId, x] of [
        ['a', -0.34],
        ['wiper', 0],
        ['b', 0.34],
      ] as const)
        lead(pinId, [x, 0.17, 0.36], [x, 0, 0.86])
    },
    battery_9v: () => {
      slab(group, graphite, 1.28, 0.83, 2.08, 0.09, 0, 'Envolvente rectangular 9 V')
      box(group, brushedMetal, 0, 1.99, 0, 1.29, 0.22, 0.84, 'Tapa metálica')
      box(group, standard('#a67d48', 0.5, 0.5), 0, 0.6, 0, 1.29, 0.88, 0.84, 'Banda de batería')
      cylinder(metal, 0.15, 0.17, -0.31, 2.18, 0, 'Broche positivo')
      cylinder(holeMaterial, 0.09, 0.018, -0.31, 2.272, 0, 'Cavidad de broche')
      const hex = mesh(
        group,
        geometry(new THREE.CylinderGeometry(0.21, 0.21, 0.15, 6)),
        metal,
        0.29,
        2.17,
        0,
        'Broche negativo hexagonal',
      )
      hex.rotation.y = Math.PI / 6
      cylinder(graphite, 0.13, 0.012, 0.29, 2.253, 0, 'Centro de broche')
      anchors.positive = new THREE.Vector3(-0.31, 2.282, 0)
      anchors.negative = new THREE.Vector3(0.29, 2.262, 0)
      text('9 V', 0.72, 0.32, 2.113, '#273038')
    },
    buzzer: () => {
      cylinder(graphite, 0.52, 0.6, 0, 0.58, 0, 'Cápsula acústica')
      cylinder(chip, 0.55, 0.08, 0, 0.27, 0, 'Brida de zumbador')
      torus(graphite, 0.47, 0.038, 0, 0.9, 0, 'Labio acústico')
      cylinder(holeMaterial, 0.13, 0.014, 0, 0.888, 0, 'Puerto acústico')
      torus(metal, 0.13, 0.012, 0, 0.898, 0, 'Reborde de puerto')
      const mark = text('+', 0.17, 0.17, 0.91)
      if (mark) mark.position.x = -0.3
      lead('positive', [-0.22, 0.27, 0], [-0.3, 0, 0])
      lead('negative', [0.22, 0.27, 0], [0.3, 0, 0])
    },
    inductor: () => {
      torus(graphite, 0.45, 0.19, 0, 0.4, 0, 'Núcleo toroidal de ferrita')
      const winding: number[][] = []
      for (let i = 0; i <= 720; i++) {
        const around = (i / 720) * Math.PI * 2
        const turn = around * 18
        const radius = 0.45 + Math.cos(turn) * 0.205
        winding.push([
          Math.cos(around) * radius,
          0.4 + Math.sin(turn) * 0.205,
          Math.sin(around) * radius,
        ])
      }
      const curve = new THREE.CatmullRomCurve3(
        winding.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      )
      mesh(
        group,
        geometry(new THREE.TubeGeometry(curve, 720, 0.035, 6, false)),
        copper,
        0,
        0,
        0,
        'Bobinado de cobre esmaltado',
      )
      lead('a', [-0.5, 0.27, 0], [-0.85, 0, 0])
      lead('b', [0.5, 0.27, 0], [0.85, 0, 0])
    },
    bjt_npn: () => {
      // D-profile TO-92 study, not a generic cuboid or a certified package pin order.
      const shape = new THREE.Shape()
      shape.moveTo(-0.31, 0.12)
      shape.lineTo(0.31, 0.12)
      shape.lineTo(0.31, -0.03)
      shape.absarc(0, -0.03, 0.31, 0, Math.PI, true)
      shape.lineTo(-0.31, 0.12)
      const shell = geometry(
        new THREE.ExtrudeGeometry(shape, {
          depth: 0.52,
          bevelEnabled: true,
          bevelSize: 0.025,
          bevelThickness: 0.025,
          bevelSegments: 2,
          steps: 1,
        }),
      )
      shell.rotateX(-Math.PI / 2)
      mesh(group, shell, graphite, 0, 0.56, 0, 'Encapsulado NPN de perfil D')
      for (const [pinId, x] of [
        ['base', -0.23],
        ['collector', 0],
        ['emitter', 0.23],
      ] as const)
        lead(pinId, [x, 0.57, 0], [x, 0, 0.19])
      text('NPN', 0.45, 0.18, 1.11)
    },
    servo: () => {
      const shell = standard('#355f74', 0.4, 0.16)
      slab(group, shell, 0.97, 1.65, 1.15, 0.08, 0.05, 'Carcasa de microservo')
      box(group, graphite, 0, 0.14, 0, 1.04, 0.18, 1.72, 'Base de servo')
      for (const z of [-1, 1]) {
        box(group, shell, 0, 0.92, z, 0.96, 0.13, 0.42, 'Oreja de fijación')
        cylinder(holeMaterial, 0.085, 0.015, 0, 0.994, z, 'Alojamiento de fijación')
      }
      cylinder(shell, 0.38, 0.19, 0, 1.28, -0.42, 'Caja de engranajes')
      cylinder(pearl, 0.14, 0.19, 0, 1.43, -0.42, 'Eje estriado')
      box(group, pearl, 0, 1.54, -0.42, 1.5, 0.11, 0.22, 'Brazo de servo')
      cylinder(metal, 0.07, 0.02, 0, 1.609, -0.42, 'Tornillo de brazo')
      const cableColors = ['#a3503f', '#40352e', '#c4a568']
      ;['VCC', 'GND', 'SIG'].forEach((pinId, i) => {
        const x = (i - 1) * 0.16
        tube(
          group,
          standard(cableColors[i] ?? '#40352e'),
          [
            [x, 0.37, 0.8],
            [x, 0.24, 1.11],
            [x, 0.13, 1.5],
          ],
          0.037,
          `Cabo ${pinId}`,
        )
      })
      header(['VCC', 'GND', 'SIG'], 1.57, 0.13, 0.16)
    },
    dc_motor: () => {
      const can = cylinder(brushedMetal, 0.53, 1.52, 0, 0.57, 0, 'Carcasa cilíndrica de motor')
      can.rotation.x = Math.PI / 2
      const front = cylinder(metal, 0.49, 0.12, 0, 0.57, -0.79, 'Tapa de motor')
      front.rotation.x = Math.PI / 2
      const shaft = cylinder(metal, 0.085, 0.72, 0, 0.57, -1.11, 'Eje de salida')
      shaft.rotation.x = Math.PI / 2
      const back = cylinder(graphite, 0.49, 0.13, 0, 0.57, 0.8, 'Portaescobillas')
      back.rotation.x = Math.PI / 2
      for (const x of [-0.23, 0.23])
        box(group, graphite, x, 1.06, 0.35, 0.16, 0.018, 0.32, 'Ventilación de motor')
      lead('a', [-0.27, 0.58, 0.86], [-0.43, 0.28, 1.2])
      lead('b', [0.27, 0.58, 0.86], [0.43, 0.28, 1.2])
    },
    dht22: () => {
      slab(group, pearl, 1.18, 0.66, 1.78, 0.09, 0.34, 'Sensor ventilado de humedad')
      for (let row = 0; row < 7; row++)
        for (const x of [-0.29, 0.29])
          box(
            group,
            holeMaterial,
            x,
            0.64 + row * 0.2,
            0.352,
            0.42,
            0.09,
            0.016,
            'Ranura de ventilación',
          )
      for (let i = 0; i < 5; i++)
        box(group, holeMaterial, -0.4 + i * 0.2, 2.15, 0, 0.08, 0.012, 0.44, 'Ventilación superior')
      for (const [pinId, x] of [
        ['VCC', -0.36],
        ['DATA', 0],
        ['GND', 0.36],
      ] as const)
        lead(pinId, [x, 0.36, 0], [x, 0, 0.22])
    },
    ultrasonic_hc_sr04: () => {
      slab(group, pcb, 2.78, 1.36, 0.11, 0.09, 0.05, 'PCB sensor de distancia')
      for (const x of [-0.78, 0.78]) {
        cylinder(brushedMetal, 0.5, 0.47, x, 0.405, -0.12, 'Transductor ultrasónico')
        torus(metal, 0.45, 0.035, x, 0.66, -0.12, 'Labio de transductor')
        cylinder(holeMaterial, 0.415, 0.012, x, 0.651, -0.12, 'Membrana acústica')
        const grille: Array<[number, number, number]> = []
        for (let i = -3; i <= 3; i++)
          for (let j = -3; j <= 3; j++)
            if (i * i + j * j < 12) grille.push([x + i * 0.103, 0.663, -0.12 + j * 0.103])
        repeated(
          group,
          geometry(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 6)),
          brushedMetal,
          grille,
          'Malla acústica',
        )
      }
      box(group, chip, 0, 0.23, 0.34, 0.43, 0.12, 0.23, 'Controlador de ultrasonido')
      header(['VCC', 'TRIG', 'ECHO', 'GND'], 0.58)
    },
    i2c_oled: () => {
      slab(group, pcb, 1.94, 1.93, 0.12, 0.08, 0.05, 'PCB de pantalla I2C')
      box(group, graphite, 0, 0.25, -0.12, 1.72, 0.18, 1.34, 'Bisel de pantalla OLED')
      const glass = standard('#101e23', 0.13, 0.25)
      box(group, glass, 0, 0.351, -0.12, 1.52, 0.026, 1.06, 'Vidrio de pantalla apagada')
      box(group, standard('#6c4d31', 0.53), 0, 0.19, 0.63, 0.78, 0.035, 0.25, 'Flex de pantalla')
      for (const x of [-0.8, 0.8])
        for (const z of [-0.79, 0.78]) torus(gold, 0.055, 0.016, x, 0.183, z, 'Montaje de pantalla')
      header(['GND', 'VCC', 'SCL', 'SDA'], 0.9)
    },
    breadboard: () => {
      // All electrical contact IDs and coordinates come from the domain topology, never generated here.
      box(group, standard('#c5c4bb', 0.88), 0, 0.038, 0, 5.4, 0.076, 3.7, 'Base de protoboard')
      slab(group, pearl, 5.34, 3.64, 0.203, 0.07, 0.075, 'Cuerpo marfil de protoboard')
      box(
        group,
        standard('#b8b6ac', 0.94),
        0,
        0.299,
        0,
        4.96,
        0.009,
        0.25,
        'Canal central sin contactos',
      )
      for (const z of [-1.23, 1.23])
        box(group, standard('#d0cec2', 0.9), 0, 0.288, z, 5.03, 0.009, 0.025, 'Junta de carril')
      const positions: Array<[number, number, number]> = BREADBOARD_CONTACTS.map(({ x, z }) => [
        x,
        0.297,
        z,
      ])
      const cavities = repeated(
        group,
        geometry(new THREE.BoxGeometry(0.074, 0.012, 0.074)),
        holeMaterial,
        positions,
        '420 alojamientos de contacto',
      )
      const contacts = BREADBOARD_CONTACTS.map(
        ({ x, z }) => [x, 0.304, z] as [number, number, number],
      )
      repeated(
        group,
        geometry(new THREE.BoxGeometry(0.014, 0.002, 0.046)),
        brushedMetal,
        contacts,
        'Resortes metálicos interiores',
      )
      for (const contact of BREADBOARD_CONTACTS)
        anchors[contact.pinId] = new THREE.Vector3(contact.x, 0.305, contact.z)
      const marks = print(group, 5.34, 3.64, 0.308, labelTexture(1602, 1092, drawBreadboardLabels))
      // Transparent label pixels must not occlude physical terminal picking.
      if (marks) marks.raycast = () => {}
      return { mesh: cavities, pinIds: BREADBOARD_CONTACTS.map((contact) => contact.pinId) }
    },
  }
  const build = builders[typeId]
  if (!build) throw new RangeError(`No physical Nexo model for ${typeId}`)
  return build() || undefined
}

function drawBreadboardLabels(ctx: CanvasRenderingContext2D) {
  const px = (x: number) => ((x + 2.67) / 5.34) * 1602
  const pz = (z: number) => ((z + 1.82) / 3.64) * 1092
  ctx.lineWidth = 3
  for (const [z, color] of [
    [-1.74, '#aa594d'],
    [-1.32, '#496c82'],
    [1.32, '#496c82'],
    [1.74, '#aa594d'],
  ] as const) {
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(px(-2.42), pz(z))
    ctx.lineTo(px(2.42), pz(z))
    ctx.stroke()
    ctx.fillStyle = color
    ctx.font = 'bold 30px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(Math.abs(z) > 1.5 ? '+' : '−', px(-2.51), pz(z) + 9)
  }
  ctx.fillStyle = '#5b625d'
  ctx.font = '24px sans-serif'
  ctx.textAlign = 'center'
  for (const contact of BREADBOARD_CONTACTS) {
    const match = /^a(\d+)$/.exec(contact.pinId)
    const row = match ? Number(match[1]) : 0
    if (row === 1 || (row % 5 === 0 && row > 0)) {
      ctx.fillText(String(row), px(contact.x), pz(-1.1))
      ctx.fillText(String(row), px(contact.x), pz(1.16))
    }
  }
  // Sparse row/column legends only; rail color is an identifier, never a powered state.
  const columnContacts = BREADBOARD_CONTACTS.filter((contact) => /^[a-j]1$/.test(contact.pinId))
  ctx.textAlign = 'left'
  for (const contact of columnContacts)
    ctx.fillText(contact.pinId[0] ?? '', px(-2.57), pz(contact.z) + 8)
}
