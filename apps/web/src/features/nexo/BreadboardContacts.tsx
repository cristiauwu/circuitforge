import {
  BREADBOARD_CONTACTS,
  BREADBOARD_GROUPS,
  type Component,
  type PinEndpoint,
} from '@circuitforge/netlist'
import { useId, useState } from 'react'
import { useNexoSession } from './session'
import './breadboard-controls.css'

const RAILS = [
  { id: 'rail_top_positive', label: 'Superior + (sin alimentación)' },
  { id: 'rail_top_negative', label: 'Superior − (sin alimentación)' },
  { id: 'rail_bottom_negative', label: 'Inferior − (sin alimentación)' },
  { id: 'rail_bottom_positive', label: 'Inferior + (sin alimentación)' },
] as const
const ROWS = Array.from({ length: 30 }, (_, index) => index + 1)

type Bank = 'ae' | 'fj' | 'rail'

interface BreadboardContactsProps {
  component: Component
  pending: PinEndpoint | null
  onPin: (componentId: string, pinId: string) => void
}

/** A precise keyboard-accessible endpoint picker, not a grid of 420 tab stops. */
export function BreadboardContacts({ component, pending, onPin }: BreadboardContactsProps) {
  const id = useId()
  const [bank, setBank] = useState<Bank>('ae')
  const [row, setRow] = useState(1)
  const [columnOffset, setColumnOffset] = useState(0)
  const [rail, setRail] = useState<string>(RAILS[0].id)
  const columns = bank === 'fj' ? ['f', 'g', 'h', 'i', 'j'] : ['a', 'b', 'c', 'd', 'e']
  const pinId = bank === 'rail' ? `${rail}_${row}` : `${columns[columnOffset]}${row}`
  const contact = BREADBOARD_CONTACTS.find((item) => item.pinId === pinId)
  const group = BREADBOARD_GROUPS.find((item) => item.id === contact?.groupId)
  const terminal = component.pins.find((item) => item.pinId === pinId)
  const isPending = pending?.componentId === component.id && pending.pinId === pinId

  return (
    <section className="nx-breadboard-contacts" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Contactos de la protoboard</h3>
      <p>
        {BREADBOARD_CONTACTS.length} contactos · {BREADBOARD_GROUPS.length} grupos internos. Elige
        un contacto como origen o destino.
      </p>
      <div
        className="nx-breadboard-fields"
        onChange={() => useNexoSession.getState().continueWork()}
      >
        <label htmlFor={`${id}-bank`}>
          Banco
          <select
            id={`${id}-bank`}
            value={bank}
            onChange={(event) => setBank(event.target.value as Bank)}
          >
            <option value="ae">a–e · regletas de 5</option>
            <option value="fj">f–j · regletas de 5</option>
            <option value="rail">Riel de alimentación (sin alimentar)</option>
          </select>
        </label>
        <label htmlFor={`${id}-column`}>
          {bank === 'rail' ? 'Riel' : 'Columna'}
          {bank === 'rail' ? (
            <select
              id={`${id}-column`}
              value={rail}
              onChange={(event) => setRail(event.target.value)}
            >
              {RAILS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              id={`${id}-column`}
              value={columnOffset}
              onChange={(event) => setColumnOffset(Number(event.target.value))}
            >
              {columns.map((column, index) => (
                <option key={column} value={index}>
                  {column}
                </option>
              ))}
            </select>
          )}
        </label>
        <label htmlFor={`${id}-row`}>
          {bank === 'rail' ? 'Contacto del riel' : 'Fila'}
          <select
            id={`${id}-row`}
            value={row}
            onChange={(event) => setRow(Number(event.target.value))}
          >
            {ROWS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p id={`${id}-selection`} className="nx-breadboard-selection" role="status">
        <strong>
          {component.id}.{pinId}
        </strong>
        <span>Red actual: {terminal?.netId ?? 'sin conectar'}</span>
      </p>
      <p id={`${id}-group`}>
        {bank === 'rail'
          ? 'Riel continuo: sus 30 contactos están unidos internamente. Sin alimentación por defecto; + y − son etiquetas, no una fuente de tensión.'
          : `Regleta de la fila ${row}: ${group?.pinIds.join(', ') ?? 'grupo no disponible'}. Estos cinco contactos están unidos internamente; el canal central separa a–e de f–j.`}
      </p>
      <button
        type="button"
        className="nx-button nx-button-primary"
        disabled={!contact || !terminal}
        aria-pressed={isPending}
        aria-describedby={`${id}-selection ${id}-group`}
        onClick={() => onPin(component.id, pinId)}
      >
        Conectar {component.id}.{pinId}
      </button>
      {pending && (
        <p>
          Origen pendiente: {pending.componentId}.{pending.pinId}.
          {isPending
            ? ' Elige otro destino o cancela la conexión.'
            : ' Este contacto será el destino.'}
        </p>
      )}
      <p className="nx-muted">
        Superponer piezas no conecta sus terminales. Las uniones internas no son cables; conecta
        cada terminal a un contacto explícitamente. Sin simulación eléctrica.
      </p>
    </section>
  )
}
