/**
 * Convierte tokens CSS a valores que Three.js entiende.
 *
 * # Por que existe
 *
 * **Three.js no entiende CSS.** Sus materiales son shaders: reciben un color
 * numerico, no una cadena. Pasarle `'var(--cf-accent)'` **no lanza un error que
 * se vea**, pero escribe una advertencia en consola y cae a un valor por defecto:
 *
 *     THREE.Color: Unknown color model var(--cf-accent)
 *
 * Medido en el editor, esa advertencia aparecia **19 veces** al montar la escena.
 * Y el efecto no era cosmetico: **el cable entre dos pines no se dibujaba**, con
 * geometria correcta, material correcto y posicion correcta, porque su color era
 * invalido y el shader no compilaba. Costo seis hipotesis descartadas —culling,
 * frustum, escala, grosor, frameloop, needsUpdate— antes de mirar la consola.
 *
 * La leccion: cuando un objeto de Three.js "no se ve" pero existe en la escena,
 * **lo primero es leer las advertencias de la consola**, no la geometria.
 *
 * # Como funciona
 *
 * Se lee el valor computado del token desde `:root` con `getComputedStyle`, que
 * devuelve un `rgb()` real, y se parsea a un entero hexadecimal, que es lo que
 * `THREE.Color` acepta.
 *
 * La lectura se cachea: `getComputedStyle` fuerza recalculo de estilos, y los
 * colores de un componente no cambian en toda la sesion.
 */

/** Cache de token a color numerico. */
const cache = new Map<string, number>()

/**
 * Lee un token CSS del documento y lo devuelve como entero hexadecimal.
 *
 * @param token Nombre del token, con o sin los guiones. Por ejemplo
 *   `'--cf-accent'` o `'cf-accent'`.
 * @param fallback Color de respaldo si el token no existe o no se puede parsear.
 * @returns Entero `0xRRGGBB`, que es lo que acepta `THREE.Color`.
 */
export function resolveTokenColor(token: string, fallback = 0xffffff): number {
  const key = token.startsWith('--') ? token : `--${token}`

  const cached = cache.get(key)
  if (cached !== undefined) return cached

  // Fuera del navegador (tests en Node) no hay documento ni estilos. El
  // respaldo TAMBIEN se cachea: sin eso, cada llamada en un entorno sin DOM
  // devolveria el fallback de su propio argumento y la cache no cumpliria su
  // funcion, que es que un color no cambie dentro de la misma sesion.
  if (typeof document === 'undefined') {
    cache.set(key, fallback)
    return fallback
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
  if (raw === '') {
    cache.set(key, fallback)
    return fallback
  }

  const parsed = parseCssColor(raw)
  if (parsed === null) {
    cache.set(key, fallback)
    return fallback
  }

  cache.set(key, parsed)
  return parsed
}

/**
 * Parsea un color de CSS a entero hexadecimal.
 *
 * Acepta las formas que `getComputedStyle` puede devolver: `rgb(r g b)`,
 * `rgb(r, g, b)` y `rgba(...)`. Los colores del sistema son todos planos —no hay
 * degradados ni nombres— asi que no hace falta mas.
 *
 * Devuelve `null` si no se puede parsear, para que el llamador decida el respaldo
 * en vez de recibir un color equivocado en silencio.
 */
export function parseCssColor(value: string): number | null {
  // El `-?` acepta negativos: aunque un color negativo no exista, un valor asi
  // puede llegar de un token mal escrito y la rama de acotado debe poder
  // corregirlo en vez de descartar el color entero.
  const match = value.match(/rgba?\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/i)
  if (!match) return null

  const r = Math.round(Number(match[1]))
  const g = Math.round(Number(match[2]))
  const b = Math.round(Number(match[3]))

  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null

  const clamp = (n: number): number => Math.max(0, Math.min(255, n))
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)
}

/**
 * Limpia la cache.
 *
 * Existe para los tests: sin ella, dos casos con tokens distintos podrian
 * compartir un valor cacheado de un documento que ya no aplica.
 */
export function clearTokenColorCache(): void {
  cache.clear()
}
