/**
 * Concatenacion condicional de clases.
 *
 * Deliberadamente minimal: sin `clsx` ni `tailwind-merge`. Con 5 primitivas
 * bajo control propio no hay conflicto de clases que resolver, y una dependencia
 * menos es una dependencia menos que mantener.
 */
export type ClassValue = string | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
