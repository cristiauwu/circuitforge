/**
 * Primitivas del sistema visual de CircuitForge (DESIGN.md sección 3).
 *
 * Viven en la app durante esta etapa. Se extraeran a `packages/ui` cuando
 * aparezca el segundo consumidor; hoy serian ceremonia sin beneficio.
 */

export { Button, ButtonContent, LinkButton } from './Button'
export { Chip, PinChip } from './Chip'
export { Input } from './Input'
export { Panel, PanelGlass, PanelTitle } from './Panel'
export { RevealText } from './RevealText'
export type { Severity as ViolationSeverity } from './ViolationMessage'
export { ViolationMessage } from './ViolationMessage'
