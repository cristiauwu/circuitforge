/**
 * @circuitforge/web — Bandeja de Telemetría Flotante estilo WashOS / Apple HIG (Tarea T-4).
 *
 * Muestra widgets modulares de alta precisión (tensión, corriente total, potencia y reglas ERC):
 *  - Auto-rango dinámico de magnitudes eléctricas (nV..kV, pA..A, nW..kW) con 0.00 CLS.
 *  - Indicadores analógicos tipo barra (bargraphs estilo Keysight 34461A) con histéresis visual.
 *  - Desglose de diagnóstico ERC con enlaces directos e interactivos al componente infractor.
 */

import type { Project } from '@circuitforge/netlist'
import type { Violation } from '@circuitforge/validation'
import type React from 'react'
import { memo, useCallback } from 'react'
import {
  calculateBargraphScale,
  type ElectricalUnit,
  formatEngineeringQuantity,
} from '@/features/simulation/precisionFormat'
import { useErcStore } from '@/features/simulation/useErcStore'
import { type TelemetryMetrics, useSimulationStore } from '@/features/simulation/useSimulationStore'
import { useEditorStore } from '@/lib/editor/useEditorStore'

export interface TelemetryDashboardTrayProps {
  open: boolean
  onToggle: () => void
  project: Project | null
  violations?: readonly Violation[] | undefined
  wiringError?: string | null | undefined
  onSelectComponent?: ((componentId: string) => void) | undefined
  metrics?: TelemetryMetrics | undefined
  isSimRunning?: boolean | undefined
}

interface AnalogMetricWidgetProps {
  readonly label: string
  readonly metricKind: 'voltage' | 'current' | 'power'
  readonly value: number
  readonly unit: ElectricalUnit
  readonly subtitle: string
}

const AnalogMetricWidget: React.FC<AnalogMetricWidgetProps> = memo(
  ({ label, metricKind, value, unit, subtitle }) => {
    const formatted = formatEngineeringQuantity(value, unit)
    const scale = calculateBargraphScale(value, unit)

    return (
      <div className="nx-metric-widget" data-metric={metricKind}>
        <span className="nx-metric-widget-label">{label}</span>
        <div className="nx-metric-widget-value">
          <span className="nx-metric-num-box">{formatted.displayValue}</span>
          <span className="nx-metric-unit-box">{formatted.unit}</span>
        </div>
        <div
          className="nx-bargraph-container"
          role="progressbar"
          aria-valuenow={scale.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          title={`Escala activa: 0 .. ${scale.formattedMax}`}
        >
          <div className="nx-bargraph-track">
            <div
              className={`nx-bargraph-fill ${metricKind}`}
              style={{ width: `${scale.percentage}%` }}
            />
          </div>
          <div className="nx-bargraph-labels">
            <span>0</span>
            <span className="nx-bargraph-scale-max">{scale.formattedMax}</span>
          </div>
        </div>
        <span className="nx-metric-widget-sub">{subtitle}</span>
      </div>
    )
  },
)

interface ErcSummaryWidgetProps {
  readonly hasErrors: boolean
  readonly hasWarnings: boolean
  readonly count: number
  readonly hasWiringError: boolean
  readonly onToggle: () => void
}

const ErcSummaryWidget: React.FC<ErcSummaryWidgetProps> = memo(
  ({ hasErrors, hasWarnings, count, hasWiringError, onToggle }) => {
    const statusClass = hasErrors ? 'error' : hasWarnings ? 'warning' : 'safe'

    return (
      <button
        type="button"
        className={`nx-metric-widget nx-widget-erc ${statusClass}`}
        onClick={onToggle}
        title="Haz clic para ver el desglose de reglas ERC"
      >
        <span className="nx-metric-widget-label">Reglas ERC (V-1..V-6)</span>
        <div className="nx-metric-widget-value">
          {count === 0 && !hasWiringError ? (
            <span className="nx-erc-clean-text">✓ Seguro</span>
          ) : (
            <span className="nx-erc-issue-count">
              {count} {count === 1 ? 'Aviso' : 'Avisos'}
            </span>
          )}
        </div>
        <div className="nx-erc-status-indicator">
          <span className={`nx-erc-status-bar ${statusClass}`} />
        </div>
        <span className="nx-metric-widget-sub">
          {hasErrors
            ? 'Bloqueo por cortocircuito'
            : hasWarnings
              ? 'Conexiones incompletas o sobretensión'
              : 'Sin conflictos de continuidad'}
        </span>
      </button>
    )
  },
)

interface ViolationCardProps {
  readonly violation: Violation
  readonly onSelectComponent?: ((componentId: string) => void) | undefined
}

const ViolationCard: React.FC<ViolationCardProps> = memo(({ violation, onSelectComponent }) => {
  const compId = violation.componentId

  const handleJump = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (compId) {
        if (onSelectComponent) {
          onSelectComponent(compId)
        } else {
          useEditorStore.getState().selectComponent(compId)
        }
      }
    },
    [compId, onSelectComponent],
  )

  return (
    <div className={`nx-violation-card ${violation.severity === 'error' ? 'error' : 'warning'}`}>
      <span className="nx-violation-rule-badge">{violation.rule}</span>
      <div className="nx-violation-body">
        <span className="nx-violation-msg">{violation.message}</span>
        <div className="nx-violation-meta">
          {compId && (
            <button
              type="button"
              className="nx-violation-target-btn"
              onClick={handleJump}
              title={`Seleccionar ${compId} en el canvas`}
            >
              <svg
                viewBox="0 0 16 16"
                width="10"
                height="10"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="4" />
              </svg>
              <span>{compId}</span>
            </button>
          )}
          {violation.netId && <span className="nx-violation-net-pill">Red: {violation.netId}</span>}
        </div>
      </div>
    </div>
  )
})

