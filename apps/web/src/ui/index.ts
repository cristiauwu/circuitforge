/**
 * Primitivas del sistema visual de CircuitForge.
 *
 * La anatomia (radios, alturas, rellenos, blur) esta derivada de MEDIR iyo.ai
 * con getComputedStyle, no de estimarla. Ver docs/design/DESIGN.md seccion 3.
 *
 * Viven en la app durante esta etapa. Se extraeran a `packages/ui` cuando
 * aparezca el segundo consumidor; hoy serian ceremonia sin beneficio.
 */

export { Atmosphere } from './Atmosphere'
export { Button, IconButton, LinkButton } from './Button'
export { CatalogCard } from './CatalogCard'
export { Chip, PinChip } from './Chip'
export { Input } from './Input'
export { Panel, PanelGlass, PanelTitle, Tile } from './Panel'
export { RevealText } from './RevealText'
export { hasSchematicSymbol, SchematicSymbol } from './SchematicSymbol'
export type { Severity as ViolationSeverity } from './ViolationMessage'
export { ViolationMessage } from './ViolationMessage'
