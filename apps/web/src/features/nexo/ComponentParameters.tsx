import {
  COMPONENT_INDEX,
  type Component,
  type ParameterDefinition,
  type ParamValue,
  validateParameterValue,
} from '@circuitforge/netlist'
import { useEffect, useId, useRef, useState } from 'react'
import './mount-controls.css'

export interface ParameterUpdateResult {
  ok: boolean
  error?: string
}

interface ComponentParametersProps {
  component: Component
  onUpdate: (key: string, value: ParamValue) => ParameterUpdateResult
}

/** Empty drafts are not zero; only finite, domain-valid numbers can be committed. */
export function parseParameterDraft(typeId: string, key: string, draft: string): number | null {
  if (!draft.trim()) return null
  const value = Number(draft)
  return Number.isFinite(value) && validateParameterValue(typeId, key, value) ? value : null
}

function ParameterField({
  component,
  definition,
  onUpdate,
}: ComponentParametersProps & { definition: ParameterDefinition }) {
  const id = useId()
  const value = component.params[definition.key] ?? definition.defaultValue
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState('')
  const cancelBlur = useRef(false)
  useEffect(() => {
    setDraft(String(value))
    setError('')
  }, [value])

  const update = (next: ParamValue) => {
    if (Object.is(value, next)) return
    const result = onUpdate(definition.key, next)
    setError(result.ok ? '' : (result.error ?? 'No se pudo actualizar. Revisa el valor.'))
  }
  const label = `${definition.label}${definition.kind === 'number' && definition.unit ? ` (${definition.unit})` : ''}`
  return (
    <div className="nx-parameter-field">
      <label htmlFor={id}>{label}</label>
      {definition.kind === 'number' ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          enterKeyHint="done"
          value={draft}
          min={definition.min}
          max={definition.max}
          step={definition.step ?? 'any'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setError('')
          }}
          onBlur={(event) => {
            if (cancelBlur.current) {
              cancelBlur.current = false
              return
            }
            const parsed = parseParameterDraft(component.typeId, definition.key, draft)
            if (parsed === null || !event.currentTarget.validity.valid) {
              setError('Introduce un número válido dentro de los límites indicados.')
              return
            }
            update(parsed)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              cancelBlur.current = true
              setDraft(String(value))
              setError('')
              event.currentTarget.blur()
            }
          }}
        />
      ) : definition.kind === 'boolean' ? (
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => update(event.target.checked)}
        />
      ) : (
        <select
          id={id}
          value={String(value)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => update(event.target.value)}
        >
          {definition.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {definition.kind === 'number' &&
        (definition.min !== undefined || definition.max !== undefined) && (
          <small>
            {definition.min !== undefined ? `Mín. ${definition.min}` : ''}
            {definition.min !== undefined && definition.max !== undefined ? ' · ' : ''}
            {definition.max !== undefined ? `Máx. ${definition.max}` : ''}
            {definition.unit ? ` ${definition.unit}` : ''}
          </small>
        )}
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function ComponentParameters({ component, onUpdate }: ComponentParametersProps) {
  const id = useId()
  const definition = COMPONENT_INDEX.get(component.typeId)
  if (!definition) return null
  return (
    <section className="nx-component-parameters" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Parámetros de {component.id}</h3>
      <p>Valores nominales de referencia del proyecto para cálculo y reglas ERC.</p>
      {component.typeId === 'relay_spdt' && (
        <p>Contactos ideales: el estado del relé se elige manualmente, no depende de la bobina.</p>
      )}
      {definition.parameters.length ? (
        <>
          <div className="nx-parameter-fields">
            {definition.parameters.map((parameter) => (
              <ParameterField
                key={`${component.id}:${parameter.key}`}
                component={component}
                definition={parameter}
                onUpdate={onUpdate}
              />
            ))}
          </div>
          <p className="nx-control-note">
            Números: confirma con Enter o al salir del campo. Escape descarta el borrador.
          </p>
        </>
      ) : (
        <p>Esta pieza no tiene parámetros editables.</p>
      )}
    </section>
  )
}