function getVoltageSubtitle(isSimRunning: boolean, voltage: number): string {
  if (!isSimRunning) return 'Simulador en pausa'
  if (voltage > 0) return 'Potencial de carril principal'
  return 'Sin fuentes activas'
}

function getHeaderStatus(
  simError: string | null,
  hasErrors: boolean,
  isSimRunning: boolean,
): 'error' | 'active' | 'idle' {
  if (simError || hasErrors) return 'error'
  if (isSimRunning) return 'active'
  return 'idle'
}

interface TelemetryHeaderProps {
  readonly status: 'error' | 'active' | 'idle'
  readonly isSimRunning: boolean
  readonly isSolving: boolean
  readonly durationMs: number
  readonly open: boolean
  readonly onToggle: () => void
}

const TelemetryHeader: React.FC<TelemetryHeaderProps> = memo(
  ({ status, isSimRunning, isSolving, durationMs, open, onToggle }) => (
    <div className="nx-telemetry-header">
      <div className="nx-telemetry-title-group">
        <span className="nx-sim-dot" data-status={status} />
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
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
          aria-hidden="true"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
    </div>
  ),
)

interface TelemetryDetailsSectionProps {
  readonly violations: readonly Violation[]
  readonly wiringError?: string | null | undefined
  readonly onSelectComponent?: ((componentId: string) => void) | undefined
}

const TelemetryDetailsSection: React.FC<TelemetryDetailsSectionProps> = memo(
  ({ violations, wiringError, onSelectComponent }) => {
    return (
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
              <ViolationCard
                key={`${v.rule}-${v.componentId ?? v.netId ?? i}`}
                violation={v}
                onSelectComponent={onSelectComponent}
              />
            ))}
          </div>
        ) : (
          <div className="nx-telemetry-clean-state">
            <span className="clean-icon">✓</span>
            <span>
              Todas las reglas ERC (V-1 Cortocircuitos, V-2 Pines incompatibles, V-3 Conexiones
              sueltas, V-4 Polaridad, V-5 Terminales incompletos, V-6 Sobretensión) están plenamente
              satisfechas.
            </span>
          </div>
        )}
      </div>
    )
  },
)

const TelemetryDashboardTrayComponent: React.FC<TelemetryDashboardTrayProps> = ({
  open,
  onToggle,
  project: _project,
  violations: propViolations,
  wiringError,
  onSelectComponent,
  metrics: propMetrics,
  isSimRunning: propIsSimRunning,
}) => {
  const storeIsSimRunning = useSimulationStore((s) => s.isRunning)
  const isSimRunning = propIsSimRunning ?? storeIsSimRunning
  const isSolving = useSimulationStore((s) => s.isSolving)
  const storeMetrics = useSimulationStore((s) => s.metrics)
  const metrics = propMetrics ?? storeMetrics
  const simError = useSimulationStore((s) => s.error)
  const durationMs = useSimulationStore((s) => s.durationMs)
  const storeViolations = useErcStore((s) => s.violations)
  const violations = propViolations ?? storeViolations

  const hasErrors = violations.some((v) => v.severity === 'error') || Boolean(wiringError)
  const hasWarnings = violations.some((v) => v.severity === 'warning')

  const voltageSub = getVoltageSubtitle(isSimRunning, metrics.mainVoltage)
  const currentSub = metrics.totalCurrentA > 0 ? 'Flujo continuo en lazos' : '0.00 mA en reposo'
  const powerSub = metrics.totalPowerW > 0 ? 'Disipación total en cargas' : '0.00 mW en reposo'
  const headerStatus = getHeaderStatus(simError, hasErrors, isSimRunning)

  return (
    <div className={`nx-telemetry-tray ${open ? 'expanded' : ''}`}>
      <TelemetryHeader
        status={headerStatus}
        isSimRunning={isSimRunning}
        isSolving={isSolving}
        durationMs={durationMs}
        open={open}
        onToggle={onToggle}
      />

      {/* Grid de Widgets Métricos estilo WashOS / Keysight */}
      <div className="nx-telemetry-grid">
        <AnalogMetricWidget
          label="Tensión DC Activa"
          metricKind="voltage"
          value={metrics.mainVoltage}
          unit="V"
          subtitle={voltageSub}
        />
        <AnalogMetricWidget
          label="Consumo de Corriente"
          metricKind="current"
          value={metrics.totalCurrentA}
          unit="A"
          subtitle={currentSub}
        />
        <AnalogMetricWidget
          label="Potencia Activa"
          metricKind="power"
          value={metrics.totalPowerW}
          unit="W"
          subtitle={powerSub}
        />
        <ErcSummaryWidget
          hasErrors={hasErrors}
          hasWarnings={hasWarnings}
          count={violations.length}
          hasWiringError={Boolean(wiringError)}
          onToggle={onToggle}
        />
      </div>

      {/* Sección Expandible con Violaciones ERC Detalladas */}
      {open && (
        <TelemetryDetailsSection
          violations={violations}
          wiringError={wiringError}
          onSelectComponent={onSelectComponent}
        />
      )}
    </div>
  )
}

export const TelemetryDashboardTray = memo(TelemetryDashboardTrayComponent)
