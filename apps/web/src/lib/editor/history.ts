/**
 * Historial de deshacer/rehacer.
 *
 * Funciones **puras**: no mutan la entrada y devuelven siempre referencias
 * nuevas. Eso es lo que permite que el store de Zustand compare por referencia
 * y que React no re-renderice lo que no cambió.
 *
 * Modelo: `past` (lo deshacible) · `present` (el estado actual) · `future`
 * (lo rehacible). Al empujar un estado nuevo, `future` se descarta: la rama que
 * se había deshecho deja de existir, que es el comportamiento estándar de
 * cualquier editor.
 */

/** Estado del historial. Genérico sobre el tipo de dato que se versiona. */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

/**
 * Límite de entradas deshacibles.
 *
 * 50 es suficiente para una sesión de trabajo real y acota la memoria: cada
 * entrada es una copia estructural del proyecto, no una referencia compartida.
 */
export const HISTORY_LIMIT = 50

/** Crea un historial con un estado inicial y sin nada que deshacer. */
export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

/**
 * Empuja un estado nuevo.
 *
 * Descarta la rama rehacible y recorta `past` al límite, tirando siempre la
 * entrada **más antigua** (el principio del array), que es la que menos
 * probable es que el usuario quiera recuperar.
 */
export function push<T>(history: History<T>, next: T, limit: number = HISTORY_LIMIT): History<T> {
  const past = [...history.past, history.present]
  // `slice` con índice negativo recorta por delante; con 0 devuelve todo.
  const trimmed = past.length > limit ? past.slice(past.length - limit) : past
  return { past: trimmed, present: next, future: [] }
}

/**
 * Deshace.
 *
 * Con la pila vacía devuelve **el mismo objeto** en vez de lanzar o devolver
 * `undefined`: deshacer de más no es un error del usuario, y el llamador no
 * debería tener que comprobarlo antes.
 */
export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1]
  if (previous === undefined) return history

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

/** Rehace. Mismo criterio que `undo`: sin pila, devuelve el mismo objeto. */
export function redo<T>(history: History<T>): History<T> {
  const next = history.future[0]
  if (next === undefined) return history

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  }
}

/** ¿Hay algo que deshacer? */
export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

/** ¿Hay algo que rehacer? */
export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}
