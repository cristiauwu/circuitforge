import {
  BREADBOARD_CONTACTS,
  BREADBOARD_TYPE_ID,
  type Component,
  type ParamValue,
  type PinEndpoint,
  type Project,
} from '@circuitforge/netlist'
import type { SolverResult } from '@circuitforge/solver'
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { playMechanicalClick } from './audioFeedback'
import { frameCameraBounds } from './cameraFraming'
import { isEditableType } from './capabilities'
import { pickBreadboardContact } from './contactPicking'
import { worldToProject } from './editorProjection'
import { resolveInstancePose } from './instancePose'
import { createProjectModel, type ProjectModel } from './models'
import { createMountedGeometry, type MountedGeometry } from './mountedGeometry'
import type { ProjectSnapshot } from './projectController'

interface ProjectLayerOptions {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  controls: OrbitControls
  invalidate: () => void
  onSelect: (id: string | null) => void
  onPin: (endpoint: PinEndpoint) => void
  onDragStart: (id: string) => void
  onDragPreview: (position: { x: number; y: number }) => void
  onDragCommit: () => void
  onDragCancel: () => void
  onPinHover?: ((endpoint: PinEndpoint | null) => void) | undefined
  onUpdateParameter?: ((componentId: string, key: string, value: ParamValue) => void) | undefined
}

export interface ProjectLayer {
  update(snapshot: ProjectSnapshot): void
  updateSimulation(result: SolverResult | null): void
  setActive(active: boolean): void
  cancelGesture(): void
  bounds(id?: string): THREE.Box3
  frameProject(): void
  locate(id: string): void
  dispose(): void
}

interface ModelEntry {
  model: ProjectModel
  typeId: string
  pinSignature: string
  modelSignature: string
  mounted?: MountedGeometry
  terminals: THREE.Group
}

