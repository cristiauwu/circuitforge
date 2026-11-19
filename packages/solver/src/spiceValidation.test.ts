import { describe, expect, it } from 'vitest'
import {
  buildMillmanCircuit,
  buildOpposingSourcesCircuit,
  buildR2RLadderCircuit,
  buildVoltageDividerCircuit,
  buildWheatstoneBridgeCircuit,
  runBenchmark,
  runGroundTruthSuite,
} from './spiceBenchmark.js'
import { exportSpiceNetlist } from './spiceExport.js'

describe('Tarea T-5: Validación Ground Truth contra SPICE / ngspice', () => {
  it('exporta una netlist canónica .cir con gramática SPICE3f5 válida', () => {
    const { project } = buildVoltageDividerCircuit()
    const result = exportSpiceNetlist(project, { title: 'Divisor de Tensión Test' })

    expect(result.netlist).toContain('* CircuitForge Canonical SPICE Netlist')
    expect(result.netlist).toContain('* Title: Divisor de Tensión Test')
    expect(result.netlist).toContain('.OP')
    expect(result.netlist).toContain('.END')
    // Debe existir nodo '0' (tierra en SPICE)
    expect(result.netlist).toMatch(/ 0 /)
    // Debe incluir fuente V_V1 y resistencias R_R1, R_R2
    expect(result.netlist).toContain('V_V1')
    expect(result.netlist).toContain('R_R1')
    expect(result.netlist).toContain('R_R2')
    expect(result.elementCount).toBe(3)
  })

  it('Benchmark 1: Divisor de Tensión Resistivo tiene RMSE < 1e-6 V', () => {
    const report = runBenchmark(
      'GT-01',
      'Divisor de Tensión',
      'Divisor 12V con 10k y 20k',
      buildVoltageDividerCircuit,
    )

    expect(report.passed).toBe(true)
    expect(report.rmse).toBeLessThan(1e-6)
    expect(report.maxError).toBeLessThan(1e-6)

    // Valores teóricos esperados: 12V en entrada, 8V en punto medio, 0V en tierra
    const vMid = report.comparisons.find((c) => c.netId.includes('R1.b'))
    expect(vMid).toBeDefined()
    expect(vMid?.mnaVoltage).toBeCloseTo(8.0, 9)
    expect(vMid?.absoluteError).toBeLessThan(1e-9)
  })

  it('Benchmark 2: Puente de Wheatstone Desbalanceado tiene RMSE < 1e-6 V', () => {
    const report = runBenchmark(
      'GT-02',
      'Puente de Wheatstone',
      'Puente desbalanceado con rama transversal',
      buildWheatstoneBridgeCircuit,
    )

    expect(report.passed).toBe(true)
    expect(report.rmse).toBeLessThan(1e-6)
    expect(report.maxError).toBeLessThan(1e-6)

    // Verificamos los nodos A y B con las soluciones de fracciones exactas (60/11 y 50/11)
    const nodeA = report.comparisons.find((c) => c.netId.includes('R1.b'))
    const nodeB = report.comparisons.find((c) => c.netId.includes('R2.b'))

    expect(nodeA).toBeDefined()
    expect(nodeB).toBeDefined()
    expect(nodeA?.mnaVoltage).toBeCloseTo(60 / 11, 9)
    expect(nodeB?.mnaVoltage).toBeCloseTo(50 / 11, 9)
  })

  it('Benchmark 3: Teorema de Millman Multi-Fuente tiene RMSE < 1e-6 V', () => {
    const report = runBenchmark(
      'GT-03',
      'Teorema de Millman',
      'Múltiples fuentes en paralelo con resistencias internas',
      buildMillmanCircuit,
    )

    expect(report.passed).toBe(true)
    expect(report.rmse).toBeLessThan(1e-6)
    expect(report.maxError).toBeLessThan(1e-6)

    const commonNode = report.comparisons.find((c) => c.netId.includes('RL.a'))
    expect(commonNode).toBeDefined()
    expect(commonNode?.mnaVoltage).toBeCloseTo(10.875, 9)
  })

  it('Benchmark 4: Mallas de Kirchhoff con Fuentes Opuestas tiene RMSE < 1e-6 V', () => {
    const report = runBenchmark(
      'GT-04',
      'Fuentes Opuestas',
      'Mallas acopladas con potenciales negativos',
      buildOpposingSourcesCircuit,
    )

    expect(report.passed).toBe(true)
    expect(report.rmse).toBeLessThan(1e-6)
    expect(report.maxError).toBeLessThan(1e-6)

    const centralNode = report.comparisons.find((c) => c.netId.includes('Rmid.a'))
    expect(centralNode).toBeDefined()
    expect(centralNode?.mnaVoltage).toBeCloseTo(120 / 11, 9)

    const negativeNode = report.comparisons.find((c) => c.netId.includes('V2.negative'))
    expect(negativeNode).toBeDefined()
    expect(negativeNode?.mnaVoltage).toBeCloseTo(-12.0, 9)
  })

  it('Benchmark 5: Red Escalera R-2R DAC tiene RMSE < 1e-6 V', () => {
    const report = runBenchmark(
      'GT-05',
      'Red Escalera R-2R',
      'Escalera divisora para convertidor digital-analógico',
      buildR2RLadderCircuit,
    )

    expect(report.passed).toBe(true)
    expect(report.rmse).toBeLessThan(1e-6)
    expect(report.maxError).toBeLessThan(1e-6)

    const dacOut = report.comparisons.find((c) => c.netId.includes('R_series.b'))
    expect(dacOut).toBeDefined()
    expect(dacOut?.mnaVoltage).toBeCloseTo(2.5, 9)

    const lsbNode = report.comparisons.find((c) => c.netId.includes('R_series.a'))
    expect(lsbNode).toBeDefined()
    expect(lsbNode?.mnaVoltage).toBeCloseTo(1.25, 9)
  })

  it('Suite Completa: Todos los benchmarks superan el estándar Ground Truth de < 1e-6 V', () => {
    const summary = runGroundTruthSuite()

    expect(summary.totalBenchmarks).toBe(5)
    expect(summary.passedBenchmarks).toBe(5)
    expect(summary.allPassed).toBe(true)
    expect(summary.globalRmse).toBeLessThan(1e-6)
    expect(summary.maxGlobalError).toBeLessThan(1e-6)

    // Reporte numérico de control
    for (const report of summary.reports) {
      expect(report.passed).toBe(true)
      expect(report.rmse).toBeLessThan(1e-6)
    }
  })
})
