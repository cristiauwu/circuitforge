/**
 * Capa atmosferica del sitio.
 *
 * Se monta UNA vez en el shell, no por ruta: asi el fondo es continuo entre
 * navegaciones. Si viviera en cada pagina, al cambiar de ruta se reiniciarian las
 * animaciones y el usuario veria un salto.
 *
 * # Por que NO son manchas de color
 *
 * La primera version eran tres halos radiales difusos. Se descarto por dos
 * motivos:
 *
 *  1. **Es el recurso mas repetido de los ultimos anos.** Manchas de color
 *     difusas no dicen nada del producto y podrian pertenecer a cualquier
 *     aplicacion. La guia de interfaces lo lista entre los patrones de "estetica
 *     generada por IA": *excessive gradients*.
 *  2. **Un simulador de circuitos tiene lenguaje grafico propio.** La placa, la
 *     senal, la reticula de medida: son cosas que el usuario ya esta mirando.
 *     Usarlas como fondo convierte la decoracion en contexto.
 *
 * # Las tres alternativas
 *
 * | Clave | Que dibuja | Caracter |
 * |---|---|---|
 * | `pcb` | Pistas ortogonales con vias | El mas literal y el mas caracteristico |
 * | `scope` | Onda sobre reticula de osciloscopio | Atmosferico, dice "aqui se mide" |
 * | `grid` | Reticula con marcas de regla | El mas sobrio, el que menos compite |
 *
 * Las tres comparten las mismas reglas: `aria-hidden`, sin captura de puntero, y
 * bajo `prefers-reduced-motion` se quedan quietas.
 */

import type { ReactNode } from 'react'
import { EngineeringGrid } from './atmosphere/EngineeringGrid'
import { PcbTraces } from './atmosphere/PcbTraces'
import { ScopeSignal } from './atmosphere/ScopeSignal'

/** Clave de la alternativa de fondo. */
export type AtmosphereBackdrop = 'pcb' | 'scope' | 'grid'

export interface AtmosphereProps {
  /**
   * Intensidad del fondo.
   *
   * El editor usa `soft`: el lienzo ya tiene su propia reticula y un fondo
   * cargado le robaria contraste a los cables de colores.
   */
  intensity?: 'full' | 'soft'
  /** Que alternativa dibujar. */
  backdrop?: AtmosphereBackdrop
}

/** Opacidad del dibujo segun la intensidad. */
const OPACITY: Record<'full' | 'soft', number> = {
  full: 0.55,
  soft: 0.28,
}

function Backdrop({
  backdrop,
  opacity,
}: {
  backdrop: AtmosphereBackdrop
  opacity: number
}): ReactNode {
  if (backdrop === 'scope') return <ScopeSignal opacity={opacity} />
  if (backdrop === 'grid') return <EngineeringGrid opacity={opacity} />
  return <PcbTraces opacity={opacity} />
}

export function Atmosphere({ intensity = 'full', backdrop = 'pcb' }: AtmosphereProps) {
  return (
    <div aria-hidden="true" data-intensity={intensity} data-backdrop={backdrop}>
      <Backdrop backdrop={backdrop} opacity={OPACITY[intensity]} />

      {/* Grano de pelicula sobre todo el viewport */}
      <div className="cf-grain-layer" />

      {/* Vineta: empuja la mirada al centro */}
      <div className="cf-vignette" />
    </div>
  )
}
