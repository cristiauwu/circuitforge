import { describe, expect, it } from 'vitest'
import {
  basePinPosition,
  COMPONENT_SIZE,
  pinPositionOf,
  pinWorldPosition,
  rotateAround,
  sampleQuadraticBezier,
  wireControlPoint,
} from './pinGeometry'

/** Componente de referencia: en el origen, sin rotar. */
const at = (x: number, y: number, rotation = 0) => ({ position: { x, y, rotation } })

describe('basePinPosition', () => {
  it('reparte los pines equiespaciados en el borde inferior', () => {
    const component = at(0, 0)
    const a = basePinPosition(component, 0, 2)
    const b = basePinPosition(component, 1, 2)

    // Los dos en el borde inferior
    expect(a.y).toBe(-COMPONENT_SIZE.height / 2)
    expect(b.y).toBe(-COMPONENT_SIZE.height / 2)

    // Repartidos simetricamente alrededor del centro
    expect(a.x).toBeLessThan(0)
    expect(b.x).toBeGreaterThan(0)
    expect(a.x).toBeCloseTo(-b.x)
  })

  it('nunca pone un pin en la esquina del componente', () => {
    // Con 2 pines, el reparto index/(count-1) los pondria en los vertices.
    const component = at(0, 0)
    const a = basePinPosition(component, 0, 2)
    const b = basePinPosition(component, 1, 2)

    const leftEdge = -COMPONENT_SIZE.width / 2
    const rightEdge = COMPONENT_SIZE.width / 2

    expect(a.x).toBeGreaterThan(leftEdge)
    expect(b.x).toBeLessThan(rightEdge)
  })

  it('con un solo pin cae en el centro del borde inferior', () => {
    const p = basePinPosition(at(10, 20), 0, 1)
    expect(p.x).toBe(10)
    expect(p.y).toBe(20 - COMPONENT_SIZE.height / 2)
  })

  it('con cero pines devuelve el centro', () => {
    const p = basePinPosition(at(7, 9), 0, 0)
    expect(p).toEqual({ x: 7, y: 9 })
  })

  it('respeta un tamano distinto', () => {
    const p = basePinPosition(at(0, 0), 0, 1, { width: 100, height: 50 })
    expect(p.y).toBe(-25)
  })
})

describe('rotateAround', () => {
  it('con 0 grados no mueve el punto', () => {
    const p = rotateAround({ x: 5, y: 3 }, { x: 0, y: 0 }, 0)
    expect(p).toEqual({ x: 5, y: 3 })
  })

  it('90 grados horarios en pantalla llevan el punto de abajo a la izquierda', () => {
    // El mundo tiene Y hacia arriba: un punto DEBAJO del centro (y negativo) al
    // rotar 90 grados en sentido horario de pantalla acaba a la IZQUIERDA.
    const p = rotateAround({ x: 0, y: -10 }, { x: 0, y: 0 }, 90)
    expect(p.x).toBeCloseTo(-10)
    expect(p.y).toBeCloseTo(0)
  })

  it('conserva la distancia al centro', () => {
    const center = { x: 3, y: 4 }
    const point = { x: 10, y: 12 }
    const before = Math.hypot(point.x - center.x, point.y - center.y)

    for (const degrees of [90, 180, 270]) {
      const rotated = rotateAround(point, center, degrees)
      const after = Math.hypot(rotated.x - center.x, rotated.y - center.y)
      expect(after).toBeCloseTo(before)
    }
  })

  it('cuatro rotaciones de 90 vuelven al punto original', () => {
    const center = { x: 0, y: 0 }
    let point = { x: 7, y: -3 }

    for (let i = 0; i < 4; i++) {
      point = rotateAround(point, center, 90)
    }

    expect(point.x).toBeCloseTo(7)
    expect(point.y).toBeCloseTo(-3)
  })

  it('180 grados invierte el punto respecto al centro', () => {
    const p = rotateAround({ x: 10, y: 5 }, { x: 0, y: 0 }, 180)
    expect(p.x).toBeCloseTo(-10)
    expect(p.y).toBeCloseTo(-5)
  })
})

describe('pinWorldPosition', () => {
  it('sin rotacion, coincide con la posicion base', () => {
    const component = at(20, 30)
    const world = pinWorldPosition(component, 0, 2)
    const base = basePinPosition(component, 0, 2)
    expect(world).toEqual(base)
  })

  it('rotar 90 grados MUEVE el pin a otra posicion', () => {
    const component = at(0, 0)
    const sinRotar = pinWorldPosition(component, 0, 2)
    const rotado = pinWorldPosition(at(0, 0, 90), 0, 2)

    expect(rotado.x).not.toBeCloseTo(sinRotar.x)
  })

  it('rotar conserva la distancia al centro del componente', () => {
    const distanceOf = (rotation: number) => {
      const p = pinWorldPosition(at(50, 50, rotation), 0, 3)
      return Math.hypot(p.x - 50, p.y - 50)
    }

    const base = distanceOf(0)
    expect(distanceOf(90)).toBeCloseTo(base)
    expect(distanceOf(180)).toBeCloseTo(base)
    expect(distanceOf(270)).toBeCloseTo(base)
  })

  it('cuatro rotaciones devuelven la posicion original', () => {
    const original = pinWorldPosition(at(12, -8), 1, 3)
    // Aplicar 4 x 90 equivale a 360
    const vuelta = pinWorldPosition(at(12, -8, 360), 1, 3)
    expect(vuelta.x).toBeCloseTo(original.x)
    expect(vuelta.y).toBeCloseTo(original.y)
  })

  it('el pin nunca se aleja mas de la diagonal del componente', () => {
    const diagonal = Math.hypot(COMPONENT_SIZE.width, COMPONENT_SIZE.height)
    for (const rotation of [0, 90, 180, 270]) {
      for (let index = 0; index < 9; index++) {
        const p = pinWorldPosition(at(0, 0, rotation), index, 9)
        expect(Math.hypot(p.x, p.y)).toBeLessThan(diagonal)
      }
    }
  })

  it('con cero pines devuelve el centro aunque haya rotacion', () => {
    const p = pinWorldPosition(at(5, 5, 90), 0, 0)
    expect(p.x).toBeCloseTo(5)
    expect(p.y).toBeCloseTo(5)
  })
})

