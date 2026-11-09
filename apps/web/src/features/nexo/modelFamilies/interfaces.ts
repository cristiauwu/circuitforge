import { COMPONENT_INDEX } from '@circuitforge/netlist'
import * as THREE from 'three'
import type { ModelTools } from '../modelParts'

/** Original unpowered package models. Registry terminals need not be complete hardware pinouts. */
export function buildInterfaceModel(typeId: string, tools: ModelTools): boolean {
  if (
    ![
      'stepper_28byj48',
      'driver_uln2003',
      'driver_l298n',
      'terminal_block_2',
      'seven_segment',
      'lcd1602',
      'keypad_4x4',
      'esc_30a',
      'lipo_3s',
      'spi_flash',
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
    repeated,
    standard,
    print,
    labelTexture,
    graphite,
    metal,
    brushedMetal,
    gold,
    holeMaterial,
  } = tools
  const pins = definition.pins
  const green = standard('#39715c', 0.64, 0.05)
  const pearl = standard('#e3e1d0', 0.63)
  const cylinder = (
    surface: THREE.Material,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
    name: string,
    segments = 24,
  ) =>
    mesh(
      group,
      geometry(new THREE.CylinderGeometry(radius, radius, height, segments)),
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
      labelTexture(1024, 256, (ctx) => {
        ctx.fillStyle = '#e0e5d7'
        ctx.textAlign = 'center'
        ctx.font = 'bold 64px monospace'
        ctx.fillText(value, 512, 152)
      }),
    )
    if (mark) mark.position.z = z
  }
  const header = (ids: typeof pins, z: number, pitch: number, y = 0.28) => {
    box(group, graphite, 0, y, z, ids.length * pitch + 0.06, 0.2, 0.23, 'Separador de terminales')
    ids.forEach(({ id }, index) => {
      const x = (index - (ids.length - 1) / 2) * pitch
      box(group, gold, x, y, z + 0.22, 0.045, 0.045, 0.61, `Terminal ${id}`)
      anchors[id] = new THREE.Vector3(x, y, z + 0.525)
    })
  }
  const screw = (x: number, y: number, z: number, radius = 0.13) => {
    cylinder(metal, radius, 0.04, x, y, z, 'Tornillo de apriete')
    box(group, holeMaterial, x, y + 0.024, z, radius * 1.4, 0.01, 0.024, 'Ranura del tornillo')
  }
  if (typeId === 'driver_uln2003' || typeId === 'spi_flash') {
    const uln = typeId === 'driver_uln2003'
    const depth = uln ? 2.62 : 1.37
    const physicalRows = uln ? 8 : 4
    slab(
      group,
      graphite,
      0.92,
      depth,
      0.37,
      0.08,
      0.19,
      uln ? 'ULN2003 · cuerpo DIP-16' : 'Flash SPI · cuerpo de ocho patillas, subconjunto lógico',
    )
    cylinder(holeMaterial, 0.12, 0.012, 0, 0.589, -depth / 2 + 0.04, 'Muesca de orientación')
    for (const side of [-1, 1])
      for (let row = 0; row < physicalRows; row++) {
        const z = (row - (physicalRows - 1) / 2) * 0.3
        tube(
          group,
          metal,
          [
            [side * 0.44, 0.35, z],
            [side * 0.7, 0.3, z],
            [side * 0.79, 0.03, z],
          ],
          0.028,
          'Patilla física ilustrativa de encapsulado',
        )
      }
    const firstSide = Math.ceil(pins.length / 2)
    pins.forEach(({ id }, index) => {
      const side = index < firstSide ? -1 : 1
      const row = side < 0 ? index : pins.length - 1 - index
      const z = (row - (physicalRows - 1) / 2) * 0.3
      anchors[id] = new THREE.Vector3(side * 0.79, 0.03, z)
    })
    label(uln ? 'ULN2003' : 'SPI FLASH', 0.8, 0.33, 0.599)
    return true
  }
  if (typeId === 'terminal_block_2') {
    slab(group, standard('#397d52', 0.6), 1.45, 0.98, 0.63, 0.06, 0.12, 'Bornera de dos vías')
    pins.forEach(({ id }, index) => {
      const x = (index - (pins.length - 1) / 2) * 0.66
      cylinder(holeMaterial, 0.21, 0.012, x, 0.778, -0.07, 'Pozo del tornillo')
      screw(x, 0.787, -0.07, 0.16)
      box(group, holeMaterial, x, 0.4, 0.502, 0.4, 0.32, 0.018, 'Entrada de conductor')
      box(group, metal, x, 0.31, 0.509, 0.32, 0.05, 0.02, 'Mordaza metálica')
      box(group, metal, x, 0.05, 0, 0.055, 0.32, 0.055, `Terminal ${id}`)
      anchors[id] = new THREE.Vector3(x, 0.41, 0.525)
    })
    label('1     2', 1.0, 0.12, 0.778, 0.31)
    return true
  }
  if (typeId === 'stepper_28byj48') {
    cylinder(brushedMetal, 1.01, 0.91, 0, 0.68, -0.22, 'Lata del motor paso a paso')
    cylinder(metal, 0.99, 0.09, 0, 1.19, -0.22, 'Tapa de la reductora')
    cylinder(standard('#4b7993', 0.58), 0.96, 0.16, 0, 0.23, -0.22, 'Base aislante del motor')
    for (const x of [-1.2, 1.2]) {
      box(group, metal, x, 0.27, -0.22, 0.59, 0.1, 0.41, 'Oreja de montaje')
      cylinder(holeMaterial, 0.11, 0.015, x, 0.33, -0.22, 'Taladro de fijación')
    }
    cylinder(metal, 0.29, 0.2, 0, 1.31, -0.64, 'Cojinete excéntrico de reductora')
    cylinder(metal, 0.11, 0.51, 0, 1.63, -0.64, 'Eje de salida')
    box(group, holeMaterial, 0.106, 1.72, -0.64, 0.012, 0.25, 0.12, 'Plano del eje')
    box(group, pearl, 0, 0.42, 0.82, 0.85, 0.35, 0.38, 'Salida de mazo del motor')
    const colors = ['#a14a40', '#987b45', '#496b88', '#a85c88', '#caa957']
    pins.forEach(({ id }, index) => {
      const x = (index - (pins.length - 1) / 2) * 0.14
      tube(
        group,
        standard(colors[index] ?? '#606967', 0.65),
        [
          [x, 0.42, 0.9],
          [x + 0.12, 0.21, 1.3],
          [x, 0.16, 1.67],
        ],
        0.035,
        `Cable ${id}`,
      )
    })
    header(pins, 1.77, 0.14, 0.16)
    label('28BYJ-48', 1.02, 0.25, 1.245, 0.17)
    return true
  }
  if (typeId === 'driver_l298n') {
    slab(group, standard('#90483c', 0.61), 3.05, 2.9, 0.12, 0.08, 0.09, 'PCB del puente H L298N')
    box(group, graphite, 0, 0.5, -0.38, 1.52, 0.57, 0.65, 'Encapsulado del puente de potencia')
    box(group, brushedMetal, 0, 0.8, -0.76, 1.86, 1.18, 0.17, 'Base del disipador')
    for (let i = 0; i < 7; i++)
      box(group, graphite, -0.78 + i * 0.26, 0.85, -0.94, 0.095, 1.32, 0.69, 'Aleta del disipador')
    for (const x of [-1.08, 1.08]) {
      cylinder(graphite, 0.18, 0.52, x, 0.49, 0.15, 'Condensador de filtrado')
      cylinder(metal, 0.17, 0.018, x, 0.759, 0.15, 'Tapa del condensador')
    }
    // All catalog terminals share these two visible banks; no inferred extra power pins.
    const bankCount = Math.ceil(pins.length / 2)
    pins.forEach(({ id }, index) => {
      const bank = index < bankCount ? 0 : 1
      const row = bank ? index - bankCount : index
      const count = bank ? pins.length - bankCount : bankCount
      const x = (row - (count - 1) / 2) * 0.39
      const z = bank ? 1.18 : -1.29
      box(group, green, x, 0.39, z, 0.37, 0.35, 0.36, 'Borna del controlador')
      screw(x, 0.584, z, 0.105)
      box(
        group,
        holeMaterial,
        x,
        0.32,
        z + (bank ? 0.188 : -0.188),
        0.22,
        0.16,
        0.016,
        `Entrada ${id}`,
      )
      anchors[id] = new THREE.Vector3(x, 0.33, z + (bank ? 0.205 : -0.205))
    })
    for (const x of [-1.3, 1.3])
      for (const z of [-1.21, 1.21])
        cylinder(holeMaterial, 0.07, 0.016, x, 0.228, z, 'Taladro de placa')
    label('L298N', 1.13, 0.25, 0.226, 0.55)
    return true
  }
  if (typeId === 'esc_30a' || typeId === 'lipo_3s') {
    const lipo = typeId === 'lipo_3s'
    const depth = lipo ? 2.7 : 2.25
    slab(
      group,
      lipo ? brushedMetal : standard('#3c4c61', 0.44),
      1.63,
      depth,
      lipo ? 0.74 : 0.48,
      lipo ? 0.18 : 0.12,
      0.08,
      lipo ? 'Pouch laminado de batería LiPo' : 'Funda termorretráctil del ESC',
    )
    if (lipo) {
      for (const x of [-0.78, 0.78])
        box(group, metal, x, 0.44, 0, 0.065, 0.52, depth - 0.12, 'Costura sellada del pouch')
      box(group, graphite, 0, 0.44, -1.32, 1.42, 0.54, 0.12, 'Aislante de salida del pack')
      box(
        group,
        standard('#b4ac6a', 0.74),
        0,
        0.844,
        0,
        1.22,
        0.018,
        1.56,
        'Etiqueta de referencia de batería',
      )
    } else {
      for (let i = 0; i < 4; i++)
        box(
          group,
          graphite,
          0,
          0.58,
          -0.74 + i * 0.49,
          1.34,
          0.025,
          0.028,
          'Pliegue de funda termorretráctil',
        )
      box(group, graphite, 0, 0.28, -depth / 2, 1.48, 0.36, 0.13, 'Sellado del controlador')
    }
    // ESC exposes only BAT/GND/SIG from the legacy catalog, never invented phase outputs.
    pins.forEach(({ id }, index) => {
      const x = (index - (pins.length - 1) / 2) * 0.39
      const z = depth / 2 + 1.03
      const end = new THREE.Vector3(x, 0.16, z)
      tube(
        group,
        standard(index === 0 ? '#a7483a' : index === 1 ? '#292b2c' : '#b4a36a', 0.68),
        [[x, 0.3, depth / 2], [x + 0.12, 0.2, depth / 2 + 0.54], end.toArray()],
        lipo ? 0.065 : 0.045,
        `Cable lógico ${id}`,
      )
      box(
        group,
        lipo ? standard('#a98b36', 0.58) : graphite,
        x,
        0.16,
        z + 0.13,
        0.22,
        0.2,
        0.28,
        `Conector ${id}`,
      )
      anchors[id] = new THREE.Vector3(x, 0.16, z + 0.28)
    })
    label(lipo ? 'LiPo 3S · 11.1 V nominal' : 'ESC · 30 A nominal', 1.35, 0.42, lipo ? 0.863 : 0.59)
    return true
  }
  if (typeId === 'seven_segment') {
    slab(group, pearl, 1.47, 2.05, 0.42, 0.08, 0.21, 'Caja de display de siete segmentos')
    box(
      group,
      standard('#26232b', 0.31),
      0,
      0.66,
      0,
      1.35,
      0.05,
      1.91,
      'Cara oscura del display apagado',
    )
    const off = standard('#673e42', 0.52)
    const segmentShape = new THREE.Shape()
    segmentShape.moveTo(-0.31, 0)
    segmentShape.lineTo(-0.24, -0.065)
    segmentShape.lineTo(0.24, -0.065)
    segmentShape.lineTo(0.31, 0)
    segmentShape.lineTo(0.24, 0.065)
    segmentShape.lineTo(-0.24, 0.065)
    segmentShape.closePath()
    const segment = geometry(
      new THREE.ExtrudeGeometry(segmentShape, { depth: 0.012, bevelEnabled: false, steps: 1 }),
    )
    segment.rotateX(-Math.PI / 2)
    for (const z of [-0.69, 0, 0.69])
      mesh(group, segment, off, -0.07, 0.692, z, 'Segmento horizontal apagado')
    for (const x of [-0.44, 0.3])
      for (const z of [-0.35, 0.35]) {
        const vertical = mesh(group, segment, off, x, 0.692, z, 'Segmento vertical apagado')
        vertical.rotation.y = Math.PI / 2
      }
    cylinder(off, 0.07, 0.012, 0.49, 0.699, 0.7, 'Punto decimal apagado')
    label('7 SEG', 0.52, 0.1, 0.636, 0.99)
    const half = Math.ceil(pins.length / 2)
    pins.forEach(({ id }, index) => {
      const side = index < half ? -1 : 1
      const row = side < 0 ? index : index - half
      const count = side < 0 ? half : pins.length - half
      const x = (row - (count - 1) / 2) * 0.25
      tube(
        group,
        metal,
        [
          [x, 0.28, side * 0.94],
          [x, 0.17, side * 1.14],
          [x, 0.02, side * 1.32],
        ],
        0.023,
        `Terminal ${id}`,
      )
      anchors[id] = new THREE.Vector3(x, 0.02, side * 1.32)
    })
    return true
  }
  if (typeId === 'lcd1602') {
    slab(group, green, 4.1, 2.05, 0.12, 0.08, 0.08, 'PCB de pantalla LCD 1602')
    box(group, brushedMetal, 0, 0.32, 0, 3.71, 0.28, 1.52, 'Bisel metálico del LCD')
    box(group, graphite, 0, 0.476, 0, 3.34, 0.035, 1.17, 'Junta de la ventana LCD')
    box(
      group,
      standard('#94a95a', 0.42),
      0,
      0.502,
      0,
      3.13,
      0.023,
      0.96,
      'Cristal verde sin salida simulada',
    )
    const cellPositions: Array<[number, number, number]> = []
    for (let row = 0; row < 2; row++)
      for (let column = 0; column < 16; column++)
        cellPositions.push([-1.39 + column * 0.185, 0.519, -0.245 + row * 0.49])
    repeated(
      group,
      geometry(new THREE.BoxGeometry(0.145, 0.006, 0.35)),
      standard('#81934f', 0.5),
      cellPositions,
      '32 celdas LCD apagadas',
    )
    // Faint 5x8 physical dot grid; no text, firmware result, or fake runtime telemetry.
    const dots: Array<[number, number, number]> = []
    for (const [cx, , cz] of cellPositions)
      for (let row = 0; row < 8; row++)
        for (let column = 0; column < 5; column++)
          dots.push([cx - 0.05 + column * 0.025, 0.524, cz - 0.14 + row * 0.04])
    repeated(
      group,
      geometry(new THREE.BoxGeometry(0.018, 0.002, 0.029)),
      standard('#78894b', 0.56),
      dots,
      'Matriz de puntos LCD en reposo',
    )
    for (const x of [-1.88, 1.88])
      for (const z of [-0.85, 0.85])
        cylinder(holeMaterial, 0.065, 0.012, x, 0.218, z, 'Taladro de LCD')
    header(pins, 0.99, 0.23)
    label('LCD 1602', 1.2, 0.14, 0.218, -0.92)
    return true
  }
  // keypad_4x4: sixteen separate domed keys over a thin membrane carrier.
  slab(group, graphite, 2.9, 3.12, 0.09, 0.13, 0.08, 'Base de teclado de membrana 4×4')
  const legends = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D']
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 4; column++) {
      const x = (column - 1.5) * 0.67
      const z = (row - 1.5) * 0.7
      const surface = standard(column === 3 ? '#775d4b' : '#536567', 0.64)
      const key = slab(
        group,
        surface,
        0.56,
        0.56,
        0.12,
        0.12,
        0.2,
        `Tecla ${legends[row * 4 + column]}`,
      )
      key.position.x = x
      key.position.z = z
      const dome = mesh(
        group,
        geometry(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
        surface,
        x,
        0.32,
        z,
        'Domo de tecla sin pulsar',
      )
      dome.scale.y = 0.45
    }
  const marks = print(
    group,
    2.9,
    3.12,
    0.44,
    labelTexture(928, 998, (ctx) => {
      ctx.fillStyle = '#ede9d9'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 72px sans-serif'
      legends.forEach((value, index) => {
        const x = ((((index % 4) - 1.5) * 0.67) / 2.9 + 0.5) * 928
        const z = (((Math.floor(index / 4) - 1.5) * 0.7) / 3.12 + 0.5) * 998
        ctx.fillText(value, x, z)
      })
    }),
  )
  if (marks) marks.raycast = () => {}
  box(group, standard('#a47d4b', 0.68), 0, 0.12, 1.83, 1.62, 0.04, 0.57, 'Cola flexible de teclado')
  header(pins, 2.14, 0.18, 0.13)
  return true
}
