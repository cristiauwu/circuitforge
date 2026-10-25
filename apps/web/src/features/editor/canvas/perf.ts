/**
 * Medición de fotogramas por segundo.
 *
 * Existe porque **la decisión de arquitectura de esta etapa depende de un
 * número**: si `<Html>` de drei no sostiene 55 fps con 30 componentes, hay que
 * cambiar a `<Svg>`. Sin medir, esa decisión sería una corazonada.
 *
 * Se descartan los primeros fotogramas: los del montaje incluyen la compilación
 * de shaders y la creación del contexto WebGL, así que promediarlos daría un
 * resultado pesimista que no representa el estado estable.
 */

/** Fotogramas que se ignoran al empezar: son los del montaje, no el régimen estable. */
const WARMUP_FRAMES = 10

export interface FpsResult {
  /** Promedio de fotogramas por segundo. */
  avg: number
  /** El peor fotograma observado, en fps. */
  min: number
  /** Número de fotogramas que entraron en la medición. */
  frames: number
}

/**
 * Mide fps durante `durationMs`.
 *
 * Devuelve el promedio y el peor fotograma: el promedio dice si la escena va
 * fluida, y el mínimo delata una pausa puntual —una compilación de shader, un
 * recolector de basura— que el promedio escondería.
 *
 * @param durationMs Cuánto medir. 2000 ms es suficiente y no hace esperar.
 */
export function measureFps(durationMs: number = 2000): Promise<FpsResult> {
  return new Promise((resolve) => {
    const timestamps: number[] = []
    let rafId = 0
    let startedAt = 0

    const tick = (now: number) => {
      if (startedAt === 0) startedAt = now
      timestamps.push(now)

      if (now - startedAt >= durationMs) {
        resolve(computeFps(timestamps))
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    // Si algo cancelara la animación (una pestaña en segundo plano, por
    // ejemplo), el resolvedor quedaría colgado. `requestAnimationFrame` se
    // pausa en pestañas ocultas, así que se resuelve con lo que haya.
    setTimeout(() => {
      globalThis.cancelAnimationFrame(rafId)
      resolve(computeFps(timestamps))
    }, durationMs + 1000)
  })
}

/**
 * Calcula los fps a partir de los instantes de cada fotograma.
 *
 * Exportada para poder probarla sin un navegador: es la única parte de este
 * módulo con lógica real.
 */
export function computeFps(timestamps: number[]): FpsResult {
  // Se descartan los del montaje.
  const stable = timestamps.slice(WARMUP_FRAMES)

  if (stable.length < 2) {
    return { avg: 0, min: 0, frames: stable.length }
  }

  const first = stable[0]
  const last = stable[stable.length - 1]
  if (first === undefined || last === undefined) {
    return { avg: 0, min: 0, frames: stable.length }
  }

  const elapsedSeconds = (last - first) / 1000
  const avg = elapsedSeconds > 0 ? (stable.length - 1) / elapsedSeconds : 0

  // El peor fotograma: el intervalo más largo entre dos consecutivos.
  let longestGap = 0
  for (let i = 1; i < stable.length; i++) {
    const previous = stable[i - 1]
    const current = stable[i]
    if (previous === undefined || current === undefined) continue
    const gap = current - previous
    if (gap > longestGap) longestGap = gap
  }

  const min = longestGap > 0 ? 1000 / longestGap : avg

  return { avg, min, frames: stable.length }
}
