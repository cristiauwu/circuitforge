/**
 * Estado del cableado en curso.
 *
 * El usuario pulsa un pin, luego otro, y se crea un net. Es una maquina de dos
 * estados muy simple, pero tiene tres decisiones que importan y que conviene
 * tener en un sitio testeable:
 *
 *  1. **Un destino rechazado NO pierde el origen.** Si el usuario intenta cablear
 *     alimentacion con tierra y V-1 lo bloquea, el pin de origen se mantiene: la
 *     intencion era cablear, y perder el origen le obliga a empezar de nuevo.
 *  2. **Pulsar el mismo pin cancela.** No es un error, es la forma natural de
 *     decir "me arrepenti" sin buscar la tecla Escape.
 *  3. **La validacion no vive aqui.** Este modulo solo orquesta; quien decide si
 *     dos pines pueden unirse es `canConnect`, dentro del store.
 *
 * # Por que la logica esta fuera de React
 *
 * El brief recomendaba extraerla a una funcion pura, y es lo correcto: con el
 * `useState` dentro del hook, probar el caso "destino rechazado" exigiria montar
 * un componente y simular eventos. Como funcion pura, el estado es un valor y la
 * transicion se comprueba con una linea.
 */

import type { PinEndpoint } from '@circuitforge/netlist'

/** Estado del cableado. `pending` es el primer pin pulsado. */
export interface WiringState {
  pending: PinEndpoint | null
  /** Mensaje de la ultima conexion rechazada, en espanol. */
  error: string | null
}

/** Estado inicial: nada pulsado, nada que reportar. */
export const EMPTY_WIRING: WiringState = { pending: null, error: null }

/** Los dos pines son el mismo? */
export function isSamePin(a: PinEndpoint, b: PinEndpoint): boolean {
  return a.componentId === b.componentId && a.pinId === b.pinId
}

/**
 * Resultado de pulsar un pin.
 *
 * Es una union discriminada y no un `WiringState` con banderas porque las tres
 * situaciones son excluyentes y el consumidor debe tratarlas distinto:
 * seleccionar no crea net, conectar si, y cancelar limpia.
 */
export type PinClickOutcome =
  | { kind: 'selected'; state: WiringState }
  | { kind: 'connected'; state: WiringState }
  | { kind: 'rejected'; state: WiringState }
  | { kind: 'cancelled'; state: WiringState }

/**
 * Decide que hacer al pulsar un pin.
 *
 * @param state Estado actual del cableado.
 * @param endpoint Pin pulsado.
 * @param connect Funcion que intenta la conexion. Se inyecta para que este modulo
 *   no dependa del store y se pueda probar con una funcion de mentira: el caso
 *   "rechazado" se prueba sin construir un circuito que viole V-1.
 */
export function resolvePinClick(
  state: WiringState,
  endpoint: PinEndpoint,
  connect: (a: PinEndpoint, b: PinEndpoint) => { ok: boolean; message?: string | undefined },
): PinClickOutcome {
  const { pending } = state

  // Primer clic: no hay nada en curso, se guarda el origen.
  if (pending === null) {
    return { kind: 'selected', state: { pending: endpoint, error: null } }
  }

  // Clic en el mismo pin: cancela. No es un error, es arrepentirse.
  if (isSamePin(pending, endpoint)) {
    return { kind: 'cancelled', state: EMPTY_WIRING }
  }

  const result = connect(pending, endpoint)

  if (result.ok) {
    return { kind: 'connected', state: EMPTY_WIRING }
  }

  // Rechazado: se MANTIENE el origen para que el usuario pueda probar otro
  // destino sin volver a empezar. El mensaje explica por que no se pudo.
  return {
    kind: 'rejected',
    state: {
      pending,
      error: result.message ?? 'No se pueden conectar esos pines.',
    },
  }
}
