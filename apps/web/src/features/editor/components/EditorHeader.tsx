/**
 * @circuitforge/web — Cabecera de cristal del editor (Apple HIG & Emil Design Eng).
 *
 * Reúne la identidad del proyecto, el selector de vista con SegmentedControl iOS,
 * los controles de simulación MNA, el badge de reglas ERC y los disparadores de herramientas.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { SegmentedControl, type SegmentedOption } from './SegmentedControl'

export interface EditorHeaderProps {
  projectName: string
  stats: {
    pieces: number
    wires: number
    nets: number
  }
  view: 'mount' | 'code' | 'split'
  onViewChange: (view: 'mount' | 'code' | 'split') => void
  canSplit: boolean
  isSimRunning: boolean
  simError: string | null
  onToggleSim: () => void
  diagnosticsOpen: boolean
  onToggleDiagnostics: () => void
  ercViolationsCount: number
  hasErcError: boolean
  toolsOpen: boolean
  onToggleTools: (trigger: HTMLButtonElement) => void
  onUndo: () => void
  onRedo: () => void
  canUndoState?: boolean | undefined
  canRedoState?: boolean | undefined
  wiringPending?: { componentId: string; pinId: string } | null | undefined
  onCancelWiring?: (() => void) | undefined
  toolsTriggerRef?: React.RefObject<HTMLButtonElement | null> | undefined
}

const EditorHeaderComponent: React.FC<EditorHeaderProps> = ({
  projectName,
  stats,
  view,
  onViewChange,
  canSplit,
  isSimRunning,
  simError,
  onToggleSim,
  diagnosticsOpen,
  onToggleDiagnostics,
  ercViolationsCount,
  hasErcError,
  toolsOpen,
  onToggleTools,
  onUndo,
  onRedo,
  wiringPending,
  onCancelWiring,
  toolsTriggerRef,
}) => {
  const viewOptions: readonly SegmentedOption<'mount' | 'code' | 'split'>[] = [
    {
      value: 'mount',
      label: '3D Montaje',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M8 2l6 3.5v5L8 14l-6-3.5v-5L8 2z" />
          <path d="M8 2v12" />
        </svg>
      ),
    },
    {
      value: 'code',
      label: 'C++ Firmware',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 4L2 8l3 4M11 4l3 4-3 4" />
        </svg>
      ),
    },
    {
      value: 'split',
      label: 'Vista Dividida',
      disabled: !canSplit,
      title: !canSplit ? 'Amplía la ventana para ver simultáneamente el montaje 3D y el código' : undefined,
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M8 2v12" />
        </svg>
      ),
    },
  ]

  return (
    <header className="nx-header">
      <div className="nx-brand">
        <Link to="/" className="nx-logo">
          nexo <span className="nx-logo-arrow">↗</span>
        </Link>
        <div className="nx-project-info">
          <span className="nx-project-name">{projectName}</span>
          <span className="nx-stats-badge">
            {stats.pieces} {stats.pieces === 1 ? 'pieza' : 'piezas'} &bull; {stats.wires} cables &bull; {stats.nets} redes
          </span>
        </div>
      </div>

      <div className="nx-header-center">
        <SegmentedControl
          options={viewOptions}
          value={view}
          onChange={onViewChange}
          ariaLabel="Modo de visualización del editor"
        />

        {wiringPending && (
          <div className="nx-toolbar-status-badge">
            <span>⚡ Conectando {wiringPending.componentId}.{wiringPending.pinId}</span>
            {onCancelWiring && (
              <button
                type="button"
                onClick={onCancelWiring}
                className="nx-cancel-wiring-btn"
              >
                Cancelar (Esc)
              </button>
            )}
          </div>
        )}
      </div>

      <div className="nx-actions">
        {/* Botón Simular DC (Web Worker MNA) */}
        <button
          type="button"
          className={`nx-sim-toolbar-btn ${isSimRunning ? 'active' : ''}`}
          onClick={onToggleSim}
          title="Ejecutar o pausar la simulación eléctrica MNA en segundo plano (Web Worker)"
          aria-pressed={isSimRunning}
        >
          <span className="nx-sim-dot" data-status={simError ? 'error' : isSimRunning ? 'active' : 'idle'} />
          <span>{isSimRunning ? 'Simulando' : 'Simular DC'}</span>
        </button>

        <Link to="/biblioteca" className="nx-button">
          Biblioteca
        </Link>

        <button
          type="button"
          className="nx-button"
          onClick={onUndo}
          aria-label="Deshacer último cambio"
        >
          Deshacer
        </button>

        <button
          type="button"
          className="nx-button"
          onClick={onRedo}
          aria-label="Rehacer último cambio"
        >
          Rehacer
        </button>

        <button
          type="button"
          className="nx-button"
          onClick={onToggleDiagnostics}
          aria-expanded={diagnosticsOpen}
          style={
            diagnosticsOpen
              ? { borderColor: 'var(--nx-accent)', color: 'var(--nx-accent)' }
              : undefined
          }
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: hasErcError
                ? '#ef4444'
                : ercViolationsCount > 0
                  ? '#f59e0b'
                  : '#10b981',
            }}
          />
          <span>Reglas ERC</span>
          {ercViolationsCount > 0 && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '9999px',
                background: hasErcError ? '#fee2e2' : '#fef3c7',
                color: hasErcError ? '#b91c1c' : '#b45309',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {ercViolationsCount}
            </span>
          )}
        </button>

        <button
          ref={toolsTriggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className="nx-button"
          onClick={(e) => onToggleTools(e.currentTarget)}
          aria-expanded={toolsOpen}
          aria-controls="editor-tools"
        >
          Inspector
        </button>
      </div>
    </header>
  )
}

export const EditorHeader = React.memo(EditorHeaderComponent)
