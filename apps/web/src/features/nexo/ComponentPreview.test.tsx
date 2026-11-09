import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CATALOG } from '../../lib/fixtures/components'
import { ComponentPreview } from './ComponentPreview'
import { EDITABLE_TYPE_IDS } from './capabilities'
import {
  resolveThumbnail,
  thumbnailManifest,
  unavailableThumbnailReasons,
} from './thumbnailManifest'

const render = (typeId: string, name?: string) =>
  renderToStaticMarkup(<ComponentPreview typeId={typeId} {...(name ? { name } : {})} />)

describe('static authored component previews', () => {
  it('covers every current authored model with a real static WebP asset', () => {
    expect(Object.keys(thumbnailManifest).sort()).toEqual([...EDITABLE_TYPE_IDS].sort())
    for (const typeId of EDITABLE_TYPE_IDS) {
      expect(resolveThumbnail(typeId)).toMatch(/\.webp(?:\?|$)/)
      const bytes = readFileSync(new URL(`../../assets/components/${typeId}.webp`, import.meta.url))
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF')
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP')
      expect(bytes.length).toBeGreaterThan(1000)
      const markup = render(typeId)
      expect(markup).toContain('data-preview="rendered"')
      expect(markup).toContain('<img')
      expect(markup).toContain('loading="lazy"')
      expect(markup).toContain('decoding="async"')
      expect(markup).toContain('width="512"')
      expect(markup).not.toMatch(/<canvas|<svg|data-preview="unavailable"/)
    }
  })

  it('renders all 73 catalog entries with no obsolete unavailable labels or placeholders', () => {
    expect(CATALOG).toHaveLength(73)
    expect(Object.keys(thumbnailManifest)).toHaveLength(73)
    expect(Object.keys(unavailableThumbnailReasons)).toHaveLength(0)
    expect(CATALOG.map((item) => item.typeId).sort()).toEqual(Object.keys(thumbnailManifest).sort())
    for (const { typeId, name } of CATALOG) {
      const markup = render(typeId, name)
      expect(resolveThumbnail(typeId)).toBeTruthy()
      expect(markup).toContain('data-preview="rendered"')
      expect(markup).toContain('<img')
      expect(markup).not.toMatch(/Vista no disponible|<canvas|<svg/)
    }
  })

  it('keeps an explicit accessible unavailable fallback for a genuinely unknown component', () => {
    const markup = render('future_unknown_component', 'Componente futuro')
    expect(markup).toContain('data-preview="unavailable"')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('Componente futuro: vista previa no disponible')
    expect(markup).toContain('Vista no disponible')
    expect(markup).not.toMatch(/<img|<canvas/)
  })

  it('handles unknown and inherited-property type IDs without broken img URLs', () => {
    for (const typeId of ['missing_model', '__proto__', 'constructor', 'toString', '']) {
      expect(resolveThumbnail(typeId)).toBeUndefined()
      expect(render(typeId)).not.toMatch(/<img|<canvas/)
      expect(render(typeId)).toContain('data-preview="unavailable"')
    }
  })

  it('preserves the exact public sizing/class API and an accessible escaped name', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreview
        typeId="esp32"
        name={'ESP <32>'}
        size="detail"
        className="example-preview"
      />,
    )
    expect(markup).toContain('component-preview--detail example-preview')
    expect(markup).toContain('alt="ESP &lt;32&gt; · vista ilustrativa del modelo 3D"')
    expect(render('led')).toContain('component-preview--compact')
  })

  it('keeps Three, model construction and generator tools out of the production preview import boundary', () => {
    for (const file of ['ComponentPreview.tsx', 'thumbnailManifest.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source).not.toMatch(
        /from\s+['"](?:three|.*(?:models|thumbnail-render|generate-thumbnails))['"]|import\(['"]three/,
      )
      expect(source).not.toContain('WebGLRenderer')
      expect(source).not.toContain('createProjectModel')
    }
  })
})
