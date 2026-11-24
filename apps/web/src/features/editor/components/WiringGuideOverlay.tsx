/**
 * @circuitforge/web — Overlay Interactivo de Cableado y Asistente de Conexión (HUD Stepper).
 *
 * Proporciona feedback visual paso a paso, indicadores de atracción magnética
 * y affordances claras para la conexión de componentes en el lienzo 3D.
 */

import type { PinEndpoint } from '@circuitforge/netlist'
import { type FC, memo } from 'react'

export interface WiringGuideOverlayProps {
  pending?: { componentId: string; pinId: string } | null | undefined
  hoveredPin?: PinEndpoint | null | undefined
  onCancel?: (() => void) | undefined
  error?: string | null | undefined
  totalWires?: number | undefined
}

const WiringGuideOverlayComponent: FC<WiringGuideOverlayProps> = ({
  pending,
  hoveredPin,
  onCancel,
  error,
}) => {
  if (error) {
    return (
      <div className="nx-wiring-hud-container" role="alert">
        <div className="nx-wiring-alert-card">
          <span className="nx-wiring-alert-icon">⚠️</span>
          <span className="nx-wiring-alert-msg">{error}</span>
          {onCancel && (
            <button
              type="button"
              className="nx-wiring-hud-cancel-btn"
              onClick={onCancel}
              title="Cerrar aviso"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    )
  }

  if (pending) {
    const isTargetLocked = Boolean(
      hoveredPin &&
        (hoveredPin.componentId !== pending.componentId || hoveredPin.pinId !== pending.pinId),
    )

    return (
      <div className="nx-wiring-hud-container" role="status" aria-live="polite">
        <div
          className={`nx-wiring-hud-card nx-frame--scan ${isTargetLocked ? 'target-locked' : ''}`}
          data-nx-code="WIRE-2P"
        >
          <div className="nx-wiring-hud-header">
            <span className="nx-wiring-hud-badge">
              <span className="nx-wiring-pulse-dot" />
              <span>Modo Cableado &bull; Paso 2 de 2</span>
            </span>
            {onCancel && (
              <button
                type="button"
                className="nx-wiring-hud-cancel-btn"
                onClick={onCancel}
                title="Cancelar cableado (Escape)"
              >
                Cancelar (Esc)
              </button>
            )}
          </div>

          <div className="nx-wiring-hud-steps">
            <div className="nx-wiring-step-box origin">
              <span className="nx-wiring-step-label">Terminal de Origen</span>
              <span className="nx-wiring-step-val">
                {pending.componentId}
                <span className="nx-wiring-pin-tag">.{pending.pinId}</span>
              </span>
            </div>

            <div className="nx-wiring-step-arrow">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className={`nx-wiring-step-box target ${isTargetLocked ? 'locked' : ''}`}>
              <span className="nx-wiring-step-label">Terminal de Destino</span>
              {hoveredPin ? (
                <span className="nx-wiring-step-val highlighted">
                  🎯 {hoveredPin.componentId}
                  <span className="nx-wiring-pin-tag">.{hoveredPin.pinId}</span>
                </span>
              ) : (
                <span className="nx-wiring-step-placeholder">
                  Selecciona o arrastra hacia otro pin...
                </span>
              )}
            </div>
          </div>

          <div className="nx-wiring-hud-hint">
            {isTargetLocked ? (
              <span>
                🎯 <strong>¡Atracción magnética activada!</strong> Haz clic o suelta para unir.
              </span>
            ) : (
              <span>💡 Mueve el cursor hacia cualquier terminal o contacto de la protoboard.</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (hoveredPin) {
    return (
      <div className="nx-wiring-hud-container pointer-idle">
        <div className="nx-wiring-hover-pill">
          <span className="nx-wiring-hover-dot" />
          <span>
            Terminal{' '}
            <strong>
              {hoveredPin.componentId}.{hoveredPin.pinId}
            </strong>{' '}
            &bull; Haz clic o arrastra para tender cable
          </span>
        </div>
      </div>
    )
  }

  return null
}

export const WiringGuideOverlay = memo(WiringGuideOverlayComponent)
