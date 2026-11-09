import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { useNexoSession } from './session'

const state = () => useNexoSession.getState()

beforeEach(() => {
  useNexoSession.setState(useNexoSession.getInitialState(), true)
})

describe('session drafts and workspace', () => {
  it('starts in split view with a 62% mounting pane and empty drafts', () => {
    expect(state()).toMatchObject({ code: '', notes: '', view: 'split', splitRatio: 0.62 })
    expect(state().help).toEqual({
      enabled: true,
      invited: false,
      open: false,
      invitation: false,
      context: null,
    })
  })

  it('keeps drafts and help state across route-consumer subscriptions', () => {
    const unsubscribe = useNexoSession.subscribe(() => undefined)
    state().setCode('void setup() {}')
    state().setNotes('Comprobar polaridad del LED')
    state().setView('code')
    state().setSplitRatio(0.7)
    state().notifyHelp('add')
    state().dismissHelp()
    unsubscribe()

    const nextRoute = useNexoSession.subscribe(() => undefined)
    expect(state()).toMatchObject({
      code: 'void setup() {}',
      notes: 'Comprobar polaridad del LED',
      view: 'code',
      splitRatio: 0.7,
      help: { invited: true, invitation: false },
    })
    state().setView('mount')
    state().setView('split')
    expect(state().code).toBe('void setup() {}')
    nextRoute()
  })

  it('bounds finite split ratios and ignores invalid measurements', () => {
    state().setSplitRatio(-1)
    expect(state().splitRatio).toBe(0)
    state().setSplitRatio(2)
    expect(state().splitRatio).toBe(1)
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      state().setSplitRatio(value)
      expect(state().splitRatio).toBe(1)
    }
  })

  it('does not mutate the circuit or its undo history', () => {
    const original = useEditorStore.getState()
    state().setCode('draft')
    state().setNotes('note')
    state().setView('mount')
    state().setSplitRatio(0.5)
    state().notifyHelp('connect')
    state().openHelp()
    state().dismissHelp()
    state().disableHelp()
    state().enableHelp()
    expect(useEditorStore.getState()).toBe(original)
    expect(useEditorStore.getState().history).toBe(original.history)
  })
})

describe('non-insistent contextual help', () => {
  it.each(['add', 'connect'] as const)('invites once for the first %s event', (context) => {
    state().notifyHelp(context)
    expect(state().help).toMatchObject({ context, invited: true, invitation: true, open: false })
    const first = state().help
    state().notifyHelp(context === 'add' ? 'connect' : 'add')
    expect(state().help).toBe(first)
  })

  it('hides the invitation when work continues without opening help or insisting again', () => {
    state().notifyHelp('add')
    state().continueWork()
    expect(state().help).toMatchObject({ invitation: false, open: false, invited: true })
    state().notifyHelp('connect')
    expect(state().help.invitation).toBe(false)
  })

  it('opens manually, hides the invitation, and dismisses without resetting invited', () => {
    state().notifyHelp('connect')
    state().openHelp()
    expect(state().help).toMatchObject({ open: true, invitation: false, context: 'connect' })
    state().continueWork()
    expect(state().help.open).toBe(true)
    state().dismissHelp()
    expect(state().help).toMatchObject({ open: false, invitation: false, invited: true })
    state().notifyHelp('add')
    expect(state().help.invitation).toBe(false)
  })

  it('can dismiss the invitation directly without losing its one-shot memory', () => {
    state().notifyHelp('add')
    state().dismissHelp()
    state().notifyHelp('connect')
    expect(state().help).toMatchObject({ open: false, invitation: false, invited: true })
  })

  it('disables automatic suggestions but keeps manual guidance available', () => {
    state().notifyHelp('add')
    state().openHelp()
    state().disableHelp()
    expect(state().help).toMatchObject({
      enabled: false,
      open: false,
      invitation: false,
      invited: true,
    })
    state().notifyHelp('connect')
    expect(state().help.invitation).toBe(false)
    state().openHelp()
    expect(state().help).toMatchObject({ enabled: false, open: true, invitation: false })
  })

  it('does not consume the invitation while disabled', () => {
    state().disableHelp()
    state().notifyHelp('connect')
    expect(state().help).toMatchObject({ invited: false, context: null, invitation: false })
  })

  it('only explicit re-enabling permits a fresh invitation', () => {
    state().notifyHelp('add')
    state().disableHelp()
    state().enableHelp()
    expect(state().help).toMatchObject({ enabled: true, invited: false, invitation: false })
    state().notifyHelp('connect')
    expect(state().help).toMatchObject({ invited: true, invitation: true, context: 'connect' })
  })

  it('does not schedule timers in the store', () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    try {
      state().notifyHelp('add')
      state().continueWork()
      state().openHelp()
      state().dismissHelp()
      expect(timeout).not.toHaveBeenCalled()
    } finally {
      timeout.mockRestore()
    }
  })
})
