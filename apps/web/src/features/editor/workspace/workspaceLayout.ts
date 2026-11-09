export const MIN_SCHEMATIC = 384
export const MIN_CODE = 320
export const DIVIDER_WIDTH = 12
export const COMPACT_WIDTH = 1320

export type WorkspacePanel = 'schematic' | 'code' | 'library' | 'tools'
export type EditorView = 'split' | 'schematic' | 'code'
export type ToolPanel = 'assistant' | 'inspector'

export function canShowSplit(width: number): boolean {
  return width >= MIN_SCHEMATIC + MIN_CODE + DIVIDER_WIDTH
}

export function clampSplitWidth(requested: number, width: number): number {
  if (!canShowSplit(width)) return Math.max(0, width)
  return Math.min(Math.max(requested, MIN_SCHEMATIC), width - MIN_CODE - DIVIDER_WIDTH)
}

export function resolveWorkspaceVisibility(
  compact: boolean,
  panel: WorkspacePanel,
  view: EditorView,
  width: number,
) {
  const split = !compact && view === 'split' && canShowSplit(width)
  const code = compact ? panel === 'code' : view === 'code' || split
  return { split, code, schematic: isSchematicVisible(compact, panel, view) }
}

export function isSchematicVisible(compact: boolean, panel: WorkspacePanel, view: EditorView) {
  return compact ? panel === 'schematic' : view !== 'code'
}
