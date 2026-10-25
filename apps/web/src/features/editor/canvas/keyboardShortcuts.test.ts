import { describe, expect, it } from 'vitest'
import { type KeyEventLike, resolveShortcut } from './keyboardShortcuts'

/** Evento base: una tecla suelta sin modificadores, sin foco en campo de texto. */
function key(k: string, extra: Partial<KeyEventLike> = {}): KeyEventLike {
  return { key: k, ctrlKey: false, metaKey: false, shiftKey: false, ...extra }
}

const withSelection = { hasSelection: true }
const withoutSelection = { hasSelection: false }

describe('resolveShortcut — deshacer y rehacer', () => {
  it('Ctrl+Z deshace', () => {
    expect(resolveShortcut(key('z', { ctrlKey: true }), withSelection)).toEqual({ kind: 'undo' })
  })

  it('Cmd+Z deshace (Mac)', () => {
    expect(resolveShortcut(key('z', { metaKey: true }), withSelection)).toEqual({ kind: 'undo' })
  })

  it('Ctrl+Shift+Z rehace', () => {
    expect(resolveShortcut(key('z', { ctrlKey: true, shiftKey: true }), withSelection)).toEqual({
      kind: 'redo',
    })
  })

  it('Ctrl+Y rehace', () => {
    expect(resolveShortcut(key('y', { ctrlKey: true }), withSelection)).toEqual({ kind: 'redo' })
  })

  it('deshacer funciona incluso escribiendo en un campo', () => {
    // Un usuario que escribe una resistencia y se arrepiente espera que Ctrl+Z
    // funcione sin tener que sacar el foco del campo.
    const event = key('z', { ctrlKey: true, targetTagName: 'INPUT' })
    expect(resolveShortcut(event, withSelection)).toEqual({ kind: 'undo' })
  })

  it('deshacer funciona sin nada seleccionado', () => {
    expect(resolveShortcut(key('z', { ctrlKey: true }), withoutSelection)).toEqual({ kind: 'undo' })
  })
})

describe('resolveShortcut — eliminar y rotar', () => {
  it('Supr elimina el seleccionado', () => {
    expect(resolveShortcut(key('Delete'), withSelection)).toEqual({ kind: 'delete' })
  })

  it('Retroceso elimina el seleccionado', () => {
    expect(resolveShortcut(key('Backspace'), withSelection)).toEqual({ kind: 'delete' })
  })

  it('R rota el seleccionado', () => {
    expect(resolveShortcut(key('r'), withSelection)).toEqual({ kind: 'rotate' })
  })

  it('R mayuscula tambien rota', () => {
    expect(resolveShortcut(key('R'), withSelection)).toEqual({ kind: 'rotate' })
  })

  it('sin seleccion no elimina ni rota', () => {
    expect(resolveShortcut(key('Delete'), withoutSelection)).toEqual({ kind: 'none' })
    expect(resolveShortcut(key('r'), withoutSelection)).toEqual({ kind: 'none' })
  })
})

describe('resolveShortcut — el filtro de campo de texto', () => {
  it('NO rota al escribir «r» en un campo', () => {
    // Este es el bug que el filtro evita: buscar «resistor» en la paleta rotaba
    // el componente seleccionado, y el usuario no sabria por que.
    const event = key('r', { targetTagName: 'INPUT' })
    expect(resolveShortcut(event, withSelection)).toEqual({ kind: 'none' })
  })

  it('NO elimina al pulsar Retroceso en un campo', () => {
    const event = key('Backspace', { targetTagName: 'TEXTAREA' })
    expect(resolveShortcut(event, withSelection)).toEqual({ kind: 'none' })
  })

  it('reconoce contenteditable', () => {
    const event = key('r', { targetIsEditable: true })
    expect(resolveShortcut(event, withSelection)).toEqual({ kind: 'none' })
  })

  it('la etiqueta se compara sin distinguir mayusculas', () => {
    const event = key('r', { targetTagName: 'input' })
    expect(resolveShortcut(event, withSelection)).toEqual({ kind: 'none' })
  })
})

describe('resolveShortcut — teclas irrelevantes', () => {
  it('una tecla suelta cualquiera no hace nada', () => {
    expect(resolveShortcut(key('a'), withSelection)).toEqual({ kind: 'none' })
    expect(resolveShortcut(key(' '), withSelection)).toEqual({ kind: 'none' })
    expect(resolveShortcut(key('Escape'), withSelection)).toEqual({ kind: 'none' })
  })
})
