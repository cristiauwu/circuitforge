import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

/** Unpowered illustrative sensors; no measured values or simulated detection state. */
export function buildSensorModel(typeId: string, tools: ModelTools): boolean {
  if (
    ![
      'ds18b20',
      'lm35',
      'bmp280',
      'mpu6050',
      'pir_hcsr501',
      'hall_a3144',
      'ir_receiver_tsop38238',
    ].includes(typeId)
  )
    return false
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
    ceramic,
    holeMaterial,
  } = tools
  const pins = definition.pins
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
      geometry(new THREE.CylinderGeometry(radius, radius, height, 24)),
      surface,
      x,
      y,
      z,
      name,
    )
  const label = (value: string, width: number, depth: number, y: number, z = 0) => {
    const mark = print(
      group,
      width,
      depth,
      y,
      labelTexture(768, 256, (ctx) => {
        ctx.fillStyle = '#d8e1d0'
        ctx.textAlign = 'center'
        ctx.font = 'bold 66px monospace'
        ctx.fillText(value, 384, 150)
      }),
    )
    if (mark) mark.position.z = z
  }
  const header = (z: number, pitch: number) => {
    box(
      group,
      graphite,
      0,
      0.28,
      z,
      pins.length * pitch + 0.06,
      0.2,
      0.23,
      'Separador del encabezado',
    )
    pins.forEach(({ id }, index) => {
      const x = (index - (pins.length - 1) / 2) * pitch
      box(group, gold, x, 0.25, z + 0.24, 0.045, 0.045, 0.65, `Terminal ${id}`)
      anchors[id] = new THREE.Vector3(x, 0.25, z + 0.565)
    })
  }
  if (['ds18b20', 'lm35', 'hall_a3144', 'ir_receiver_tsop38238'].includes(typeId)) {
    const ir = typeId === 'ir_receiver_tsop38238'
    const hall = typeId === 'hall_a3144'
    const height = hall ? 0.55 : ir ? 0.84 : 0.68
    const shape = new THREE.Shape()
    shape.moveTo(-0.32, 0.13)
    shape.lineTo(0.32, 0.13)
    shape.lineTo(0.32, -0.04)
    shape.absarc(0, -0.04, 0.32, 0, Math.PI, true)
    shape.closePath()
    const shell = geometry(
      new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 2,
        steps: 1,
      }),
    )
    shell.rotateX(-Math.PI / 2)
    mesh(
      group,
      shell,
      graphite,
      0,
      0.4,
      0,
      ir ? 'Encapsulado de receptor IR' : 'Encapsulado de perfil D',
    )
    if (ir) {
      const lens = mesh(
        group,
        geometry(new THREE.SphereGeometry(0.26, 24, 12)),
        standard('#291c25', 0.16, 0.1),
        0,
        0.87,
        0.14,
        'Lente oscura infrarroja',
      )
      lens.scale.set(1, 1.25, 0.48)
    } else {
      cylinder(holeMaterial, 0.045, 0.012, -0.19, 0.4 + height + 0.031, -0.05, 'Marca de molde')
    }
    pins.forEach(({ id }, index) => {
      const x = (index - (pins.length - 1) / 2) * 0.23
      const end = new THREE.Vector3(x, 0, 0.28)
      tube(group, metal, [[x, 0.42, 0], [x, 0.18, 0.08], end.toArray()], 0.024, `Terminal ${id}`)
      anchors[id] = end
    })
    label(
      ir ? '38238' : hall ? 'A3144' : typeId === 'lm35' ? 'LM35' : 'DS18B20',
      0.56,
      0.16,
      0.4 + height + 0.032,
      -0.05,
    )
    return true
  }
  const pir = typeId === 'pir_hcsr501'
  const mpu = typeId === 'mpu6050'
  const width = pir ? 2.25 : mpu ? 2.1 : 1.9
  const depth = pir ? 2.25 : mpu ? 2.05 : 1.55
  slab(
    group,
    standard(mpu ? '#2c6387' : '#2e6852', 0.64, 0.08),
    width,
    depth,
    0.11,
    0.08,
    0.08,
    'Placa del módulo sensor',
  )
  for (const x of [-width / 2 + 0.18, width / 2 - 0.18]) {
    cylinder(gold, 0.09, 0.012, x, 0.207, -depth / 2 + 0.18, 'Anillo de montaje')
    cylinder(holeMaterial, 0.053, 0.016, x, 0.218, -depth / 2 + 0.18, 'Taladro de montaje')
  }
  if (pir) {
    const ivory = standard('#e4e4d4', 0.54)
    cylinder(ivory, 0.81, 0.16, 0, 0.37, -0.08, 'Base de lente Fresnel')
    mesh(
      group,
      geometry(new THREE.SphereGeometry(0.8, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
      ivory,
      0,
      0.44,
      -0.08,
      'Cúpula Fresnel del PIR',
    )
    // Shallow physical annular ridges describe a faceted lens, never an emitting state.
    for (let i = 1; i <= 5; i++) {
      const angle = (i * Math.PI) / 12
      const radius = Math.sin(angle) * 0.803
      const ring = mesh(
        group,
        geometry(new THREE.TorusGeometry(radius, 0.009, 4, 40)),
        standard('#d1d5c7', 0.63),
        0,
        0.44 + Math.cos(angle) * 0.803,
        -0.08,
        'Anillo óptico Fresnel',
      )
      ring.rotation.x = Math.PI / 2
    }
    for (const x of [-0.62, 0.62]) {
      box(
        group,
        standard('#cc9b48', 0.68),
        x,
        0.31,
        0.78,
        0.34,
        0.25,
        0.27,
        'Ajuste mecánico de sensibilidad y tiempo',
      )
      cylinder(metal, 0.075, 0.02, x, 0.445, 0.78, 'Tornillo de ajuste')
      box(group, holeMaterial, x, 0.458, 0.78, 0.1, 0.008, 0.018, 'Ranura de tornillo')
    }
    header(1.02, 0.26)
    label('HC-SR501', 1.1, 0.16, 0.207, -0.97)
  } else if (mpu) {
    box(group, chip, 0, 0.29, -0.12, 0.6, 0.15, 0.6, 'MPU6050 LGA inercial')
    cylinder(holeMaterial, 0.035, 0.012, -0.22, 0.372, -0.34, 'Índice de encapsulado')
    for (let i = 0; i < 4; i++) {
      box(
        group,
        ceramic,
        -0.56,
        0.25,
        -0.48 + i * 0.27,
        0.17,
        0.08,
        0.085,
        'Capacitor de desacoplo',
      )
      box(group, graphite, 0.59, 0.25, -0.48 + i * 0.27, 0.16, 0.07, 0.075, 'Resistencia SMD')
    }
    header(0.91, 0.22)
    label('MPU6050', 1.1, 0.2, 0.207, 0.55)
  } else {
    box(group, metal, 0, 0.31, -0.13, 0.5, 0.23, 0.44, 'Cápsula metálica del BMP280')
    cylinder(holeMaterial, 0.032, 0.01, 0.12, 0.431, -0.21, 'Puerto de presión')
    for (const x of [-0.55, 0.55]) {
      box(group, ceramic, x, 0.25, -0.15, 0.18, 0.08, 0.1, 'Desacoplo del sensor')
      box(group, chip, x, 0.25, 0.22, 0.19, 0.08, 0.1, 'Resistencia de módulo')
    }
    header(0.65, 0.25)
    label('BMP280', 1.1, 0.2, 0.207, -0.55)
  }
  return true
}