interface Gesture {
  pointerId: number
  componentId: string
  pin: PinEndpoint | null
  startX: number
  startY: number
  offset: THREE.Vector3
  dragging: boolean
  moved: boolean
  controlsEnabled: boolean
  preview: { x: number; y: number } | null
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function isSamePin(a: PinEndpoint, b: PinEndpoint): boolean {
  return a.componentId === b.componentId && a.pinId === b.pinId
}

interface ComponentPickHit {
  distance: number
  object: { userData: { componentId?: string; pinEndpoint?: PinEndpoint } }
}

/** Hits must be distance-sorted, as returned by THREE.Raycaster. */
export function resolveComponentPick(hits: readonly ComponentPickHit[]): {
  componentId: string
  pin: PinEndpoint | null
} | null {
  const nearest = hits.find((hit) => typeof hit.object.userData.componentId === 'string')
  if (!nearest) return null
  const componentId = nearest.object.userData.componentId as string
  // A terminal lead may sit just in front of its hit sphere (R1.b: 0.03 units).
  // Do not promote pins through a component body, such as the LED's raised dome.
  const terminal = hits.find(
    (hit) =>
      hit.object.userData.componentId === componentId &&
      hit.object.userData.pinEndpoint &&
      hit.distance - nearest.distance <= 0.06,
  )
  return { componentId, pin: terminal?.object.userData.pinEndpoint ?? null }
}

/** Physical cables are authoritative; conductive net membership is not a cable route. */
export function projectWireConnections(project: Project): {
  id: string
  from: PinEndpoint
  to: PinEndpoint
}[] {
  if (project.wires !== undefined) return project.wires
  const connections: { id: string; from: PinEndpoint; to: PinEndpoint }[] = []
  for (const net of [...project.nets].sort((a, b) => compare(a.id, b.id))) {
    const endpoints = [...net.pins].sort(
      (a, b) => compare(a.componentId, b.componentId) || compare(a.pinId, b.pinId),
    )
    const unique = endpoints.filter(
      (pin, index) =>
        index === 0 ||
        pin.componentId !== endpoints[index - 1]?.componentId ||
        pin.pinId !== endpoints[index - 1]?.pinId,
    )
    const from = unique[0]
    if (!from) continue
    for (const to of unique.slice(1)) {
      const component = project.components.find((item) => item.id === from.componentId)
      const fromGroup = BREADBOARD_CONTACTS.find((contact) => contact.pinId === from.pinId)?.groupId
      const toGroup = BREADBOARD_CONTACTS.find((contact) => contact.pinId === to.pinId)?.groupId
      if (
        component?.typeId === BREADBOARD_TYPE_ID &&
        from.componentId === to.componentId &&
        fromGroup !== undefined &&
        fromGroup === toGroup
      )
        continue
      connections.push({ id: net.id, from, to })
    }
  }
  return connections
}

/** Owned project geometry and gestures only; the host retains its renderer and controls. */
export function createProjectLayer(options: ProjectLayerOptions): ProjectLayer {
  const { scene, camera, canvas, controls, invalidate } = options
  const root = new THREE.Group()
  root.name = 'Nexo · proyecto editable'
  root.visible = false
  scene.add(root)
  const componentsRoot = new THREE.Group()
  const wiresRoot = new THREE.Group()
  root.add(componentsRoot, wiresRoot)
  const models = new Map<string, ModelEntry>()
  let lastSimulationResult: SolverResult | null = null
  const INTERACTIVE_TYPES = new Set([
    'pushbutton',
    'switch_spst',
    'switch_spdt',
    'reed_switch',
    'dip_switch_4',
    'potentiometer',
  ])
  const markerGeometry = new THREE.SphereGeometry(0.09, 12, 8)
  const hitGeometry = new THREE.SphereGeometry(0.18, 10, 8)
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: '#f0ca78',
    roughness: 0.32,
    metalness: 0.55,
  })
  const hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  })
  const wireMaterial = new THREE.MeshStandardMaterial({ color: '#c98454', roughness: 0.48 })
  // At most one conductive strip is emphasized, in one draw call and without animation.
  const contactGeometry = new THREE.RingGeometry(0.035, 0.063, 16)
  contactGeometry.rotateX(-Math.PI / 2)
  const contactMaterial = new THREE.MeshBasicMaterial({
    color: '#e1c79b',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })
  const contactHighlight = new THREE.InstancedMesh(contactGeometry, contactMaterial, 60)
  contactHighlight.count = 0
  contactHighlight.raycast = () => {}
  contactHighlight.frustumCulled = false
  root.add(contactHighlight)
  const contactMatrix = new THREE.Matrix4()
  const selection = new THREE.BoxHelper(new THREE.Object3D(), '#f2bd78')
  selection.visible = false
  selection.material.depthTest = false
  selection.material.transparent = true
  selection.material.opacity = 0.8
  selection.renderOrder = 10
  root.add(selection)

  // Cable dinámico en curso de trazado (Rubberband live wire)
  const activeWireGroup = new THREE.Group()
  activeWireGroup.name = 'Cable interactivo dinámico'
  activeWireGroup.visible = false
  root.add(activeWireGroup)

  const activeWireMaterial = new THREE.MeshStandardMaterial({
    color: '#d4eb91',
    roughness: 0.32,
    metalness: 0.25,
    emissive: new THREE.Color('#84cc16'),
    emissiveIntensity: 0.45,
  })
  const activeTipMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.2,
    metalness: 0.8,
    emissive: new THREE.Color('#d4eb91'),
    emissiveIntensity: 0.8,
  })
  const activeTipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), activeTipMaterial)
  let activeWireMesh: THREE.Mesh | null = null
  activeWireGroup.add(activeTipMesh)

  // Halo indicador de atracción magnética y hover en pines
  const snapRingGeometry = new THREE.RingGeometry(0.07, 0.14, 24)
  snapRingGeometry.rotateX(-Math.PI / 2)
  const snapRingMaterial = new THREE.MeshBasicMaterial({
    color: '#10b981',
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthTest: false,
  })
  const snapRingMesh = new THREE.Mesh(snapRingGeometry, snapRingMaterial)
  snapRingMesh.visible = false
  snapRingMesh.renderOrder = 20
  root.add(snapRingMesh)

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  let snapshot: ProjectSnapshot | null = null
  let active = false
  let disposed = false
  let gesture: Gesture | null = null
  let wireSignature = ''

  function setRay(event: PointerEvent): boolean {
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return false
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    camera.updateMatrixWorld()
    raycaster.setFromCamera(pointer, camera)
    return true
  }

  function planePoint(event: PointerEvent): THREE.Vector3 | null {
    if (!setRay(event)) return null
    return raycaster.ray.intersectPlane(ground, new THREE.Vector3())
  }

  function pick(event: PointerEvent): { componentId: string; pin: PinEndpoint | null } | null {
    if (!setRay(event)) return null
    root.updateWorldMatrix(true, true)
    const hits = raycaster.intersectObjects(componentsRoot.children, true)
    const bodyDistance = hits[0]?.distance ?? Number.POSITIVE_INFINITY
    let contactPick: { componentId: string; pin: PinEndpoint; distance: number } | null = null
    for (const [componentId, entry] of models) {
      if (entry.typeId !== BREADBOARD_TYPE_ID) continue
      const contact = pickBreadboardContact(
        raycaster.ray,
        entry.model.group,
        entry.model.anchors,
        bodyDistance,
      )
      if (contact && (!contactPick || contact.distance < contactPick.distance)) {
        contactPick = {
          componentId,
          pin: { componentId, pinId: contact.pinId },
          distance: contact.distance,
        }
      }
    }
    if (contactPick) return { componentId: contactPick.componentId, pin: contactPick.pin }
    return resolveComponentPick(hits)
  }

  function addTerminals(entry: ModelEntry, component: Component) {
    entry.terminals.clear()
    if (component.typeId === BREADBOARD_TYPE_ID) return
    for (const pin of component.pins) {
      const anchor = entry.model.anchors[pin.pinId]
      if (!anchor) continue
      const endpoint: PinEndpoint = { componentId: component.id, pinId: pin.pinId }
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.copy(anchor)
      marker.userData = { componentId: component.id, pinEndpoint: endpoint }
      const hit = new THREE.Mesh(hitGeometry, hitMaterial)
      hit.position.copy(anchor)
      hit.userData = { componentId: component.id, pinEndpoint: endpoint }
      entry.terminals.add(marker, hit)
    }
  }

  function applyPose(entry: ModelEntry, component: Component) {
    const preview =
      gesture?.componentId === component.id && gesture.preview
        ? gesture.preview
        : snapshot?.preview?.componentId === component.id
          ? snapshot.preview.position
          : null
    if (!snapshot) return
    const instancePreview = gesture?.preview
      ? { componentId: gesture.componentId, position: gesture.preview }
      : snapshot.preview
    const pose = resolveInstancePose(
      snapshot.project,
      component,
      instancePreview ?? (preview ? { componentId: component.id, position: preview } : null),
    )
    entry.model.group.position.set(pose.x, pose.y, pose.z)
    entry.model.group.rotation.y = pose.rotation
  }

  function anchorPoint(endpoint: PinEndpoint): THREE.Vector3 | null {
    const entry = models.get(endpoint.componentId)
    const component = snapshot?.project.components.find((item) => item.id === endpoint.componentId)
    const anchor = entry?.model.anchors[endpoint.pinId]
    if (!entry || !anchor) return null
    if (
      component?.typeId !== BREADBOARD_TYPE_ID &&
      !component?.pins.some((pin) => pin.pinId === endpoint.pinId)
    ) {
      return null
    }
    return root.worldToLocal(entry.model.group.localToWorld(anchor.clone()))
  }

  function updateActiveWire(targetPoint: THREE.Vector3 | null) {
    const pending = snapshot?.wiring.pending
    if (!pending || !targetPoint) {
      activeWireGroup.visible = false
      return
    }
    const from = anchorPoint(pending)
    if (!from) {
      activeWireGroup.visible = false
      return
    }
    const to = targetPoint
    const dist = from.distanceTo(to)
    if (dist < 0.04) {
      activeWireGroup.visible = false
      return
    }
    const lift = Math.max(from.y, to.y) + Math.min(1.8, 0.35 + dist * 0.16)
    const curve = new THREE.CubicBezierCurve3(
      from,
      new THREE.Vector3(from.x, lift, from.z),
      new THREE.Vector3(to.x, lift, to.z),
      to,
    )
    if (activeWireMesh) {
      activeWireMesh.geometry.dispose()
      activeWireMesh.geometry = new THREE.TubeGeometry(curve, 28, 0.04, 8, false)
    } else {
      activeWireMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.04, 8, false),
        activeWireMaterial,
      )
      activeWireGroup.add(activeWireMesh)
    }
    activeTipMesh.position.copy(to)
    activeWireGroup.visible = true
    invalidate()
  }

  function clearWires() {
    for (const item of [...wiresRoot.children]) {
      wiresRoot.remove(item)
      if (item instanceof THREE.Mesh) item.geometry.dispose()
    }
  }

  function refreshWires() {
    if (!snapshot) return
    root.updateWorldMatrix(true, true)
    const segments: { netId: string; from: THREE.Vector3; to: THREE.Vector3 }[] = []
    for (const connection of projectWireConnections(snapshot.project)) {
      const from = anchorPoint(connection.from)
      const to = anchorPoint(connection.to)
      if (from && to) segments.push({ netId: connection.id, from, to })
    }
    const signature = JSON.stringify(
      segments.map((segment) => [segment.netId, segment.from.toArray(), segment.to.toArray()]),
    )
    if (signature === wireSignature) return
    wireSignature = signature
    clearWires()
    for (const { netId, from, to } of segments) {
      if (from.distanceToSquared(to) < 1e-10) continue
      const lift = Math.max(from.y, to.y) + Math.min(1.8, 0.4 + from.distanceTo(to) * 0.12)
      const curve = new THREE.CubicBezierCurve3(
        from,
        new THREE.Vector3(from.x, lift, from.z),
        new THREE.Vector3(to.x, lift, to.z),
        to,
      )
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.035, 7, false), wireMaterial)
      wire.name = `Cable ilustrativo · ${netId}`
      wire.userData.wireId = netId
      wire.castShadow = true
      wiresRoot.add(wire)
    }
  }

  function highlightContact(entry: ModelEntry, pinId: string, selectedPinId: string) {
    const anchor = entry.model.anchors[pinId]
    if (!anchor) return
    const point = root.worldToLocal(entry.model.group.localToWorld(anchor.clone()))
    contactMatrix.makeTranslation(point.x, point.y + 0.006, point.z)
    const index = contactHighlight.count++
    contactHighlight.setMatrixAt(index, contactMatrix)
    contactHighlight.setColorAt(
      index,
      new THREE.Color(pinId === selectedPinId ? '#ffbd65' : '#bdba9c'),
    )
  }

  function refreshContactHighlight() {
    contactHighlight.count = 0
    const pending = snapshot?.wiring.pending
    if (!pending) return
    const entry = models.get(pending.componentId)
    if (!entry || entry.typeId !== BREADBOARD_TYPE_ID) return
    const selectedContact = BREADBOARD_CONTACTS.find((contact) => contact.pinId === pending.pinId)
    if (!selectedContact) return
    for (const contact of BREADBOARD_CONTACTS) {
      if (contact.groupId !== selectedContact.groupId) continue
      highlightContact(entry, contact.pinId, pending.pinId)
    }
    contactHighlight.instanceMatrix.needsUpdate = true
    if (contactHighlight.instanceColor) contactHighlight.instanceColor.needsUpdate = true
  }

  function refreshSelection() {
    refreshContactHighlight()
    const selected = snapshot?.selectedId ? models.get(snapshot.selectedId) : undefined
    selection.visible = Boolean(selected)
    if (selected) {
      // Box3 includes invisible objects, so detach hit spheres while measuring.
      selected.model.group.remove(selected.terminals)
      selection.setFromObject(selected.model.group)
      selected.model.group.add(selected.terminals)
    }
  }

  function refreshMountedGeometry() {
    if (!snapshot) return
    root.updateWorldMatrix(true, true)
    for (const mount of snapshot.project.mounts ?? []) {
      const entry = models.get(mount.componentId)
      const board = models.get(mount.boardId)
      const component = snapshot.project.components.find((item) => item.id === mount.componentId)
      if (!entry?.mounted || !board || !component) continue
      const targets: Record<string, THREE.Vector3> = {}
      for (const contact of mount.contacts) {
        const anchor = board.model.anchors[contact.contactId]
        if (!anchor) continue
        targets[contact.pinId] = entry.model.group.worldToLocal(
          board.model.group.localToWorld(anchor.clone()),
        )
      }
      if (entry.mounted.update(targets)) addTerminals(entry, component)
    }
  }

  function refreshGeometry() {
    for (const component of snapshot?.project.components ?? []) {
      const entry = models.get(component.id)
      if (entry) applyPose(entry, component)
    }
    refreshMountedGeometry()
    refreshWires()
    refreshSelection()
    invalidate()
  }

  /** Fresh world bounds of physical geometry, never selection helpers or invisible hit targets. */
  function bounds(id?: string): THREE.Box3 {
    const result = new THREE.Box3()
    if (disposed) return result
    root.updateWorldMatrix(true, true)
    const entries = id === undefined ? [...models.values()] : [models.get(id)]
    for (const entry of entries) {
      if (!entry) continue
      entry.model.group.children
        .filter((child) => child !== entry.terminals)
        .forEach((child) => {
          result.expandByObject(child)
        })
    }
    if (id === undefined) result.expandByObject(wiresRoot)
    return result
  }

  function releaseGesture(current: Gesture) {
    // Clear first: releasing capture can synchronously emit lostpointercapture.
    gesture = null
    controls.enabled = current.controlsEnabled
    if (canvas.hasPointerCapture(current.pointerId)) canvas.releasePointerCapture(current.pointerId)
  }

  function setCanvasCursor(cursor: string) {
    if (canvas.style) {
      canvas.style.cursor = cursor
    }
  }

  function cancelGesture() {
    activeWireGroup.visible = false
    snapRingMesh.visible = false
    setCanvasCursor('')
    options.onPinHover?.(null)
    const current = gesture
    if (!current) return
    releaseGesture(current)
    if (current.dragging) options.onDragCancel()
    refreshGeometry()
  }

  function pointerDown(event: PointerEvent) {
    if (!active || disposed || gesture || event.button !== 0 || !event.isPrimary) return
    const hit = pick(event)
    if (!hit) {
      options.onSelect(null)
      return // A blank canvas still belongs to OrbitControls.
    }
    const entry = models.get(hit.componentId)
    const point = planePoint(event)
    if (!entry || !point) return
    event.preventDefault()
    event.stopImmediatePropagation()

    if (snapshot?.wiring.pending && hit.pin) {
      options.onPin(hit.pin)
      activeWireGroup.visible = false
      snapRingMesh.visible = false
      return
    }

    gesture = {
      pointerId: event.pointerId,
      componentId: hit.componentId,
      pin: hit.pin,
      startX: event.clientX,
      startY: event.clientY,
      offset: point.sub(entry.model.group.getWorldPosition(new THREE.Vector3())),
      dragging: false,
      moved: false,
      controlsEnabled: controls.enabled,
      preview: null,
    }
    controls.enabled = false
    canvas.setPointerCapture(event.pointerId)
    options.onSelect(hit.componentId)

    if (hit.pin) {
      options.onPin(hit.pin)
    }
  }

  function handlePinDragMove(event: PointerEvent, current: Gesture) {
    const hit = pick(event)
    if (hit?.pin && current.pin && !isSamePin(current.pin, hit.pin)) {
      const pinPos = anchorPoint(hit.pin)
      if (pinPos) {
        snapRingMesh.position.copy(pinPos)
        snapRingMesh.position.y += 0.015
        snapRingMesh.visible = true
        snapRingMaterial.color.set('#10b981')
        setCanvasCursor('crosshair')
        updateActiveWire(pinPos)
        options.onPinHover?.(hit.pin)
        return
      }
    }
    snapRingMesh.visible = false
    options.onPinHover?.(null)
    const point = planePoint(event)
    if (point) {
      updateActiveWire(root.worldToLocal(point))
    }
  }

  function handleComponentDragMove(event: PointerEvent, current: Gesture) {
    if (snapshot?.project.mounts?.some((mount) => mount.componentId === current.componentId)) {
      if (!current.dragging) {
        current.dragging = true
        options.onDragStart(current.componentId)
      }
      return
    }
    const point = planePoint(event)
    if (!point) return
    if (!current.dragging) {
      current.dragging = true
      options.onDragStart(current.componentId)
      if (gesture !== current) return
    }
    const position = worldToProject(point.sub(current.offset))
    if (current.preview?.x === position.x && current.preview.y === position.y) return
    current.preview = position
    refreshGeometry()
    options.onDragPreview(position)
  }

  function pointerMove(event: PointerEvent) {
    const current = gesture
    if (!active || !current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (
      !current.moved &&
      Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5
    )
      return
    current.moved = true
    if (current.pin) {
      handlePinDragMove(event, current)
      return
    }
    handleComponentDragMove(event, current)
  }

  function handleInteractiveClick(componentId: string) {
    const comp = snapshot?.project.components.find((item) => item.id === componentId)
    if (!comp) return
    if (comp.typeId === 'pushbutton') {
      const next = !(comp.params.pressed === true)
      playMechanicalClick(next ? 'press' : 'release')
      options.onUpdateParameter?.(comp.id, 'pressed', next)
    } else if (comp.typeId === 'switch_spst') {
      const next = !(comp.params.closed === true)
      playMechanicalClick('toggle')
      options.onUpdateParameter?.(comp.id, 'closed', next)
    } else if (comp.typeId === 'switch_spdt') {
      const next = comp.params.position === 'throw_b' ? 'throw_a' : 'throw_b'
      playMechanicalClick('toggle')
      options.onUpdateParameter?.(comp.id, 'position', next)
    } else if (comp.typeId === 'reed_switch') {
      const next = !(comp.params.closed === true)
      playMechanicalClick('toggle')
      options.onUpdateParameter?.(comp.id, 'closed', next)
    } else if (comp.typeId === 'dip_switch_4') {
      const currentMask = typeof comp.params.closedMask === 'number' ? comp.params.closedMask : 0
      const next = (currentMask + 1) % 16
      playMechanicalClick('toggle')
      options.onUpdateParameter?.(comp.id, 'closedMask', next)
    }
  }

  function applyLedSimulation(result: SolverResult | null) {
    for (const [id, entry] of models) {
      if (entry.typeId !== 'led') continue
      const currentIf = result ? Math.abs(result.currents[`${id}_vd`] ?? 0) : 0
      const isLit = currentIf > 0.0001
      const intensity = isLit ? Math.min(2.5, Math.max(0.6, currentIf / 0.015)) : 0.02
      entry.model.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
          child.material.emissiveIntensity = intensity
          child.material.color.set(isLit ? '#ff7436' : '#e26835')
        }
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof THREE.MeshStandardMaterial &&
          child.name === 'Dado emisor'
        ) {
          child.material.emissiveIntensity = isLit ? 2.0 : 0
        }
        if (child instanceof THREE.PointLight) {
          child.intensity = isLit ? 0.8 : 0
        }
      })
    }
    invalidate()
  }

  function pointerUp(event: PointerEvent) {
    const current = gesture
    if (!current || current.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    releaseGesture(current)
    if (current.dragging) {
      options.onDragCommit()
    } else if (current.pin && current.moved) {
      const dropHit = pick(event)
      if (dropHit?.pin && !isSamePin(current.pin, dropHit.pin)) {
        options.onPin(dropHit.pin)
        activeWireGroup.visible = false
        snapRingMesh.visible = false
        options.onPinHover?.(null)
      }
    } else if (!current.moved && !current.pin && current.componentId) {
      handleInteractiveClick(current.componentId)
    }
    refreshGeometry()
  }

  function updateHoveredPin(pin: PinEndpoint, pending: PinEndpoint | null | undefined): boolean {
    const pinPos = anchorPoint(pin)
    if (!pinPos) return false
    snapRingMesh.position.copy(pinPos)
    snapRingMesh.position.y += 0.015
    snapRingMesh.visible = true
    if (pending) {
      const isOrigin = isSamePin(pending, pin)
      snapRingMaterial.color.set(isOrigin ? '#f59e0b' : '#10b981')
      updateActiveWire(pinPos)
    } else {
      snapRingMaterial.color.set('#38bdf8')
    }
    setCanvasCursor('crosshair')
    options.onPinHover?.(pin)
    invalidate()
    return true
  }

  function handleHoverMove(event: PointerEvent) {
    if (!active || disposed || gesture) return
    const hit = pick(event)
    const pending = snapshot?.wiring.pending

    if (hit?.pin && updateHoveredPin(hit.pin, pending)) {
      return
    }

    snapRingMesh.visible = false
    options.onPinHover?.(null)

    if (pending) {
      setCanvasCursor('crosshair')
      const point = planePoint(event)
      if (point) {
        updateActiveWire(root.worldToLocal(point))
      }
    } else {
      if (hit?.componentId) {
        const comp = snapshot?.project.components.find((c) => c.id === hit.componentId)
        if (comp && INTERACTIVE_TYPES.has(comp.typeId)) {
          setCanvasCursor('pointer')
          return
        }
      }
      setCanvasCursor('')
    }
  }

  function pointerCancelled(event: PointerEvent) {
    if (gesture?.pointerId === event.pointerId) cancelGesture()
  }

  canvas.addEventListener('pointerdown', pointerDown, true)
  canvas.addEventListener('pointermove', pointerMove, true)
  canvas.addEventListener('pointermove', handleHoverMove, false)
  canvas.addEventListener('pointerup', pointerUp, true)
  canvas.addEventListener('pointercancel', pointerCancelled, true)
  canvas.addEventListener('lostpointercapture', pointerCancelled, true)

  return {
    update(next) {
      if (disposed) return
      snapshot = next
      if (!next.wiring.pending) {
        activeWireGroup.visible = false
        snapRingMesh.visible = false
        setCanvasCursor('')
        options.onPinHover?.(null)
      }
      const present = new Set(next.project.components.map((component) => component.id))
      if (
        gesture &&
        (!present.has(gesture.componentId) ||
          !next.project.components.some(
            (component) =>
              component.id === gesture?.componentId && isEditableType(component.typeId),
          ))
      ) {
        cancelGesture()
      }
      for (const [id, entry] of models) {
        const component = next.project.components.find((item) => item.id === id)
        const signature = component
          ? JSON.stringify([
              component.typeId,
              Object.entries(component.params).sort(([a], [b]) => compare(a, b)),
              next.project.mounts?.find((mount) => mount.componentId === component.id) ?? null,
            ])
          : ''
        if (!component || signature !== entry.modelSignature) {
          componentsRoot.remove(entry.model.group)
          entry.mounted?.dispose()
          entry.model.dispose()
          models.delete(id)
        }
      }
      for (const component of next.project.components) {
        if (!isEditableType(component.typeId)) continue
        const pinSignature = JSON.stringify(component.pins.map((pin) => pin.pinId).sort(compare))
        let entry = models.get(component.id)
        if (!entry) {
          const model = createProjectModel(component.typeId, component.params)
          model.group.traverse((child) => {
            child.userData.componentId = component.id
            // The analytic plane handles these dense contacts in one query.
            if (component.typeId === BREADBOARD_TYPE_ID && child instanceof THREE.InstancedMesh) {
              child.raycast = () => {}
            }
          })
          const terminals = new THREE.Group()
          model.group.add(terminals)
          const mount = next.project.mounts?.find((item) => item.componentId === component.id)
          entry = {
            model,
            terminals,
            typeId: component.typeId,
            pinSignature: '',
            modelSignature: JSON.stringify([
              component.typeId,
              Object.entries(component.params).sort(([a], [b]) => compare(a, b)),
              mount ?? null,
            ]),
            ...(mount ? { mounted: createMountedGeometry(model) } : {}),
          }
          models.set(component.id, entry)
          componentsRoot.add(model.group)
        }
        if (entry.pinSignature !== pinSignature) {
          entry.pinSignature = pinSignature
          addTerminals(entry, component)
        }
      }
      refreshGeometry()
      applyLedSimulation(lastSimulationResult)
    },
    updateSimulation(result) {
      if (disposed) return
      lastSimulationResult = result
      applyLedSimulation(result)
    },
    setActive(value) {
      if (disposed) return
      if (!value) cancelGesture()
      active = value
      root.visible = value
      invalidate()
    },
    cancelGesture,
    bounds,
    frameProject() {
      if (disposed || !active) return
      frameCameraBounds(camera, controls, bounds())
      invalidate()
    },
    locate(id) {
      if (disposed || !active || !models.has(id)) return
      cancelGesture()
      frameCameraBounds(camera, controls, bounds(id))
      invalidate()
    },
    dispose() {
      if (disposed) return
      cancelGesture()
      disposed = true
      canvas.removeEventListener('pointerdown', pointerDown, true)
      canvas.removeEventListener('pointermove', pointerMove, true)
      canvas.removeEventListener('pointermove', handleHoverMove, false)
      canvas.removeEventListener('pointerup', pointerUp, true)
      canvas.removeEventListener('pointercancel', pointerCancelled, true)
      canvas.removeEventListener('lostpointercapture', pointerCancelled, true)
      root.removeFromParent()
      clearWires()
      for (const entry of models.values()) {
        entry.mounted?.dispose()
        entry.model.dispose()
      }
      models.clear()
      markerGeometry.dispose()
      hitGeometry.dispose()
      markerMaterial.dispose()
      hitMaterial.dispose()
      wireMaterial.dispose()
      contactHighlight.dispose()
      contactGeometry.dispose()
      contactMaterial.dispose()
      selection.geometry.dispose()
      selection.material.dispose()
      activeWireMaterial.dispose()
      activeTipMaterial.dispose()
      activeTipMesh.geometry.dispose()
      activeWireMesh?.geometry.dispose()
      snapRingGeometry.dispose()
      snapRingMaterial.dispose()
      snapshot = null
    },
  }
}
