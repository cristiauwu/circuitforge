/**
 * Cuadrícula del lienzo.
 *
 * Se dimensiona muy por encima del viewport visible porque el lienzo tiene paneo:
 * una cuadrícula ajustada al tamaño de la pantalla dejaría de verse al
 * desplazarse, que es justo cuando más se necesita para orientarse.
 *
 * Los colores salen de los tokens del design system, no de literales: si el
 * sistema cambia, la cuadrícula cambia con él.
 */

import { Grid } from '@react-three/drei'
import { resolveTokenColor } from './tokenColor'
import { GRID_SIZE } from './useGridSnap'

/** Lado de la cuadrícula, en unidades de mundo. */
const GRID_EXTENT = 4000

/**
 * Cada cuántas celdas se dibuja una línea de sección (más marcada).
 * 4 celdas = 96 unidades, que da una referencia visual legible sin ruido.
 */
const SECTION_EVERY = 4

export function GridPlane() {
  return (
    <Grid
      args={[GRID_EXTENT, GRID_EXTENT]}
      cellSize={GRID_SIZE}
      cellThickness={0.6}
      cellColor={resolveTokenColor('--cf-grid', 0x242426)}
      sectionSize={GRID_SIZE * SECTION_EVERY}
      sectionThickness={1}
      sectionColor={resolveTokenColor('--cf-hairline-strong', 0x5a5a5e)}
      // Sin atenuación por distancia: la cámara es ortográfica y el lienzo debe
      // leerse igual de nítido en cualquier punto, como una hoja de papel
      // milimetrado. Un fundido por distancia daría sensación de 3D que aquí
      // estorba.
      fadeDistance={0}
      fadeStrength={0}
      infiniteGrid={false}
      followCamera={false}
      // El plano se dibuja en el plano XY (el del circuito), no en el XZ por
      // defecto, porque el lienzo es una vista frontal.
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -1]}
    />
  )
}
