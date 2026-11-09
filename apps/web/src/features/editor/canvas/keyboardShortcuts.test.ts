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

  it('Cmd+Shift+Z y Cmd+Y rehacen (Mac)', () => {
    expect(resolveShortcut(key('Z', { metaKey: true, shiftKey: true }), withoutSelection)).toEqual({
      kind: 'redo',
    })
    expect(resolveShortcut(key('y', { metaKey: true }), withoutSelection)).toEqual({ kind: 'redo' })
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
  const typingTargets: { name: string; target: Partial<KeyEventLike> }[] = [
    { name: 'INPUT', target: { targetTagName: 'INPUT' } },
    { name: 'TEXTAREA', target: { targetTagName: 'TEXTAREA' } },
    { name: 'SELECT', target: { targetTagName: 'SELECT' } },
    { name: 'contenteditable', target: { targetTagName: 'DIV', targetIsEditable: true } },
  ]
  const shortcuts: { name: string; event: KeyEventLike }[] = [
    { name: 'Ctrl+Z', event: key('z', { ctrlKey: true }) },
    { name: 'Cmd+Z', event: key('z', { metaKey: true }) },
    { name: 'Ctrl+Shift+Z', event: key('Z', { ctrlKey: true, shiftKey: true }) },
    { name: 'Cmd+Shift+Z', event: key('Z', { metaKey: true, shiftKey: true }) },
    { name: 'Ctrl+Y', event: key('y', { ctrlKey: true }) },
    { name: 'Cmd+Y', event: key('y', { metaKey: true }) },
    { name: 'Delete', event: key('Delete') },
    { name: 'Backspace', event: key('Backspace') },
    { name: 'R', event: key('r') },
  ]

  describe.each(typingTargets)('$name conserva el teclado nativo', ({ target }) => {
    it.each(shortcuts)('no dispara $name en el editor', ({ event }) => {
      expect(resolveShortcut({ ...event, ...target }, withSelection)).toEqual({ kind: 'none' })
      expect(resolveShortcut({ ...event, ...target }, withoutSelection)).toEqual({ kind: 'none' })
    })
  })

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
