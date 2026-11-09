import type { PinEndpoint } from '@circuitforge/netlist'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { frameCameraBounds } from './cameraFraming'
import { createProjectLayer } from './editor3d'
import type { ProjectSnapshot } from './projectController'

export interface ProjectSceneActions {
  onSelect(id: string | null): void
  onPin(endpoint: PinEndpoint): void
  onDragStart(id: string): void
  onDragPreview(position: { x: number; y: number }): void
  onDragCommit(): void
  onDragCancel(): void
}

export type SceneAPI = ReturnType<typeof createElectronicsScene>

type SceneMode = 'hero' | 'lab'
type BoardKind = 'esp32' | 'uno'

/** Original, illustrative geometry: not a dimensionally accurate hardware model or simulator. */
export function createElectronicsScene(
  host: HTMLElement,
  actions?: ProjectSceneActions,
): {
  updateProject(snapshot: ProjectSnapshot): void
  cancelGesture(): void
  locateProject(id: string): void
  frameProject(): void
  setMode(mode: SceneMode): void
  setBoard(board: BoardKind): void
  setLed(on: boolean): void
  setView(view: 'perspective' | 'top'): void
  locate(id: 'esp32' | 'uno' | 'breadboard' | 'led' | 'resistor' | 'wire'): void
  reset(): void
  dispose(): void
} {
  let disposed = false
  let mode: SceneMode = 'hero'
  let view: 'perspective' | 'top' = 'perspective'
  const fallback = document.createElement('p')
  fallback.setAttribute('role', 'status')
  fallback.textContent =
    'La vista 3D necesita WebGL. Puedes seguir trabajando con los controles del proyecto.'
  Object.assign(fallback.style, {
    padding: '24px',
    margin: '0',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'center',
  })
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    })
  } catch {
    host.append(fallback)
    return {
      updateProject() {},
      cancelGesture() {},
      locateProject() {},
      frameProject() {},
      setMode() {},
      setBoard() {},
      setLed() {},
      setView() {},
      locate() {},
      reset() {},
      dispose() {
        disposed = true
        fallback.remove()
      },
    }
  }

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
  const ivory = standard('#e9e4d9', 0.73)
  const holeMaterial = standard('#343c41', 0.95)
  const copper = standard('#be7448', 0.39, 0.7)
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1))
  const pinGeometry = geometry(new THREE.BoxGeometry(0.045, 0.66, 0.045))
  const padGeometry = geometry(new THREE.CylinderGeometry(0.092, 0.092, 0.018, 16))
  const holeGeometry = geometry(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 10))
  const scene = new THREE.Scene()
  // Bake one small, asset-free studio map. It lights metals, not the transparent background.
  let environmentTarget: THREE.WebGLRenderTarget | undefined
  function refreshEnvironment() {
    const room = new RoomEnvironment()
    const generator = new THREE.PMREMGenerator(renderer)
    try {
      const next = generator.fromScene(room, 0.06, 0.1, 100, { size: 128 })
      scene.environment = next.texture
      environmentTarget?.dispose()
      environmentTarget = next
    } finally {
      room.traverse((item) => {
        if (item instanceof THREE.InstancedMesh) item.dispose()
      })
      room.dispose()
      generator.dispose()
    }
  }
  scene.environmentIntensity = 0.7
  const assembly = new THREE.Group()
  scene.add(assembly)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  refreshEnvironment()
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute(
    'aria-label',
    'Modelo 3D ilustrativo de una placa ESP32 y un circuito con protoboard, resistencia y LED. Arrastra o usa las flechas para girar. Inicio restaura la cámara; Ctrl o Cmd más rueda cambia el zoom.',
  )
  canvas.tabIndex = 0
  Object.assign(canvas.style, {
    display: 'block',
    width: '100%',
    height: '100%',
    touchAction: 'pan-y',
  })
  host.append(canvas)

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
    const image = document.createElement('canvas')
    image.width = width
    image.height = height
    const ctx = image.getContext('2d')
    if (!ctx) return undefined
    draw(ctx)
    const texture = new THREE.CanvasTexture(image)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
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
    return mesh(
      parent,
      geometry(new THREE.TubeGeometry(curve, 40, radius, 8, false)),
      surface,
      0,
      0,
      0,
      name,
    )
  }

  scene.add(new THREE.HemisphereLight('#e6f0f5', '#716c61', 0.9))
  const key = new THREE.DirectionalLight('#fff3e2', 2.8)
  key.position.set(-3, 10, 4)
  key.castShadow = true
  // A wider texel footprint softens PCF contact shadows without extra render passes.
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 })
  key.shadow.normalBias = 0.012
  key.shadow.bias = -0.00008
  key.shadow.radius = 2
  scene.add(key)
  const rim = new THREE.DirectionalLight('#d7e7e8', 0.9)
  rim.position.set(5, 5, -7)
  scene.add(rim)
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.65)
  fill.position.set(7, 3, 7)
  scene.add(fill)
  const shadow = mesh(
    scene,
    geometry(new THREE.PlaneGeometry(36, 36)),
    material(new THREE.ShadowMaterial({ color: '#202b2e', opacity: 0.2 })),
    0,
    0.005,
    0,
    'Sombras de contacto de estudio',
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.castShadow = false

  const boards: Record<BoardKind, THREE.Group> = {
    esp32: new THREE.Group(),
    uno: new THREE.Group(),
  }
  for (const [kind, group] of Object.entries(boards)) {
    group.name = `${kind.toUpperCase()} · representación ilustrativa`
    group.position.set(-1.9, 0.395, -0.35)
    assembly.add(group)
  }
  const pcbGreen = standard('#174f49', 0.47, 0.15)
  const pcbBlue = standard('#166078', 0.47, 0.13)
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

  const esp = boards.esp32
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
      if (leftLabel !== undefined) {
        ctx.textAlign = 'left'
        ctx.fillText(leftLabel, 87, y)
      }
      if (rightLabel !== undefined) {
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

  const uno = boards.uno
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
  uno.visible = false

  const breadboard = new THREE.Group()
  breadboard.name = 'Protoboard de demostración'
  breadboard.position.set(2.27, 0.05, 0.43)
  assembly.add(breadboard)
  slab(breadboard, ivory, 2.65, 4.7, 0.32, 0.2, 0, 'Cuerpo de protoboard')
  box(breadboard, standard('#c7c6bd', 0.92), 0, 0.33, 0, 0.14, 0.011, 4.2, 'Canal central')
  const holes: Array<[number, number, number]> = []
  const rims: Array<[number, number, number]> = []
  const holeRimGeometry = geometry(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 12))
  for (let row = 0; row < 25; row++) {
    const z = -1.92 + row * 0.16
    for (const side of [-1, 1]) {
      for (let column = 0; column < 5; column++) {
        const x = side * (0.24 + column * 0.16)
        holes.push([x, 0.34, z])
        rims.push([x, 0.333, z])
      }
      holes.push([side * 1.11, 0.34, z])
      rims.push([side * 1.11, 0.333, z])
    }
  }
  repeated(breadboard, holeRimGeometry, standard('#b9b9af', 0.9), rims, 'Rebajes de 300 contactos')
  repeated(breadboard, holeGeometry, holeMaterial, holes, '300 cavidades de contactos')
  print(
    breadboard,
    2.65,
    4.7,
    0.348,
    labelTexture(768, 1280, (ctx) => {
      ctx.lineWidth = 5
      ctx.strokeStyle = '#d46e57'
      ctx.beginPath()
      ctx.moveTo(31, 85)
      ctx.lineTo(31, 1185)
      ctx.stroke()
      ctx.strokeStyle = '#6888a4'
      ctx.beginPath()
      ctx.moveTo(737, 85)
      ctx.lineTo(737, 1185)
      ctx.stroke()
      ctx.fillStyle = '#778482'
      ctx.textAlign = 'center'
      ctx.font = '26px monospace'
      ctx.fillText('+', 31, 57)
      ctx.fillText('−', 737, 57)
      ctx.fillText('a b c d e', 222, 65)
      ctx.fillText('f g h i j', 548, 65)
      ctx.font = '22px monospace'
      for (let row = 0; row < 25; row += 5) {
        const y = 117 + row * 43.57
        ctx.fillText(String(row + 1), 383, y)
      }
      ctx.font = '24px monospace'
      ctx.fillText('NEXO / MINI BREADBOARD', 384, 1246)
    }),
  )

  const leadGeometry = geometry(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10))
  const led = new THREE.Group()
  led.name = 'LED · previsualización manual, no simulación'
  led.position.set(2.64, 0.39, 0.38)
  assembly.add(led)
  for (const x of [-0.12, 0.12]) mesh(led, leadGeometry, solder, x, 0.32, 0)
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
    new THREE.MeshStandardMaterial({ color: '#e8bca4', emissive: '#ff7436', emissiveIntensity: 0 }),
  )
  box(led, metal, -0.07, 0.78, 0, 0.065, 0.22, 0.07)
  box(led, dieSurface, 0.04, 0.83, 0, 0.12, 0.07, 0.12, 'Dado emisor')
  const ledLight = new THREE.PointLight('#ff7842', 0, 2.4, 2)
  ledLight.position.set(0, 1.04, 0)
  led.add(ledLight)

  const resistor = new THREE.Group()
  resistor.position.set(2.2, 0.63, 1.1)
  resistor.rotation.z = Math.PI / 2
  resistor.name = 'Resistencia axial · bandas ilustrativas'
  assembly.add(resistor)
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
    assembly,
    solder,
    [
      [1.68, 0.63, 1.1],
      [1.54, 0.63, 1.1],
      [1.54, 0.49, 1.1],
      [1.54, 0.39, 1.1],
    ],
    0.024,
    'Terminal de resistencia',
  )
  tube(
    assembly,
    solder,
    [
      [2.72, 0.63, 1.1],
      [2.95, 0.63, 1.1],
      [2.95, 0.48, 1.1],
      [2.95, 0.39, 1.1],
    ],
    0.024,
    'Terminal de resistencia',
  )
  const red = standard('#d24c3c', 0.4)
  const black = standard('#283139', 0.56)
  const teal = standard('#2b9690', 0.43)
  const wireGroup = new THREE.Group()
  wireGroup.name = 'Cables de conexión ilustrativos'
  assembly.add(wireGroup)
  tube(
    wireGroup,
    red,
    [
      [-0.58, 0.73, 1.47],
      [-0.22, 1.31, 1.7],
      [0.7, 1.48, 2.0],
      [1.16, 0.7, 1.7],
      [1.16, 0.43, 1.55],
    ],
    0.048,
    'Jumper rojo',
  )
  tube(
    wireGroup,
    black,
    [
      [-0.58, 0.72, -0.87],
      [0.2, 1.06, -1.78],
      [2.18, 0.85, -1.98],
      [3.38, 0.7, -1.26],
      [3.38, 0.43, -0.85],
    ],
    0.046,
    'Jumper de retorno negro',
  )
  tube(
    wireGroup,
    teal,
    [
      [-0.58, 0.72, 0.17],
      [0.14, 1.53, -0.2],
      [1.65, 1.32, -0.12],
      [2.51, 0.7, 0.38],
      [2.51, 0.43, 0.38],
    ],
    0.045,
    'Jumper de señal verde',
  )
  const dupontPositions: Array<[number, number]> = [
    [1.16, 1.55],
    [3.38, -0.85],
    [2.51, 0.38],
  ]
  for (const [x, z] of dupontPositions) {
    box(wireGroup, graphite, x, 0.54, z, 0.13, 0.25, 0.13, 'Terminal Dupont')
    mesh(
      wireGroup,
      geometry(new THREE.CylinderGeometry(0.021, 0.021, 0.15, 8)),
      copper,
      x,
      0.41,
      z,
      'Cobre expuesto',
    )
  }

  // Direct manipulation only: no inertia, autorotation or decorative motion,
  // including when the user requests reduced motion.
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = false
  controls.enablePan = false
  controls.enableZoom = true
  controls.autoRotate = false
  controls.minDistance = 7
  controls.maxDistance = 25
  controls.minPolarAngle = 0.18
  controls.maxPolarAngle = Math.PI / 2 - 0.045
  controls.rotateSpeed = 0.7
  controls.zoomSpeed = 0.7
  // Keep document scrolling available; zoom is an explicit Ctrl/Meta + wheel gesture.
  controls.enableZoom = false
  let projectLayer: ReturnType<typeof createProjectLayer> | null = null
  let framedComponent: string | undefined
  let hasProjectSnapshot = false
  let frame = 0
  let intersecting = true
  let contextLost = false
  let drawing = false
  let width = 1
  let height = 1
  let resizeObserver: ResizeObserver | undefined
  let intersectionObserver: IntersectionObserver | undefined

  function invalidate() {
    if (disposed || contextLost || drawing || frame || !intersecting || document.hidden) return
    frame = window.requestAnimationFrame(render)
  }
  function render() {
    frame = 0
    if (disposed || contextLost || !intersecting || document.hidden) return
    drawing = true
    controls.update()
    renderer.render(scene, camera)
    drawing = false
  }
  function frameCamera() {
    const portrait = width / height < 0.95
    const lab = mode === 'lab'
    const top = view === 'top'
    const target =
      lab || top ? new THREE.Vector3(0.15, 0.45, 0.1) : new THREE.Vector3(-0.05, 0.4, 0.1)
    // Keep a small z offset to avoid a lookAt direction collinear with camera.up.
    const direction = top
      ? new THREE.Vector3(0, 16.55, 0.01)
      : lab
        ? new THREE.Vector3(7.4, 12.4, 9.5)
        : new THREE.Vector3(9.8, 11.4, 12.4)
    controls.minPolarAngle = top ? 0.0001 : 0.18
    framedComponent = undefined
    if (lab && projectLayer) {
      camera.position.copy(controls.target).add(direction)
      projectLayer.frameProject()
      return
    }
    const fit = portrait ? Math.min(2.2, 0.95 / Math.max(width / height, 0.3)) : 1
    direction.multiplyScalar(fit)
    controls.target.copy(target)
    camera.position.copy(target).add(direction)
    controls.minDistance = 7
    controls.maxDistance = Math.max(25, direction.length() * 1.4)
    camera.updateProjectionMatrix()
    controls.update()
    invalidate()
  }
  function resize() {
    if (disposed) return
    const rect = host.getBoundingClientRect()
    const nextWidth = Math.max(1, Math.round(rect.width || host.clientWidth || 1))
    const nextHeight = Math.max(1, Math.round(rect.height || host.clientHeight || 1))
    const previousAspect = width / height
    const nextAspect = nextWidth / nextHeight
    width = nextWidth
    height = nextHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (nextAspect < previousAspect) {
      if (mode === 'lab' && projectLayer) {
        frameCameraBounds(camera, controls, projectLayer.bounds(framedComponent), true)
      } else {
        // Preserve the authored hero and the user's orbit; only compensate lost horizontal FOV.
        const halfFov = THREE.MathUtils.degToRad(camera.getEffectiveFOV() / 2)
        const oldFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * previousAspect))
        const nextFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * nextAspect))
        const offset = camera.position.clone().sub(controls.target)
        offset.multiplyScalar(Math.sin(oldFov) / Math.sin(nextFov))
        camera.position.copy(controls.target).add(offset)
        controls.maxDistance = Math.max(controls.maxDistance, offset.length() * 1.4)
        controls.update()
      }
    }
    invalidate()
  }
  function onVisibility() {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame)
      frame = 0
    } else invalidate()
  }
  function onContextLost(event: Event) {
    event.preventDefault()
    contextLost = true
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    canvas.hidden = true
    fallback.textContent = 'La vista 3D se ha pausado. Se recuperará cuando WebGL esté disponible.'
    host.append(fallback)
  }
  function onContextRestored() {
    if (disposed) return
    contextLost = false
    // Render-target contents are lost with the context; rebuild the one-shot bake.
    refreshEnvironment()
    canvas.hidden = false
    fallback.remove()
    renderer.shadowMap.needsUpdate = true
    resize()
    invalidate()
  }
  function onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const direction = camera.position.clone().sub(controls.target)
    direction.multiplyScalar(Math.exp(THREE.MathUtils.clamp(event.deltaY, -100, 100) * 0.002))
    direction.clampLength(controls.minDistance, controls.maxDistance)
    camera.position.copy(controls.target).add(direction)
    controls.update()
    invalidate()
  }
  function onKey(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const turns: Record<string, [number, number]> = {
      ArrowLeft: [-0.09, 0],
      ArrowRight: [0.09, 0],
      ArrowUp: [0, -0.09],
      ArrowDown: [0, 0.09],
    }
    if (event.key === 'Home') {
      event.preventDefault()
      frameCamera()
      return
    }
    const turn = turns[event.key]
    if (!turn) return
    event.preventDefault()
    const offset = camera.position.clone().sub(controls.target)
    const sphere = new THREE.Spherical().setFromVector3(offset)
    sphere.theta += turn[0]
    sphere.phi = THREE.MathUtils.clamp(
      sphere.phi + turn[1],
      controls.minPolarAngle,
      controls.maxPolarAngle,
    )
    camera.position.copy(controls.target).add(offset.setFromSpherical(sphere))
    controls.update()
    invalidate()
  }
  controls.addEventListener('change', invalidate)
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  canvas.addEventListener('keydown', onKey)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', resize)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
  }
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return
      intersecting = entry.isIntersecting
      if (!intersecting && frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      if (intersecting) invalidate()
    })
    intersectionObserver.observe(host)
  }
  renderer.shadowMap.needsUpdate = true
  resize()
  frameCamera()

  function setLed(on: boolean) {
    if (disposed) return
    ledSurface.emissiveIntensity = on ? 1.5 : 0.02
    dieSurface.emissiveIntensity = on ? 3.5 : 0
    ledLight.intensity = on ? 0.8 : 0
    invalidate()
  }
  function setBoard(value: BoardKind) {
    if (disposed) return
    boards.esp32.visible = value === 'esp32'
    boards.uno.visible = value === 'uno'
    canvas.setAttribute(
      'aria-label',
      `Modelo 3D ilustrativo de una placa ${value === 'esp32' ? 'ESP32' : 'UNO'} y un circuito con protoboard, resistencia y LED. Arrastra o usa las flechas para girar. Inicio restaura la cámara; Ctrl o Cmd más rueda cambia el zoom.`,
    )
    renderer.shadowMap.needsUpdate = true
    invalidate()
  }
  if (actions) {
    projectLayer = createProjectLayer({
      scene,
      camera,
      canvas,
      controls,
      invalidate: () => {
        renderer.shadowMap.needsUpdate = true
        invalidate()
      },
      ...actions,
    })
    projectLayer.setActive(false)
  }
  function onInspect() {
    canvas.dispatchEvent(new CustomEvent('nexo:scene', { detail: { scene, camera } }))
  }
  if (import.meta.env.DEV) {
    canvas.addEventListener('nexo:inspect', onInspect)
  }
  return {
    updateProject(snapshot) {
      if (disposed) return
      const initial = !hasProjectSnapshot
      hasProjectSnapshot = true
      projectLayer?.update(snapshot)
      // The React host sets lab mode before delivering its initial snapshot.
      if (initial && mode === 'lab') projectLayer?.frameProject()
    },
    cancelGesture() {
      projectLayer?.cancelGesture()
    },
    locateProject(id) {
      if (disposed || mode !== 'lab') return
      framedComponent = id
      projectLayer?.locate(id)
    },
    frameProject() {
      if (disposed || mode !== 'lab') return
      framedComponent = undefined
      projectLayer?.frameProject()
    },
    setMode(value) {
      if (disposed || mode === value) return
      mode = value
      assembly.visible = value === 'hero'
      ledLight.visible = value === 'hero'
      projectLayer?.setActive(value === 'lab')
      canvas.setAttribute(
        'aria-label',
        value === 'lab'
          ? 'Montaje electrónico editable. Selecciona piezas y sus pines; usa la lista de terminales como alternativa de teclado.'
          : 'Modelo 3D ilustrativo del montaje de presentación.',
      )
      renderer.shadowMap.needsUpdate = true
      frameCamera()
    },
    setBoard,
    setLed,
    setView(value) {
      if (disposed) return
      view = value
      frameCamera()
    },
    locate(id) {
      if (disposed) return
      if (id === 'esp32' || id === 'uno') setBoard(id)
      const subjects = {
        esp32: boards.esp32,
        uno: boards.uno,
        breadboard,
        led,
        resistor,
        wire: wireGroup,
      }
      const bounds = new THREE.Box3().setFromObject(subjects[id])
      if (bounds.isEmpty()) return
      const sphere = bounds.getBoundingSphere(new THREE.Sphere())
      const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2)
      const halfHorizontalFov = Math.atan(Math.tan(halfVerticalFov) * camera.aspect)
      const distance =
        (sphere.radius * 1.18) / Math.sin(Math.min(halfVerticalFov, halfHorizontalFov))
      const direction = camera.position.clone().sub(controls.target).normalize()
      controls.minDistance = Math.max(1.5, sphere.radius * 1.5)
      controls.maxDistance = Math.max(25, distance * 1.4)
      controls.target.copy(sphere.center)
      camera.position
        .copy(sphere.center)
        .addScaledVector(direction, Math.max(controls.minDistance, distance))
      controls.update()
      invalidate()
    },
    reset() {
      if (disposed) return
      frameCamera()
    },
    dispose() {
      if (disposed) return
      disposed = true
      if (frame) cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      canvas.removeEventListener('keydown', onKey)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('nexo:inspect', onInspect)
      controls.removeEventListener('change', invalidate)
      projectLayer?.dispose()
      controls.dispose()
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
      key.shadow.dispose()
      scene.environment = null
      environmentTarget?.dispose()
      environmentTarget = undefined
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      fallback.remove()
    },
  }
}
