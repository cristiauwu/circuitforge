import { describe, expect, it } from 'vitest'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { initialWorkspaceSession, workspaceSessionReducer } from './useWorkspaceSession'
import { canShowSplit, clampSplitWidth, isSchematicVisible } from './workspaceLayout'

describe('workspace layout', () => {
  it('reserva mínimos para ambos paneles', () => {
    expect(canShowSplit(715)).toBe(false)
    expect(canShowSplit(716)).toBe(true)
    expect(clampSplitWidth(20, 1000)).toBe(384)
    expect(clampSplitWidth(9999, 1000)).toBe(668)
    expect(clampSplitWidth(800, 300)).toBe(300)
  })

  it('identifica cuándo ocultar el esquema y cancelar su operación transitoria', () => {
    expect(isSchematicVisible(false, 'tools', 'split')).toBe(true)
    expect(isSchematicVisible(false, 'schematic', 'code')).toBe(false)
    expect(isSchematicVisible(true, 'code', 'split')).toBe(false)
    expect(isSchematicVisible(true, 'schematic', 'code')).toBe(true)
  })

  it('conserva borradores al cambiar paneles sin tocar dominio ni historial', () => {
    const before = useEditorStore.getState()
    const draft = workspaceSessionReducer(initialWorkspaceSession, {
      code: 'void setup() {}',
      message: 'Mi idea',
    })
    const hidden = workspaceSessionReducer(draft, { panel: 'tools', view: 'code', splitRatio: 0.6 })
    const restored = workspaceSessionReducer(hidden, { panel: 'schematic', view: 'split' })
    expect(restored.code).toBe(draft.code)
    expect(restored.message).toBe(draft.message)
    expect(restored.splitRatio).toBe(0.6)
    expect(useEditorStore.getState().project).toBe(before.project)
    expect(useEditorStore.getState().history).toBe(before.history)
  })
})
