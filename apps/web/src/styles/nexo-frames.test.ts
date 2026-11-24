import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = resolve(__dirname, 'nexo-frames.css')
const cssSource = readFileSync(cssPath, 'utf8')

describe('nexo-frames.css — Invariantes de Design Engineering', () => {
  it('usa nomenclatura propia sin referencias externas', () => {
    expect(cssSource).toContain('.nx-frame')
    expect(cssSource.toLowerCase()).not.toContain('cyberpunk')
  })

  it('mantiene animaciones GPU-only sin filtros costosos ni loops infinitos en :hover', () => {
    expect(cssSource).not.toMatch(/filter\s*:\s*(drop-shadow|blur)/)
    const keyframesBlock = cssSource.match(/@keyframes[\s\S]*?\n\s*\}/g) ?? []
    expect(keyframesBlock.length).toBeGreaterThan(0)
    for (const block of keyframesBlock) {
      expect(block).not.toMatch(/\b(top|bottom|left|right|width|height|margin)\s*:/)
    }
    const hoverInfinite = cssSource.match(/:hover[^{]*\{[^}]*infinite/g)
    expect(hoverInfinite).toBeNull()
  })

  it('aisla tarjetas repetitivas con contain y respeta prefers-reduced-motion', () => {
    expect(cssSource).toContain('contain: layout style')
    expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)')
    expect(cssSource).toContain('pointer-events: none')
  })
})
