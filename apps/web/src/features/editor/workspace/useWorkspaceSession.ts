import { useReducer } from 'react'
import type { EditorView, ToolPanel, WorkspacePanel } from './workspaceLayout'

export const initialWorkspaceSession = {
  view: 'split' as EditorView,
  panel: 'schematic' as WorkspacePanel,
  tool: 'assistant' as ToolPanel,
  libraryExpanded: false,
  toolsOpen: true,
  diagnosticsOpen: false,
  splitRatio: 0.55,
  code: '',
  message: '',
}

export type WorkspaceSession = typeof initialWorkspaceSession
export type SessionPatch = Partial<WorkspaceSession>

/** La distribución y los borradores no son ediciones del circuito. */
export function workspaceSessionReducer(
  state: WorkspaceSession,
  patch: SessionPatch,
): WorkspaceSession {
  return { ...state, ...patch }
}

export function useWorkspaceSession() {
  return useReducer(workspaceSessionReducer, initialWorkspaceSession)
}
