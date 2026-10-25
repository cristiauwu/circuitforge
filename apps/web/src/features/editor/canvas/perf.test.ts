import { describe, expect, it } from 'vitest'
import { computeFps } from './perf'

/**
 * Genera instantes de fotograma a un ritmo constante.
 * @param fps Fotogramas por segundo deseados.
 * @param frames Cuántos generar.
 */
function steadyTimestamps(fps: number, frames: number): number[] {
  const step = 1000 / fps
  return Array.from({ length: frames }, (_, i) => i * step)
}

describe('computeFps', () => {
  it('mide 60 fps a partir de instantes regulares', () => {
    const result = computeFps(steadyTimestamps(60, 40))
    expect(result.avg).toBeCloseTo(60, 1)
  })

  it('mide 30 fps a partir de instantes regulares', () => {
    const result = computeFps(steadyTimestamps(30, 40))
    expect(result.avg).toBeCloseTo(30, 1)
  })

  it('descarta los fotogramas de montaje', () => {
    // Primeros 10 fotogramas a 5 fps (montaje lento), el resto a 60
    const warmup = steadyTimestamps(5, 10)
    const stable = steadyTimestamps(60, 40)
    const lastWarmup = warmup[warmup.length - 1] ?? 0
    const merged = [...warmup, ...stable.map((t) => t + lastWarmup)]

    const result = computeFps(merged)
    // Sin descartar el montaje, el promedio caería muy por debajo de 60
    expect(result.avg).toBeGreaterThan(50)
    expect(result.frames).toBe(40)
  })

  it('devuelve numeros y min <= avg', () => {
    const result = computeFps(steadyTimestamps(60, 40))
    expect(Number.isFinite(result.avg)).toBe(true)
    expect(Number.isFinite(result.min)).toBe(true)
    expect(result.min).toBeLessThanOrEqual(result.avg + 0.5)
  })

  it('el peor fotograma delata una pausa puntual', () => {
    // Régimen de 60 fps con un hueco de 100 ms en medio
    const timestamps = steadyTimestamps(60, 40)
    const withHitch = timestamps.map((t, i) => (i >= 20 ? t + 100 : t))

    const result = computeFps(withHitch)
    // El minimo es lo que importa: un hueco de 100 ms son 10 fps en ese
    // fotograma, y es lo que se quiere detectar. No se fija un umbral sobre el
    // promedio porque una pausa de 100 ms sobre una ventana de 650 ms lo baja
    // de forma proporcional, y ese numero no dice nada por si solo.
    expect(result.min).toBeLessThan(20)
    expect(result.min).toBeLessThan(result.avg)
  })

  it('con menos de 2 fotogramas estables no inventa un numero', () => {
    expect(computeFps([])).toEqual({ avg: 0, min: 0, frames: 0 })
    expect(computeFps([0, 16, 32])).toEqual({ avg: 0, min: 0, frames: 0 })
  })

  it('no divide por cero con todos los instantes iguales', () => {
    const same = Array.from({ length: 30 }, () => 100)
    const result = computeFps(same)
    expect(Number.isFinite(result.avg)).toBe(true)
  })
})
