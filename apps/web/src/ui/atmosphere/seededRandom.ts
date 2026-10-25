/**
 * Generador pseudoaleatorio con semilla.
 *
 * Por que no `Math.random()`: el fondo se redibuja en cada render y con azar real
 * las pistas cambiarian de sitio a cada navegacion. El usuario veria el fondo
 * "saltar" al cambiar de ruta. Con una semilla fija el dibujo es siempre el
 * mismo: organico a la vista, determinista por dentro.
 *
 * Es un generador congruencial lineal (los multiplicadores son los de Numerical
 * Recipes). No necesita calidad criptografica: solo que no se note el patron.
 */

/** Crea un generador reproducible a partir de una semilla entera. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** Entero entre `min` y `max`, ambos incluidos. */
export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

/** Elige un elemento de la lista. */
export function pick<T>(rand: () => number, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(rand() * items.length)]
}
