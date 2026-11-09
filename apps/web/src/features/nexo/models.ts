import type { ParamValue } from '@circuitforge/netlist'
import * as THREE from 'three'
import { isEditableType } from './capabilities'
import { buildFamilyModel, buildPhysicalModel, type ModelTools } from './modelParts'

export interface ProjectModel {
  group: THREE.Group
  /** Exact catalog pin IDs; illustrative locations, not a certified hardware pinout. */
  anchors: Record<string, THREE.Vector3>
  /** Dense contacts use one raycastable batch; instanceId indexes these exact catalog IDs. */
  contactPicking?: { mesh: THREE.InstancedMesh; pinIds: readonly string[] }
  dispose(): void
}

/** No renderer, lights, global caches or hit metadata. Every resource belongs to this instance. */
export function createProjectModel(
  typeId: string,
  params: Readonly<Record<string, ParamValue>> = {},
): ProjectModel {
  if (!isEditableType(typeId)) {
    throw new RangeError(`No Nexo model for ${typeId}`)
  }
  const group = new THREE.Group()
  group.name = `${typeId} · modelo ilustrativo, no certificado`
  const anchors: Record<string, THREE.Vector3> = {}
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const instances = new Set<THREE.InstancedMesh>()
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value)
    return value
  }
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value)
    return value
  }
  const standard = (color: THREE.ColorRepresentation, roughness = 0.5, metalness = 0) =>
    material(new THREE.MeshStandardMaterial({ color, roughness, metalness }))
  const graphite = standard('#171e26', 0.53)
  const chip = standard('#10151b', 0.7)
  const metal = standard('#b9c7cb', 0.24, 0.9)
  const brushedMetal = standard('#9faeb4', 0.38, 0.88)
  const gold = standard('#c7a15b', 0.24, 0.9)
  const pinMetal = standard('#aeb9bd', 0.26, 0.92)
  // Deterministic microscopic tool marks; one shared map, no external assets.
  const brushedPixels = new Uint8Array(128 * 128 * 4)
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const offset = (y * 128 + x) * 4
      const value = 147 + Math.round(18 * Math.sin(y * 2.41) + 5 * Math.sin(x * 0.19 + y))
      brushedPixels[offset] = brushedPixels[offset + 1] = brushedPixels[offset + 2] = value
      brushedPixels[offset + 3] = 255
    }
  const brushedTexture = new THREE.DataTexture(brushedPixels, 128, 128)
  brushedTexture.wrapS = brushedTexture.wrapT = THREE.RepeatWrapping
  brushedTexture.repeat.set(1, 6)
  brushedTexture.needsUpdate = true
  textures.add(brushedTexture)
  brushedMetal.roughnessMap = brushedTexture
  brushedMetal.bumpMap = brushedTexture
  brushedMetal.bumpScale = 0.0018
  const solder = standard('#9aadb2', 0.4, 0.74)
  const ceramic = standard('#d1b890', 0.82)
  const holeMaterial = standard('#343c41', 0.95)
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1))
  const pinGeometry = geometry(new THREE.BoxGeometry(0.045, 0.66, 0.045))
  const padGeometry = geometry(new THREE.CylinderGeometry(0.092, 0.092, 0.018, 16))
  function mesh(
    parent: THREE.Object3D,
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
    name?: string,
  ) {
    const item = new THREE.Mesh(shape, surface)
    item.position.set(x, y, z)
    item.castShadow = true
    item.receiveShadow = true
    if (name) item.name = name
    parent.add(item)
    return item
  }
  function box(
    parent: THREE.Object3D,
    surface: THREE.Material,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    name?: string,
  ) {
    const item = mesh(parent, unitBox, surface, x, y, z, name)
    item.scale.set(width, height, depth)
    return item
  }
  function roundedShape(width: number, depth: number, radius: number) {
    const shape = new THREE.Shape()
    const x = -width / 2
    const z = -depth / 2
    shape.moveTo(x + radius, z)
    shape.lineTo(x + width - radius, z)
    shape.quadraticCurveTo(x + width, z, x + width, z + radius)
    shape.lineTo(x + width, z + depth - radius)
    shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth)
    shape.lineTo(x + radius, z + depth)
    shape.quadraticCurveTo(x, z + depth, x, z + depth - radius)
    shape.lineTo(x, z + radius)
    shape.quadraticCurveTo(x, z, x + radius, z)
    return shape
  }
  function slab(
    parent: THREE.Object3D,
    surface: THREE.Material,
    width: number,
    depth: number,
    thickness: number,
    radius: number,
    y: number,
    name: string,
  ) {
    const shape = geometry(
      new THREE.ExtrudeGeometry(roundedShape(width, depth, radius), {
        depth: thickness,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.018,
        bevelSegments: 2,
        curveSegments: 8,
        steps: 1,
      }),
    )
    shape.rotateX(-Math.PI / 2)
    return mesh(parent, shape, surface, 0, y, 0, name)
  }
  function labelTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) {
    if (typeof document === 'undefined') return undefined
    const image = document.createElement('canvas')
    image.width = width
    image.height = height
    const ctx = image.getContext('2d')
    if (!ctx) return undefined
    draw(ctx)
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    textures.add(texture)
    return texture
  }
  function print(
    parent: THREE.Object3D,
    width: number,
    depth: number,
    y: number,
    texture: THREE.CanvasTexture | undefined,
  ) {
    if (!texture) return
    const ink = material(
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    )
    const plane = mesh(
      parent,
      geometry(new THREE.PlaneGeometry(width, depth)),
      ink,
      0,
      y,
      0,
      'Serigrafía original',
    )
    plane.rotation.x = -Math.PI / 2
    plane.castShadow = false
    plane.receiveShadow = false
    return plane
  }
  const matrix = new THREE.Matrix4()
  function repeated(
    parent: THREE.Object3D,
    shape: THREE.BufferGeometry,
    surface: THREE.Material,
    positions: Array<[number, number, number]>,
    name: string,
  ) {
    const batch = new THREE.InstancedMesh(shape, surface, positions.length)
    positions.forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z)
      batch.setMatrixAt(index, matrix)
    })
    batch.instanceMatrix.needsUpdate = true
    batch.castShadow = true
    batch.receiveShadow = true
    batch.name = name
    instances.add(batch)
    parent.add(batch)
    return batch
  }
  function tube(
    parent: THREE.Object3D,
    surface: THREE.Material,
    points: number[][],
    radius: number,
    name: string,
  ) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    const item = mesh(
      parent,
      geometry(new THREE.TubeGeometry(curve, 40, radius, 8, false)),
      surface,
      0,
      0,
      0,
      name,
    )
    if (name.startsWith('Terminal ')) {
      item.userData = {
        freeLead: true,
        pinId: name.slice(9),
        bodyAnchor: [...(points[0] ?? [0, 0, 0])],
      }
    }
    return item
  }
  const traceMaterial = material(
    new THREE.LineBasicMaterial({ color: '#47958a', transparent: true, opacity: 0.44 }),
  )
  function traces(parent: THREE.Object3D, width: number, count: number) {
    const vertices: number[] = []
    for (let i = 0; i < count; i++) {
      const z = -1.8 + i * 0.24
      const sign = i % 2 ? 1 : -1
      const x = sign * width * 0.43
      vertices.push(
        x,
        0.153,
        z,
        x * 0.65,
        0.153,
        z,
        x * 0.65,
        0.153,
        z,
        x * 0.43,
        0.153,
        z + 0.2,
        x * 0.43,
        0.153,
        z + 0.2,
        sign * 0.3,
        0.153,
        z + 0.2,
      )
    }
    const lines = new THREE.LineSegments(
      geometry(
        new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.Float32BufferAttribute(vertices, 3),
        ),
      ),
      traceMaterial,
    )
    parent.add(lines)
  }
  function usb(parent: THREE.Object3D, x: number, z: number, wide = false) {
    const width = wide ? 0.95 : 0.74
    box(parent, brushedMetal, x, 0.34, z, width, 0.4, 0.65, 'Carcasa USB')
    box(parent, holeMaterial, x, 0.34, z + 0.332, width - 0.13, 0.23, 0.016, 'Apertura USB')
    box(parent, graphite, x, 0.315, z + 0.345, width - 0.3, 0.095, 0.022)
    for (let i = 0; i < 5; i++)
      box(parent, gold, x - 0.19 + i * 0.095, 0.315, z + 0.36, 0.027, 0.027, 0.02)
    box(parent, metal, x - width / 2 - 0.04, 0.19, z, 0.12, 0.07, 0.32)
    box(parent, metal, x + width / 2 + 0.04, 0.19, z, 0.12, 0.07, 0.32)
  }
  function button(parent: THREE.Object3D, x: number, z: number, name: string) {
    box(parent, metal, x, 0.21, z, 0.37, 0.13, 0.36)
    mesh(
      parent,
      geometry(new THREE.CylinderGeometry(0.105, 0.105, 0.1, 16)),
      graphite,
      x,
      0.32,
      z,
      name,
    )
  }
  function smd(parent: THREE.Object3D, x: number, z: number, angle = 0, capacitor = false) {
    const part = new THREE.Group()
    part.position.set(x, 0.2, z)
    part.rotation.y = angle
    parent.add(part)
    box(
      part,
      capacitor ? ceramic : chip,
      0,
      0,
      0,
      0.11,
      0.09,
      0.2,
      capacitor ? 'Condensador SMD' : 'Resistencia SMD',
    )
    box(part, solder, 0, 0, -0.11, 0.115, 0.09, 0.05)
    box(part, solder, 0, 0, 0.11, 0.115, 0.09, 0.05)
  }
  function mountingRing(parent: THREE.Object3D, x: number, z: number) {
    const ring = mesh(
      parent,
      geometry(new THREE.TorusGeometry(0.105, 0.027, 6, 20)),
      gold,
      x,
      0.155,
      z,
      'Anillo de montaje',
    )
    ring.rotation.x = Math.PI / 2
    mesh(
      parent,
      geometry(new THREE.CylinderGeometry(0.079, 0.079, 0.008, 16)),
      holeMaterial,
      x,
      0.151,
      z,
    )
  }
  const tools: ModelTools = {
    params,
    group,
    anchors,
    geometry,
    material,
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
    ceramic,
    holeMaterial,
  }
  let contactPicking: ProjectModel['contactPicking']
  if (buildFamilyModel(typeId, tools)) {
    // Family builders own their catalog geometry; never substitute generic fallback bodies.
  } else if (typeId === 'esp32') {
    const pcbGreen = standard('#174f49', 0.47, 0.15)
    const esp = group
    slab(esp, pcbGreen, 3.05, 5.65, 0.13, 0.2, 0, 'PCB ESP32 redondeada')
    traces(esp, 3.05, 16)
    const espPads: Array<[number, number, number]> = []
    const espPins: Array<[number, number, number]> = []
    for (const side of [-1, 1]) {
      box(esp, graphite, side * 1.32, -0.08, 0, 0.21, 0.2, 4.9, 'Separador de pines')
      for (let i = 0; i < 19; i++) {
        const z = -2.34 + i * 0.26
        espPads.push([side * 1.32, 0.146, z])
        espPins.push([side * 1.32, -0.05, z])
      }
    }
    repeated(esp, padGeometry, gold, espPads, '38 pads dorados')
    repeated(esp, pinGeometry, pinMetal, espPins, '38 pines de sección cuadrada')
    box(esp, graphite, 0, 0.22, -1.05, 1.89, 0.16, 2.59, 'Módulo de radio')
    const shield = slab(esp, brushedMetal, 1.8, 1.86, 0.25, 0.09, 0.29, 'Blindaje metálico')
    // Move only the shield, leaving its local label plane aligned below.
    shield.position.z = -0.81
    box(esp, chip, 0, 0.31, -2.24, 1.78, 0.09, 0.65, 'Zona de antena')
    const antennaPoints: number[][] = []
    for (let i = 0; i < 8; i++) {
      const x = -0.7 + i * 0.2
      antennaPoints.push([x, 0.368, i % 2 ? -2.4 : -2.08], [x + 0.15, 0.368, i % 2 ? -2.4 : -2.08])
    }
    const antenna = new THREE.Line(
      geometry(
        new THREE.BufferGeometry().setFromPoints(
          antennaPoints.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
        ),
      ),
      material(new THREE.LineBasicMaterial({ color: '#d3b570' })),
    )
    antenna.name = 'Antena meandro ilustrativa'
    esp.add(antenna)
    box(esp, chip, 0, 0.25, 1.04, 0.61, 0.22, 0.64, 'Controlador USB')
    for (let i = 0; i < 8; i++) {
      box(esp, solder, -0.35, 0.22, 0.79 + i * 0.07, 0.12, 0.035, 0.035)
      box(esp, solder, 0.35, 0.22, 0.79 + i * 0.07, 0.12, 0.035, 0.035)
    }
    for (let i = 0; i < 12; i++)
      smd(esp, i % 2 ? 0.73 : -0.76, 0.4 + Math.floor(i / 2) * 0.3, Math.PI / 2, i % 3 === 0)
    usb(esp, 0, 2.62)
    button(esp, -0.88, 2.34, 'Bouton EN')
    button(esp, 0.88, 2.34, 'Bouton BOOT')
    mountingRing(esp, -1.14, -2.56)
    mountingRing(esp, 1.14, -2.56)
    const espPrint = labelTexture(768, 1536, (ctx) => {
      ctx.fillStyle = '#d5e8dd'
      ctx.textAlign = 'center'
      ctx.font = '600 47px monospace'
      ctx.fillText('NEXO / 32', 384, 860)
      ctx.font = '24px monospace'
      ctx.fillText('DEV BOARD · ILLUSTRATIVE', 384, 908)
      ctx.font = 'bold 25px monospace'
      ctx.fillText('EN', 162, 1437)
      ctx.fillText('BOOT', 605, 1437)
      const left = [
        '3V3',
        'EN',
        'VP',
        'VN',
        '34',
        '35',
        '32',
        '33',
        '25',
        '26',
        '27',
        '14',
        '12',
        'GND',
        '13',
        'D2',
        'D3',
        'CMD',
        '5V',
      ]
      const right = [
        'GND',
        '23',
        '22',
        'TX',
        'RX',
        '21',
        'GND',
        '19',
        '18',
        '5',
        '17',
        '16',
        '4',
        '0',
        '2',
        '15',
        'D1',
        'D0',
        'CLK',
      ]
      ctx.font = '22px monospace'
      for (let i = 0; i < 19; i++) {
        const y = 132 + i * 70.7
        const leftLabel = left[i]
        const rightLabel = right[i]
        if (leftLabel) {
          ctx.textAlign = 'left'
          ctx.fillText(leftLabel, 87, y)
        }
        if (rightLabel) {
          ctx.textAlign = 'right'
          ctx.fillText(rightLabel, 681, y)
        }
      }
      ctx.strokeStyle = '#a9cbbc'
      ctx.lineWidth = 3
      ctx.strokeRect(218, 783, 332, 154)
    })
    print(esp, 3.05, 5.65, 0.156, espPrint)
    const shieldPrint = labelTexture(512, 512, (ctx) => {
      ctx.fillStyle = '#34484b'
      ctx.textAlign = 'center'
      ctx.font = 'bold 52px monospace'
      ctx.fillText('ESP32', 256, 166)
      ctx.font = '26px monospace'
      ctx.fillText('RADIO MODULE', 256, 224)
      ctx.font = '22px monospace'
      ctx.fillText('2.4 GHz / Wi-Fi + BLE', 256, 284)
      ctx.fillText('ILLUSTRATIVE MODEL', 256, 373)
    })
    const shieldLabel = print(esp, 1.6, 1.65, 0.561, shieldPrint)
    if (shieldLabel) shieldLabel.position.z = -0.81
    const at = (side: number, index: number) =>
      new THREE.Vector3(side * 1.32, 0.156, -2.34 + index * 0.26)
    anchors['3V3'] = at(-1, 0)
    anchors.GND = at(1, 0)
    anchors.GPIO2 = at(1, 14)
    anchors.GPIO4 = at(1, 12)
    anchors.GPIO34 = at(-1, 4)
  } else if (typeId === 'arduino_uno') {
    const pcbBlue = standard('#166078', 0.47, 0.13)
    const uno = group
    slab(uno, pcbBlue, 4.3, 5.8, 0.13, 0.2, 0, 'PCB UNO ilustrativa')
    traces(uno, 4.3, 17)
    const socketShape = geometry(new THREE.CylinderGeometry(0.044, 0.044, 0.008, 10))
    const sockets: Array<[number, number, number]> = []
    const unoPadPositions: Array<[number, number, number]> = []
    for (const side of [-1, 1]) {
      box(uno, graphite, side * 1.89, 0.31, -0.15, 0.3, 0.35, 4.59, 'Conector hembra')
      for (let i = 0; i < 16; i++) {
        sockets.push([side * 1.89, 0.489, -2.25 + i * 0.28])
        unoPadPositions.push([side * 1.89, 0.14, -2.25 + i * 0.28])
      }
    }
    repeated(uno, socketShape, holeMaterial, sockets, 'Aperturas de headers')
    repeated(uno, padGeometry, gold, unoPadPositions, 'Pads de headers')
    box(uno, chip, 0.42, 0.31, 0.42, 0.76, 0.3, 2.58, 'Microcontrolador DIP ilustrativo')
    for (const side of [-1, 1])
      for (let i = 0; i < 14; i++) {
        box(uno, solder, 0.42 + side * 0.46, 0.22, -0.75 + i * 0.18, 0.2, 0.07, 0.065)
      }
    usb(uno, -0.92, 2.56, true)
    const barrel = mesh(
      uno,
      geometry(new THREE.CylinderGeometry(0.32, 0.32, 0.84, 24)),
      graphite,
      1.18,
      0.45,
      2.45,
      'Conector de alimentación',
    )
    barrel.rotation.x = Math.PI / 2
    const barrelOpening = mesh(
      uno,
      geometry(new THREE.RingGeometry(0.13, 0.245, 24)),
      metal,
      1.18,
      0.45,
      2.88,
    )
    box(uno, graphite, 1.18, 0.25, 2.34, 0.66, 0.28, 0.85)
    barrelOpening.castShadow = false
    button(uno, -1.18, -2.24, 'RESET')
    for (let i = 0; i < 9; i++)
      smd(uno, -0.75 + (i % 3) * 0.38, -1.75 + Math.floor(i / 3) * 0.35, 0, i % 2 === 0)
    box(uno, metal, -0.82, 0.27, 0.19, 0.28, 0.21, 0.72, 'Cristal oscilador')
    mesh(
      uno,
      geometry(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 20)),
      metal,
      1.25,
      0.37,
      1.84,
      'Condensador electrolítico',
    )
    for (const x of [-1.65, 1.65]) mountingRing(uno, x, -2.6)
    print(
      uno,
      4.3,
      5.8,
      0.157,
      labelTexture(1024, 1536, (ctx) => {
        ctx.fillStyle = '#def2eb'
        ctx.textAlign = 'center'
        ctx.font = 'bold 92px monospace'
        ctx.fillText('UNO', 510, 330)
        ctx.font = '29px monospace'
        ctx.fillText('NEXO / OPEN HARDWARE STUDY', 510, 392)
        ctx.font = '24px monospace'
        ctx.fillText('ILLUSTRATIVE · NOT TO SCALE', 510, 449)
        ctx.font = 'bold 27px monospace'
        ctx.save()
        ctx.translate(182, 780)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText('DIGITAL / PWM', 0, 0)
        ctx.restore()
        ctx.save()
        ctx.translate(846, 780)
        ctx.rotate(Math.PI / 2)
        ctx.fillText('ANALOG IN / POWER', 0, 0)
        ctx.restore()
        ctx.font = '26px monospace'
        ctx.fillText('RESET', 230, 123)
        ctx.fillText('USB', 285, 1290)
        ctx.fillText('DC IN', 800, 1290)
      }),
    )
    // Explicit logical subset on an illustrative header arrangement, not an UNO pinout claim.
    const at = (side: number, index: number) =>
      new THREE.Vector3(side * 1.89, 0.495, -2.25 + index * 0.28)
    anchors['5V'] = at(1, 10)
    anchors.GND = at(1, 11)
    anchors.D13 = at(-1, 3)
    anchors.D9 = at(-1, 7)
    anchors.A0 = at(1, 4)
    anchors.SDA = at(-1, 1)
    anchors.SCL = at(-1, 0)
    anchors.TX = at(-1, 14)
    anchors.RX = at(-1, 15)
  } else if (typeId === 'led') {
    const leadGeometry = geometry(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10))
    const led = group
    led.name = 'LED · previsualización manual, no simulación'
    for (const x of [-0.12, 0.12]) {
      const terminal = mesh(
        led,
        leadGeometry,
        solder,
        x,
        0.32,
        0,
        `Terminal ${x < 0 ? 'anode' : 'cathode'}`,
      )
      terminal.userData = {
        freeLead: true,
        pinId: x < 0 ? 'anode' : 'cathode',
        bodyAnchor: [x, 0.66, 0],
      }
    }
    const ledSurface = material(
      new THREE.MeshPhysicalMaterial({
        color: '#e26835',
        roughness: 0.2,
        metalness: 0,
        transparent: true,
        opacity: 0.76,
        transmission: 0.35,
        thickness: 0.45,
        ior: 1.48,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
        emissive: '#ff5a19',
        emissiveIntensity: 0.02,
      }),
    )
    mesh(
      led,
      geometry(new THREE.CylinderGeometry(0.24, 0.24, 0.09, 32)),
      ledSurface,
      0,
      0.66,
      0,
      'Base de LED',
    )
    mesh(
      led,
      geometry(new THREE.CylinderGeometry(0.205, 0.205, 0.32, 32)),
      ledSurface,
      0,
      0.83,
      0,
      'Cuerpo translúcido',
    )
    const dome = geometry(new THREE.SphereGeometry(0.205, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2))
    mesh(led, dome, ledSurface, 0, 0.99, 0, 'Domo de LED')
    const dieSurface = material(
      new THREE.MeshStandardMaterial({
        color: '#e8bca4',
        emissive: '#ff7436',
        emissiveIntensity: 0,
      }),
    )
    box(led, metal, -0.07, 0.78, 0, 0.065, 0.22, 0.07)
    box(led, dieSurface, 0.04, 0.83, 0, 0.12, 0.07, 0.12, 'Dado emisor')
    anchors.anode = new THREE.Vector3(-0.12, -0.04, 0)
    anchors.cathode = new THREE.Vector3(0.12, -0.04, 0)
  } else if (typeId === 'resistor') {
    const resistor = new THREE.Group()
    group.add(resistor)
    resistor.rotation.z = Math.PI / 2
    resistor.position.y = 0.26
    const resistorBody = geometry(new THREE.CapsuleGeometry(0.115, 0.5, 5, 16))
    // The axial body and four colored bands are separate, reusable primitives.
    mesh(
      resistor,
      geometry(new THREE.CylinderGeometry(0.024, 0.024, 1.06, 10)),
      solder,
      0,
      0,
      0,
      'Alambre axial',
    )
    mesh(resistor, resistorBody, ceramic, 0, 0, 0, 'Cuerpo cerámico')
    const bandGeometry = geometry(new THREE.CylinderGeometry(0.117, 0.117, 0.055, 20))
    ;['#92522e', '#171b20', '#c24330', '#c6a854'].forEach((color, i) => {
      mesh(
        resistor,
        bandGeometry,
        standard(color, 0.65),
        0,
        -0.22 + i * 0.14,
        0,
        'Banda de resistencia',
      )
    })
    tube(
      group,
      solder,
      [
        [-0.53, 0.26, 0],
        [-0.82, 0.26, 0],
        [-0.92, 0.14, 0],
        [-0.92, 0, 0],
      ],
      0.024,
      'Terminal a',
    )
    tube(
      group,
      solder,
      [
        [0.53, 0.26, 0],
        [0.82, 0.26, 0],
        [0.92, 0.14, 0],
        [0.92, 0, 0],
      ],
      0.024,
      'Terminal b',
    )
    anchors.a = new THREE.Vector3(-0.92, 0, 0)
    anchors.b = new THREE.Vector3(0.92, 0, 0)
  } else if (typeId !== 'dc_source' && typeId !== 'gnd_ref') {
    contactPicking = buildPhysicalModel(typeId, {
      group,
      anchors,
      geometry,
      material,
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
      ceramic,
      holeMaterial,
    })
  } else {
    const ink = material(new THREE.LineBasicMaterial({ color: '#315a63' }))
    const vertices: number[] = []
    const stroke = (x1: number, z1: number, x2: number, z2: number) => {
      vertices.push(x1, 0.035, z1, x2, 0.035, z2)
    }
    if (typeId === 'dc_source') {
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2
        const b = ((i + 1) / 64) * Math.PI * 2
        stroke(Math.cos(a) * 0.68, Math.sin(a) * 0.68, Math.cos(b) * 0.68, Math.sin(b) * 0.68)
      }
      stroke(-1.12, 0, -0.68, 0)
      stroke(0.68, 0, 1.12, 0)
      stroke(-0.38, 0, -0.14, 0)
      stroke(-0.26, -0.12, -0.26, 0.12)
      stroke(0.14, 0, 0.38, 0)
      anchors.positive = new THREE.Vector3(-1.12, 0.035, 0)
      anchors.negative = new THREE.Vector3(1.12, 0.035, 0)
    } else {
      stroke(0, -0.72, 0, -0.12)
      stroke(-0.6, -0.12, 0.6, -0.12)
      stroke(-0.39, 0.12, 0.39, 0.12)
      stroke(-0.17, 0.36, 0.17, 0.36)
      anchors.gnd = new THREE.Vector3(0, 0.035, -0.72)
    }
    const symbol = new THREE.LineSegments(
      geometry(
        new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.Float32BufferAttribute(vertices, 3),
        ),
      ),
      ink,
    )
    symbol.name =
      typeId === 'dc_source' ? 'Símbolo fuente DC · sin simulación' : 'Símbolo referencia GND'
    group.add(symbol)
    const title = print(
      group,
      1.8,
      0.32,
      0.038,
      labelTexture(576, 96, (ctx) => {
        ctx.fillStyle = '#315a63'
        ctx.textAlign = 'center'
        ctx.font = 'bold 34px monospace'
        ctx.fillText(typeId === 'dc_source' ? 'FUENTE DC' : 'GND · 0 V', 288, 62)
      }),
    )
    if (title) title.position.z = 0.94
  }

  // Labels describe the actual exported subset; decorative header cavities are not pins.
  for (const [pinId, anchor] of typeId === 'breadboard' ? [] : Object.entries(anchors)) {
    const board = typeId === 'esp32' || typeId === 'arduino_uno'
    const width = board ? 0.62 : 0.72
    const annotation = print(
      group,
      width,
      0.16,
      anchor.y + 0.027,
      labelTexture(384, 96, (ctx) => {
        ctx.fillStyle = board ? '#e3f1df' : '#315a63'
        ctx.textAlign = 'center'
        ctx.font = 'bold 44px monospace'
        ctx.fillText(pinId, 192, 64)
      }),
    )
    if (annotation) {
      annotation.name = `Pin lógico ${pinId} · posición ilustrativa`
      annotation.position.x = anchor.x + (board ? -Math.sign(anchor.x) * 0.47 : 0)
      annotation.position.z = anchor.z + (board ? 0 : pinId === 'anode' ? -0.28 : 0.28)
    }
  }

  // Normalize the whole visible model to XZ center / Y bottom, including all labels.
  group.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(group)
  const offset = new THREE.Vector3(
    -(bounds.min.x + bounds.max.x) / 2,
    -bounds.min.y,
    -(bounds.min.z + bounds.max.z) / 2,
  )
  // Breadboard coordinates are a public topology contract, already centered and floor-aligned.
  if (typeId !== 'breadboard') {
    for (const child of group.children) child.position.add(offset)
    for (const anchor of Object.values(anchors)) anchor.add(offset)
    group.traverse((child) => {
      const point = child.userData.bodyAnchor as [number, number, number] | undefined
      if (point)
        child.userData.bodyAnchor = [point[0] + offset.x, point[1] + offset.y, point[2] + offset.z]
      if (child.name === 'Alambre axial') child.userData.freeLead = true
    })
  }
  group.updateMatrixWorld(true)
  let disposed = false
  return {
    group,
    anchors,
    ...(contactPicking ? { contactPicking } : {}),
    dispose() {
      if (disposed) return
      disposed = true
      group.removeFromParent()
      instances.forEach((item) => {
        item.dispose()
      })
      geometries.forEach((item) => {
        item.dispose()
      })
      materials.forEach((item) => {
        item.dispose()
      })
      textures.forEach((item) => {
        item.dispose()
      })
      group.clear()
      instances.clear()
      geometries.clear()
      materials.clear()
      textures.clear()
    },
  }
}
