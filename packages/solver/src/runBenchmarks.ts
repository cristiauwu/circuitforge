/**
 * @circuitforge/solver — CLI Runner de Verificación Ground Truth contra SPICE (Tarea T-5).
 *
 * Imprime un reporte tabular de alta precisión con las diferencias punto a punto,
 * matrices de error y verificación de la tolerancia estricta RMSE < 1e-6 V.
 */

import { runGroundTruthSuite, type SuiteSummaryReport } from './spiceBenchmark.js'

export function formatSpiceBenchmarkReport(summary: SuiteSummaryReport): string {
  const out: string[] = []
  out.push('\n======================================================================')
  out.push(' CircuitForge — Reporte Ground-Truth de Simulación contra SPICE3f5')
  out.push('======================================================================\n')

  for (const rep of summary.reports) {
    const status = rep.passed ? '✓ SUPERADO' : '✗ FALLIDO'
    out.push(`[${rep.id}] ${rep.name} -> ${status}`)
    out.push(`      Descripción: ${rep.description}`)
    out.push(`      RMSE:        ${rep.rmse.toExponential(4)} V`)
    out.push(`      Error Máx:   ${rep.maxError.toExponential(4)} V`)
    out.push('      Puntos de prueba:')
    for (const c of rep.comparisons) {
      out.push(
        `        • ${c.netId.padEnd(40)} | Calc: ${c.mnaVoltage.toFixed(6)} V | Esp: ${c.expectedVoltage.toFixed(6)} V | Δ: ${c.absoluteError.toExponential(2)} V`,
      )
    }
    out.push('')
  }

  out.push('----------------------------------------------------------------------')
  out.push(`Total de benchmarks evaluados: ${summary.totalBenchmarks}`)
  out.push(`Total de benchmarks superados: ${summary.passedBenchmarks}`)
  out.push(`RMSE Global Ponderado:         ${summary.globalRmse.toExponential(4)} V`)
  out.push(`Error Máximo Global:           ${summary.maxGlobalError.toExponential(4)} V`)
  out.push(
    `Veredicto Ground-Truth:        ${summary.allPassed ? '✓ 100% CONVERGENCIA EXACTA (< 1e-6 V)' : '✗ TOLERANCIA EXCEDIDA'}`,
  )
  out.push('======================================================================\n')

  return out.join('\n')
}

export function executeSpiceBenchmarkCli(): void {
  const summary = runGroundTruthSuite()
  process.stdout.write(formatSpiceBenchmarkReport(summary))
}

if (process.argv[1]?.includes('runBenchmarks')) {
  executeSpiceBenchmarkCli()
}
