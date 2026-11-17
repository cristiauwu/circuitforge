/**
 * @circuitforge/web — Cajón lateral del Inspector de propiedades (Apple HIG & Emil Design Eng).
 */

import React from 'react'
import { BREADBOARD_TYPE_ID, type Component, type PinEndpoint, type Project } from '@circuitforge/netlist'
import { BreadboardContacts } from '@/features/nexo/BreadboardContacts'
import { BreadboardMountPanel } from '@/features/nexo/BreadboardMountPanel'
import { ComponentParameters } from '@/features/nexo/ComponentParameters'
import { ComponentPreview } from '@/features/nexo/ComponentPreview'
import { useNexoSession } from '@/features/nexo/session'
import { SimulationInspectorPanel } from '@/features/simulation/SimulationInspectorPanel'
import type { CatalogFixture } from '@/lib/fixtures/components'
import { SegmentedControl } from './SegmentedControl'

export interface EditorInspectorDrawerProps {
  toolsOpen: boolean
  onClose: () => void
  toolsRef: React.RefObject<HTMLElement | null>
  tool: 'part' | 'project'
  onToolChange: (tool: 'part' | 'project') => void
  selected: Component | null
  fixture?: CatalogFixture
  project: Project | null
  controller: any
  setMessage: (msg: string) => void
  snapshotPendingWiring?: { componentId: string; pinId: string } | null
  onPin: (endpoint: PinEndpoint) => void
  notes: string
  onNotesChange: (notes: string) => void
  windowWidth: number
  onWireRemove: (wireId: string) => void
}

export const EditorInspectorDrawer: React.FC<EditorInspectorDrawerProps> = ({
  toolsOpen,
  onClose,
  toolsRef,
  tool,
  onToolChange,
  selected,
  fixture,
  project,
  controller,
  setMessage,
  snapshotPendingWiring,
  onPin,
  notes,
  onNotesChange,
  windowWidth,
  onWireRemove,
}) => {
  const toolOptions = [
    { value: 'part', label: 'Componente' },
    { value: 'project', label: 'Especificaciones' },
  ] as const

  return (
    <aside
      id="editor-tools"
      ref={toolsRef as React.RefObject<HTMLElement>}
      tabIndex={-1}
      className="nx-editor-tools"
      data-open={toolsOpen}
      aria-label="Inspector de propiedades y componentes"
      onBlur={(event) => {
        if (windowWidth <= 1000 && !event.currentTarget.contains(event.relatedTarget)) {
          onClose()
        }
      }}
    >
      <div className="nx-tools-header">
        <SegmentedControl
          size="sm"
          options={toolOptions}
          value={tool}
          onChange={onToolChange}
          ariaLabel="Pestañas del inspector"
        />

        <button
          type="button"
          className="nx-tools-close"
          aria-label="Cerrar inspector"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <div className="nx-tools-content" tabIndex={-1} hidden={tool !== 'part'}>
        {fixture && (
          <ComponentPreview
            typeId={fixture.typeId}
            name={fixture.name}
            size="detail"
            className="nx-inspector-preview"
          />
        )}

        <h2>
          {selected ? `${selected.id} · ` : ''}
          {fixture?.name ?? 'Selecciona un componente'}
        </h2>
        <p>{fixture?.description}</p>

        {selected ? (
          <>
            <div className="nx-instance-actions">
              <button
                type="button"
                className="nx-button"
                disabled={project?.mounts?.some((mount) => mount.componentId === selected.id)}
                title={
                  project?.mounts?.some((mount) => mount.componentId === selected.id)
                    ? 'Utiliza la orientación de montaje para rotar la pieza insertada en el protoboard.'
                    : undefined
                }
                onClick={() => {
                  useNexoSession.getState().continueWork()
                  controller?.rotate()
                }}
              >
                Rotar 90°
              </button>
              <button
                type="button"
                className="nx-button"
                style={{ borderColor: 'rgba(244, 63, 94, 0.35)', color: '#f43f5e' }}
                onClick={() => {
                  useNexoSession.getState().continueWork()
                  controller?.remove()
                }}
              >
                Eliminar
              </button>
            </div>

            <ComponentParameters
              component={selected}
              onUpdate={(key, value) => {
                useNexoSession.getState().continueWork()
                const result = controller?.updateParameter(selected.id, key, value) ?? {
                  ok: false,
                  error: 'El proyecto aún no está disponible.',
                }
                if (result.ok) setMessage(`Parámetro de ${selected.id} actualizado.`)
                return result
              }}
            />

            {project && (
              <BreadboardMountPanel
                key={selected.id}
                project={project}
                component={selected}
                onMount={(boardId, anchor, rotation) => {
                  useNexoSession.getState().continueWork()
                  const result = controller?.mountComponent(selected.id, boardId, anchor, rotation) ?? {
                    ok: false,
                    error: 'El proyecto aún no está disponible.',
                  }
                  if (result.ok) setMessage(`${selected.id} montado en ${boardId}.${anchor}.`)
                  return result
                }}
                onUnmount={() => {
                  useNexoSession.getState().continueWork()
                  const result = controller?.unmountComponent(selected.id) ?? {
                    ok: false,
                    error: 'El proyecto aún no está disponible.',
                  }
                  if (result.ok) setMessage(`${selected.id} desmontado del protoboard.`)
                  return result
                }}
              />
            )}

            {project && (
              <SimulationInspectorPanel
                key={`sim-${selected.id}`}
                component={selected}
                project={project}
              />
            )}

            {selected.typeId === BREADBOARD_TYPE_ID ? (
              <BreadboardContacts
                key={selected.id}
                component={selected}
                pending={snapshotPendingWiring ?? null}
                onPin={onPin}
              />
            ) : (
              <>
                <h3>Terminales y Conexiones</h3>
                <p>Haz clic en un terminal para trazar una conexión hacia otro pin o protoboard.</p>
                <div className="nx-pin-list">
                  {selected.pins.map((terminal) => (
                    <button
                      type="button"
                      className="nx-button"
                      key={terminal.pinId}
                      onClick={() => {
                        useNexoSession.getState().continueWork()
                        onPin({ componentId: selected.id, pinId: terminal.pinId })
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{terminal.pinId}</span>
                      <span className="nx-badge">{terminal.type}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="nx-tools-empty">
            <p>Selecciona cualquier pieza en el lienzo 3D para editar parámetros, montarla o inspeccionar su telemetría.</p>
          </div>
        )}
      </div>

      <div className="nx-tools-content" tabIndex={-1} hidden={tool !== 'project'}>
        <h2>Especificaciones y Proyecto</h2>
        <p>Notas técnicas y registro del circuito de la sesión:</p>
        <textarea
          id="nexo-notes"
          className="nx-input"
          rows={6}
          aria-label="Notas del proyecto"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Escribe aquí observaciones sobre el esquemático o firmware..."
        />

        {project?.wires && project.wires.length > 0 && (
          <section className="nx-project-wires" aria-label="Cables conectados">
            <h3>Cables explícitos ({project.wires.length})</h3>
            <ul>
              {project.wires.map((wire) => (
                <li key={wire.id}>
                  <span>
                    {wire.id}: {wire.from.componentId}.{wire.from.pinId} &rarr; {wire.to.componentId}.{wire.to.pinId}
                  </span>
                  <button
                    type="button"
                    className="nx-button"
                    onClick={() => onWireRemove(wire.id)}
                  >
                    Desconectar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}
