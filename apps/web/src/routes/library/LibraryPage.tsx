import type { Category } from '@circuitforge/netlist'
import { useMemo, useState } from 'react'
import { CATALOG, CATEGORIES, CATEGORY_LABELS, searchCatalog } from '@/lib/fixtures/components'
import { Chip, Input, PinChip, RevealText, SchematicSymbol } from '@/ui'

/**
 * Biblioteca de componentes (documento de diseño sección 4).
 *
 * Ficha apaisada 4:3 (DESIGN.md sección 3.5): un símbolo esquemático es
 * horizontal, a diferencia del retrato de la referencia, que era para producto
 * fisico.
 *
 * **Sin glass.** Son ~22 fichas visibles; con `backdrop-filter` en cada una se
 * agotaria el presupuesto de GPU. Superficie solida.
 */
export function LibraryPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')

  const visible = useMemo(() => {
    const byQuery = searchCatalog(query)
    return category === 'all' ? byQuery : byQuery.filter((c) => c.category === category)
  }, [query, category])

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <header className="mb-6">
        <p className="cf-eyebrow mb-2">Catálogo</p>
        <RevealText
          text="Biblioteca de componentes"
          as="h1"
          className="mb-1 text-xl font-semibold tracking-tight text-text-strong"
        />
        <p className="text-sm text-text-secondary">
          {CATALOG.length} fichas tipadas en {CATEGORIES.length} categorías. Cada una declara su
          símbolo, sus pines y sus parámetros editables.
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="library-search" className="sr-only">
            Buscar componente
          </label>
          <Input
            id="library-search"
            type="search"
            placeholder="Buscar por nombre o tipo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* `<fieldset>` agrupa los filtros sin necesitar un rol ARIA explicito */}
        <fieldset aria-label="Filtrar por categoría" className="flex flex-wrap gap-1.5">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            Todas
          </Chip>
          {CATEGORIES.map((cat) => (
            <Chip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {CATEGORY_LABELS[cat]}
            </Chip>
          ))}
        </fieldset>
      </div>

      <p className="mb-4 text-xs text-text-muted" role="status">
        {visible.length} {visible.length === 1 ? 'resultado' : 'resultados'}
      </p>

      {/* Rejilla de fichas */}
      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((component) => (
            <li key={component.typeId}>
              {/*
                `cf-tile` en vez de un div con borde: da el mismo relleno tenue
                que el glass de la referencia SIN el coste de GPU (no relee el
                fondo). Con 22 fichas visibles, `backdrop-filter` en cada una
                agotaria el presupuesto y degradaria el arrastre del lienzo.
              */}
              <article className="cf-tile h-full hover:-translate-y-0.5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-md font-medium text-text">{component.name}</h2>
                    <p className="cf-mono truncate text-2xs text-text-muted">{component.typeId}</p>
                  </div>
                  {/* Simbolo esquematico real, no la inicial de la ficha */}
                  <SchematicSymbol
                    typeId={component.typeId}
                    className="mt-0.5 h-6 w-9 shrink-0 text-text-muted"
                  />
                </div>

                <p className="mb-4 flex-1 text-sm leading-snug text-text-secondary">
                  {component.description}
                </p>

                {/* Parámetro principal */}
                {component.primaryParam && (
                  <p className="mb-3 flex items-baseline gap-1.5 text-xs">
                    <span className="text-text-muted">{component.primaryParam.name}</span>
                    <span className="cf-mono font-medium text-text">
                      {component.primaryParam.value}
                    </span>
                    <span className="cf-mono text-text-muted">{component.primaryParam.unit}</span>
                  </p>
                )}

                {/* Pines tipados */}
                <ul className="flex flex-wrap gap-1" aria-label="Pines">
                  {component.pins.slice(0, 6).map((pin) => (
                    <li key={pin.id}>
                      <PinChip pinType={pin.type} pinName={pin.id} />
                    </li>
                  ))}
                  {component.pins.length > 6 && (
                    <li className="cf-mono self-center text-2xs text-text-muted">
                      +{component.pins.length - 6}
                    </li>
                  )}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyLibrary query={query} onClear={() => setQuery('')} />
      )}
    </div>
  )
}

/** Estado vacio de la búsqueda: ofrece la salida en vez de dejar la pantalla en blanco. */
function EmptyLibrary({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-hairline bg-surface py-16 text-center">
      <p className="text-md text-text">Ningun componente coincide con «{query}»</p>
      <p className="max-w-[40ch] text-sm text-text-muted">
        Prueba con el nombre en espanol o con el identificador técnico, como{' '}
        <span className="cf-mono text-text-secondary">led</span> o{' '}
        <span className="cf-mono text-text-secondary">arduino</span>.
      </p>
      <Chip onClick={onClear}>Limpiar búsqueda</Chip>
    </div>
  )
}
