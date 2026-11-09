import {
  BREADBOARD_CONTACTS,
  BREADBOARD_TYPE_ID,
  buildMount,
  type Component,
  getMountFootprint,
  type Mount,
  type Project,
  type Rotation,
} from '@circuitforge/netlist'
import { useEffect, useId, useState } from 'react'
import type { ParameterUpdateResult } from './ComponentParameters'
import './mount-controls.css'

const RAILS = [
  { id: 'rail_top_positive', label: 'Superior + (sin alimentar)' },
  { id: 'rail_top_negative', label: 'Superior − (sin alimentar)' },
  { id: 'rail_bottom_negative', label: 'Inferior − (sin alimentar)' },
  { id: 'rail_bottom_positive', label: 'Inferior + (sin alimentar)' },
] as const
const ROWS = Array.from({ length: 30 }, (_, index) => index + 1)
const ORIENTATIONS: readonly Rotation[] = [0, 90, 180, 270]
type Bank = 'ae' | 'fj' | 'rail'

export function previewBreadboardMount(
  project: Project,
  componentId: string,
  boardId: string,
  anchor: string,
  rotation: Rotation,
): { mount: Mount; error?: never } | { mount?: never; error: string } {
  try {
    return { mount: buildMount(project, componentId, boardId, anchor, rotation) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No se puede insertar en estos contactos.',
    }
  }
}

interface BreadboardMountPanelProps {
  project: Project
  component: Component
  onMount: (boardId: string, anchor: string, rotation: Rotation) => ParameterUpdateResult
  onUnmount: () => ParameterUpdateResult
}

