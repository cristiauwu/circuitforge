import type { Category } from '@circuitforge/netlist'
import { useMemo, useState } from 'react'
import { cx } from '@/lib/cx'
import { CATALOG, CATEGORIES, CATEGORY_LABELS, searchCatalog } from '@/lib/fixtures/components'
import { Chip, Input, PanelTitle, SchematicSymbol } from '@/ui'

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
export interface PaletteProps {
  /** Añade el componente al lienzo. */
  onAdd: (typeId: string) => void
  compact?: boolean
}

export function Palette({ onAdd, compact = false }: PaletteProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')

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
        hidden={compact}
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
          UNA columna con ficha HORIZONTAL (simbolo a la izquierda, texto a la
          derecha), no una rejilla de 2 columnas.
          
          Por que: medido, una ficha vertical con simbolo + nombre + pines mide
          98px de alto, y con 405px de lista solo caben 6 sin scroll. La
          alternativa era truncar el nombre o quitar el simbolo, y ambas
          empeoran la paleta. En horizontal la ficha mide ~40px, caben mas del
          doble y el nombre entra completo en una linea.
          
          Es ademas como funciona una paleta de EDA real (KiCad, Altium): lista
          densa de filas, no rejilla de tarjetas.
        */
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1"
        aria-label="Componentes disponibles"
      >
        {visible.map((component) => {
          return (
            <li key={component.typeId}>
              {/*
                Al pulsar se ANADE el componente al lienzo. El arrastre directo
                desde la paleta al lienzo es una mejora posterior: con el clic ya
                se puede construir un circuito completo, que es lo que exige el
                OE-1.
              */}
              <button
                type="button"
                onClick={() => onAdd(component.typeId)}
                title={`${component.name} — ${component.description}`}
                className={cx(
                  // Fila horizontal: simbolo, nombre y pines en una sola linea
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left',
                  'border border-hairline bg-surface',
                  'transition-[border-color,background-color] duration-fast ease-inout',
                  'hover:border-accent hover:bg-accent-veil',
                  'active:bg-accent-veil',
                )}
              >
                {/*
                  Simbolo esquematico real, no la inicial. En la paleta el
                  simbolo es lo que el usuario reconoce de un vistazo: es el
                  mismo dibujo que vera en el lienzo.
                */}
                <SchematicSymbol
                  typeId={component.typeId}
                  className="h-6 w-8 shrink-0 text-text-secondary"
                />
                {/* Nombre completo en una linea: en horizontal si cabe */}
                <span className="min-w-0 flex-1 truncate text-xs leading-tight font-medium text-text">
                  {component.name}
                </span>
                <span className="cf-mono shrink-0 text-2xs text-text-muted">
                  {component.pins.length}
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
