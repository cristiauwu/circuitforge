import {
  BREADBOARD_CONTACTS,
  BREADBOARD_GROUPS,
  BREADBOARD_TYPE_ID,
  type Category,
  COMPONENT_DEFINITIONS,
  COMPONENT_INDEX,
} from '@circuitforge/netlist'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComponentPreview } from '@/features/nexo/ComponentPreview'
import { isEditableType } from '@/features/nexo/capabilities'
import { findProjectPosition } from '@/features/nexo/editorProjection'
import { useNexoSession } from '@/features/nexo/session'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { CATEGORIES, CATEGORY_LABELS, searchCatalog } from '@/lib/fixtures/components'
import '@/features/nexo/mount-controls.css'

const ELECTRONIC_COUNT = COMPONENT_DEFINITIONS.filter((definition) => definition.electronic).length
const AUXILIARY_COUNT = COMPONENT_DEFINITIONS.length - ELECTRONIC_COUNT

export function LibraryPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [error, setError] = useState('')
  const visible = useMemo(() => {
    const results = searchCatalog(query)
    return category === 'all'
      ? results
      : results.filter((component) => component.category === category)
  }, [query, category])

  function addToProject(typeId: string) {
    if (!isEditableType(typeId)) return
    try {
      const store = useEditorStore.getState()
      const position = findProjectPosition(store.project.components, typeId)
      const id = store.addComponent(typeId, position)
      useEditorStore.getState().selectComponent(id)
      useNexoSession.getState().continueWork()
      useNexoSession.getState().notifyHelp('add')
      navigate('/editor')
    } catch {
      setError('No se pudo añadir la pieza. Tu proyecto no se ha reemplazado; vuelve a intentarlo.')
    }
  }

  function clearFilters() {
    setQuery('')
    setCategory('all')
  }

  return (
    <div className="nx-page">
      <header className="nx-page-heading">
        <h1>Biblioteca de componentes</h1>
        <p className="nx-muted">
          {ELECTRONIC_COUNT} componentes electrónicos y {AUXILIARY_COUNT} auxiliares para tu
          montaje. Parámetros y terminales de referencia; sin simulación eléctrica.
        </p>
      </header>
      <div className="nx-library-controls">
        <label htmlFor="library-search">
          Buscar una pieza
          <input
            className="nx-input"
            id="library-search"
            type="search"
            placeholder="Nombre o identificador…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <fieldset className="nx-filter-group">
          <legend>Filtrar por categoría</legend>
          <button
            className="nx-filter"
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            Todas
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item}
              className="nx-filter"
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {CATEGORY_LABELS[item]}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="nx-muted" role="status">
        {visible.length} {visible.length === 1 ? 'resultado' : 'resultados'}
      </p>
      {error && <p role="alert">{error}</p>}
      {visible.length ? (
        <ul className="nx-catalog-grid">
          {visible.map((component) => {
            const supported = isEditableType(component.typeId)
            const definition = COMPONENT_INDEX.get(component.typeId)
            return (
              <li key={component.typeId} className="nx-catalog-row">
                <ComponentPreview
                  typeId={component.typeId}
                  name={component.name}
                  size="detail"
                  className="nx-library-preview"
                />
                <div className="nx-catalog-copy">
                  <span className="nx-badge">
                    {supported ? 'Disponible en montaje' : 'Solo consulta'}
                  </span>
                  <h2>{component.name}</h2>
                  <p className="nx-muted">{component.description}</p>
                  <p className="nx-catalog-meta">
                    {CATEGORY_LABELS[component.category]} · <code>{component.typeId}</code>
                  </p>
                  {definition && (
                    <p className="nx-catalog-meta">
                      {definition.electronic ? 'Componente electrónico' : 'Auxiliar de montaje'} ·
                      Referencia {definition.referencePrefix}
                    </p>
                  )}
                  {definition && definition.parameters.length > 0 && (
                    <dl
                      className="nx-reference-values"
                      aria-label={`Valores de referencia de ${component.name}`}
                    >
                      {definition.parameters.map((parameter) => (
                        <div key={parameter.key}>
                          <dt>{parameter.label}</dt>
                          <dd>
                            {parameter.kind === 'boolean'
                              ? parameter.defaultValue
                                ? 'Sí'
                                : 'No'
                              : parameter.kind === 'enum'
                                ? (parameter.options.find(
                                    (option) => option.value === parameter.defaultValue,
                                  )?.label ?? parameter.defaultValue)
                                : `${parameter.defaultValue}${parameter.unit ? ` ${parameter.unit}` : ''}`}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {component.typeId === 'relay_spdt' && (
                    <p className="nx-catalog-meta">
                      Contactos ideales; estado manual, sin simulación de bobina.
                    </p>
                  )}
                  <p className="nx-catalog-pins">
                    {component.typeId === BREADBOARD_TYPE_ID
                      ? `${BREADBOARD_CONTACTS.length} contactos · ${BREADBOARD_GROUPS.length} grupos internos. Regletas de 5; rieles continuos de 30, sin alimentación.`
                      : `Pines: ${component.pins.map((pin) => pin.id).join(', ')}`}
                  </p>
                </div>
                <button
                  className="nx-button nx-button-dark"
                  type="button"
                  disabled={!supported}
                  onClick={() => addToProject(component.typeId)}
                  aria-label={
                    supported
                      ? `Añadir ${component.name} al proyecto y abrir el laboratorio`
                      : `${component.name}: disponible solo para consulta`
                  }
                >
                  {supported ? 'Añadir al proyecto' : 'No disponible en montaje'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <section className="nx-empty" aria-labelledby="library-empty-title">
          <h2 id="library-empty-title">No encontramos esa pieza</h2>
          <p className="nx-muted">Prueba otro nombre o elimina el filtro de categoría.</p>
          <button className="nx-button nx-button-dark" type="button" onClick={clearFilters}>
            Limpiar búsqueda y filtros
          </button>
        </section>
      )}
    </div>
  )
}