/** Draft coordinates are local UI state. Only the explicit action writes the project. */
export function BreadboardMountPanel({
  project,
  component,
  onMount,
  onUnmount,
}: BreadboardMountPanelProps) {
  const id = useId()
  const mounted = project.mounts?.find((item) => item.componentId === component.id)
  const boards = project.components.filter((item) => item.typeId === BREADBOARD_TYPE_ID)
  const initialAnchor = BREADBOARD_CONTACTS.find((item) => item.pinId === mounted?.anchorContactId)
  const initialColumn = initialAnchor?.pinId.match(/^([a-j])(\d+)$/)?.[1] ?? 'a'
  const [boardId, setBoardId] = useState(mounted?.boardId ?? boards[0]?.id ?? '')
  const [bank, setBank] = useState<Bank>(
    initialAnchor?.groupId.startsWith('rail_') ? 'rail' : initialColumn <= 'e' ? 'ae' : 'fj',
  )
  const [columnOffset, setColumnOffset] = useState(
    initialColumn.charCodeAt(0) - (initialColumn <= 'e' ? 97 : 102),
  )
  const [row, setRow] = useState(
    initialAnchor ? Number(initialAnchor.pinId.match(/\d+$/)?.[0] ?? 1) : 1,
  )
  const [rail, setRail] = useState(
    initialAnchor?.groupId.startsWith('rail_') ? initialAnchor.groupId : RAILS[0].id,
  )
  const [rotation, setRotation] = useState<Rotation>(mounted?.rotation ?? 0)
  const [actionError, setActionError] = useState('')
  useEffect(() => {
    if (!mounted) return
    const contact = BREADBOARD_CONTACTS.find((item) => item.pinId === mounted.anchorContactId)
    const column = contact?.pinId.match(/^([a-j])(\d+)$/)?.[1]
    setBoardId(mounted.boardId)
    setRotation(mounted.rotation)
    setRow(Number(mounted.anchorContactId.match(/\d+$/)?.[0] ?? 1))
    if (column) {
      setBank(column <= 'e' ? 'ae' : 'fj')
      setColumnOffset(column.charCodeAt(0) - (column <= 'e' ? 97 : 102))
    } else if (contact) {
      setBank('rail')
      setRail(contact.groupId)
    }
    setActionError('')
  }, [mounted])
  if (!getMountFootprint(component.typeId)) return null

  const selectedBoard = boards.find((item) => item.id === boardId)
  const columns = bank === 'fj' ? ['f', 'g', 'h', 'i', 'j'] : ['a', 'b', 'c', 'd', 'e']
  const anchor = bank === 'rail' ? `${rail}_${row}` : `${columns[columnOffset]}${row}`
  const preview = selectedBoard
    ? previewBreadboardMount(project, component.id, boardId, anchor, rotation)
    : null
  const unchanged =
    mounted?.boardId === boardId &&
    mounted.anchorContactId === anchor &&
    mounted.rotation === rotation
  const applyResult = (result: ParameterUpdateResult) =>
    setActionError(result.ok ? '' : (result.error ?? 'No se pudo cambiar el montaje.'))

  return (
    <section className="nx-breadboard-mount" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Insertar en protoboard</h3>
      {mounted ? (
        <div className="nx-mounted-status">
          <p>
            <strong>Insertado en {mounted.boardId}</strong> · Anclaje {mounted.anchorContactId} ·{' '}
            {mounted.rotation}°
          </p>
          <ul aria-label="Contactos insertados">
            {mounted.contacts.map((contact) => (
              <li key={contact.pinId}>
                {component.id}.{contact.pinId} → {mounted.boardId}.{contact.contactId}
              </li>
            ))}
          </ul>
          <p>
            Al mover o girar la protoboard, esta pieza la sigue. Para cambiarla de sitio, usa
            Recolocar; para moverla libremente, usa Extraer.
          </p>
        </div>
      ) : (
        <p>Inserta todas las patas con una huella validada. Superponer la pieza no la conecta.</p>
      )}
      {boards.length ? (
        <>
          <div className="nx-mount-fields" onChange={() => setActionError('')}>
            <label htmlFor={`${id}-board`}>
              Protoboard
              <select
                id={`${id}-board`}
                value={boardId}
                onChange={(event) => setBoardId(event.target.value)}
              >
                {!selectedBoard && <option value="">Elige una protoboard</option>}
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.id}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-bank`}>
              Banco de anclaje
              <select
                id={`${id}-bank`}
                value={bank}
                onChange={(event) => setBank(event.target.value as Bank)}
              >
                <option value="ae">a–e · regletas de 5</option>
                <option value="fj">f–j · regletas de 5</option>
                <option value="rail">Riel (sin alimentar)</option>
              </select>
            </label>
            <label htmlFor={`${id}-column`}>
              {bank === 'rail' ? 'Riel de anclaje' : 'Columna de anclaje'}
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
              Fila de anclaje
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
            <label htmlFor={`${id}-rotation`}>
              Orientación en la protoboard
              <select
                id={`${id}-rotation`}
                value={rotation}
                onChange={(event) => setRotation(Number(event.target.value) as Rotation)}
              >
                {ORIENTATIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}°
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="nx-mount-preview" role="status" aria-live="polite">
            <p>
              <strong>
                Vista previa · {selectedBoard ? `${boardId}.${anchor}` : 'Elige una protoboard'}
              </strong>
            </p>
            {preview?.mount && (
              <ul aria-label="Contactos previstos">
                {preview.mount.contacts.map((contact) => (
                  <li key={contact.pinId}>
                    {component.id}.{contact.pinId} → {boardId}.{contact.contactId}
                  </li>
                ))}
              </ul>
            )}
            {preview?.error && <p>{preview.error} Cambia el anclaje o la orientación.</p>}
            <p>No se modifica el proyecto hasta pulsar {mounted ? 'Recolocar' : 'Insertar'}.</p>
          </div>
          <button
            type="button"
            className="nx-button nx-button-primary"
            disabled={!preview?.mount || unchanged}
            aria-describedby={`${id}-scope`}
            onClick={() => applyResult(onMount(boardId, anchor, rotation))}
          >
            {mounted ? 'Recolocar' : 'Insertar'}
          </button>
        </>
      ) : (
        <p>Añade una protoboard desde Componentes para insertar esta pieza.</p>
      )}
      {mounted && (
        <button type="button" className="nx-button" onClick={() => applyResult(onUnmount())}>
          Extraer
        </button>
      )}
      {actionError && <p role="alert">{actionError}</p>}
      <p id={`${id}-scope`} className="nx-control-note">
        La inserción une los pines con los contactos indicados; no crea cables. Contactos ideales,
        sin simulación eléctrica. Los rieles no alimentan por sí solos.
      </p>
    </section>
  )
}
