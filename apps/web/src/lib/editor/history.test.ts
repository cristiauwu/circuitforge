import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, createHistory, HISTORY_LIMIT, push, redo, undo } from './history'

describe('createHistory', () => {
  it('empieza sin nada que deshacer ni rehacer', () => {
    const h = createHistory('a')
    expect(h.present).toBe('a')
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })
})

describe('push', () => {
  it('mueve el presente a past y pone el nuevo como presente', () => {
    const h = push(createHistory('a'), 'b')
    expect(h.present).toBe('b')
    expect(h.past).toEqual(['a'])
  })

  it('descarta la rama rehacible al empujar', () => {
    // a -> b, deshacer (queda future=['b']), y empujar 'c' debe tirar 'b'
    const afterUndo = undo(push(createHistory('a'), 'b'))
    expect(canRedo(afterUndo)).toBe(true)

    const afterPush = push(afterUndo, 'c')
    expect(afterPush.future).toEqual([])
    expect(canRedo(afterPush)).toBe(false)
    expect(afterPush.present).toBe('c')
  })

  it('recorta al limite tirando la entrada mas antigua', () => {
    let h = createHistory(0)
    // 60 empujes con limite 50
    for (let i = 1; i <= 60; i++) h = push(h, i, HISTORY_LIMIT)

    expect(h.past).toHaveLength(HISTORY_LIMIT)
    // La mas antigua que sobrevive es 10 (se tiraron 0..9)
    expect(h.past[0]).toBe(10)
    expect(h.present).toBe(60)
  })

  it('respeta un limite distinto', () => {
    let h = createHistory(0)
    for (let i = 1; i <= 10; i++) h = push(h, i, 3)
    expect(h.past).toHaveLength(3)
  })

  it('no muta la entrada', () => {
    const original = createHistory('a')
    const snapshot = JSON.stringify(original)
    push(original, 'b')
    expect(JSON.stringify(original)).toBe(snapshot)
  })
})

describe('undo', () => {
  it('vuelve al estado anterior', () => {
    const h = undo(push(createHistory('a'), 'b'))
    expect(h.present).toBe('a')
  })

  it('con la pila vacia devuelve el MISMO objeto sin lanzar', () => {
    const h = createHistory('a')
    expect(undo(h)).toBe(h)
  })

  it('se puede deshacer varias veces', () => {
    let h = createHistory(1)
    h = push(h, 2)
    h = push(h, 3)
    h = undo(h)
    h = undo(h)
    expect(h.present).toBe(1)
    expect(canUndo(h)).toBe(false)
  })

  it('no muta la entrada', () => {
    const h = push(createHistory('a'), 'b')
    const snapshot = JSON.stringify(h)
    undo(h)
    expect(JSON.stringify(h)).toBe(snapshot)
  })
})

describe('redo', () => {
  it('vuelve al estado deshecho', () => {
    const h = redo(undo(push(createHistory('a'), 'b')))
    expect(h.present).toBe('b')
  })

  it('con la pila vacia devuelve el MISMO objeto', () => {
    const h = createHistory('a')
    expect(redo(h)).toBe(h)
  })

  it('deshacer y rehacer devuelve al punto de partida', () => {
    const start = push(push(createHistory('a'), 'b'), 'c')
    const roundTrip = redo(undo(start))
    expect(roundTrip.present).toBe('c')
    expect(roundTrip.past).toEqual(['a', 'b'])
  })
})
