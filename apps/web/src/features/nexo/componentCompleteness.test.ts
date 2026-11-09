import {
  COMPONENT_DEFINITIONS,
  COMPONENT_INDEX,
  getDefaultParameters,
  validateParameterValue,
} from '@circuitforge/netlist'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATALOG, CATALOG_INDEX } from '@/lib/fixtures/components'
import { hasSchematicSymbol } from '@/ui/SchematicSymbol'
import { EDITABLE_TYPE_IDS, isEditableType } from './capabilities'
import { MODEL_FOOTPRINTS, MODEL_SCALE } from './editorProjection'
import { createProjectModel } from './models'
import { resolveThumbnail, thumbnailManifest } from './thumbnailManifest'

const registeredIds = COMPONENT_DEFINITIONS.map(({ typeId }) => typeId)
const definitions = COMPONENT_DEFINITIONS.map(
  (definition) => [definition.typeId, definition] as const,
)
const infrastructureIds = new Set(['breadboard', 'dc_source', 'gnd_ref'])

afterEach(() => vi.unstubAllGlobals())

/** Exercise the actual browser-only label planes without requiring a DOM or WebGL renderer. */
function enableLabels() {
  const context = new Proxy({}, { get: () => () => {} })
  vi.stubGlobal('document', {
    createElement: () => ({ getContext: () => context }),
  })
}

function resources(group: THREE.Group) {
  const owned = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.InstancedMesh
  >()
  group.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) owned.add(object)
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
    owned.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      owned.add(material)
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) owned.add(value)
      }
    }
  })
  return owned
}

