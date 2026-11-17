/**
 * @circuitforge/web — Cajón lateral del catálogo de piezas (Apple HIG & Emil Design Eng).
 */

import React from 'react'
import type { Category } from '@circuitforge/netlist'
import { ComponentPreview } from '@/features/nexo/ComponentPreview'
import { isEditableType } from '@/features/nexo/capabilities'
import { CATALOG, CATEGORIES, CATEGORY_LABELS, type CatalogFixture } from '@/lib/fixtures/components'

export interface EditorCatalogDrawerProps {
  catalogOpen: boolean
  onClose: () => void
  catalogRef: React.RefObject<HTMLElement | null>
  query: string
  onQueryChange: (query: string) => void
  category: Category | 'all'
  onCategoryChange: (category: Category | 'all') => void
  catalog: readonly CatalogFixture[]
  onAddPiece: (typeId: string) => void
  windowWidth: number
}

export const EditorCatalogDrawer: React.FC<EditorCatalogDrawerProps> = ({
  catalogOpen,
  onClose,
  catalogRef,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  catalog,
  onAddPiece,
  windowWidth,
}) => {
  return (
    <aside
      id="editor-catalog"
      ref={catalogRef as React.RefObject<HTMLElement>}
      tabIndex={-1}
      className="nx-editor-catalog"
      data-open={catalogOpen}
      aria-label="Piezas editables"
      onBlur={(event) => {
        if (windowWidth <= 650 && !event.currentTarget.contains(event.relatedTarget)) {
          onClose()
        }
      }}
    >
      <div className="nx-palette-header">
        <div className="nx-palette-heading">
          <h2>Componentes</h2>
          <button
            type="button"
            className="nx-catalog-close nx-button"
            aria-label="Cerrar catálogo de componentes"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <input
          id="editor-piece-search"
          className="nx-input"
          type="search"
          aria-label="Buscar componente en catálogo"
          placeholder="Buscar componente…"
          autoCapitalize="none"
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />

        <label className="nx-palette-category" htmlFor="editor-piece-category">
          Categoría
          <select
            id="editor-piece-category"
            className="nx-input"
            value={category}
            style={{ colorScheme: 'light' }}
            onChange={(e) => onCategoryChange(e.target.value as Category | 'all')}
          >
            <option value="all">
              Todas las categorías ({CATALOG.filter((p) => isEditableType(p.typeId)).length})
            </option>
            {CATEGORIES.filter((item) =>
              CATALOG.some((part) => part.category === item && isEditableType(part.typeId)),
            ).map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <p className="nx-palette-count" role="status">
          {catalog.length} {catalog.length === 1 ? 'componente disponible' : 'componentes disponibles'}
        </p>
      </div>

      <div className="nx-palette-list">
        {catalog.map((part) => (
          <div key={part.typeId} className="nx-piece-card">
            <div className="nx-piece-main">
              <ComponentPreview
                typeId={part.typeId}
                name={part.name}
                size="catalog"
                className="nx-piece-thumb"
              />
              <div className="nx-piece-meta">
                <span className="nx-piece-name">{part.name}</span>
                <span className="nx-piece-desc">{part.description}</span>
              </div>
            </div>

            <button
              type="button"
              className="nx-button-primary nx-piece-add"
              onClick={() => onAddPiece(part.typeId)}
            >
              Añadir {part.name}
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
