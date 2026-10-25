/**
 * Conversión entre coordenadas de pantalla y de mundo, con imán a la rejilla.
 *
 * **Por qué la fórmula es tan simple:** la cámara es **ortográfica**, no de
 * perspectiva. En una cámara ortográfica la proyección es lineal —no hay
 * división por profundidad—, así que convertir un punto de pantalla a mundo es
 * una escala más un desplazamiento. Es exactamente por esto que el stack eligió
 * ortográfica (D-3): permite razonar sobre el lienzo en dos dimensiones planas
 * y, cuando llegue el 3D, solo cambia la cámara.
 *
 * Todo aquí es **puro** salvo el hook del final: son las funciones que el
 * arrastre llama en cada frame, y conviene poder probarlas sin un navegador.
 */

/** Tamaño de celda de la rejilla, en unidades de mundo. */
export const GRID_SIZE = 24

/** Punto en píxeles de pantalla. El origen es la esquina superior izquierda. */
export interface ScreenPoint {
  x: number
  y: number
}

/** Punto en unidades de mundo. El eje Y crece hacia ARRIBA. */
export interface WorldPoint {
  x: number
  y: number
}

/** Tamaño del viewport en píxeles. */
export interface Viewport {
  width: number
  height: number
}

/**
 * Cámara ortográfica, descrita solo por lo que hace falta para la conversión.
 *
 * Se declara esta forma en vez de importar el tipo de Three.js para que estas
 * funciones no dependan de la librería y puedan probarse en Node sin WebGL.
 */
export interface OrthoCamera {
  /** Ancho del frustum visible, en unidades de mundo, con zoom 1. */
  frustumWidth: number
  /** Centro de la cámara, en coordenadas de mundo. */
  center: WorldPoint
  /** Factor de zoom. 1 = sin aumento; 2 = el doble de cerca. */
  zoom: number
}

/**
 * Redondea al múltiplo más cercano de la rejilla.
 *
 * El `+ 0` final no es decorativo: `Math.round(-0.4) * 24` produce `-0` en
 * JavaScript, que se comporta como 0 en aritmética pero falla una comparación
 * con `Object.is` y aparece como `-0` al serializar. Normalizarlo evita un bug
 * desconcertante en los tests y en el estado guardado.
 */
export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize + 0
}

/**
 * Convierte un punto de pantalla a coordenadas de mundo.
 *
 * `unitsPerPixel` es común a los dos ejes: una cámara ortográfica no deforma, así
 * que la escala horizontal y la vertical son la misma. El eje Y se **invierte**
 * porque en pantalla crece hacia abajo y en el mundo hacia arriba.
 */
export function screenToWorld(
  point: ScreenPoint,
  camera: OrthoCamera,
  viewport: Viewport,
): WorldPoint {
  const unitsPerPixel = camera.frustumWidth / viewport.width / camera.zoom

  return {
    x: camera.center.x + (point.x - viewport.width / 2) * unitsPerPixel,
    y: camera.center.y - (point.y - viewport.height / 2) * unitsPerPixel,
  }
}

/**
 * Convierte un punto de mundo a coordenadas de pantalla.
 *
 * Es la inversa exacta de `screenToWorld`: ida y vuelta devuelve el punto
 * original. Hay un test que lo comprueba, porque una inversa mal derivada
 * produce un arrastre que se desvía poco a poco y es muy difícil de diagnosticar.
 */
export function worldToScreen(
  point: WorldPoint,
  camera: OrthoCamera,
  viewport: Viewport,
): ScreenPoint {
  const pixelsPerUnit = (viewport.width / camera.frustumWidth) * camera.zoom

  return {
    x: (point.x - camera.center.x) * pixelsPerUnit + viewport.width / 2,
    y: viewport.height / 2 - (point.y - camera.center.y) * pixelsPerUnit,
  }
}

/**
 * Convierte un punto de pantalla a mundo **ya imantado a la rejilla**.
 *
 * Es lo que usa el arrastre: el componente nunca queda en una posición
 * arbitraria, siempre sobre una celda.
 */
export function screenToSnappedWorld(
  point: ScreenPoint,
  camera: OrthoCamera,
  viewport: Viewport,
  gridSize: number = GRID_SIZE,
): WorldPoint {
  const world = screenToWorld(point, camera, viewport)
  return { x: snapToGrid(world.x, gridSize), y: snapToGrid(world.y, gridSize) }
}

/**
 * Hook de conveniencia.
 *
 * Existe para que los componentes no importen las constantes y funciones sueltas,
 * y para tener un único sitio donde cambiar si algún día la conversión deja de
 * ser pura (por ejemplo, si la cámara pasa a perspectiva).
 */
export function useGridSnap(gridSize: number = GRID_SIZE) {
  return {
    gridSize,
    snapToGrid: (value: number) => snapToGrid(value, gridSize),
    screenToWorld,
    worldToScreen,
    screenToSnappedWorld: (point: ScreenPoint, camera: OrthoCamera, viewport: Viewport) =>
      screenToSnappedWorld(point, camera, viewport, gridSize),
  }
}
