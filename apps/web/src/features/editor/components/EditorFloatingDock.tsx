/**
 * @circuitforge/web — Dock flotante 3D y guía del proyecto (Apple HIG & Emil Design Eng).
 */

import React from 'react'
import { ContextHelp } from '@/features/nexo/ContextHelp'
import { useNexoSession } from '@/features/nexo/session'

export interface EditorFloatingDockProps {
  cameraView: 'perspective' | 'top'
  onPerspectiveClick: () => void
  onTopClick: () => void
  onFrameClick: () => void
  onResetClick: () => void
}

export const EditorFloatingDock: React.FC<EditorFloatingDockProps> = ({
  cameraView,
  onPerspectiveClick,
  onTopClick,
  onFrameClick,
  onResetClick,
}) => {
  return (
    <>
      {/* HUD Flotante Dock Inferior (Noomo Labs Style) */}
      <div
        className="nx-mount-hud-dock"
        role="toolbar"
        aria-label="Controles de cámara y perspectiva 3D"
      >
        <button
          type="button"
          className="nx-hud-dock-btn"
          aria-pressed={cameraView === 'perspective'}
          onClick={() => {
            useNexoSession.getState().continueWork()
            onPerspectiveClick()
          }}
          title="Vista 3D libre con rotación y zoom completo"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>3D Órbita</span>
        </button>

        <button
          type="button"
          className="nx-hud-dock-btn"
          aria-pressed={cameraView === 'top'}
          onClick={() => {
            useNexoSession.getState().continueWork()
            onTopClick()
          }}
          title="Vista cenital 2D ortogonal para cableado rápido"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Cenital</span>
        </button>

        <div className="nx-hud-dock-divider" />

        <button
          type="button"
          className="nx-hud-dock-btn"
          onClick={() => {
            useNexoSession.getState().continueWork()
            onFrameClick()
          }}
          title="Encuadrar la escena en el protoboard y piezas"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span>Encuadrar</span>
        </button>

        <button
          type="button"
          className="nx-hud-dock-btn"
          onClick={() => {
            useNexoSession.getState().continueWork()
            onResetClick()
          }}
          title="Reiniciar cámara a la posición original"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* Ayuda y guía del proyecto flotante en la esquina inferior */}
      <div className="nx-companion-floating-dock">
        <ContextHelp />
      </div>
    </>
  )
}
