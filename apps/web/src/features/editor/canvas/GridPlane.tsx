/**
 * Cuadricula del lienzo.
 *
 * Se dimensiona muy por encima del viewport visible porque el lienzo tiene paneo:
 * una cuadricula ajustada al tamano de la pantalla dejaria de verse al
 * desplazarse, que es justo cuando mas se necesita para orientarse.
 *
 * # Los colores, y por que importan mas de lo que parece
 *
 * Salen de los tokens del sistema, resueltos con `resolveTokenColor`.
 *
 * **El token de la reticula estaba mal calibrado y no se noto durante mucho
 * tiempo.** Era `#242426`, que sobre el fondo `#101010` da un contraste de
 * **1.23:1** — invisible. Medido con la formula de luminancia relativa de WCAG.
 *
 * No se veia mal porque habia **otro bug tapandolo**: los colores se pasaban como
 * `var(--cf-...)`, que Three.js no entiende, asi que caia a su valor por defecto
 * —claro— y la reticula se veia por accidente. Al corregir ese bug, el color real
 * quedo a la vista, y el resultado fue que **el lienzo se veia vacio**.
 *
 * Es el caso clasico de dos bugs que se compensan: arreglar uno destapa el otro.
 * El token ahora es `#525256` (2.45:1), que se lee como referencia de alineacion
 * sin competir con los componentes.
 */

import { Grid } from '@react-three/drei'
import { resolveTokenColor } from './tokenColor'
import { GRID_SIZE } from './useGridSnap'

/** Lado de la cuadricula, en unidades de mundo. */
const GRID_EXTENT = 4000

/**
 * Cada cuantas celdas se dibuja una linea de seccion (mas marcada).
 * 4 celdas = 96 unidades, que da una referencia visual legible sin ruido.
 */
const SECTION_EVERY = 4

export function GridPlane() {
  return (
    <Grid
      args={[GRID_EXTENT, GRID_EXTENT]}
      cellSize={GRID_SIZE}
      // Grosor de 1: el trazo del shader se mide en pixeles y por debajo de 1
      // desaparece en pantallas de densidad 1.
      cellThickness={1}
      cellColor={resolveTokenColor('--cf-grid', 0x525256)}
      sectionSize={GRID_SIZE * SECTION_EVERY}
      sectionThickness={1.6}
      // Las lineas de seccion usan un token mas claro: son la referencia de
      // alineacion fuerte y deben distinguirse de la reticula fina.
      sectionColor={resolveTokenColor('--cf-grid-strong', 0x6b6b70)}
      // Sin atenuacion por distancia: la camara es ortografica y el lienzo debe
      // leerse igual de nitido en cualquier punto, como una hoja de papel
      // milimetrado. Un fundido por distancia daria sensacion de 3D que aqui
      // estorba.
      // A 0 el shader no dibuja ninguna atenuacion y el degradado no se aplica.
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
