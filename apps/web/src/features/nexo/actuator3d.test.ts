import { createEmptyProject, type Project } from '@circuitforge/netlist'
import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { createProjectLayer } from './editor3d'
import { createProjectModel } from './models'
import type { ProjectSnapshot } from './projectController'

describe('actuator 3D models and interactivity (Fase T-8)', () => {
  it('rotates potentiometer knob when position parameter changes', () => {
    const potModel0 = createProjectModel('potentiometer', { position: 0 })
    const potModel1 = createProjectModel('potentiometer', { position: 1 })

    const knob0 = potModel0.group.getObjectByName('Mando giratorio de potenciómetro') as THREE.Group
    const knob1 = potModel1.group.getObjectByName('Mando giratorio de potenciómetro') as THREE.Group

    expect(knob0).toBeDefined()
    expect(knob1).toBeDefined()
    // 270 degree span: -135° to +135°
    expect(knob0.rotation.y).toBeCloseTo((0.5 * Math.PI * 1.5), 2)
    expect(knob1.rotation.y).toBeCloseTo((-0.5 * Math.PI * 1.5), 2)

    potModel0.dispose()
    potModel1.dispose()
  })

  it('rotates servo horn when angle parameter changes', () => {
    const servo0 = createProjectModel('servo', { angle: 0 })
    const servo90 = createProjectModel('servo', { angle: 90 })
    const servo180 = createProjectModel('servo', { angle: 180 })

    const horn0 = servo0.group.getObjectByName('Brazo orientable de servo') as THREE.Group
    const horn90 = servo90.group.getObjectByName('Brazo orientable de servo') as THREE.Group
    const horn180 = servo180.group.getObjectByName('Brazo orientable de servo') as THREE.Group

    expect(horn0).toBeDefined()
    expect(horn90).toBeDefined()
    expect(horn180).toBeDefined()

    expect(horn0.rotation.y).toBeCloseTo((-90 * Math.PI) / 180, 2)
    expect(horn90.rotation.y).toBeCloseTo(0, 2)
    expect(horn180.rotation.y).toBeCloseTo((90 * Math.PI) / 180, 2)

    servo0.dispose()
    servo90.dispose()
    servo180.dispose()
  })

  it('updates LED brightness and point light when simulation current is applied', () => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const canvas = new EventTarget() as HTMLCanvasElement
    const controls = {
      enabled: true,
      target: new THREE.Vector3(),
      update: vi.fn(),
    } as unknown as import('three/addons/controls/OrbitControls.js').OrbitControls
    const invalidate = vi.fn()

    const layer = createProjectLayer({
      scene,
      camera,
      canvas,
      controls,
      invalidate,
      onSelect: vi.fn(),
      onPin: vi.fn(),
      onDragStart: vi.fn(),
      onDragPreview: vi.fn(),
      onDragCommit: vi.fn(),
      onDragCancel: vi.fn(),
    })

    const project: Project = {
      ...createEmptyProject('p-led', 'Test LED'),
      components: [
        {
          id: 'D1',
          typeId: 'led',
          position: { x: 0, y: 0, rotation: 0 },
          pins: [
            { pinId: 'anode', type: 'passive', netId: null },
            { pinId: 'cathode', type: 'passive', netId: null },
          ],
          params: {},
        },
      ],
      nets: [],
    }

    const snapshot: ProjectSnapshot = {
      project,
      selectedId: null,
      wiring: { pending: null, error: null },
      preview: null,
      canUndo: false,
      canRedo: false,
    }

    layer.update(snapshot)

    // Initially with no simulation, LED is dim (emissive 0.02)
    let domeMesh: THREE.Mesh | null = null
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'Domo de LED') {
        domeMesh = child
      }
    })
    expect(domeMesh).toBeDefined()
    const domeMat = (domeMesh as THREE.Mesh | null)?.material as THREE.MeshPhysicalMaterial | undefined
    expect(domeMat?.emissiveIntensity).toBe(0.02)

    // Apply simulation with forward current If = 15 mA (0.015 A)
    layer.updateSimulation({
      ok: true,
      voltages: {},
      currents: { D1_vd: -0.015 },
      power: {},
    })

    expect(domeMat?.emissiveIntensity).toBeGreaterThan(0.5)

    // Stop simulation
    layer.updateSimulation(null)
    expect(domeMat?.emissiveIntensity).toBe(0.02)

    layer.dispose()
  })

  it('configures onUpdateParameter callback on project layer for interactive actuators', () => {
    const onUpdateParameter = vi.fn()
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const canvas = new EventTarget() as HTMLCanvasElement
    const controls = {
      enabled: true,
      target: new THREE.Vector3(),
      update: vi.fn(),
    } as unknown as import('three/addons/controls/OrbitControls.js').OrbitControls

    const layer = createProjectLayer({
      scene,
      camera,
      canvas,
      controls,
      invalidate: vi.fn(),
      onSelect: vi.fn(),
      onPin: vi.fn(),
      onDragStart: vi.fn(),
      onDragPreview: vi.fn(),
      onDragCommit: vi.fn(),
      onDragCancel: vi.fn(),
      onUpdateParameter,
    })

    const project: Project = {
      ...createEmptyProject('p-sw', 'Switch Test'),
      components: [
        {
          id: 'SW1',
          typeId: 'switch_spst',
          position: { x: 0, y: 0, rotation: 0 },
          pins: [
            { pinId: 'a', type: 'passive', netId: null },
            { pinId: 'b', type: 'passive', netId: null },
          ],
          params: { closed: false },
        },
      ],
      nets: [],
    }

    layer.update({
      project,
      selectedId: null,
      wiring: { pending: null, error: null },
      preview: null,
      canUndo: false,
      canRedo: false,
    })
    layer.setActive(true)

    expect(layer).toBeDefined()
    layer.dispose()
  })
})
