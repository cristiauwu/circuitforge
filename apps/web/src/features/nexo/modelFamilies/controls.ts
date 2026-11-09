import * as THREE from 'three'
import type { ModelTools } from '../modelParts'
import { familyTools } from './modelTools'

const CONTROL_TYPES = new Set([
  'switch_spst',
  'switch_spdt',
  'pushbutton',
  'dip_switch_4',
  'reed_switch',
  'rotary_encoder',
  'relay_spdt',
])

/** Manual catalog state only; these poses do not imply a running circuit simulation. */
export function buildControlModel(typeId: string, tools: ModelTools): boolean {
  if (!CONTROL_TYPES.has(typeId)) return false
  const {
    group,
    geometry,
    material,
    standard,
    mesh,
    box,
    slab,
    graphite,
    chip,
    metal,
    brushedMetal,
    gold,
    holeMaterial,
  } = tools
  const { cylinder, ring, lead, marking } = familyTools(tools)
  const pearl = standard('#e7e4d9', 0.62)

  const builders: Record<string, () => void> = {
    switch_spst: () => {
      slab(
        group,
        standard('#79523f', 0.65),
        1.03,
        0.65,
        0.36,
        0.08,
        0.2,
        'Base fenólica de interruptor',
      )
      slab(group, brushedMetal, 1.09, 0.7, 0.08, 0.08, 0.55, 'Tapa del conmutador de palanca')
      cylinder(metal, 0.16, 0.24, 0, 0.75, 0, 'Casquillo roscado de palanca', 12)
      const nut = cylinder(brushedMetal, 0.23, 0.065, 0, 0.69, 0, 'Tuerca hexagonal de fijación', 6)
      nut.rotation.y = Math.PI / 6
      const lever = new THREE.Group()
      lever.name = 'Palanca manual'
      lever.position.y = 0.88
      lever.rotation.z = tools.params?.closed === true ? -0.32 : 0.32
      group.add(lever)
      mesh(
        lever,
        geometry(new THREE.CylinderGeometry(0.062, 0.085, 0.59, 20)),
        metal,
        0,
        0.2,
        0,
        'Vástago basculante',
      )
      mesh(
        lever,
        geometry(new THREE.SphereGeometry(0.086, 20, 12)),
        metal,
        0,
        0.49,
        0,
        'Extremo redondeado de palanca',
      )
      lead('a', [-0.31, 0.22, 0], [-0.42, 0, 0])
      lead('b', [0.31, 0.22, 0], [0.42, 0, 0])
    },
    switch_spdt: () => {
      slab(group, graphite, 1.24, 0.65, 0.35, 0.07, 0.24, 'Cuerpo de interruptor deslizante')
      slab(group, brushedMetal, 1.27, 0.67, 0.07, 0.055, 0.59, 'Guía metálica de corredera')
      box(group, holeMaterial, 0, 0.671, 0, 0.79, 0.013, 0.27, 'Ranura de selección')
      const selectedX = tools.params?.position === 'throw_b' ? 0.25 : -0.25
      box(group, chip, selectedX, 0.8, 0, 0.32, 0.26, 0.25, 'Cursor deslizante')
      for (const dx of [-0.08, 0, 0.08])
        box(group, brushedMetal, selectedX + dx, 0.935, 0, 0.018, 0.008, 0.19, 'Estría de cursor')
      for (const [pinId, x] of [
        ['throw_a', -0.43],
        ['common', 0],
        ['throw_b', 0.43],
      ] as const)
        lead(pinId, [x, 0.26, 0], [x, 0, 0.18])
    },
    pushbutton: () => {
      slab(group, graphite, 0.9, 0.85, 0.23, 0.05, 0.24, 'Base de pulsador táctil')
      slab(group, brushedMetal, 0.87, 0.82, 0.075, 0.06, 0.47, 'Placa de retención de pulsador')
      for (const x of [-0.33, 0.33])
        for (const z of [-0.3, 0.3])
          cylinder(metal, 0.055, 0.025, x, 0.565, z, 'Remache de retención')
      cylinder(holeMaterial, 0.27, 0.04, 0, 0.565, 0, 'Asiento del émbolo')
      const pressed = tools.params?.pressed === true
      cylinder(
        standard('#a45043', 0.43),
        0.205,
        pressed ? 0.13 : 0.26,
        0,
        pressed ? 0.63 : 0.7,
        0,
        'Émbolo de pulsador',
      )
      lead('a', [-0.44, 0.31, 0], [-0.59, 0, 0])
      lead('b', [0.44, 0.31, 0], [0.59, 0, 0])
    },
    dip_switch_4: () => {
      const red = standard('#a94f43', 0.49)
      slab(group, red, 1.88, 0.93, 0.4, 0.055, 0.28, 'Banco rojo de cuatro microinterruptores')
      box(group, graphite, 0, 0.28, 0, 1.82, 0.08, 0.86, 'Base de banco DIP')
      const mask = typeof tools.params?.closedMask === 'number' ? tools.params.closedMask : 0
      for (let i = 0; i < 4; i++) {
        const x = (i - 1.5) * 0.41
        box(group, holeMaterial, x, 0.695, 0, 0.24, 0.018, 0.56, 'Canal de microinterruptor')
        box(
          group,
          pearl,
          x,
          0.745,
          mask & (1 << i) ? -0.13 : 0.13,
          0.18,
          0.105,
          0.22,
          `Selector DIP ${i + 1}`,
        )
        lead(`a${i + 1}`, [x, 0.3, -0.42], [x, 0, -0.7])
        lead(`b${i + 1}`, [x, 0.3, 0.42], [x, 0, 0.7])
      }
      const legend = marking('1   2   3   4', 1.58, 0.14, 0.705)
      if (legend) legend.position.z = 0.37
    },
    reed_switch: () => {
      const glass = material(
        new THREE.MeshStandardMaterial({
          color: '#b8d0bf',
          transparent: true,
          opacity: 0.32,
          roughness: 0.13,
          metalness: 0.03,
          depthWrite: false,
        }),
      )
      const envelope = mesh(
        group,
        geometry(new THREE.CapsuleGeometry(0.135, 1.22, 6, 24)),
        glass,
        0,
        0.23,
        0,
        'Ampolla de vidrio de contacto reed',
      )
      envelope.rotation.z = Math.PI / 2
      const closed = tools.params?.closed === true
      box(group, brushedMetal, -0.24, 0.23, -0.022, 0.88, 0.035, 0.075, 'Lámina ferromagnética A')
      box(
        group,
        metal,
        0.24,
        closed ? 0.231 : 0.285,
        0.022,
        0.88,
        0.025,
        0.075,
        'Lámina ferromagnética B',
      )
      for (const x of [-0.63, 0.63]) {
        const seal = cylinder(
          standard('#516a58', 0.36),
          0.084,
          0.14,
          x,
          0.23,
          0,
          'Sello de vidrio de terminal',
        )
        seal.rotation.z = Math.PI / 2
      }
      lead('a', [-0.74, 0.23, 0], [-1.06, 0, 0])
      lead('b', [0.74, 0.23, 0], [1.06, 0, 0])
    },
    rotary_encoder: () => {
      slab(group, graphite, 1.08, 0.96, 0.24, 0.045, 0.25, 'Base de codificador rotativo')
      slab(group, brushedMetal, 1.12, 1, 0.19, 0.1, 0.48, 'Carcasa estampada de encoder')
      cylinder(metal, 0.19, 0.3, 0, 0.78, 0, 'Casquillo de encoder', 12)
      cylinder(brushedMetal, 0.115, 0.29, 0, 1.01, 0, 'Eje de encoder')
      const knobY = tools.params?.pressed === true ? 1.19 : 1.26
      cylinder(graphite, 0.37, 0.36, 0, knobY, 0, 'Mando circular de encoder')
      ring(chip, 0.34, 0.025, 0, knobY + 0.18, 0, 'Borde de mando')
      for (let i = 0; i < 20; i++) {
        const angle = (i * Math.PI) / 10
        cylinder(
          brushedMetal,
          0.012,
          0.24,
          Math.cos(angle) * 0.365,
          knobY,
          Math.sin(angle) * 0.365,
          'Moleteado de mando',
          6,
        )
      }
      box(group, pearl, 0, knobY + 0.185, -0.19, 0.025, 0.01, 0.18, 'Índice de giro')
      for (const [pinId, x] of [
        ['A', -0.35],
        ['COM', 0],
        ['B', 0.35],
      ] as const)
        lead(pinId, [x, 0.28, 0.45], [x, 0, 0.77])
      lead('SW1', [-0.36, 0.28, -0.45], [-0.36, 0, -0.73])
      lead('SW2', [0.36, 0.28, -0.45], [0.36, 0, -0.73])
    },
    relay_spdt: () => {
      const shell = material(
        new THREE.MeshStandardMaterial({
          color: '#b0bfad',
          roughness: 0.18,
          metalness: 0.03,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        }),
      )
      const copper = standard('#a66a40', 0.36, 0.6)
      slab(group, graphite, 1.65, 1.1, 0.14, 0.065, 0.22, 'Zócalo de relé')
      // The clear hood exposes a wound coil and separate moving contact mechanism.
      slab(group, shell, 1.62, 1.08, 1.12, 0.09, 0.36, 'Cubierta translúcida de relé')
      const core = cylinder(metal, 0.16, 0.77, -0.33, 0.85, 0, 'Núcleo de electroimán')
      core.rotation.x = Math.PI / 2
      for (const z of [-0.39, 0.39]) {
        const flange = cylinder(pearl, 0.32, 0.065, -0.33, 0.85, z, 'Brida de bobina de relé')
        flange.rotation.x = Math.PI / 2
      }
      const winding: number[][] = []
      for (let i = 0; i <= 216; i++) {
        const phase = (i / 216) * Math.PI * 2 * 15
        winding.push([
          -0.33 + Math.cos(phase) * 0.26,
          0.85 + Math.sin(phase) * 0.26,
          -0.32 + (i / 216) * 0.64,
        ])
      }
      const curve = new THREE.CatmullRomCurve3(
        winding.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      )
      mesh(
        group,
        geometry(new THREE.TubeGeometry(curve, 216, 0.022, 6, false)),
        copper,
        0,
        0,
        0,
        'Bobinado de relé',
      )
      box(group, brushedMetal, 0.25, 0.53, 0, 0.1, 0.33, 0.64, 'Soporte de armadura')
      const armature = box(
        group,
        metal,
        0.38,
        1.17,
        0,
        0.63,
        0.045,
        0.65,
        'Armadura móvil del relé',
      )
      armature.rotation.z = tools.params?.energized === true ? -0.12 : 0.09
      for (const z of [-0.22, 0.22])
        box(group, gold, 0.64, z < 0 ? 1.08 : 1.28, z, 0.1, 0.05, 0.1, 'Contacto fijo de relé')
      for (const [pinId, x, z] of [
        ['coil_a', -0.53, -0.76],
        ['coil_b', -0.53, 0.76],
        ['COM', 0.52, 0.76],
        ['NO', 0.56, -0.76],
        ['NC', 0.02, -0.76],
      ] as const)
        lead(pinId, [x, 0.26, Math.sign(z) * 0.47], [x, 0, z])
    },
  }
  const build = builders[typeId]
  if (!build) return false
  build()
  return true
}
