import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'
import { CATALOG_INDEX } from '@/lib/fixtures/components'
import { Input, PanelTitle, PinChip, ViolationMessage } from '@/ui'

/** Componentes colocados, para que el inspector tenga algo que inspeccionar. */
const PLACED: Record<string, { name: string; typeId: string }> = {
  V1: { name: 'Fuente DC', typeId: 'dc_source' },
  R1: { name: 'Resistencia', typeId: 'resistor' },
  D1: { name: 'LED', typeId: 'led' },
  U1: { name: 'Arduino UNO', typeId: 'arduino_uno' },
}

interface InspectorProps {
  selectedId: string | null
}

/**
 * Inspector de propiedades (documento de diseño sección 4).
 *
 * Superficie glass (M-3) — segunda del presupuesto de tres.
 *
 * Con un componente seleccionado, el cuerpo del panel entra con el patron M-4:
 * el contenido anterior se desvanece y desplaza 6 px antes de que entre el nuevo.
 * `data-swapping` es lo que dispara esa transición, y se limpia en el siguiente
 * frame para que el contenido nuevo pueda animarse.
 */
export function Inspector({ selectedId }: InspectorProps) {
  const [swapping, setSwapping] = useState(false)

  // M-4: al cambiar la selección, marcar el cuerpo como "saliendo" durante un
  // frame. Sin esto la transición no se dispara porque el DOM se reemplaza
  // directamente.
  useEffect(() => {
    if (selectedId === null) return
    setSwapping(true)
    const id = window.requestAnimationFrame(() => setSwapping(false))
    return () => window.cancelAnimationFrame(id)
  }, [selectedId])

  const placed = selectedId ? PLACED[selectedId] : undefined
  const entry = placed ? CATALOG_INDEX.get(placed.typeId) : undefined

  return (
    <>
      <PanelTitle
        action={
          selectedId ? <span className="cf-mono text-2xs text-signal">{selectedId}</span> : null
        }
      >
        Inspector
      </PanelTitle>

      <div className="cf-inspector__body min-h-0 flex-1 overflow-y-auto" data-swapping={swapping}>
        {!placed || !entry ? (
          <EmptyInspector />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Identidad */}
            <div>
              <p className="text-md font-medium text-text">{placed.name}</p>
              <p className="text-xs text-text-secondary">{entry.description}</p>
              <p className="cf-mono mt-1 text-2xs text-text-muted">{entry.typeId}</p>
            </div>

            {/* Parámetros editables */}
            {entry.primaryParam && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                  Parámetros
                </legend>
                <div className="flex items-center justify-between gap-3">
                  {/*
                    `htmlFor` explicito en vez de envolver el input: la asociacion
                    por anidamiento se rompe si hay un contenedor en medio, y un
                    lector de pantalla dejaria de anunciar para que sirve el campo.
                  */}
                  <label htmlFor="param-primary" className="text-sm text-text-secondary">
                    {entry.primaryParam.name}
                  </label>
                  <span className="flex items-center gap-1.5">
                    <Input
                      id="param-primary"
                      numeric
                      defaultValue={entry.primaryParam.value}
                      className="w-24"
                    />
                    <span className="cf-mono w-8 text-xs text-text-muted">
                      {entry.primaryParam.unit}
                    </span>
                  </span>
                </div>
              </fieldset>
            )}

            {/* Pines */}
            <fieldset>
              <legend className="mb-2 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                Pines
              </legend>
              <ul className="flex flex-wrap gap-1.5">
                {entry.pins.map((pin) => (
                  <li key={pin.id} className="flex items-center gap-1.5">
                    <PinChip pinType={pin.type} pinName={pin.id} />
                  </li>
                ))}
              </ul>
            </fieldset>

            {/* Estado de conexiones: aquí vivira la salida de validateCircuit */}
            <fieldset>
              <legend className="mb-2 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                Conexiones
              </legend>
              <ViolationMessage
                severity="warning"
                rule="V-5"
                message="Hay pines sin conectar en este componente."
              />
            </fieldset>
          </div>
        )}
      </div>
    </>
  )
}

/** Estado vacio del inspector: guia en vez de un panel en blanco. */
function EmptyInspector() {
  return (
    <div className={cx('flex flex-col items-center gap-3 py-10 text-center')}>
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
        Selecciona un componente del lienzo para editar sus parámetros y ver sus pines.
      </p>
    </div>
  )
}
