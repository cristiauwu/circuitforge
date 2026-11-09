import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { CATALOG_INDEX } from '@/lib/fixtures/components'
import { PanelTitle, PinChip, ViolationMessage } from '@/ui'

/**
 * Inspector de propiedades.
 *
 * Superficie glass (M-3) — segunda del presupuesto de tres.
 *
 * **Lee del store, no de una tabla fija:** el componente seleccionado sale del
 * netlist, que es la fuente de verdad. La versión anterior tenía cuatro
 * componentes escritos a mano, así que no reflejaba lo que hubiera en el lienzo.
 *
 * Con un componente seleccionado, el cuerpo entra con el patrón M-4: el contenido
 * anterior se desvanece y desplaza 6 px antes de que entre el nuevo.
 */
export interface InspectorProps {
  selectedId: string | null
}

export function Inspector({ selectedId }: InspectorProps) {
  const [swapping, setSwapping] = useState(false)
  const component = useEditorStore((s) =>
    selectedId === null ? undefined : s.project.components.find((c) => c.id === selectedId),
  )

  // M-4: al cambiar la selección, marcar el cuerpo como "saliendo" durante un
  // frame. Sin esto la transición no se dispara porque el DOM se reemplaza
  // directamente.
  useEffect(() => {
    if (selectedId === null) return
    setSwapping(true)
    const id = window.requestAnimationFrame(() => setSwapping(false))
    return () => window.cancelAnimationFrame(id)
  }, [selectedId])

  const fixture = component ? CATALOG_INDEX.get(component.typeId) : undefined

  return (
    <>
      <PanelTitle
        action={
          component ? <span className="cf-mono text-2xs text-signal">{component.id}</span> : null
        }
      >
        Inspector
      </PanelTitle>

      <div className="cf-inspector__body min-h-0 flex-1 overflow-y-auto" data-swapping={swapping}>
        {!component || !fixture ? (
          <EmptyInspector />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Identidad */}
            <div>
              <p className="text-md font-medium text-text">{fixture.name}</p>
              <p className="text-xs text-text-secondary">{fixture.description}</p>
              <p className="cf-mono mt-1 text-2xs text-text-muted">{component.typeId}</p>
            </div>

            {/* Transformación */}
            <fieldset className="flex flex-col gap-2">
              <legend className="cf-eyebrow mb-2">Transformación</legend>
              <Row
                label="Posición"
                value={`${Math.round(component.position.x)}, ${Math.round(component.position.y)}`}
              />
              <Row label="Rotación" value={`${component.position.rotation}°`} />
            </fieldset>

            {/* Valor de referencia del catálogo, no un parámetro editable del proyecto. */}
            {fixture.primaryParam && (
              <section className="flex flex-col gap-2" aria-label="Parámetros del catálogo">
                <h3 className="cf-eyebrow mb-2">Parámetros del catálogo</h3>
                <dl>
                  <Row
                    label={fixture.primaryParam.name}
                    value={`${fixture.primaryParam.value} ${fixture.primaryParam.unit}`.trim()}
                  />
                </dl>
                <p className="text-xs text-text-muted">
                  Valor de referencia del catálogo. Solo lectura.
                </p>
              </section>
            )}

            {/* Pines */}
            <fieldset>
              <legend className="cf-eyebrow mb-2">Pines</legend>
              <ul className="flex flex-wrap gap-1.5">
                {fixture.pins.map((pin) => {
                  const connected = component.pins.find((p) => p.pinId === pin.id)?.netId != null
                  return (
                    <li key={pin.id} className="flex items-center gap-1.5">
                      <PinChip pinType={pin.type} pinName={pin.id} />
                      <span
                        className={cx(
                          'cf-mono text-2xs',
                          connected ? 'text-success' : 'text-text-muted',
                        )}
                      >
                        {connected ? 'net' : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            {/* Estado de conexiones */}
            <fieldset>
              <legend className="cf-eyebrow mb-2">Conexiones</legend>
              {component.pins.some((p) => p.netId === null) ? (
                <ViolationMessage
                  severity="warning"
                  rule="V-5"
                  message="Hay pines sin conectar en este componente."
                />
              ) : (
                <ViolationMessage severity="success" message="Todos los pines están conectados." />
              )}
            </fieldset>
          </div>
        )}
      </div>
    </>
  )
}

/** Fila etiqueta/valor en monoespaciada. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="cf-mono text-sm text-text">{value}</dd>
    </div>
  )
}

/** Estado vacío del inspector: guía en vez de un panel en blanco. */
function EmptyInspector() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-text-muted"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 9h6v6H9z" />
      </svg>
      <p className="max-w-[22ch] text-sm text-text-muted">
        Selecciona un componente del lienzo para consultar sus propiedades y ver sus pines.
      </p>
    </div>
  )
}
