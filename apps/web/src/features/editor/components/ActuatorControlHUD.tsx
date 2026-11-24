/**
 * @circuitforge/web — HUD Flotante de Control Físico de Actuadores y Sensores (Fase T-8).
 *
 * Proporciona manipulación directa en tiempo real de los componentes interactivos
 * en el canvas 3D:
 *  - Potenciómetro: deslizador rotatorio con cálculo instantáneo de R_AW y R_WB.
 *  - LDR: nivel de iluminancia (lux) y cálculo físico de resistencia dependiente de luz.
 *  - Termistor NTC: temperatura ambiental (-20 °C a 100 °C) y resistencia Steinhart-Hart/B.
 *  - Servomotor: ángulo físico (0° a 180°) y decodificación PWM en microsegundos.
 *  - Pulsadores y Switches: control táctil directo con retroalimentación sonora mecánica.
 */

import type { Component, ParamValue } from '@circuitforge/netlist'
import {
  computeLdrResistance,
  computeNtcResistance,
  encodeServoAngle,
} from '@circuitforge/solver'
import { memo, useCallback } from 'react'
import { playMechanicalClick } from '@/features/nexo/audioFeedback'
import { formatEngineeringQuantity } from '@/features/simulation/precisionFormat'

export interface ActuatorControlHUDProps {
  readonly selectedComponent: Component | null | undefined
  readonly onUpdateParameter: (componentId: string, key: string, value: ParamValue) => void
  readonly onDeselect?: () => void
}

function PotentiometerControl({
  component,
  onUpdate,
}: {
  component: Component
  onUpdate: (key: string, value: ParamValue) => void
}) {
  const totalRkOhm = typeof component.params.resistance === 'number' ? component.params.resistance : 10
  const totalROhms = totalRkOhm * 1000
  const pos = typeof component.params.position === 'number' ? component.params.position : 0.5
  const pct = Math.round(pos * 100)
  const rAW = totalROhms * pos
  const rWB = totalROhms * (1 - pos)

  return (
    <div className="nx-actuator-body">
      <div className="nx-actuator-row">
        <label htmlFor="pot-pos-slider" className="nx-actuator-label">
          Posición del cursor
        </label>
        <span className="nx-actuator-val-pill">{pct}%</span>
      </div>
      <input
        id="pot-pos-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={pos}
        onChange={(e) => onUpdate('position', parseFloat(e.target.value))}
        className="nx-actuator-slider"
        aria-label="Posición de potenciómetro"
      />
      <div className="nx-actuator-presets">
        <button type="button" onClick={() => onUpdate('position', 0)} className="nx-actuator-btn-preset">
          0% (Min)
        </button>
        <button type="button" onClick={() => onUpdate('position', 0.5)} className="nx-actuator-btn-preset">
          50%
        </button>
        <button type="button" onClick={() => onUpdate('position', 1)} className="nx-actuator-btn-preset">
          100% (Max)
        </button>
      </div>
      <div className="nx-actuator-metrics-grid">
        <div className="nx-actuator-metric">
          <span className="nx-actuator-metric-k">R(A-W)</span>
          <span className="nx-actuator-metric-v">{formatEngineeringQuantity(rAW, 'Ω').fullText}</span>
        </div>
        <div className="nx-actuator-metric">
          <span className="nx-actuator-metric-k">R(W-B)</span>
          <span className="nx-actuator-metric-v">{formatEngineeringQuantity(rWB, 'Ω').fullText}</span>
        </div>
      </div>
    </div>
  )
}

