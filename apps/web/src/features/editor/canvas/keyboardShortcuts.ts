/**
 * Atajos de teclado del editor.
 *
 * **Por que estan fuera del componente:** la logica de decidir que hacer con una
 * tecla mezclaba tres cosas —leer los modificadores, detectar si el foco esta en
 * un campo de texto y elegir la accion— y eso disparaba la complejidad por
 * encima del limite. Separarla tiene ademas una ventaja concreta: **se puede
 * probar sin un navegador**, que con el manejador dentro de un `useEffect` no
 * era posible.
 *
 * La regla que mas importa: los atajos se ignoran cuando el usuario esta
 * escribiendo. Sin eso, teclear «r» en el buscador de la paleta rotaria el
 * componente seleccionado, que es un bug que el usuario no sabria explicar.
 */

/** Acciones que un atajo puede disparar. */
export type EditorAction =
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'delete' }
  | { kind: 'rotate' }
  | { kind: 'none' }

/** Lo que el manejador necesita saber del evento. */
export interface KeyEventLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  /** Etiqueta del elemento con el foco, o `undefined` si no es un HTMLElement. */
  targetTagName?: string | undefined
  /** `true` si el foco esta en un campo editable. */
  targetIsEditable?: boolean | undefined
}

/** Contexto del editor que condiciona algunos atajos. */
export interface ShortcutContext {
  /** Hay un componente seleccionado. */
  hasSelection: boolean
}

/**
 * Decide la accion de una tecla.
 *
 * El orden importa: los atajos con modificador se comprueban **antes** del
 * filtro de campo de texto, porque deshacer debe funcionar aunque el foco este
 * en un input. Las teclas sueltas si se filtran.
 */
export function resolveShortcut(event: KeyEventLike, context: ShortcutContext): EditorAction {
  const key = event.key.toLowerCase()
  const modifier = event.ctrlKey || event.metaKey

  // Deshacer y rehacer: funcionan con el foco en cualquier sitio.
  if (modifier && key === 'z' && !event.shiftKey) return { kind: 'undo' }
  if (modifier && key === 'z' && event.shiftKey) return { kind: 'redo' }
  if (modifier && key === 'y') return { kind: 'redo' }

  // A partir de aqui, escribir en un campo no debe disparar nada.
  if (isTypingTarget(event)) return { kind: 'none' }

  if (!context.hasSelection) return { kind: 'none' }

  if (key === 'delete' || key === 'backspace') return { kind: 'delete' }
  if (key === 'r') return { kind: 'rotate' }

  return { kind: 'none' }
}

/** `true` si el foco esta en un campo donde el usuario escribe texto. */
export function isTypingTarget(event: KeyEventLike): boolean {
  if (event.targetIsEditable === true) return true
  const tag = event.targetTagName?.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Traduce un evento de teclado real a la forma que consume `resolveShortcut`.
 *
 * Se extrae aqui para que el componente no tenga que construir el objeto a mano:
 * ese trabajo era parte de lo que disparaba su complejidad, y ademas asi la
 * traduccion —que tiene su propio caso borde, el objetivo que no es un elemento—
 * queda cubierta por tests.
 */
export function toKeyEventLike(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
}): KeyEventLike {
  const isElement = event.target instanceof HTMLElement
  return {
    key: event.key,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    targetTagName: isElement ? (event.target as HTMLElement).tagName : undefined,
    targetIsEditable: isElement ? (event.target as HTMLElement).isContentEditable : undefined,
  }
}
