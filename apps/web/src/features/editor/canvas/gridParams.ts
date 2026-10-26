/**
 * Parametros de la reticula del lienzo.
 *
 * # Por que esto es una funcion pura y no constantes sueltas
 *
 * Porque el valor de `fadeDistance` **no es un ajuste estetico: es correcto o
 * incorrecto**, y estuvo incorrecto de una forma que solo se veia en algunas
 * maquinas. Extrayendolo aqui se puede probar, y el test documenta el fallo.
 *
 * # El bug que motiva este archivo
 *
 * La reticula se pasaba a drei con `fadeDistance={0}`. En el shader de drei eso
 * produce:
 *
 *     float d = 1.0 - min(dist / fadeDistance, 1.0);   // dist/0 = Infinito
 *     gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
 *
 * Con `dist / 0 = Infinito`, `min(Infinito, 1.0) = 1.0` y por tanto **`d = 0`**.
 * La linea que decide la opacidad es entonces `pow(0.0, 0.0)`, y **`pow(0,0)` no
 * esta definido en GLSL**: cada driver devuelve lo que quiere.
 *
 * Medido: con **SwiftShader** (renderizado por software, el que usa el Chrome
 * headless de verificacion) devuelve `1` y la reticula se ve. Con **NVIDIA**
 * devuelve `0` y **el lienzo queda completamente negro**.
 *
 * De ahi que el fallo fuera invisible en la verificacion y evidente en la maquina
 * del usuario: el codigo era el mismo, el driver distinto.
 *
 * # La correccion
 *
 * `fadeDistance` debe ser un valor **grande**, no cero. Con un valor grande,
 * `dist / fadeDistance` tiende a 0, luego `d` tiende a 1, y `pow(1, x)` **si**
 * esta bien definido para cualquier exponente. El resultado es el mismo que se
 * pretendia —sin atenuacion por distancia— pero sin depender de comportamiento
 * indefinido.
 *
 * Es la diferencia entre "funciona en mi maquina" y "funciona".
 */

/** Distancia de atenuacion. Muy grande = sin atenuacion, pero SIN dividir por cero. */
const FADE_DISTANCE = 1_000_000

/**
 * Exponente de la atenuacion.
 *
 * 0 desactiva el efecto por completo. Se deja en 0 porque un lienzo ortografico
 * debe leerse igual de nitido en cualquier punto: es un plano tecnico, no una
 * escena con profundidad.
 */
const FADE_STRENGTH = 0

/**
 * Grosor de la linea fina, en pixeles de pantalla.
 *
 * Por debajo de 1 el shader descarta la linea en pantallas de densidad 1.
 */
const CELL_THICKNESS = 1

/** Grosor de la linea de seccion. Mas marcada, para distinguirse de la fina. */
const SECTION_THICKNESS = 1.6

/** Cada cuantas celdas va una linea de seccion. */
const SECTION_EVERY = 4

export interface GridParams {
  fadeDistance: number
  fadeStrength: number
  cellThickness: number
  sectionThickness: number
  sectionEvery: number
}

/** Parametros de la reticula, listos para pasar a `<Grid>` de drei. */
export function gridParams(): GridParams {
  return {
    fadeDistance: FADE_DISTANCE,
    fadeStrength: FADE_STRENGTH,
    cellThickness: CELL_THICKNESS,
    sectionThickness: SECTION_THICKNESS,
    sectionEvery: SECTION_EVERY,
  }
}

/**
 * Reproduce la formula de opacidad del shader de drei, para poder probarla.
 *
 * Es la linea que decidia si la reticula se veia:
 *
 *     d = 1.0 - min(dist / fadeDistance, 1.0)
 *     alfa = pow(d, fadeStrength)
 *
 * @returns La opacidad resultante, o `null` si el calculo cae en el caso
 *   indefinido `pow(0, 0)`. Devolver `null` en vez de un numero es deliberado:
 *   el caso no tiene un valor correcto, y esconderlo detras de un `0` o un `1`
 *   es lo que hizo que el fallo pasara desapercibido.
 */
export function gridOpacity(
  distance: number,
  fadeDistance: number,
  fadeStrength: number,
): number | null {
  // La division por cero es el origen del problema.
  if (fadeDistance <= 0) return null

  const d = 1 - Math.min(distance / fadeDistance, 1)

  // `pow(0, 0)` es indefinido: se declara como tal en vez de inventar un valor.
  if (d === 0 && fadeStrength === 0) return null

  return d ** fadeStrength
}
