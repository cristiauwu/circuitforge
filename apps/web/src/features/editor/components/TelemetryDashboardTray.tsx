/**
 * @circuitforge/web — Bandeja de Telemetría Flotante estilo WashOS / Apple HIG (Fase 2 y 3).
 *
 * Muestra widgets modulares de alta precisión (tensión, corriente total, potencia y reglas ERC)
 * con tarjetas squircle, tipografía tabular y detalles expandibles sin empujar el viewport 3D.
 */

import React, { useMemo } from 'react'
import type { Project } from '@circuitforge/netlist'
import type { Violation } from '@circuitforge/validation'
import { useSimulationStore } from '@/features/simulation/useSimulationStore'

export interface TelemetryDashboardTrayProps {
  open: boolean
  onToggle: () => void
  project: Project | null
  violations: readonly Violation[]
  wiringError?: string | null | undefined
}

export const TelemetryDashboardTray: React.FC<TelemetryDashboardTrayProps> = ({
  open,
  onToggle,
  project: _project,
  violations,
  wiringError,
}) => {
  const isSimRunning = useSimulationStore((s) => s.isRunning)
  const isSolving = useSimulationStore((s) => s.isSolving)
  const simResult = useSimulationStore((s) => s.result)
  const simError = useSimulationStore((s) => s.error)
  const durationMs = useSimulationStore((s) => s.durationMs)

  // Calcular métricas globales del circuito
  const metrics = useMemo(() => {
    if (!simResult) {
      return {
        mainVoltage: 0,
        totalCurrentA: 0,
        totalPowerW: 0,
      }
    }

    // Tensión principal: valor máximo de tensión detectado en nodos
    const maxVoltage = Math.max(0, ...Object.values(simResult.voltages))

    // Corriente total entregada por fuentes de tensión
    let totalCurrent = 0
    for (const current of Object.values(simResult.currents)) {
      if (current < 0) {
        // En fuentes, corriente negativa = entrega corriente al circuito
        totalCurrent += Math.abs(current)
      }
    }

    // Potencia total disipada por cargas
    let totalPower = 0
    for (const p of Object.values(simResult.power)) {
      if (p > 0) totalPower += p
    }

    return {
      mainVoltage: maxVoltage,
      totalCurrentA: totalCurrent,
      totalPowerW: totalPower,
    }
  }, [simResult])

  const hasErrors = violations.some((v) => v.severity === 'error') || Boolean(wiringError)
  const hasWarnings = violations.some((v) => v.severity === 'warning')

  return (
    <div className={`nx-telemetry-tray ${open ? 'expanded' : ''}`}>
      {/* Barra de cabecera colapsable / toggle */}
      <div className="nx-telemetry-header">
        <div className="nx-telemetry-title-group">
          <span
            className="nx-sim-dot"
            data-status={simError || hasErrors ? 'error' : isSimRunning ? 'active' : 'idle'}
          />
          <h3 className="nx-telemetry-title">Telemetría e Integridad del Circuito</h3>
          <span className="nx-telemetry-dots" aria-hidden="true">
            <span className="dot dot-blue" />
            <span className="dot dot-amber" />
            <span className="dot dot-green" />
          </span>
          {isSimRunning && (
            <span className="nx-telemetry-perf-pill">
              {isSolving ? 'Calculando MNA...' : `${durationMs.toFixed(1)} ms • 60 FPS`}
            </span>
          )}
        </div>

        <button
          type="button"
          className="nx-telemetry-toggle-btn"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'Contraer panel de telemetría' : 'Expandir panel de telemetría'}
        >
          <span>{open ? 'Ocultar detalles' : 'Ver análisis ERC'}</span>
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
            aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
      </div>

      {/* Grid de Widgets Métricos estilo WashOS */}
      <div className="nx-telemetry-grid">
        {/* Widget 1: Tensión de Entrada */}
        <div className="nx-metric-widget">
          <span className="nx-metric-widget-label">Tensión DC Activa</span>
          <div className="nx-metric-widget-value">
            {metrics.mainVoltage > 0 ? `${metrics.mainVoltage.toFixed(2)}` : '0.00'}
            <span className="nx-metric-unit">V</span>
          </div>
          <span className="nx-metric-widget-sub">
            {isSimRunning
              ? metrics.mainVoltage > 0
                ? 'Potencial de carril principal'
                : 'Sin fuentes activas'
              : 'Simulador en pausa'}
          </span>
        </div>

        {/* Widget 2: Corriente Total */}
        <div className="nx-metric-widget">
          <span className="nx-metric-widget-label">Consumo de Corriente</span>
          <div className="nx-metric-widget-value">
            {formatCurrentNum(metrics.totalCurrentA)}
            <span className="nx-metric-unit">{formatCurrentUnit(metrics.totalCurrentA)}</span>
          </div>
          <span className="nx-metric-widget-sub">
            {metrics.totalCurrentA > 0 ? 'Flujo continuo en lazos' : '0.00 mA en reposo'}
          </span>
        </div>

        {/* Widget 3: Potencia Disipada */}
        <div className="nx-metric-widget">
          <span className="nx-metric-widget-label">Potencia Activa</span>
          <div className="nx-metric-widget-value">
            {formatPowerNum(metrics.totalPowerW)}
            <span className="nx-metric-unit">{formatPowerUnit(metrics.totalPowerW)}</span>
          </div>
          <span className="nx-metric-widget-sub">
            {metrics.totalPowerW > 0 ? 'Disipación total en cargas' : '0.00 mW'}
          </span>
        </div>

        {/* Widget 4: Reglas ERC e Integridad */}
        <div
          className={`nx-metric-widget nx-widget-erc ${hasErrors ? 'error' : hasWarnings ? 'warning' : 'safe'}`}
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onToggle()
          }}
          title="Haz clic para ver el desglose de reglas ERC"
        >
          <span className="nx-metric-widget-label">Reglas ERC (V-1..V-6)</span>
          <div className="nx-metric-widget-value">
            {violations.length === 0 && !wiringError ? (
              <span className="nx-erc-clean-text">✓ Seguro</span>
            ) : (
              <span className="nx-erc-issue-count">
                {violations.length} {violations.length === 1 ? 'Aviso' : 'Avisos'}
              </span>
            )}
          </div>
          <span className="nx-metric-widget-sub">
            {hasErrors
              ? 'Bloqueo por cortocircuito'
              : hasWarnings
                ? 'Conexiones incompletas o sobretensión'
                : 'Sin conflictos de continuidad'}
          </span>
        </div>
      </div>

      {/* Sección Expandible con Violaciones ERC Detalladas */}
      {open && (
        <div className="nx-telemetry-details">
          {wiringError && (
            <div className="nx-telemetry-alert error">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <strong>Error de conexión en vivo:</strong>
                <span>{wiringError}</span>
              </div>
            </div>
          )}

          {violations.length > 0 ? (
            <div className="nx-violations-list">
              {violations.map((v, i) => (
                <div
                  key={`${v.rule}-${v.componentId ?? v.netId ?? i}`}
                  className={`nx-violation-card ${v.severity === 'error' ? 'error' : 'warning'}`}
                >
                  <span className="nx-violation-rule-badge">{v.rule}</span>
                  <div className="nx-violation-body">
                    <span className="nx-violation-msg">{v.message}</span>
                    <div className="nx-violation-meta">
                      {v.componentId && <span>Componente: {v.componentId}</span>}
                      {v.netId && <span>Red: {v.netId}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="nx-telemetry-clean-state">
              <span className="clean-icon">✓</span>
              <span>
                Todas las reglas ERC (V-1 Cortocircuitos, V-2 Pines incompatibles, V-3 Conexiones sueltas, V-4
                Polaridad, V-5 Terminales incompletos, V-6 Sobretensión) están plenamente satisfechas.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatCurrentNum(amperes: number): string {
  const abs = Math.abs(amperes)
  if (abs === 0) return '0.00'
  if (abs < 1e-3) return (amperes * 1e6).toFixed(1)
  if (abs < 1) return (amperes * 1000).toFixed(2)
  return amperes.toFixed(3)
}

function formatCurrentUnit(amperes: number): string {
  const abs = Math.abs(amperes)
  if (abs === 0) return 'mA'
  if (abs < 1e-3) return 'µA'
  if (abs < 1) return 'mA'
  return 'A'
}

function formatPowerNum(watts: number): string {
  const abs = Math.abs(watts)
  if (abs === 0) return '0.00'
  if (abs < 1e-3) return (watts * 1e6).toFixed(1)
  if (abs < 1) return (watts * 1000).toFixed(1)
  return watts.toFixed(2)
}

function formatPowerUnit(watts: number): string {
  const abs = Math.abs(watts)
  if (abs === 0) return 'mW'
  if (abs < 1e-3) return 'µW'
  if (abs < 1) return 'mW'
  return 'W'
}
