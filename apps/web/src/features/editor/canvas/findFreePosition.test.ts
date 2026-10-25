import { describe, expect, it } from 'vitest'
import { CLEARANCE_X, CLEARANCE_Y, findFreePosition } from './findFreePosition'

describe('findFreePosition', () => {
  it('el primer componente va al centro', () => {
    expect(findFreePosition([])).toEqual({ x: 0, y: 0 })
  })

  it('el segundo NO cae encima del primero', () => {
    // Este es el bug que motiva la funcion: cuatro clics seguidos apilaban los
    // cuatro componentes en (0,0) y el lienzo parecia no responder.
    const first = findFreePosition([])
    const second = findFreePosition([first])

    expect(second).not.toEqual(first)
  })

  it('cuatro componentes seguidos ocupan cuatro posiciones distintas', () => {
    const placed: { x: number; y: number }[] = []
    for (let i = 0; i < 4; i++) {
      placed.push(findFreePosition(placed))
    }

    const unique = new Set(placed.map((p) => `${p.x},${p.y}`))
    expect(unique.size).toBe(4)
  })

  it('nunca devuelve una posicion que se solape con las existentes', () => {
    const placed: { x: number; y: number }[] = []
    for (let i = 0; i < 20; i++) {
      const next = findFreePosition(placed)
      // Debe respetar la holgura en al menos un eje, o solaparia
      const overlaps = placed.some(
        (p) => Math.abs(p.x - next.x) < CLEARANCE_X && Math.abs(p.y - next.y) < CLEARANCE_Y,
      )
      expect(overlaps).toBe(false)
      placed.push(next)
    }
    expect(placed).toHaveLength(20)
  })

  it('todas las posiciones caen en la rejilla', () => {
    const placed: { x: number; y: number }[] = []
    for (let i = 0; i < 12; i++) {
      const next = findFreePosition(placed)
      expect((next.x % 24) + 0).toBe(0)
      expect((next.y % 24) + 0).toBe(0)
      placed.push(next)
    }
  })

  it('respeta un tamano de rejilla distinto', () => {
    const placed: { x: number; y: number }[] = []
    for (let i = 0; i < 6; i++) {
      placed.push(findFreePosition(placed, 10))
    }
    for (const p of placed) {
      expect((p.x % 10) + 0).toBe(0)
      expect((p.y % 10) + 0).toBe(0)
    }
  })

  it('reutiliza un hueco que quedo libre', () => {
    // Si se coloca en (0,0) y en (48,0), el hueco de arriba o abajo sigue libre
    const occupied = [
      { x: 0, y: 0 },
      { x: 48, y: 0 },
    ]
    const next = findFreePosition(occupied)
    const overlaps = occupied.some(
      (p) => Math.abs(p.x - next.x) < CLEARANCE_X && Math.abs(p.y - next.y) < CLEARANCE_Y,
    )
    expect(overlaps).toBe(false)
  })

  it('sin hueco tras muchos componentes devuelve una posicion valida, no lanza', () => {
    // Llenar en exceso para forzar el camino del fallback
    const many = Array.from({ length: 300 }, (_, i) => ({
      x: (i % 20) * 24,
      y: Math.floor(i / 20) * 24,
    }))
    expect(() => findFreePosition(many)).not.toThrow()
    const result = findFreePosition(many)
    expect(Number.isFinite(result.x)).toBe(true)
    expect(Number.isFinite(result.y)).toBe(true)
  })

  it('acumular el resultado paso a paso da posiciones distintas', () => {
    // Reproduce el uso real: cada llamada recibe lo que ya hay colocado. Es el
    // contrato que rompia el cierre obsoleto del componente, donde las llamadas
    // sincronas recibian todas la misma lista y devolvian el mismo hueco.
    let placed: { x: number; y: number }[] = []
    const seen = new Set<string>()

    for (let i = 0; i < 10; i++) {
      const next = findFreePosition(placed)
      seen.add(`${next.x},${next.y}`)
      placed = [...placed, next]
    }

    expect(seen.size).toBe(10)
  })
})
