import type { Category } from '@circuitforge/netlist'
import { useMemo, useState } from 'react'
import { cx } from '@/lib/cx'
import { CATALOG, CATEGORIES, CATEGORY_LABELS, searchCatalog } from '@/lib/fixtures/components'
import { Chip, Input, PanelTitle } from '@/ui'

/**
 * Paleta de componentes (documento de diseño sección 4).
 *
 * Superficie glass (M-3) — una de las tres del presupuesto: con `backdrop-filter`
 * la GPU relee el fondo en cada frame, y aquí el fondo es la cuadrícula.
 *
 * Densidad alta: el objetivo de DESIGN.md es que se vean **>=14 componentes sin
 * scroll**. De ahi la rejilla de 2 columnas y las fichas compactas.
 *
 * En esta etapa solo **selecciona**: arrastrar al lienzo llega con la lógica de
 * dominio. Aun asi el estado de selección es real, para que se sienta vivo.
 */
export function Palette() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const visible = useMemo(() => {
    const byQuery = searchCatalog(query)
    return category === 'all' ? byQuery : byQuery.filter((c) => c.category === category)
  }, [query, category])

  /**
   * Categorías con al menos una coincidencia para la búsqueda actual.
   *
   * Deshabilitar las vacias en vez de ocultarlas mantiene la barra de filtros
   * estable: si los chips aparecieran y desaparecieran al teclear, el objetivo
   * se moveria bajo el cursor.
   */
  const counts = useMemo(() => {
    const byQuery = searchCatalog(query)
    const map = new Map<Category, number>()
    for (const item of byQuery) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1)
    }
    return map
  }, [query])

  return (
    <>
      <PanelTitle
        action={
          <span className="cf-mono text-2xs text-text-muted">
            {visible.length}/{CATALOG.length}
          </span>
        }
      >
        Componentes
      </PanelTitle>

      <div className="mb-3">
        <label htmlFor="palette-search" className="sr-only">
          Buscar componente
        </label>
        <Input
          id="palette-search"
          type="search"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/*
        `<fieldset>` en vez de `<div role="group">`: agrupa semanticamente el
        conjunto de filtros sin necesitar un rol ARIA, y un lector de pantalla lo
        anuncia como grupo de controles.
      */}
      <fieldset
        aria-label="Filtrar por categoría"
        className="mb-3 flex flex-wrap gap-1.5 border-b border-hairline pb-3"
      >
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          Todos
        </Chip>
        {CATEGORIES.map((cat) => {
          const count = counts.get(cat) ?? 0
          return (
            <Chip
              key={cat}
              active={category === cat}
              disabled={count === 0}
              onClick={() => setCategory(cat)}
              className={cx(count === 0 && 'opacity-40')}
            >
              {CATEGORY_LABELS[cat]}
              <span className="cf-mono ml-1 text-2xs opacity-70">{count}</span>
            </Chip>
          )
        })}
      </fieldset>

      <ul
        /*
          `overflow-x-hidden`: con la altura ya acotada por el shell la lista
          desplaza en vertical, pero las fichas de 2 columnas no caben en los
          ~216 px utiles y aparecia una barra horizontal. El desbordamiento
          horizontal en una lista de fichas nunca es deseable: el nombre se
          recorta con `truncate` en vez de empujar el ancho.
        */
        className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden pr-1"
        aria-label="Componentes disponibles"
      >
        {visible.map((component) => {
          const isSelected = selected === component.typeId
          return (
            <li key={component.typeId}>
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : component.typeId)}
                aria-pressed={isSelected}
                title={`${component.name} — ${component.description}`}
                className={cx(
                  'flex h-full w-full cursor-grab flex-col gap-1.5 rounded-md p-2.5 text-left',
                  'border bg-surface',
                  'transition-[border-color,transform] duration-fast ease-inout',
                  'hover:-translate-y-0.5 hover:border-accent',
                  'active:cursor-grabbing active:scale-[0.98]',
                  isSelected ? 'border-accent bg-accent-veil' : 'border-hairline',
                )}
              >
                {/* Símbolo esquemático abreviado */}
                <span aria-hidden="true" className="cf-mono text-sm font-medium text-text-muted">
                  {component.symbol}
                </span>
                <span className="truncate text-sm leading-tight font-medium text-text">
                  {component.name}
                </span>
                <span className="cf-mono text-2xs text-text-muted">
                  {component.pins.length} pines
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {visible.length === 0 && (
        <p className="py-8 text-center text-sm text-text-muted">
          Ningun componente coincide con «{query}».
        </p>
      )}
    </>
  )
}
