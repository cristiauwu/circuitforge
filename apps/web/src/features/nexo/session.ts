import { create } from 'zustand'

export type NexoView = 'split' | 'mount' | 'code'
export type HelpContext = 'add' | 'connect'

export interface HelpState {
  enabled: boolean
  invited: boolean
  open: boolean
  invitation: boolean
  context: HelpContext | null
}

export interface NexoSession {
  code: string
  notes: string
  view: NexoView
  splitRatio: number
  help: HelpState
  setCode: (code: string) => void
  setNotes: (notes: string) => void
  setView: (view: NexoView) => void
  setSplitRatio: (ratio: number) => void
  notifyHelp: (context: HelpContext) => void
  continueWork: () => void
  openHelp: () => void
  dismissHelp: () => void
  disableHelp: () => void
  enableHelp: () => void
}

/** Route-independent session state, deliberately separate from circuit undo history. */
export const useNexoSession = create<NexoSession>((set) => ({
  code: '',
  notes: '',
  view: 'split',
  splitRatio: 0.62,
  help: {
    enabled: true,
    invited: false,
    open: false,
    invitation: false,
    context: null,
  },
  setCode: (code) => set({ code }),
  setNotes: (notes) => set({ notes }),
  setView: (view) => set({ view }),
  setSplitRatio: (ratio) => {
    if (Number.isFinite(ratio)) set({ splitRatio: Math.min(1, Math.max(0, ratio)) })
  },
  notifyHelp: (context) =>
    set((state) => {
      if (!state.help.enabled || state.help.invited) return state
      return {
        help: { ...state.help, invited: true, invitation: true, context },
      }
    }),
  continueWork: () => set((state) => ({ help: { ...state.help, invitation: false } })),
  openHelp: () => set((state) => ({ help: { ...state.help, open: true, invitation: false } })),
  dismissHelp: () => set((state) => ({ help: { ...state.help, open: false, invitation: false } })),
  disableHelp: () =>
    set((state) => ({
      help: { ...state.help, enabled: false, open: false, invitation: false },
    })),
  enableHelp: () =>
    set((state) => ({
      help: { ...state.help, enabled: true, invited: false, invitation: false },
    })),
}))
