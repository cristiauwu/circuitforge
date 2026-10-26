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
import { gridParams } from './gridParams'
import { resolveTokenColor } from './tokenColor'
import { GRID_SIZE } from './useGridSnap'

/** Lado de la cuadricula, en unidades de mundo. */
const GRID_EXTENT = 4000

export function GridPlane() {
  const params = gridParams()

  return (
    <Grid
      args={[GRID_EXTENT, GRID_EXTENT]}
      cellSize={GRID_SIZE}
      cellThickness={params.cellThickness}
      cellColor={resolveTokenColor('--cf-grid', 0x525256)}
      sectionSize={GRID_SIZE * params.sectionEvery}
      sectionThickness={params.sectionThickness}
      // Las lineas de seccion usan un token mas claro: son la referencia de
      // alineacion fuerte y deben distinguirse de la reticula fina.
      sectionColor={resolveTokenColor('--cf-grid-strong', 0x6b6b70)}
      /*
       * SIN atenuacion por distancia, pero con un valor GRANDE.
       *
       * **Aqui estuvo el bug que dejo el lienzo negro.** Se pasaba `0`, y eso
       * hace que el shader de drei calcule `dist / 0 = Infinito`, luego
       * `min(Infinito, 1) = 1` y por tanto `d = 0`. La opacidad acaba en
       * `pow(0.0, 0.0)`, que **no esta definido en GLSL**: unos drivers devuelven
       * 1 y otros 0.
       *
       * Medido: SwiftShader (software, el del Chrome headless de verificacion)
       * devuelve 1 → la reticula se veia. NVIDIA devuelve 0 → **lienzo negro**.
       * Por eso el fallo no aparecia en la verificacion y si en la maquina del
       * usuario.
       *
       * Un valor grande consigue el mismo efecto —sin atenuacion— sin dividir por
       * cero: `d` tiende a 1 y `pow(1, x)` si esta definido.
       */
      fadeDistance={params.fadeDistance}
      fadeStrength={params.fadeStrength}
      infiniteGrid={false}
      followCamera={false}
      // El plano se dibuja en el plano XY (el del circuito), no en el XZ por
      // defecto, porque el lienzo es una vista frontal.
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -1]}
    />
  )
}