describe('pinPositionOf', () => {
  const components = [
    {
      id: 'R1',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [{ pinId: 'a' }, { pinId: 'b' }],
    },
    {
      id: 'D1',
      position: { x: 100, y: 0, rotation: 90 },
      pins: [{ pinId: 'anode' }, { pinId: 'cathode' }],
    },
  ]

  it('encuentra la posicion de un pin por componente y pin', () => {
    const p = pinPositionOf(components, 'R1', 'a')
    expect(p).not.toBeNull()
    expect(p?.y).toBe(-COMPONENT_SIZE.height / 2)
  })

  it('aplica la rotacion del componente', () => {
    const sinRotar = pinPositionOf(
      [{ id: 'D1', position: { x: 100, y: 0, rotation: 0 }, pins: [{ pinId: 'anode' }] }],
      'D1',
      'anode',
    )
    const rotado = pinPositionOf(components, 'D1', 'anode')

    expect(rotado?.x).not.toBeCloseTo(sinRotar?.x ?? 0)
  })

  it('devuelve null si el componente no existe', () => {
    expect(pinPositionOf(components, 'NO_EXISTE', 'a')).toBeNull()
  })

  it('devuelve null si el pin no existe', () => {
    // Devolver null en vez de lanzar permite dibujar un net huerfano sin romper
    // la escena entera.
    expect(pinPositionOf(components, 'R1', 'zzz')).toBeNull()
  })

  it('los dos pines de un componente caen en sitios distintos', () => {
    const a = pinPositionOf(components, 'R1', 'a')
    const b = pinPositionOf(components, 'R1', 'b')
    expect(a?.x).not.toBeCloseTo(b?.x ?? 0)
  })
})

describe('wireControlPoint', () => {
  it('el codo queda por DEBAJO de los dos extremos', () => {
    // Los pines viven en el borde inferior, asi que el cable sale hacia abajo.
    const control = wireControlPoint({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(control.y).toBeLessThan(0)
  })

  it('el codo se centra horizontalmente', () => {
    const control = wireControlPoint({ x: 0, y: 0 }, { x: 80, y: 40 })
    expect(control.x).toBeCloseTo(40)
  })

  it('el codo crece con la distancia pero tiene tope', () => {
    const corto = wireControlPoint({ x: 0, y: 0 }, { x: 50, y: 0 })
    const largo = wireControlPoint({ x: 0, y: 0 }, { x: 400, y: 0 })
    const enorme = wireControlPoint({ x: 0, y: 0 }, { x: 4000, y: 0 })

    expect(Math.abs(largo.y)).toBeGreaterThan(Math.abs(corto.y))
    // El tope evita un rizo absurdo en un cable muy largo
    expect(Math.abs(enorme.y)).toBeLessThanOrEqual(90)
  })
})

describe('sampleQuadraticBezier', () => {
  const from = { x: 0, y: 0 }
  const control = { x: 50, y: -50 }
  const to = { x: 100, y: 0 }

  it('empieza exactamente en el origen', () => {
    const points = sampleQuadraticBezier(from, control, to)
    expect(points[0]?.[0]).toBeCloseTo(0)
    expect(points[0]?.[1]).toBeCloseTo(0)
  })

  it('termina exactamente en el destino', () => {
    const points = sampleQuadraticBezier(from, control, to)
    const last = points[points.length - 1]
    expect(last?.[0]).toBeCloseTo(100)
    expect(last?.[1]).toBeCloseTo(0)
  })

  it('devuelve segments + 1 puntos', () => {
    expect(sampleQuadraticBezier(from, control, to, 10)).toHaveLength(11)
    expect(sampleQuadraticBezier(from, control, to, 24)).toHaveLength(25)
  })

  it('pasa cerca del punto de control', () => {
    // En t = 0.5 una Bezier cuadratica esta a medio camino del control
    const points = sampleQuadraticBezier(from, control, to, 2)
    const mid = points[1]
    expect(mid?.[1]).toBeCloseTo(-25)
  })

  it('todos los puntos estan en z = 0', () => {
    const points = sampleQuadraticBezier(from, control, to)
    expect(points.every((p) => p[2] === 0)).toBe(true)
  })
})
