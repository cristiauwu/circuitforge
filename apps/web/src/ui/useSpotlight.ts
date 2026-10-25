/**
 * Reflejo que sigue al cursor.
 *
 * Escribe la posicion del puntero en las variables CSS `--mx` y `--my` del
 * elemento, en porcentaje. El CSS hace el resto con un `radial-gradient`
 * posicionado en esas coordenadas.
 *
 * **Por que variables CSS y no estado de React:** mover el raton dispara decenas
 * de eventos por segundo. Con `useState` cada uno provocaria un render del
 * componente y de sus hijos; con variables CSS el navegador solo recompone el
 * gradiente, sin tocar el arbol de React.
 *
 * Se escribe directamente en el estilo del elemento (no en `:root`) para que
 * cada superficie tenga su propio reflejo independiente.
 */

import { useCallback, useRef } from 'react'

export interface SpotlightHandlers {
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
}

/**
 * Devuelve los handlers que activan el reflejo.
 *
 * @returns `ref` para el elemento que recibe el reflejo y `onPointerMove`.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const element = ref.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    // En porcentaje, para que el gradiente sea independiente del tamano real y
    // no haya que recalcular nada al redimensionar.
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    element.style.setProperty('--mx', `${x}%`)
    element.style.setProperty('--my', `${y}%`)
  }, [])

  return { ref, onPointerMove }
}