function LdrControl({
  component,
  onUpdate,
}: {
  component: Component
  onUpdate: (key: string, value: ParamValue) => void
}) {
  const lux = typeof component.params.lux === 'number' ? component.params.lux : 100
  const calculatedOhms = computeLdrResistance(lux)

  return (
    <div className="nx-actuator-body">
      <div className="nx-actuator-row">
        <label htmlFor="ldr-lux-slider" className="nx-actuator-label">
          Iluminancia ambiental
        </label>
        <span className="nx-actuator-val-pill">{Math.round(lux)} lux</span>
      </div>
      <input
        id="ldr-lux-slider"
        type="range"
        min="0"
        max="5000"
        step="25"
        value={lux}
        onChange={(e) => onUpdate('lux', parseFloat(e.target.value))}
        className="nx-actuator-slider"
        aria-label="Nivel de luz LDR"
      />
      <div className="nx-actuator-presets">
        <button type="button" onClick={() => onUpdate('lux', 0)} className="nx-actuator-btn-preset">
          Noche (0 lx)
        </button>
        <button type="button" onClick={() => onUpdate('lux', 350)} className="nx-actuator-btn-preset">
          Interior (350 lx)
        </button>
        <button type="button" onClick={() => onUpdate('lux', 3000)} className="nx-actuator-btn-preset">
          Sol (3k lx)
        </button>
      </div>
      <div className="nx-actuator-metric-single">
        <span className="nx-actuator-metric-k">Resistencia efectiva:</span>
        <span className="nx-actuator-metric-v">{formatEngineeringQuantity(calculatedOhms, 'Ω').fullText}</span>
      </div>
    </div>
  )
}

function NtcControl({
  component,
  onUpdate,
}: {
  component: Component
  onUpdate: (key: string, value: ParamValue) => void
}) {
  const temp = typeof component.params.temperature === 'number' ? component.params.temperature : 25
  const calculatedOhms = computeNtcResistance(temp)

  return (
    <div className="nx-actuator-body">
      <div className="nx-actuator-row">
        <label htmlFor="ntc-temp-slider" className="nx-actuator-label">
          Temperatura ambiental
        </label>
        <span className="nx-actuator-val-pill">{Math.round(temp)} °C</span>
      </div>
      <input
        id="ntc-temp-slider"
        type="range"
        min="-20"
        max="100"
        step="1"
        value={temp}
        onChange={(e) => onUpdate('temperature', parseFloat(e.target.value))}
        className="nx-actuator-slider"
        aria-label="Temperatura NTC"
      />
      <div className="nx-actuator-presets">
        <button type="button" onClick={() => onUpdate('temperature', 0)} className="nx-actuator-btn-preset">
          Hielo (0 °C)
        </button>
        <button type="button" onClick={() => onUpdate('temperature', 25)} className="nx-actuator-btn-preset">
          Ambiente (25 °C)
        </button>
        <button type="button" onClick={() => onUpdate('temperature', 80)} className="nx-actuator-btn-preset">
          Calor (80 °C)
        </button>
      </div>
      <div className="nx-actuator-metric-single">
        <span className="nx-actuator-metric-k">Resistencia efectiva:</span>
        <span className="nx-actuator-metric-v">{formatEngineeringQuantity(calculatedOhms, 'Ω').fullText}</span>
      </div>
    </div>
  )
}

function ServoControl({
  component,
  onUpdate,
}: {
  component: Component
  onUpdate: (key: string, value: ParamValue) => void
}) {
  const angle = typeof component.params.angle === 'number' ? component.params.angle : 90
  const pulseWidthUs = encodeServoAngle(angle)

  return (
    <div className="nx-actuator-body">
      <div className="nx-actuator-row">
        <label htmlFor="servo-angle-slider" className="nx-actuator-label">
          Ángulo del brazo
        </label>
        <span className="nx-actuator-val-pill">{Math.round(angle)}°</span>
      </div>
      <input
        id="servo-angle-slider"
        type="range"
        min="0"
        max="180"
        step="1"
        value={angle}
        onChange={(e) => onUpdate('angle', parseFloat(e.target.value))}
        className="nx-actuator-slider"
        aria-label="Ángulo de servomotor"
      />
      <div className="nx-actuator-presets">
        <button type="button" onClick={() => onUpdate('angle', 0)} className="nx-actuator-btn-preset">
          0°
        </button>
        <button type="button" onClick={() => onUpdate('angle', 90)} className="nx-actuator-btn-preset">
          90°
        </button>
        <button type="button" onClick={() => onUpdate('angle', 180)} className="nx-actuator-btn-preset">
          180°
        </button>
      </div>
      <div className="nx-actuator-metric-single">
        <span className="nx-actuator-metric-k">Pulso PWM equivalente:</span>
        <span className="nx-actuator-metric-v">{Math.round(pulseWidthUs)} µs</span>
      </div>
    </div>
  )
}

