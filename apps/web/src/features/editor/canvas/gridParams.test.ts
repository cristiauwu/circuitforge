import { describe, expect, it } from 'vitest'
import { gridOpacity, gridParams } from './gridParams'

describe('gridParams', () => {
  it('fadeDistance NUNCA es cero', () => {
    // Es el bug que dejo el lienzo negro en la maquina del usuario. Un
    // fadeDistance de 0 hace `dist / 0 = Infinito`, que lleva a `pow(0, 0)`, que
    // no esta definido en GLSL: unos drivers devuelven 1 y otros 0.
    expect(gridParams().fadeDistance).toBeGreaterThan(0)
  })

  it('fadeDistance es muy grande, para que no atenue', () => {
    // Un valor grande consigue el efecto deseado —sin atenuacion por distancia—
    // sin caer en la division por cero.
    expect(gridParams().fadeDistance).toBeGreaterThanOrEqual(100_000)
  })

  it('los grosores son visibles a densidad 1', () => {
    // Por debajo de 1 px el shader descarta la linea.
    expect(gridParams().cellThickness).toBeGreaterThanOrEqual(1)
    expect(gridParams().sectionThickness).toBeGreaterThan(gridParams().cellThickness)
  })

  it('las secciones son mas espaciadas que las celdas', () => {
    expect(gridParams().sectionEvery).toBeGreaterThan(1)
  })
})

describe('gridOpacity — la formula del shader', () => {
  it('un fadeDistance de cero es el caso indefinido', () => {
    // No devuelve 0 ni 1: devuelve null, porque no hay un valor correcto.
    expect(gridOpacity(100, 0, 0)).toBeNull()
  })

  it('un fadeDistance NEGATIVO tambien es invalido', () => {
    expect(gridOpacity(100, -5, 0)).toBeNull()
  })

  it('con el valor real, la opacidad es 1 en cualquier distancia', () => {
    // Es lo que se pretende: la reticula no se atenua. Y con `pow(1, 0)` el
    // calculo SI esta definido.
    const { fadeDistance, fadeStrength } = gridParams()

    for (const distance of [0, 1, 100, 1000, 5000]) {
      expect(gridOpacity(distance, fadeDistance, fadeStrength)).toBe(1)
    }
  })

  it('sin el arreglo, el caso indefinido aparece incluso a distancia cero', () => {
    // Documenta el fallo: con fadeDistance 0, la formula cae en `pow(0, 0)`
    // incluso cuando el objeto esta pegado a la camara. Por eso el lienzo
    // entero quedaba negro, no solo los bordes.
    expect(gridOpacity(0, 0, 0)).toBeNull()
  })

  it('con atenuacion activa si decae con la distancia', () => {
    // Control: la formula es correcta cuando los parametros son validos.
    const cerca = gridOpacity(10, 100, 1)
    const lejos = gridOpacity(80, 100, 1)

    expect(cerca).not.toBeNull()
    expect(lejos).not.toBeNull()
    expect(cerca ?? 0).toBeGreaterThan(lejos ?? 0)
  })

  it('a partir del fadeDistance la opacidad llega a cero', () => {
    expect(gridOpacity(100, 100, 1)).toBe(0)
    expect(gridOpacity(200, 100, 1)).toBe(0)
  })
})
