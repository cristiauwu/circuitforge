import { readFileSync } from 'node:fs'
import { COMPONENT_DEFINITIONS, COMPONENT_INDEX, type Component } from '@circuitforge/netlist'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ComponentParameters, parseParameterDraft } from './ComponentParameters'

function instance(typeId: string): Component {
  const definition = COMPONENT_INDEX.get(typeId)
  if (!definition) throw new Error(typeId)
  return {
    id: `${definition.referencePrefix}1`,
    typeId,
    position: { x: 0, y: 0, rotation: 0 },
    params: Object.fromEntries(
      definition.parameters.map((parameter) => [parameter.key, parameter.defaultValue]),
    ),
    pins: definition.pins.map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
  }
}

describe('component parameter controls', () => {
  it('renders every registry parameter with a labeled native control without writes', () => {
    const update = vi.fn(() => ({ ok: true }))
    for (const definition of COMPONENT_DEFINITIONS) {
      const markup = renderToStaticMarkup(
        <ComponentParameters component={instance(definition.typeId)} onUpdate={update} />,
      )
      expect(markup).toContain('Valores nominales de referencia')
      expect((markup.match(/<label /g) ?? []).length).toBe(definition.parameters.length)
      expect((markup.match(/<input |<select /g) ?? []).length).toBe(definition.parameters.length)
      for (const parameter of definition.parameters) {
        if (parameter.kind === 'number') expect(markup).toContain('type="number"')
        if (parameter.kind === 'boolean') expect(markup).toContain('type="checkbox"')
        if (parameter.kind === 'enum') {
          for (const option of parameter.options)
            expect(markup).toContain(`value="${option.value}"`)
        }
      }
    }
    expect(update).not.toHaveBeenCalled()
  })

  it('rejects empty, nonfinite, wrong-type and out-of-range numeric drafts', () => {
    const definition = COMPONENT_DEFINITIONS.find((item) =>
      item.parameters.some((parameter) => parameter.kind === 'number'),
    )
    if (!definition) throw new Error('Missing numeric definition')
    const parameter = definition.parameters.find((item) => item.kind === 'number')
    if (!parameter) throw new Error('Missing numeric parameter')
    for (const invalid of ['', ' ', 'NaN', 'Infinity', '-Infinity', 'número']) {
      expect(parseParameterDraft(definition.typeId, parameter.key, invalid)).toBeNull()
    }
    expect(
      parseParameterDraft(definition.typeId, parameter.key, String(parameter.defaultValue)),
    ).toBe(parameter.defaultValue)
    if (parameter.kind === 'number' && parameter.min !== undefined) {
      expect(
        parseParameterDraft(definition.typeId, parameter.key, String(parameter.min - 1)),
      ).toBeNull()
    }
    expect(parseParameterDraft('unknown', parameter.key, '1')).toBeNull()
  })

  it('keeps numeric keystrokes local; blur/Enter commit and Escape discards', () => {
    const source = readFileSync(new URL('./ComponentParameters.tsx', import.meta.url), 'utf8')
    const numberInput = source.slice(
      source.indexOf('type="number"'),
      source.indexOf("definition.kind === 'boolean' ?"),
    )
    const change = numberInput.slice(
      numberInput.indexOf('onChange='),
      numberInput.indexOf('onBlur='),
    )
    expect(change).toContain('setDraft(')
    expect(change).not.toMatch(/onUpdate|update\(/)
    expect(numberInput).toContain('update(parsed)')
    expect(numberInput).toContain("event.key === 'Enter'")
    expect(numberInput).toContain("event.key === 'Escape'")
    expect(numberInput).toContain('cancelBlur.current = true')
  })

  it('labels relay state as manual ideal contacts, not coil simulation', () => {
    const markup = renderToStaticMarkup(
      <ComponentParameters component={instance('relay_spdt')} onUpdate={() => ({ ok: true })} />,
    )
    expect(markup).toContain('Contactos ideales')
    expect(markup).toContain('manualmente')
    expect(markup).toContain('no depende de la bobina')
  })
})
