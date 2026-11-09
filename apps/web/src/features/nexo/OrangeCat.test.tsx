import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextHelp } from './ContextHelp'
import { OrangeCat } from './OrangeCat'
import { useNexoSession } from './session'

beforeEach(() => {
  useNexoSession.setState(useNexoSession.getInitialState(), true)
})

// Read the live client store for static DOM checks, rather than Zustand's
// initial server-hydration snapshot. The session actions remain real.
vi.mock('./session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./session')>()
  type State = ReturnType<typeof actual.useNexoSession.getState>
  return {
    useNexoSession: Object.assign(
      <T,>(selector: (state: State) => T) => selector(actual.useNexoSession.getState()),
      actual.useNexoSession,
    ),
  }
})

const renderHelp = () => renderToStaticMarkup(<ContextHelp />)

function expectAwake(markup: string, awake: boolean) {
  expect(markup).toContain(`data-awake="${awake}"`)
}

describe('original orange cat help companion', () => {
  it('renders authored decorative vector layers without remote artwork', () => {
    const markup = renderToStaticMarkup(<OrangeCat awake={false} />)
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('focusable="false"')
    for (const layer of ['head', 'tail', 'sleeping', 'waking', 'message']) {
      expect(markup).toContain(`nx-cat-${layer}`)
    }
    expect(markup).not.toMatch(/<img|<image|<animate|<foreignObject/)
  })

  it('rests asleep behind a named keyboard-accessible help trigger', () => {
    const markup = renderHelp()
    expectAwake(markup, false)
    expect(markup).toContain('aria-label="Ayuda del proyecto"')
    expect(markup).toContain('title="Ayuda del proyecto"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('nx-help-panel')
  })

  it('wakes for the single invitation and rests when work continues', () => {
    const session = useNexoSession.getState()
    session.notifyHelp('add')
    expectAwake(renderHelp(), true)
    expect(renderHelp()).toContain('Ahora no')
    session.continueWork()
    session.notifyHelp('connect')
    expectAwake(renderHelp(), false)
    expect(renderHelp()).not.toContain('nx-help-invitation')
  })

  it('wakes for manual nonmodal help and rests after closing', () => {
    const session = useNexoSession.getState()
    session.openHelp()
    const markup = renderHelp()
    expectAwake(markup, true)
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-controls=')
    expect(markup).toContain('Cerrar ayuda')
    expect(markup).not.toMatch(/aria-modal|role="dialog"/)
    session.dismissHelp()
    expectAwake(renderHelp(), false)
  })

  it('keeps manual help available after disabling automatic suggestions', () => {
    const session = useNexoSession.getState()
    session.notifyHelp('add')
    session.disableHelp()
    session.notifyHelp('connect')
    expectAwake(renderHelp(), false)
    session.openHelp()
    expectAwake(renderHelp(), true)
    expect(renderHelp()).toContain('Activar sugerencias')
  })
})
