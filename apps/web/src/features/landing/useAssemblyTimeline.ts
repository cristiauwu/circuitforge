import { useEffect, useRef, useState } from 'react'

/**
 * Secuencia de ensamblado de la portada (documento de diseño sección 3).
 *
 * **Una sola fuente de verdad.** Cada etapa declara su instante y su nombre; de
 * esta lista se derivan los temporizadores y las comprobaciones de "ya toca".
 * Antes habia una tabla de milisegundos duplicada en el componente, que se
 * desincronizaria al primer ajuste de ritmo.
 *
 * El orden importa: cada etapa asume que la anterior ya se vio.
 *
 * **Por que el ritmo es tan corto:** la secuencia original terminaba a los 3 s,
 * y el titular y los botones no aparecian hasta los 2.6 s y los 3 s. Medido en el
 * navegador, eso significaba que la portada pasaba casi tres segundos con el
 * texto invisible. La secuencia completa ahora termina en 1.9 s: el circuito se
 * sigue viendo montarse pieza a pieza, pero el usuario no espera para leer.
 */
export const STAGES = [
  { name: 'source', at: 120 },
  { name: 'resistor', at: 380 },
  { name: 'led', at: 640 },
  { name: 'wireToResistor', at: 880 },
  { name: 'wireToLed', at: 1120 },
  { name: 'wireToGround', at: 1360 },
  { name: 'pulse', at: 1500 },
  { name: 'title', at: 1600 },
  { name: 'cta', at: 1900 },
] as const

export type StageName = (typeof STAGES)[number]['name']

/** Estado de cada etapa de la secuencia. */
export type AssemblyState = Record<StageName, boolean>

/** Instante en que el LED ya conduce corriente: su brillo depende de esto. */
const CONDUCTING_FROM: StageName = 'wireToGround'

const EMPTY: AssemblyState = {
  source: false,
  resistor: false,
  led: false,
  wireToResistor: false,
  wireToLed: false,
  wireToGround: false,
  pulse: false,
  title: false,
  cta: false,
}

const ALL: AssemblyState = {
  source: true,
  resistor: true,
  led: true,
  wireToResistor: true,
  wireToLed: true,
  wireToGround: true,
  pulse: true,
  title: true,
  cta: true,
}

/**
 * Avanza la secuencia con temporizadores.
 *
 * **`reduced` es la ruta importante:** con `prefers-reduced-motion` se devuelve
 * el estado final completo. El circuito aparece ya montado y encendido — la misma
 * información, sin movimiento. No es una degradacion.
 */
export function useAssemblyTimeline(reduced: boolean): AssemblyState {
  const [state, setState] = useState<AssemblyState>(reduced ? ALL : EMPTY)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (reduced) {
      setState(ALL)
      return
    }

    for (const stage of STAGES) {
      timers.current.push(
        window.setTimeout(() => {
          setState((prev) => ({ ...prev, [stage.name]: true }))
        }, stage.at),
      )
    }

    return () => {
      for (const id of timers.current) window.clearTimeout(id)
      timers.current = []
    }
  }, [reduced])

  return state
}

/**
 * Detecta `prefers-reduced-motion` y se suscribe a cambios en vivo: si el usuario
 * activa la preferencia con la página abierta, la secuencia se detiene sin recargar.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** `true` cuando el LED ya conduce: es lo que enciende su halo y su color. */
export function isConducting(state: AssemblyState): boolean {
  return state[CONDUCTING_FROM]
}
