import type { Violation } from '@circuitforge/validation'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TelemetryDashboardTray } from './TelemetryDashboardTray'

describe('TelemetryDashboardTray (WashOS / Apple HIG Style & Instrument Precision)', () => {
  it('renderiza los cuatro widgets principales con métricas en reposo', () => {
    const html = renderToStaticMarkup(
      <TelemetryDashboardTray open={false} onToggle={vi.fn()} project={null} violations={[]} />,
    )

    expect(html).toContain('Tensión DC Activa')
    expect(html).toContain('Consumo de Corriente')
    expect(html).toContain('Potencia Activa')
    expect(html).toContain('Reglas ERC (V-1..V-6)')
    expect(html).toContain('✓ Seguro')
    // Verifica clases de 0.00 CLS
    expect(html).toContain('nx-metric-num-box')
    expect(html).toContain('nx-metric-unit-box')
  })

  it('renderiza barras analógicas (bargraphs) con atributos de accesibilidad y escalas dinámicas', () => {
    const activeMetrics = {
      mainVoltage: 3.3,
      totalCurrentA: 0.025,
      totalPowerW: 0.0825,
    }

    const html = renderToStaticMarkup(
      <TelemetryDashboardTray
        open={false}
        onToggle={vi.fn()}
        project={null}
        violations={[]}
        isSimRunning={true}
        metrics={activeMetrics}
      />,
    )

    // Debe contener contenedores de bargraph con role="progressbar"
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('nx-bargraph-track')
    expect(html).toContain('nx-bargraph-fill voltage')
    expect(html).toContain('nx-bargraph-fill current')
    expect(html).toContain('nx-bargraph-fill power')

    // 3.3V escala en 5.0V (66%)
    expect(html).toContain('aria-valuenow="66"')
    expect(html).toContain('3.30')
    expect(html).toContain('V')

    // 0.025A = 25.00 mA
    expect(html).toContain('25.00')
    expect(html).toContain('mA')

    // 0.0825W = 82.50 mW
    expect(html).toContain('82.50')
    expect(html).toContain('mW')
  })

  it('preserva el layout determinista ante saltos de escala de 10x (0.00 CLS Guarantee)', () => {
    // Probar con valores de escala baja (100 µA) y alta (1.5 A)
    const lowMetrics = {
      mainVoltage: 0.05, // 50 mV
      totalCurrentA: 0.0001, // 100 µA
      totalPowerW: 0.000005, // 5 µW
    }

    const htmlLow = renderToStaticMarkup(
      <TelemetryDashboardTray
        open={false}
        onToggle={vi.fn()}
        project={null}
        violations={[]}
        isSimRunning={true}
        metrics={lowMetrics}
      />,
    )

    expect(htmlLow).toContain('50.00')
    expect(htmlLow).toContain('mV')
    expect(htmlLow).toContain('100.00')
    expect(htmlLow).toContain('µA')

    // Salto de 100x
    const highMetrics = {
      mainVoltage: 5.0, // 5.00 V
      totalCurrentA: 0.1, // 100.00 mA
      totalPowerW: 0.5, // 500.00 mW
    }

    const htmlHigh = renderToStaticMarkup(
      <TelemetryDashboardTray
        open={false}
        onToggle={vi.fn()}
        project={null}
        violations={[]}
        isSimRunning={true}
        metrics={highMetrics}
      />,
    )

    expect(htmlHigh).toContain('5.00')
    expect(htmlHigh).toContain('V')
    expect(htmlHigh).toContain('100.00')
    expect(htmlHigh).toContain('mA')

    // Ambos renders contienen idénticos selectores de contenedor estructurados
    const numBoxesLow = (htmlLow.match(/nx-metric-num-box/g) || []).length
    const numBoxesHigh = (htmlHigh.match(/nx-metric-num-box/g) || []).length
    expect(numBoxesLow).toBe(3)
    expect(numBoxesHigh).toBe(3)
  })

  it('renderiza la lista de violaciones con enlaces interactivos al componente infractor', () => {
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
    // Botón interactivo de salto al componente R1
    expect(html).toContain('nx-violation-target-btn')
    expect(html).toContain('R1')
  })
})
