import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

describe('SegmentedControl (Apple iOS Style)', () => {
  const options = [
    { value: 'mount', label: '3D Montaje' },
    { value: 'code', label: 'C++ Firmware' },
    { value: 'split', label: 'Vista Dividida' },
  ] as const

  it('renderiza todas las opciones con atributos ARIA correspondientes', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        options={options}
        value="mount"
        onChange={vi.fn()}
        ariaLabel="Vistas del editor"
      />,
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="Vistas del editor"')
    expect(html).toContain('3D Montaje')
    expect(html).toContain('C++ Firmware')
    expect(html).toContain('Vista Dividida')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-selected="false"')
    expect(html).toContain('active')
  })

  it('marca correctamente el tab seleccionado y respeta disabled', () => {
    const disabledOptions = [
      { value: 'mount', label: '3D Montaje' },
      { value: 'split', label: 'Vista Dividida', disabled: true, title: 'No disponible' },
    ] as const

    const html = renderToStaticMarkup(
      <SegmentedControl
        options={disabledOptions}
        value="mount"
        onChange={vi.fn()}
        ariaLabel="Vistas"
      />,
    )

    expect(html).toContain('disabled=""')
    expect(html).toContain('title="No disponible"')
  })
})
