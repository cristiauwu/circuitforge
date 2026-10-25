/**
 * Colocacion de componentes nuevos.
 *
 * **Por que existe:** anadir varios componentes al mismo punto los apila unos
 * sobre otros y el usuario ve una sola mancha. Es lo que pasaba al anadir cuatro
 * seguidos en el centro: el lienzo parecia no responder porque los cuatro
 * ocupaban exactamente la misma posicion.
 *
 * La solucion es buscar el primer hueco libre siguiendo una espiral de celdas
 * desde el centro. Es lo que hace cualquier editor de esquematicos: el
 * componente nuevo cae donde no molesta, no encima de lo que ya hay.
 */

import { GRID_SIZE } from './useGridSnap'

/** Posicion en coordenadas de mundo. */
export interface Position {
  x: number
  y: number
}

/**
 * Distancia minima entre dos componentes para considerarlos superpuestos.
 *
 * **No es el tamano del componente, es el tamano de su ETIQUETA.** Medido en el
 * navegador: con 48 x 36 unidades de separacion, los cuerpos no se tocan pero los
 * nombres SI — "Fuente DC" y "Servomotor" son mas anchos que el simbolo y se
 * solapan con el componente vecino, que es peor que si chocaran los cuerpos
 * porque el texto es lo que se lee.
 *
 * El nombre mas largo del catalogo ("Fotorresistencia", 16 caracteres) a 9 px de
 * fuente mide unas 90 unidades de ancho. Con 96 unidades de separacion horizontal
 * caben las etiquetas y queda aire entre columnas.
 */
const CLEARANCE_X = 96
const CLEARANCE_Y = 84

/** Holgura minima entre componentes. Se exporta para que los tests la usen. */
export { CLEARANCE_X, CLEARANCE_Y }

/** Anillos que se exploran como maximo antes de rendirse. */
const MAX_RINGS = 8

/**
 * Celdas del borde de un anillo, en orden.
 *
 * Se separa del bucle principal porque anidar los dos bucles con la condicion de
 * borde dentro disparaba la complejidad por encima del limite. Con las celdas ya
 * generadas, buscar hueco es un solo recorrido lineal.
 */
function ringCells(ring: number, gridSize: number): Position[] {
  const cells: Position[] = []
  for (let dx = -ring; dx <= ring; dx++) {
    for (let dy = -ring; dy <= ring; dy++) {
      // Solo el borde: el interior ya se probo en anillos previos.
      if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue
      cells.push({ x: dx * gridSize, y: dy * gridSize })
    }
  }
  return cells
}

/**
 * Busca una posicion libre cerca del centro.
 *
 * Recorre anillos de celdas de la rejilla desde el origen: primero el centro,
 * luego los vecinos inmediatos, luego el anillo siguiente, y asi. Devuelve la
 * primera celda donde el componente nuevo no se solape con ninguno existente.
 *
 * Si no encuentra hueco en `MAX_RINGS` anillos devuelve una posicion desplazada
 * en diagonal en vez de fallar: un componente apilado es mejor que un clic que
 * no hace nada.
 *
 * @param existing Posiciones de los componentes que ya estan en el lienzo.
 * @param gridSize Tamano de celda. Por defecto, el de la rejilla del lienzo.
 */
export function findFreePosition(
  existing: readonly Position[],
  gridSize: number = GRID_SIZE,
): Position {
  const isFree = (candidate: Position): boolean =>
    !existing.some(
      (p) => Math.abs(p.x - candidate.x) < CLEARANCE_X && Math.abs(p.y - candidate.y) < CLEARANCE_Y,
    )

  const center: Position = { x: 0, y: 0 }
  if (isFree(center)) return center

  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    for (const candidate of ringCells(ring, gridSize)) {
      if (isFree(candidate)) return candidate
    }
  }

  // Sin hueco: se devuelve un punto desplazado en diagonal para que al menos no
  // caiga exactamente encima del primero.
  const fallbackIndex = existing.length + 1
  return { x: fallbackIndex * gridSize, y: fallbackIndex * gridSize }
}