describe('component completeness release gate', () => {
  it('registers at least 73 unique definitions and 70 electronic parts, excluding infrastructure', () => {
    expect(COMPONENT_DEFINITIONS.length).toBeGreaterThanOrEqual(73)
    expect(new Set(registeredIds).size).toBe(registeredIds.length)
    expect(COMPONENT_INDEX.size).toBe(registeredIds.length)
    const electronics = COMPONENT_DEFINITIONS.filter(({ electronic }) => electronic)
    expect(electronics.length).toBeGreaterThanOrEqual(70)
    for (const typeId of infrastructureIds) {
      expect(COMPONENT_INDEX.get(typeId)?.electronic, typeId).toBe(false)
      expect(
        electronics.some((definition) => definition.typeId === typeId),
        typeId,
      ).toBe(false)
    }
  })

  it('aligns the complete catalog adapter, capabilities, and placement footprints with the registry', () => {
    const expected = [...registeredIds].sort()
    expect(CATALOG.map(({ typeId }) => typeId).sort()).toEqual(expected)
    expect([...CATALOG_INDEX.keys()].sort()).toEqual(expected)
    expect([...EDITABLE_TYPE_IDS].sort()).toEqual(expected)
    expect(Object.keys(MODEL_FOOTPRINTS).sort()).toEqual(expected)
    for (const definition of COMPONENT_DEFINITIONS) {
      const { typeId } = definition
      expect(COMPONENT_INDEX.get(typeId), typeId).toEqual(definition)
      expect(CATALOG_INDEX.get(typeId), typeId).toMatchObject(definition)
      expect(MODEL_FOOTPRINTS[typeId], typeId).toEqual(definition.footprint)
      expect(isEditableType(typeId), typeId).toBe(true)
      const primary = definition.parameters.find((parameter) => parameter.kind === 'number')
      expect(CATALOG_INDEX.get(typeId)?.primaryParam, typeId).toEqual(
        primary
          ? { name: primary.label, unit: primary.unit ?? '', value: primary.defaultValue }
          : undefined,
      )
    }
  })

  it.each(definitions)(
    '%s declares typed pins, valid defaults, a reference prefix, and a footprint',
    (typeId, definition) => {
      expect(typeId.trim()).toBe(typeId)
      expect(typeId.length).toBeGreaterThan(0)
      expect(definition.name.trim().length).toBeGreaterThan(0)
      expect(definition.description.trim().length).toBeGreaterThan(0)
      expect(definition.visualFamily.trim().length).toBeGreaterThan(0)
      expect(definition.referencePrefix).toMatch(/^[A-Z][A-Z0-9]*$/)
      expect(Number.isFinite(definition.footprint.width)).toBe(true)
      expect(Number.isFinite(definition.footprint.depth)).toBe(true)
      expect(definition.footprint.width).toBeGreaterThan(0)
      expect(definition.footprint.depth).toBeGreaterThan(0)
      expect(definition.pins.length).toBeGreaterThan(0)
      expect(new Set(definition.pins.map(({ id }) => id)).size).toBe(definition.pins.length)
      const pinTypes = new Set([
        'power',
        'gnd',
        'digital',
        'analog',
        'pwm',
        'i2c_sda',
        'i2c_scl',
        'spi_mosi',
        'spi_miso',
        'spi_sck',
        'uart_tx',
        'uart_rx',
        'passive',
      ])
      for (const pin of definition.pins) {
        expect(pin.id.trim()).toBe(pin.id)
        expect(pin.id.length).toBeGreaterThan(0)
        expect(pinTypes.has(pin.type), pin.id).toBe(true)
      }
      const defaults = getDefaultParameters(typeId)
      expect(defaults).not.toBe(getDefaultParameters(typeId))
      expect(defaults).toEqual(
        Object.fromEntries(
          definition.parameters.map(({ key, defaultValue }) => [key, defaultValue]),
        ),
      )
      expect(new Set(definition.parameters.map(({ key }) => key)).size).toBe(
        definition.parameters.length,
      )
      for (const parameter of definition.parameters) {
        expect(parameter.key.trim().length).toBeGreaterThan(0)
        expect(parameter.label.trim().length).toBeGreaterThan(0)
        expect(
          validateParameterValue(typeId, parameter.key, defaults[parameter.key]),
          parameter.key,
        ).toBe(true)
        for (const invalid of [undefined, null, {}, []]) {
          expect(validateParameterValue(typeId, parameter.key, invalid), parameter.key).toBe(false)
        }
        if (parameter.kind === 'number') {
          for (const invalid of [NaN, Infinity, -Infinity, String(parameter.defaultValue), true]) {
            expect(validateParameterValue(typeId, parameter.key, invalid)).toBe(false)
          }
          if (parameter.min !== undefined) {
            expect(validateParameterValue(typeId, parameter.key, parameter.min - 1)).toBe(false)
          }
          if (parameter.max !== undefined) {
            expect(validateParameterValue(typeId, parameter.key, parameter.max + 1)).toBe(false)
          }
          if (parameter.step !== undefined) {
            expect(parameter.step).toBeGreaterThan(0)
            expect(
              validateParameterValue(
                typeId,
                parameter.key,
                parameter.defaultValue + parameter.step / 2,
              ),
            ).toBe(false)
          }
        } else if (parameter.kind === 'boolean') {
          expect(validateParameterValue(typeId, parameter.key, !parameter.defaultValue)).toBe(true)
          expect(validateParameterValue(typeId, parameter.key, 'false')).toBe(false)
        } else {
          expect(parameter.options.length).toBeGreaterThan(0)
          expect(new Set(parameter.options.map(({ value }) => value)).size).toBe(
            parameter.options.length,
          )
          for (const option of parameter.options) {
            expect(option.value.trim().length).toBeGreaterThan(0)
            expect(option.label.trim().length).toBeGreaterThan(0)
            expect(validateParameterValue(typeId, parameter.key, option.value)).toBe(true)
          }
          expect(validateParameterValue(typeId, parameter.key, '__unknown_option__')).toBe(false)
        }
      }
      expect(validateParameterValue(typeId, '__unknown_parameter__', 0)).toBe(false)
    },
  )

  it.each(definitions)('%s has an explicit schematic symbol', (typeId) => {
    expect(hasSchematicSymbol(typeId)).toBe(true)
  })

  it.each(definitions)(
    '%s builds exact finite anchors and visible geometry within its footprint, including automatic labels',
    (typeId, definition) => {
      enableLabels()
      const defaults = getDefaultParameters(typeId)
      const original = { ...defaults }
      const model = createProjectModel(typeId, defaults)
      try {
        expect(defaults).toEqual(original)
        expect(Object.keys(model.anchors).sort()).toEqual(
          definition.pins.map(({ id }) => id).sort(),
        )
        for (const [pinId, anchor] of Object.entries(model.anchors)) {
          expect(anchor.toArray().every(Number.isFinite), pinId).toBe(true)
        }
        expect(model.group.children.length).toBeGreaterThan(0)
        const bounds = new THREE.Box3().setFromObject(model.group)
        expect(bounds.isEmpty()).toBe(false)
        expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true)
        const size = bounds.getSize(new THREE.Vector3())
        // A tiny tolerance permits float32 vertex storage, not footprint overflow.
        expect(size.x).toBeLessThanOrEqual(definition.footprint.width * MODEL_SCALE + 1e-6)
        expect(size.z).toBeLessThanOrEqual(definition.footprint.depth * MODEL_SCALE + 1e-6)
        expect(bounds.min.y).toBeCloseTo(0, 5)
        expect(size.x).toBeGreaterThan(0)
        expect(size.z).toBeGreaterThan(0)
        const labels: string[] = []
        model.group.traverse((object) => {
          if (object.name.startsWith('Pin lógico ')) labels.push(object.name)
        })
        expect(labels.length).toBe(typeId === 'breadboard' ? 0 : definition.pins.length)
      } finally {
        model.dispose()
      }
    },
  )

  it.each(definitions)(
    '%s owns independent geometry, materials, and label textures and disposes them exactly once',
    (typeId) => {
      enableLabels()
      const first = createProjectModel(typeId, getDefaultParameters(typeId))
      const second = createProjectModel(typeId, getDefaultParameters(typeId))
      try {
        const firstResources = resources(first.group)
        const secondResources = resources(second.group)
        expect(firstResources.size).toBeGreaterThan(0)
        expect([...firstResources].some((resource) => secondResources.has(resource))).toBe(false)
        expect(
          [...firstResources].some((resource) => resource instanceof THREE.CanvasTexture),
        ).toBe(true)
        const firstDisposals = [...firstResources].map((resource) => vi.spyOn(resource, 'dispose'))
        const secondDisposals = [...secondResources].map((resource) =>
          vi.spyOn(resource, 'dispose'),
        )
        first.dispose()
        first.dispose()
        expect(first.group.children).toHaveLength(0)
        for (const dispose of firstDisposals) expect(dispose).toHaveBeenCalledTimes(1)
        for (const dispose of secondDisposals) expect(dispose).not.toHaveBeenCalled()
        expect(second.group.children.length).toBeGreaterThan(0)
        second.dispose()
        second.dispose()
        for (const dispose of secondDisposals) expect(dispose).toHaveBeenCalledTimes(1)
      } finally {
        first.dispose()
        second.dispose()
      }
    },
  )

  it('rejects unknown source types and inherited property names instead of providing fallback models', () => {
    for (const typeId of ['__unknown_component__', 'toString', 'constructor', '__proto__']) {
      expect(COMPONENT_INDEX.has(typeId)).toBe(false)
      expect(CATALOG_INDEX.has(typeId)).toBe(false)
      expect(isEditableType(typeId)).toBe(false)
      expect(hasSchematicSymbol(typeId)).toBe(false)
      expect(() => createProjectModel(typeId)).toThrow(RangeError)
      expect(validateParameterValue(typeId, 'voltage', 5)).toBe(false)
      expect(resolveThumbnail(typeId)).toBeUndefined()
    }
  })
})

describe('component thumbnail release gate', () => {
  it.each(definitions)(
    '%s has a generated static thumbnail rather than an unavailable placeholder',
    (typeId) => {
      expect(Object.hasOwn(thumbnailManifest, typeId)).toBe(true)
      const thumbnail = resolveThumbnail(typeId)
      expect(typeof thumbnail).toBe('string')
      expect(thumbnail?.length).toBeGreaterThan(0)
      expect(thumbnail).toMatch(/\.webp(?:\?|$)/)
    },
  )
})
