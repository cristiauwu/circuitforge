import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Violation } from '@circuitforge/validation'
import { TelemetryDashboardTray } from './TelemetryDashboardTray'

describe('TelemetryDashboardTray (WashOS / Apple HIG Style)', () => {
  it('renderiza los cuatro widgets principales con métricas en reposo', () => {
    const html = renderToStaticMarkup(
      <TelemetryDashboardTray
        open={false}
        onToggle={vi.fn()}
        project={null}
        violations={[]}
      />,
    )

    expect(html).toContain('Tensión DC Activa')
    expect(html).toContain('Consumo de Corriente')
    expect(html).toContain('Potencia Activa')
    expect(html).toContain('Reglas ERC (V-1..V-6)')
    expect(html).toContain('✓ Seguro')
  })

  it('renderiza la lista de violaciones cuando open es true y hay avisos', () => {
    const mockViolations: Violation[] = [
      {
        rule: 'V-1',
        severity: 'error',
        message: 'Cortocircuito entre alimentación y tierra',
        netId: 'N1',
      },
      {
        rule: 'V-5',
        severity: 'warning',
        message: 'Componente sin conectar por completo',
        componentId: 'R1',
      },
    ]

    const html = renderToStaticMarkup(
      <TelemetryDashboardTray
        open={true}
        onToggle={vi.fn()}
        project={null}
        violations={mockViolations}
      />,
    )

    expect(html).toContain('V-1')
    expect(html).toContain('Cortocircuito entre alimentación y tierra')
    expect(html).toContain('V-5')
    expect(html).toContain('Componente sin conectar por completo')
    expect(html).toContain('Red: N1')
    expect(html).toContain('Componente: R1')
  })
})
