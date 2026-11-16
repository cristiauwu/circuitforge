/**
 * @circuitforge/web — Panel de telemetría y estado de simulación para el Inspector (RF-2.5).
 *
 * Muestra tensiones de nodo en los terminales, caída de tensión, corriente de rama
 * y potencia consumida con tipografía tabular limpia estilo Apple iOS.
 */

import React from 'react'
import type { Component, Project } from '@circuitforge/netlist'
import { useSimulationStore } from './useSimulationStore'

interface SimulationInspectorPanelProps {
  component: Component
  project: Project
}

export const SimulationInspectorPanel: React.FC<SimulationInspectorPanelProps> = ({
  component,
  project,
}) => {
  const isRunning = useSimulationStore((s) => s.isRunning)
  const result = useSimulationStore((s) => s.result)
  const error = useSimulationStore((s) => s.error)
  const isSolving = useSimulationStore((s) => s.isSolving)
  const toggleRunning = useSimulationStore((s) => s.toggleRunning)
  const execute = useSimulationStore((s) => s.execute)

  const handleSimulateClick = () => {
    if (!isRunning) {
      execute(project)
    }
    toggleRunning()
  }

  // Si no está corriendo y no hay resultado
  if (!isRunning && !result && !error) {
    return (
      <div className="nx-sim-card">
        <div className="nx-sim-card-header">
          <div className="nx-sim-title-group">
            <span className="nx-sim-dot" data-status="idle" />
            <h4 className="nx-sim-title">Telemetría DC</h4>
          </div>
          <button
            type="button"
            className="nx-sim-btn-primary"
            onClick={handleSimulateClick}
          >
            Iniciar simulación
          </button>
        </div>
        <p className="nx-sim-hint">
          Inicia el motor MNA para ver tensiones de nodo, corrientes y disipación de potencia en tiempo real.
        </p>
      </div>
    )
  }

  // Obtener datos del componente
  const componentPower = result?.power[component.id]
  const currentKey = Object.keys(result?.currents ?? {}).find((k) => k.startsWith(component.id))
  const componentCurrent = currentKey ? result?.currents[currentKey] : undefined

  // Pin voltages
  const pinVoltages = component.pins.map((pin) => {
    const netId = pin.netId
    const v = netId && result?.voltages[netId] !== undefined ? result.voltages[netId] : undefined
    return {
      pinId: pin.pinId,
      netId,
      voltage: v,
    }
  })

  return (
    <div className="nx-sim-card">
      <div className="nx-sim-card-header">
        <div className="nx-sim-title-group">
          <span
            className="nx-sim-dot"
            data-status={error ? 'error' : isRunning ? 'active' : 'idle'}
          />
          <h4 className="nx-sim-title">
            {isSolving ? 'Calculando MNA...' : 'Telemetría Eléctrica (DC)'}
          </h4>
        </div>
        <button
          type="button"
          className={isRunning ? 'nx-sim-btn-stop' : 'nx-sim-btn-primary'}
          onClick={handleSimulateClick}
        >
          {isRunning ? 'Pausar' : 'Reanudar'}
        </button>
      </div>

      {error && (
        <div className="nx-sim-error">
          <span className="nx-sim-error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="nx-sim-metrics-grid">
          {componentPower !== undefined && (
            <div className="nx-sim-metric-item">
              <span className="nx-sim-metric-label">Potencia</span>
              <span className="nx-sim-metric-val">
                {formatPower(componentPower)}
              </span>
            </div>
          )}

          {componentCurrent !== undefined && (
            <div className="nx-sim-metric-item">
              <span className="nx-sim-metric-label">Corriente</span>
              <span className="nx-sim-metric-val">
                {formatCurrent(componentCurrent)}
              </span>
            </div>
          )}

          {component.typeId === 'led' && componentCurrent !== undefined && (
            <div className="nx-sim-metric-item full-width">
              <span className="nx-sim-metric-label">Emisión luminosa</span>
              <span className="nx-sim-metric-badge" data-lit={Math.abs(componentCurrent) > 0.001}>
                {Math.abs(componentCurrent) > 0.001
                  ? `Encendido (${(Math.min(1, Math.abs(componentCurrent) / 0.02) * 100).toFixed(0)}% brillo)`
                  : 'Apagado'}
              </span>
            </div>
          )}

          <div className="nx-sim-pins-list">
            <span className="nx-sim-metric-label">Tensión por terminal</span>
            <div className="nx-sim-pins-table">
              {pinVoltages.map(({ pinId, netId, voltage }) => (
                <div key={pinId} className="nx-sim-pin-row">
                  <span className="nx-sim-pin-name">{pinId}</span>
                  <span className="nx-sim-pin-net">{netId ?? 'Sin conexión'}</span>
                  <span className="nx-sim-pin-voltage">
                    {voltage !== undefined ? `${voltage.toFixed(2)} V` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPower(watts: number): string {
  const abs = Math.abs(watts)
  if (abs < 1e-3) return `${(watts * 1e6).toFixed(1)} µW`
  if (abs < 1) return `${(watts * 1000).toFixed(1)} mW`
  return `${watts.toFixed(2)} W`
}

function formatCurrent(amperes: number): string {
  const abs = Math.abs(amperes)
  if (abs < 1e-3) return `${(amperes * 1e6).toFixed(1)} µA`
  if (abs < 1) return `${(amperes * 1000).toFixed(2)} mA`
  return `${amperes.toFixed(3)} A`
}
