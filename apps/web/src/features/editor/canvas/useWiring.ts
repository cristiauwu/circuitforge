/**
 * Cableado: une el estado de la maquina de pines con el store.
 *
 * Este hook es **deliberadamente fino**. Toda la decision vive en
 * `resolvePinClick`, que es puro y se prueba sin React; aqui solo se guarda el
 * estado y se llama al store. Es la separacion que permite probar el caso
 * "destino rechazado" con una linea en vez de montando un componente.
 *
 * **Compartido por toda la capa de escena, no por componente.** Si cada
 * `SceneComponent` tuviera su propio `useState`, el pin de origen se guardaria en
 * el estado de un componente y el segundo clic llegaria a otro distinto: el
 * cableado nunca se completaria. Por eso el estado vive en `EditorPage` y se pasa
 * por contexto.
 */

import type { PinEndpoint } from '@circuitforge/netlist'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { EMPTY_WIRING, resolvePinClick, type WiringState } from './wiringState'

export interface WiringApi {
  /** Primer pin pulsado, o `null`. */
  pending: PinEndpoint | null
  /** Mensaje de la ultima conexion rechazada. */
  error: string | null
  /** Pulsa un pin: selecciona, conecta, rechaza o cancela. */
  onPinClick: (endpoint: PinEndpoint) => void
  /** Cancela el cableado en curso. */
  cancel: () => void
  /** Limpia solo el mensaje de error, sin tocar el origen. */
  clearError: () => void
  /** Cuantos cables se han creado en esta sesion. Para el aviso de exito. */
  lastConnected: string | null
}

const WiringContext = createContext<WiringApi | null>(null)

/**
 * Provee el estado de cableado a la capa de escena.
 *
 * Se monta UNA vez, en `EditorPage`, envolviendo el lienzo.
 */
export function useWiringProvider(): WiringApi {
  const [state, setState] = useState<WiringState>(EMPTY_WIRING)
  const [lastConnected, setLastConnected] = useState<string | null>(null)

  /**
   * Copia del estado para leerlo dentro del handler sin recrearlo.
   *
   * Sin esto, `onPinClick` dependeria de `state` y se recrearia en cada cambio,
   * lo que a su vez recrearia el contexto entero y re-renderizaria los 22
   * simbolos de la escena cada vez que se pulsa un pin.
   */
  const stateRef = useRef<WiringState>(EMPTY_WIRING)

  const connectPins = useEditorStore((s) => s.connectPins)

  const onPinClick = useCallback(
    (endpoint: PinEndpoint) => {
      // Se calcula FUERA del updater de `setState`.
      //
      // Un updater debe ser puro, y aqui hay un efecto secundario real: llamar al
      // store para crear el net. Hacerlo dentro provocaria que React lo ejecutara
      // dos veces en StrictMode y creara el net por duplicado. Calculando el
      // resultado antes, la conexion ocurre exactamente una vez.
      const outcome = resolvePinClick(stateRef.current, endpoint, connectPins)

      stateRef.current = outcome.state
      setState(outcome.state)

      if (outcome.kind === 'connected') {
        setLastConnected(endpoint.pinId)
      } else if (outcome.kind === 'rejected') {
        setLastConnected(null)
      }
    },
    [connectPins],
  )

  const cancel = useCallback(() => {
    // El ref y el estado se mantienen juntos: si el ref se quedara con el pin
    // pendiente, el siguiente clic intentaria conectar con un origen que el
    // usuario ya habia cancelado.
    stateRef.current = EMPTY_WIRING
    setState(EMPTY_WIRING)
    setLastConnected(null)
  }, [])

  const clearError = useCallback(() => {
    const next: WiringState = { ...stateRef.current, error: null }
    stateRef.current = next
    setState(next)
  }, [])

  return useMemo(
    () => ({
      pending: state.pending,
      error: state.error,
      onPinClick,
      cancel,
      clearError,
      lastConnected,
    }),
    [state.pending, state.error, onPinClick, cancel, clearError, lastConnected],
  )
}

/** Contexto del proveedor, para que lo consuma la capa de escena. */
export const WiringProviderContext = WiringContext

/**
 * Lee el estado de cableado.
 *
 * Lanza si no hay proveedor: un `SceneComponent` sin contexto no puede cablear
 * nada, y fallar rapido es mejor que un cableado que no responde sin explicacion.
 */
export function useWiring(): WiringApi {
  const api = useContext(WiringContext)
  if (api === null) {
    throw new Error('useWiring necesita un WiringProvider por encima en el arbol')
  }
  return api
}
