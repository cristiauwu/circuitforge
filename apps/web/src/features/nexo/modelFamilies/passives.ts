import * as THREE from 'three'
import type { ModelTools } from '../modelParts'
import { familyTools } from './modelTools'

const PASSIVE_TYPES = new Set([
  'capacitor_ceramic',
  'capacitor_film',
  'thermistor_ntc',
  'varistor_mov',
  'fuse',
  'crystal',
  'transformer',
])

/** Authored illustrative packages, not manufacturer dimensions or certified pin orders. */
export function buildPassiveModel(typeId: string, tools: ModelTools): boolean {
  if (!PASSIVE_TYPES.has(typeId)) return false
  const {
    group,
    geometry,
    material,
    standard,
    mesh,
    box,
    slab,
    tube,
    metal,
    brushedMetal,
    graphite,
    gold,
  } = tools
  const { cylinder, lead, marking } = familyTools(tools)

  const disc =
    typeId === 'capacitor_ceramic' || typeId === 'thermistor_ntc' || typeId === 'varistor_mov'
  const builders: Record<string, () => void> = {
    disc: () => {
      const ceramic = typeId === 'capacitor_ceramic'
      const ntc = typeId === 'thermistor_ntc'
      const radius = ceramic ? 0.38 : ntc ? 0.34 : 0.49
      const centerY = radius + 0.42
      const enamel = standard(
        ceramic ? '#bd8a4f' : ntc ? '#303d37' : '#426d91',
        ceramic ? 0.59 : 0.34,
      )
      const disc = mesh(
        group,
        geometry(new THREE.SphereGeometry(1, 32, 20)),
        enamel,
        0,
        centerY,
        0,
        ceramic
          ? 'Disco cerámico ocre'
          : ntc
            ? 'Perla termistora verde carbón'
            : 'Disco MOV azul esmaltado',
      )
      disc.scale.set(radius, radius, ceramic ? 0.12 : ntc ? 0.18 : 0.135)
      for (const [pinId, side] of [
        ['a', -1],
        ['b', 1],
      ] as const) {
        const x = side * radius * 0.49
        tube(
          group,
          enamel,
          [
            [x, centerY - radius * 0.68, 0],
            [x, 0.39, 0],
            [side * 0.25, 0.3, 0],
          ],
          0.041,
          'Recubrimiento de salida',
        )
        lead(pinId, [side * 0.25, 0.31, 0], [side * 0.36, 0, 0])
      }
      // A single face marking, rather than a texture per terminal.
      const stamp = marking(
        ceramic ? '104' : ntc ? '10K' : 'MOV',
        radius * 1.2,
        0.23,
        0,
        ceramic ? '#4c3825' : '#e7e4d9',
      )
      if (stamp) {
        stamp.rotation.x = 0
        stamp.position.set(0, centerY, ceramic ? 0.122 : ntc ? 0.182 : 0.137)
      }
    },
    capacitor_film: () => {
      const resin = standard('#925b46', 0.37)
      slab(group, resin, 1.12, 0.48, 0.72, 0.12, 0.3, 'Cápsula de película encapsulada en resina')
      box(
        group,
        standard('#784a3b', 0.52),
        0,
        0.34,
        0,
        1.03,
        0.08,
        0.43,
        'Costura inferior de resina',
      )
      lead('a', [-0.39, 0.34, 0], [-0.49, 0, 0])
      lead('b', [0.39, 0.34, 0], [0.49, 0, 0])
      marking('100n', 0.71, 0.22, 1.047)
    },
    fuse: () => {
      const glass = material(
        new THREE.MeshStandardMaterial({
          color: '#d9e7df',
          roughness: 0.12,
          metalness: 0.08,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        }),
      )
      const barrel = cylinder(glass, 0.19, 1.24, 0, 0.27, 0, 'Tubo de vidrio de fusible')
      barrel.rotation.z = Math.PI / 2
      for (const x of [-0.69, 0.69]) {
        const cap = cylinder(brushedMetal, 0.205, 0.25, x, 0.27, 0, 'Casquillo metálico de fusible')
        cap.rotation.z = Math.PI / 2
        const lip = cylinder(
          metal,
          0.212,
          0.035,
          x + Math.sign(x) * 0.1,
          0.27,
          0,
          'Labio de casquillo',
        )
        lip.rotation.z = Math.PI / 2
      }
      tube(
        group,
        metal,
        [
          [-0.57, 0.27, 0],
          [-0.25, 0.29, 0],
          [0, 0.24, 0],
          [0.25, 0.29, 0],
          [0.57, 0.27, 0],
        ],
        0.014,
        'Filamento fusible continuo',
      )
      lead('a', [-0.81, 0.27, 0], [-1.09, 0, 0])
      lead('b', [0.81, 0.27, 0], [1.09, 0, 0])
    },
    crystal: () => {
      slab(group, brushedMetal, 1.27, 0.55, 0.095, 0.25, 0.25, 'Pestaña ovalada HC49')
      slab(group, metal, 1.1, 0.43, 0.7, 0.205, 0.33, 'Campana metálica HC49')
      slab(group, graphite, 1.1, 0.4, 0.035, 0.19, 0.235, 'Junta aislante de cristal')
      lead('a', [-0.36, 0.27, 0], [-0.45, 0, 0])
      lead('b', [0.36, 0.27, 0], [0.45, 0, 0])
      marking('16.000', 0.77, 0.22, 1.057, '#3f4c50')
    },
    transformer: () => {
      const enamel = standard('#b46f3f', 0.3, 0.58)
      const bobbin = standard('#b6a070', 0.67)
      // Open laminated E-I core: the winding is visible through the frame, not a solid box.
      for (const x of [-0.9, 0.9])
        box(group, graphite, x, 0.81, 0, 0.3, 1.38, 0.96, 'Columna de núcleo laminado')
      for (const y of [0.2, 1.42])
        box(group, brushedMetal, 0, y, 0, 2.08, 0.16, 1, 'Puente de núcleo E-I')
      for (let i = 0; i < 9; i++)
        for (const x of [-0.9, 0.9])
          box(
            group,
            brushedMetal,
            x,
            0.81,
            -0.445 + i * 0.111,
            0.302,
            1.2,
            0.017,
            'Canto de laminación',
          )
      box(group, bobbin, 0, 0.82, 0, 1.32, 0.79, 0.78, 'Carrete aislante de transformador')
      for (const x of [-0.66, 0, 0.66])
        box(group, bobbin, x, 0.82, 0, 0.075, 0.98, 0.99, 'Brida de carrete')
      for (const side of [-1, 1]) {
        const turns: number[][] = []
        for (let i = 0; i <= 256; i++) {
          const fraction = i / 256
          const phase = fraction * Math.PI * 2 * 13
          turns.push([
            side * 0.33 + (fraction - 0.5) * 0.53,
            0.82 + Math.cos(phase) * 0.42,
            Math.sin(phase) * 0.43,
          ])
        }
        const curve = new THREE.CatmullRomCurve3(
          turns.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        )
        mesh(
          group,
          geometry(new THREE.TubeGeometry(curve, 256, 0.027, 6, false)),
          enamel,
          0,
          0,
          0,
          side < 0 ? 'Bobinado primario de cobre' : 'Bobinado secundario de cobre',
        )
      }
      for (const [pinId, x, z] of [
        ['primary_a', -0.57, -0.76],
        ['primary_b', 0.57, -0.76],
        ['secondary_a', -0.57, 0.76],
        ['secondary_b', 0.57, 0.76],
      ] as const) {
        box(group, gold, x, 0.2, z * 0.78, 0.11, 0.16, 0.15, 'Lengüeta de bobinado')
        lead(pinId, [x, 0.22, z * 0.78], [x, 0, z])
      }
    },
  }
  const build = builders[disc ? 'disc' : typeId]
  if (!build) return false
  build()
  return true
}
