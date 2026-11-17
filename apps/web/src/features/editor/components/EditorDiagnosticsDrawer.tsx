/**
 * @circuitforge/web — Panel de diagnóstico de reglas eléctricas (ERC V-1..V-6).
 */

import React from 'react'
import type { Violation } from '@circuitforge/validation'

export interface EditorDiagnosticsDrawerProps {
  open: boolean
  violations: readonly Violation[]
  wiringError?: string | null
}

export const EditorDiagnosticsDrawer: React.FC<EditorDiagnosticsDrawerProps> = ({
  open,
  violations,
  wiringError,
}) => {
  if (!open) return null

  return (
    <section className="nx-diagnostics" aria-label="Verificación de Reglas Eléctricas">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2>Verificación de Reglas Eléctricas (ERC)</h2>
        <span className="nx-hud-badge">
          <span className="nx-hud-badge-dot" />
          <span>Análisis Continuo</span>
        </span>
      </div>
      <p style={{ color: 'var(--nx-muted)', marginBottom: '10px' }}>
        Comprobación automática de continuidad, polaridades, cortocircuitos y sobretensión en tiempo real:
      </p>

      {violations.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {violations.map((v, i) => (
            <div
              key={`${v.rule}-${v.componentId ?? v.netId ?? i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: v.severity === 'error' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${v.severity === 'error' ? '#fee2e2' : '#fef3c7'}`,
                borderRadius: '10px',
                fontSize: '12px',
                color: '#0f172a',
              }}
            >
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: v.severity === 'error' ? '#ef4444' : '#f59e0b',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '11px',
                }}
              >
                {v.rule}
              </span>
              <span style={{ fontWeight: 600 }}>{v.message}</span>
              {v.componentId && (
                <span style={{ color: '#64748b', fontSize: '11px', marginLeft: 'auto' }}>
                  Pieza: {v.componentId}
                </span>
              )}
              {v.netId && (
                <span style={{ color: '#64748b', fontSize: '11px', marginLeft: v.componentId ? '8px' : 'auto' }}>
                  Net: {v.netId}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: wiringError ? 'rgba(245, 158, 11, 0.08)' : '#f0fdf4',
            border: wiringError
              ? '1px solid rgba(245, 158, 11, 0.35)'
              : '1px solid #bbf7d0',
            borderRadius: '12px',
            color: wiringError ? '#b45309' : '#166534',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span>{wiringError ? '⚠️' : '✓'}</span>
          <span>
            {wiringError ??
              'Reglas ERC satisfechas: No se detectan cortocircuitos (V-1), conflictos de polaridad (V-4), conexiones sueltas (V-3) ni sobretensiones (V-6).'}
          </span>
        </div>
      )}
    </section>
  )
}
