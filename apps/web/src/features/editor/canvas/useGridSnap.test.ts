import { describe, expect, it } from 'vitest'
import {
  GRID_SIZE,
  type OrthoCamera,
  screenToSnappedWorld,
  screenToWorld,
  snapToGrid,
  type Viewport,
  worldToScreen,
} from './useGridSnap'

/** Viewport de referencia: 800x600 px. */
const viewport: Viewport = { width: 800, height: 600 }

/** Cámara de referencia: frustum de 800 unidades, centrada en el origen, sin zoom. */
const camera: OrthoCamera = {
  frustumWidth: 800,
  center: { x: 0, y: 0 },
  zoom: 1,
}

describe('snapToGrid', () => {
  it('redondea al multiplo mas cercano', () => {
    expect(snapToGrid(30)).toBe(24) // 1.25 -> 1
    expect(snapToGrid(37)).toBe(48) // 1.54 -> 2
    expect(snapToGrid(20)).toBe(24) // 0.83 -> 1
    expect(snapToGrid(4)).toBe(0) // 0.17 -> 0
  })

  it('en el punto medio redondea hacia arriba', () => {
    // 12/24 = 0.5 y Math.round(0.5) = 1, asi que 12 cae en 24. Es el
    // comportamiento de Math.round y conviene fijarlo: el punto medio no es un
    // caso ambiguo que queramos que cambie sin darnos cuenta.
    expect(snapToGrid(12)).toBe(24)
  })

  it('un valor ya en la rejilla no cambia', () => {
    expect(snapToGrid(24)).toBe(24)
    expect(snapToGrid(48)).toBe(48)
  })

  it('funciona con negativos', () => {
    expect(snapToGrid(-24)).toBe(-24)
    expect(snapToGrid(-37)).toBe(-48) // -1.54 -> -2
    expect(snapToGrid(-44)).toBe(-48) // -1.83 -> -2
  })

  it('redondea al multiplo mas cercano tambien en negativo', () => {
    // -10 dista 10 de 0 y 14 de -24, asi que cae en 0
    expect(snapToGrid(-10)).toBe(0)
    expect(snapToGrid(-5)).toBe(0)
    // -20 dista 20 de 0 y 4 de -24
    expect(snapToGrid(-20)).toBe(-24)
  })

  it('nunca devuelve -0', () => {
    // Math.round(-0.4) * 24 produce -0, que rompe Object.is y aparece al
    // serializar el proyecto. El `+ 0` de la implementacion lo normaliza.
    expect(Object.is(snapToGrid(0), 0)).toBe(true)
    expect(Object.is(snapToGrid(-5), 0)).toBe(true)
    expect(Object.is(snapToGrid(-10), 0)).toBe(true)
  })

  it('la rejilla es configurable', () => {
    expect(snapToGrid(10, 5)).toBe(10)
    expect(snapToGrid(12, 5)).toBe(10)
    expect(snapToGrid(13, 5)).toBe(15)
  })

  it('usa GRID_SIZE por defecto', () => {
    expect(GRID_SIZE).toBe(24)
    expect(snapToGrid(30)).toBe(snapToGrid(30, GRID_SIZE))
  })
})

describe('screenToWorld', () => {
  it('el centro de la pantalla es el centro de la camara', () => {
    const world = screenToWorld({ x: 400, y: 300 }, camera, viewport)
    expect(world.x).toBeCloseTo(0)
    expect(world.y).toBeCloseTo(0)
  })

  it('el eje Y esta INVERTIDO', () => {
    // Un punto por DEBAJO del centro en pantalla (y mayor) debe dar un worldY
    // MENOR: en el mundo el eje Y crece hacia arriba.
    const abajo = screenToWorld({ x: 400, y: 500 }, camera, viewport)
    const arriba = screenToWorld({ x: 400, y: 100 }, camera, viewport)

    expect(abajo.y).toBeLessThan(0)
    expect(arriba.y).toBeGreaterThan(0)
  })

  it('el eje X no se invierte', () => {
    const derecha = screenToWorld({ x: 700, y: 300 }, camera, viewport)
    expect(derecha.x).toBeGreaterThan(0)
  })

  it('la escala es 1 unidad por pixel con este frustum', () => {
    // frustumWidth 800 / viewport 800 px = 1 unidad por pixel
    const world = screenToWorld({ x: 500, y: 300 }, camera, viewport)
    expect(world.x).toBeCloseTo(100)
  })

  it('el zoom escala la conversion', () => {
    const conZoom: OrthoCamera = { ...camera, zoom: 2 }
    // Con el doble de zoom, el mismo desplazamiento en pantalla recorre la mitad
    const world = screenToWorld({ x: 500, y: 300 }, conZoom, viewport)
    expect(world.x).toBeCloseTo(50)
  })

  it('respeta el centro de la camara', () => {
    const desplazada: OrthoCamera = { ...camera, center: { x: 100, y: 50 } }
    const world = screenToWorld({ x: 400, y: 300 }, desplazada, viewport)
    expect(world.x).toBeCloseTo(100)
    expect(world.y).toBeCloseTo(50)
  })
})

describe('worldToScreen', () => {
  it('es la inversa exacta de screenToWorld', () => {
    const puntos = [
      { x: 0, y: 0 },
      { x: 137, y: 421 },
      { x: 799, y: 599 },
      { x: 1, y: 1 },
    ]

    for (const punto of puntos) {
      const world = screenToWorld(punto, camera, viewport)
      const vuelta = worldToScreen(world, camera, viewport)
      expect(vuelta.x).toBeCloseTo(punto.x)
      expect(vuelta.y).toBeCloseTo(punto.y)
    }
  })

  it('tambien es inversa con zoom y centro desplazado', () => {
    const otra: OrthoCamera = { frustumWidth: 1200, center: { x: -50, y: 80 }, zoom: 1.7 }
    const punto = { x: 233, y: 477 }

    const world = screenToWorld(punto, otra, viewport)
    const vuelta = worldToScreen(world, otra, viewport)
    expect(vuelta.x).toBeCloseTo(punto.x)
    expect(vuelta.y).toBeCloseTo(punto.y)
  })

  it('el centro del mundo cae en el centro de la pantalla', () => {
    const screen = worldToScreen({ x: 0, y: 0 }, camera, viewport)
    expect(screen.x).toBeCloseTo(400)
    expect(screen.y).toBeCloseTo(300)
  })
})

describe('screenToSnappedWorld', () => {
  it('devuelve siempre un multiplo de la rejilla', () => {
    for (let px = 0; px < 800; px += 37) {
      for (let py = 0; py < 600; py += 53) {
        const world = screenToSnappedWorld({ x: px, y: py }, camera, viewport)
        // `world.x % GRID_SIZE` puede dar -0 en los negativos, y `Object.is(-0, 0)`
        // es false. Se normaliza antes de comparar en vez de aflojar la asercion:
        // el -0 es un artefacto del operador `%`, no del valor.
        expect((world.x % GRID_SIZE) + 0).toBe(0)
        expect((world.y % GRID_SIZE) + 0).toBe(0)
      }
    }
  })

  it('imanta al multiplo mas cercano del punto sin imantar', () => {
    const libre = screenToWorld({ x: 500, y: 300 }, camera, viewport)
    const imantado = screenToSnappedWorld({ x: 500, y: 300 }, camera, viewport)

    expect(imantado.x).toBe(snapToGrid(libre.x))
    expect(imantado.y).toBe(snapToGrid(libre.y))
  })
})