function SwitchControl({
  component,
  onUpdate,
}: {
  component: Component
  onUpdate: (key: string, value: ParamValue) => void
}) {
  const isSpdt = component.typeId === 'switch_spdt'
  const isPush = component.typeId === 'pushbutton'
  const closed = isPush ? component.params.pressed === true : component.params.closed === true
  const position = component.params.position === 'throw_b' ? 'throw_b' : 'throw_a'

  const handleToggle = () => {
    if (isSpdt) {
      const next = position === 'throw_a' ? 'throw_b' : 'throw_a'
      playMechanicalClick('toggle')
      onUpdate('position', next)
    } else if (isPush) {
      const next = !closed
      playMechanicalClick(next ? 'press' : 'release')
      onUpdate('pressed', next)
    } else {
      const next = !closed
      playMechanicalClick('toggle')
      onUpdate('closed', next)
    }
  }

  let stateText = closed ? 'Cerrado (ON)' : 'Abierto (OFF)'
  if (isPush) {
    stateText = closed ? 'Pulsado (Activo)' : 'En reposo (Abierto)'
  } else if (isSpdt) {
    stateText = position === 'throw_a' ? 'Salida A (Conectada)' : 'Salida B (Conectada)'
  }

  return (
    <div className="nx-actuator-body">
      <div className="nx-actuator-switch-container">
        <button
          type="button"
          onClick={handleToggle}
          className={`nx-actuator-toggle-btn ${closed || position === 'throw_b' ? 'nx-actuator-toggle-btn--active' : ''}`}
          aria-label={stateText}
        >
          <span className="nx-actuator-toggle-thumb" />
          <span className="nx-actuator-toggle-text">{stateText}</span>
        </button>
      </div>
      <p className="nx-actuator-hint">Tip: También puedes hacer clic directo sobre la pieza en el visor 3D.</p>
    </div>
  )
}

export const ActuatorControlHUD = memo(function ActuatorControlHUD({
  selectedComponent,
  onUpdateParameter,
  onDeselect,
}: ActuatorControlHUDProps) {
  const handleUpdate = useCallback(
    (key: string, value: ParamValue) => {
      if (selectedComponent) {
        onUpdateParameter(selectedComponent.id, key, value)
      }
    },
    [selectedComponent, onUpdateParameter],
  )

  if (!selectedComponent) return null

  const type = selectedComponent.typeId
  const isInteractive =
    type === 'potentiometer' ||
    type === 'ldr' ||
    type === 'thermistor_ntc' ||
    type === 'servo' ||
    type === 'pushbutton' ||
    type === 'switch_spst' ||
    type === 'switch_spdt' ||
    type === 'reed_switch'

  if (!isInteractive) return null

  return (
    <aside className="nx-actuator-hud-container" aria-label="Control interactivo de componente 3D">
      <div className="nx-actuator-hud-card" data-nx-code="ACT-T8">
        <header className="nx-actuator-hud-header">
          <div className="nx-actuator-header-info">
            <span className="nx-actuator-chip-badge">{selectedComponent.id}</span>
            <span className="nx-actuator-chip-title">{selectedComponent.typeId}</span>
          </div>
          {onDeselect && (
            <button
              type="button"
              onClick={onDeselect}
              className="nx-actuator-close-btn"
              title="Cerrar control"
              aria-label="Cerrar control"
            >
              ✕
            </button>
          )}
        </header>

        {type === 'potentiometer' && <PotentiometerControl component={selectedComponent} onUpdate={handleUpdate} />}
        {type === 'ldr' && <LdrControl component={selectedComponent} onUpdate={handleUpdate} />}
        {type === 'thermistor_ntc' && <NtcControl component={selectedComponent} onUpdate={handleUpdate} />}
        {type === 'servo' && <ServoControl component={selectedComponent} onUpdate={handleUpdate} />}
        {(type === 'pushbutton' ||
          type === 'switch_spst' ||
          type === 'switch_spdt' ||
          type === 'reed_switch') && <SwitchControl component={selectedComponent} onUpdate={handleUpdate} />}
      </div>
    </aside>
  )
})
