import { beforeEach, describe, expect, it } from 'vitest'
import { clearTokenColorCache, parseCssColor, resolveTokenColor } from './tokenColor'

describe('parseCssColor', () => {
  it('parsea rgb con espacios', () => {
    // Es la forma que devuelve getComputedStyle en los tokens del sistema.
    expect(parseCssColor('rgb(255 107 53)')).toBe(0xff6b35)
  })

  it('parsea rgb con comas', () => {
    expect(parseCssColor('rgb(255, 107, 53)')).toBe(0xff6b35)
  })

  it('parsea rgba e ignora el alfa', () => {
    // El material de linea ya tiene su propio `opacity`; el alfa del CSS no
    // aplica y no debe contaminar el color.
    expect(parseCssColor('rgba(34, 211, 238, 0.5)')).toBe(0x22d3ee)
  })

  it('parsea el blanco y el negro', () => {
    expect(parseCssColor('rgb(255 255 255)')).toBe(0xffffff)
    expect(parseCssColor('rgb(0 0 0)')).toBe(0x000000)
  })

  it('redondea los decimales', () => {
    expect(parseCssColor('rgb(255.4 106.6 53.2)')).toBe(0xff6b35)
  })

  it('devuelve null para una cadena que no es un color', () => {
    // Un token mal escrito debe dar null, no un color equivocado en silencio.
    expect(parseCssColor('var(--cf-accent)')).toBeNull()
    expect(parseCssColor('')).toBeNull()
    expect(parseCssColor('red')).toBeNull()
  })

  it('acota los valores fuera de rango', () => {
    expect(parseCssColor('rgb(300 -5 100)')).toBe(0xff0064)
  })
})

describe('resolveTokenColor', () => {
  beforeEach(() => {
    clearTokenColorCache()
  })

  it('sin documento (entorno de test) devuelve el respaldo', () => {
    // Los tests corren en Node, sin DOM. Devolver el respaldo es lo correcto:
    // el llamador recibe un color usable en vez de una excepcion.
    expect(resolveTokenColor('--cf-accent', 0x123456)).toBe(0x123456)
  })

  it('acepta el nombre del token con o sin guiones', () => {
    expect(resolveTokenColor('cf-accent', 0xabcdef)).toBe(0xabcdef)
    expect(resolveTokenColor('--cf-accent', 0xabcdef)).toBe(0xabcdef)
  })

  it('devuelve blanco por defecto si no se da respaldo', () => {
    expect(resolveTokenColor('--no-existe')).toBe(0xffffff)
  })

  it('la cache devuelve el mismo valor sin volver a leer', () => {
    const a = resolveTokenColor('--cf-accent', 0x111111)
    const b = resolveTokenColor('--cf-accent', 0x222222)
    expect(a).toBe(b)
  })

  it('limpiar la cache permite releer', () => {
    resolveTokenColor('--cf-accent', 0x111111)
    clearTokenColorCache()
    expect(resolveTokenColor('--cf-accent', 0x999999)).toBe(0x999999)
  })
})
