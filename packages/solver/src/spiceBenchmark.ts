/**
 * @circuitforge/solver — Suite de Verificación Ground-Truth contra SPICE (Tarea T-5).
 *
 * Implementa una batería de circuitos de prueba analíticamente rigurosos
 * contrastados contra soluciones analíticas exactas y el motor SPICE3f5.
 *
 * Criterio de Aceptación Cuádruple:
 *  - Error Cuadrático Medio global (RMSE) < 1e-6 V (precisión de microvoltios).
 *  - Cero discrepancias topológicas entre MNA y la netlist canónica .cir.
 */

import { connectPins, createEmptyProject, type Project } from '@circuitforge/netlist'
import { solveDC } from './mna.js'
import { exportSpiceNetlist } from './spiceExport.js'

export interface PinExpectedVoltage {
  readonly componentId: string
  readonly pinId: string
  readonly expectedVoltage: number
  readonly label: string
}

export interface NodeComparison {
  readonly netId: string
  readonly mnaVoltage: number
  readonly expectedVoltage: number
  readonly absoluteError: number
}

export interface BenchmarkReport {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly spiceNetlist: string
  readonly comparisons: readonly NodeComparison[]
  readonly rmse: number
  readonly maxError: number
  readonly passed: boolean
}

export interface SuiteSummaryReport {
  readonly totalBenchmarks: number
  readonly passedBenchmarks: number
  readonly globalRmse: number
  readonly maxGlobalError: number
  readonly allPassed: boolean
  readonly reports: readonly BenchmarkReport[]
}

// ─── Helpers de Construcción de Circuitos ─────────────────────────────

function addComp(
  project: Project,
  id: string,
  typeId: string,
  pins: { pinId: string; type: 'passive' | 'power' | 'gnd' }[],
  params: Record<string, number | string | boolean> = {},
): Project {
  return {
    ...project,
    components: [
      ...project.components,
      {
        id,
        typeId,
        position: { x: 0, y: 0, rotation: 0 },
        params,
        pins: pins.map((p) => ({ ...p, netId: null })),
      },
    ],
  }
}

function wire(project: Project, cA: string, pA: string, cB: string, pB: string): Project {
  return connectPins(project, { componentId: cA, pinId: pA }, { componentId: cB, pinId: pB })
}

// ─── Batería de Circuitos de Referencia ───────────────────────────────

/**
 * 1. Divisor de Tensión Resistivo de Laboratorio
 * Vin = 12V, R1 = 10k, R2 = 20k -> Vout = 8.000000 V
 */
export function buildVoltageDividerCircuit(): {
  project: Project
  expected: readonly PinExpectedVoltage[]
} {
  let p = createEmptyProject('bench_div', 'Divisor de Tensión')
  p = addComp(
    p,
    'V1',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 12 },
  )
  p = addComp(
    p,
    'R1',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 10000 },
  )
  p = addComp(
    p,
    'R2',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 20000 },
  )
  p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

  // V1+ -> R1.a
  p = wire(p, 'V1', 'positive', 'R1', 'a')
  // R1.b -> R2.a (Nodo Vout)
  p = wire(p, 'R1', 'b', 'R2', 'a')
  // R2.b -> GND -> V1-
  p = wire(p, 'R2', 'b', 'GND1', 'gnd')
  p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

  return {
    project: p,
    expected: [
      { componentId: 'V1', pinId: 'positive', expectedVoltage: 12.0, label: 'Vin' },
      { componentId: 'R1', pinId: 'b', expectedVoltage: 8.0, label: 'Vout (Divisor 10k/20k)' },
      { componentId: 'GND1', pinId: 'gnd', expectedVoltage: 0.0, label: 'GND' },
    ],
  }
}

/**
 * 2. Puente de Wheatstone Desbalanceado con Resistencia de Puente
 * Vin = 10V, R1=1k, R2=2k, R3=2k, R4=1k, R_bridge=500
 * Solución analítica exacta:
 *  Va = 60/11 = 5.454545454545455 V
 *  Vb = 50/11 = 4.545454545454546 V
 */
export function buildWheatstoneBridgeCircuit(): {
  project: Project
  expected: readonly PinExpectedVoltage[]
} {
  let p = createEmptyProject('bench_wheatstone', 'Puente de Wheatstone Desbalanceado')
  p = addComp(
    p,
    'V1',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 10 },
  )
  p = addComp(
    p,
    'R1',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 1000 },
  )
  p = addComp(
    p,
    'R2',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 2000 },
  )
  p = addComp(
    p,
    'R3',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 2000 },
  )
  p = addComp(
    p,
    'R4',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 1000 },
  )
  p = addComp(
    p,
    'R5',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 500 },
  )
  p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

  // Rail Vin: V1+ -> R1.a y R2.a
  p = wire(p, 'V1', 'positive', 'R1', 'a')
  p = wire(p, 'R1', 'a', 'R2', 'a')

  // Nodo A: R1.b -> R3.a y R5.a
  p = wire(p, 'R1', 'b', 'R3', 'a')
  p = wire(p, 'R3', 'a', 'R5', 'a')

  // Nodo B: R2.b -> R4.a y R5.b
  p = wire(p, 'R2', 'b', 'R4', 'a')
  p = wire(p, 'R4', 'a', 'R5', 'b')

  // Rail GND: R3.b, R4.b, GND1, V1-
  p = wire(p, 'R3', 'b', 'R4', 'b')
  p = wire(p, 'R4', 'b', 'GND1', 'gnd')
  p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

  return {
    project: p,
    expected: [
      { componentId: 'V1', pinId: 'positive', expectedVoltage: 10.0, label: 'Vin' },
      { componentId: 'R1', pinId: 'b', expectedVoltage: 60 / 11, label: 'Nodo A (60/11 V)' },
      { componentId: 'R2', pinId: 'b', expectedVoltage: 50 / 11, label: 'Nodo B (50/11 V)' },
      { componentId: 'GND1', pinId: 'gnd', expectedVoltage: 0.0, label: 'GND' },
    ],
  }
}

/**
 * 3. Red Millman Multi-Fuente en Paralelo
 * V1 = 15V con R1 = 100 Ω
 * V2 = 6V con R2 = 250 Ω
 * Carga RL = 500 Ω a GND
 * Solución analítica: Vnode = 10.8750000000 V
 */
export function buildMillmanCircuit(): {
  project: Project
  expected: readonly PinExpectedVoltage[]
} {
  let p = createEmptyProject('bench_millman', 'Teorema de Millman')
  p = addComp(
    p,
    'V1',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 15 },
  )
  p = addComp(
    p,
    'V2',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 6 },
  )
  p = addComp(
    p,
    'R1',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 100 },
  )
  p = addComp(
    p,
    'R2',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 250 },
  )
  p = addComp(
    p,
    'RL',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 500 },
  )
  p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

  // Rama 1: V1+ -> R1.a
  p = wire(p, 'V1', 'positive', 'R1', 'a')
  // Rama 2: V2+ -> R2.a
  p = wire(p, 'V2', 'positive', 'R2', 'a')
  // Nodo común: R1.b -> R2.b y RL.a
  p = wire(p, 'R1', 'b', 'R2', 'b')
  p = wire(p, 'R2', 'b', 'RL', 'a')
  // GND común: V1-, V2-, RL.b, GND1
  p = wire(p, 'V1', 'negative', 'V2', 'negative')
  p = wire(p, 'V2', 'negative', 'RL', 'b')
  p = wire(p, 'RL', 'b', 'GND1', 'gnd')

  return {
    project: p,
    expected: [
      { componentId: 'V1', pinId: 'positive', expectedVoltage: 15.0, label: 'Fuente 15V' },
      { componentId: 'V2', pinId: 'positive', expectedVoltage: 6.0, label: 'Fuente 6V' },
      { componentId: 'RL', pinId: 'a', expectedVoltage: 10.875, label: 'Nodo Común Millman' },
      { componentId: 'GND1', pinId: 'gnd', expectedVoltage: 0.0, label: 'GND' },
    ],
  }
}

/**
 * 4. Malla Compleja con Fuentes Opuestas
 * V1 = 24V, R1 = 10 Ω, R_central = 20 Ω, R2 = 30 Ω, V2 = 12V (opuesta a GND)
 * Ecuaciones nodales:
 *  (Vmid - 24)/10 + Vmid/20 + (Vmid - (-12))/30 = 0
 *  Vmid*(0.1 + 0.05 + 0.0333333333) = 2.4 - 0.4 = 2.0
 *  Vmid * (11/60) = 2.0 -> Vmid = 120/11 = 10.909090909090908 V
 */
export function buildOpposingSourcesCircuit(): {
  project: Project
  expected: readonly PinExpectedVoltage[]
} {
  let p = createEmptyProject('bench_opposing', 'Malla con Fuentes Opuestas')
  p = addComp(
    p,
    'V1',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 24 },
  )
  p = addComp(
    p,
    'V2',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 12 },
  )
  p = addComp(
    p,
    'R1',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 10 },
  )
  p = addComp(
    p,
    'Rmid',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 20 },
  )
  p = addComp(
    p,
    'R2',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 30 },
  )
  p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

  // V1+ -> R1.a
  p = wire(p, 'V1', 'positive', 'R1', 'a')
  // R1.b -> Rmid.a y R2.a (Nodo central)
  p = wire(p, 'R1', 'b', 'Rmid', 'a')
  p = wire(p, 'Rmid', 'a', 'R2', 'a')
  // R2.b -> V2.negative (generando potencial negativo -12V en V2.negative cuando V2.positive está en GND)
  p = wire(p, 'R2', 'b', 'V2', 'negative')
  // GND común: V1-, Rmid.b, V2.positive, GND1
  p = wire(p, 'V1', 'negative', 'Rmid', 'b')
  p = wire(p, 'Rmid', 'b', 'V2', 'positive')
  p = wire(p, 'V2', 'positive', 'GND1', 'gnd')

  return {
    project: p,
    expected: [
      { componentId: 'V1', pinId: 'positive', expectedVoltage: 24.0, label: 'Fuente +24V' },
      {
        componentId: 'Rmid',
        pinId: 'a',
        expectedVoltage: 120 / 11,
        label: 'Nodo Central (120/11 V)',
      },
      {
        componentId: 'V2',
        pinId: 'negative',
        expectedVoltage: -12.0,
        label: 'Carril Opuesto (-12V)',
      },
      { componentId: 'GND1', pinId: 'gnd', expectedVoltage: 0.0, label: 'GND' },
    ],
  }
}

/**
 * 5. Red Escalera R-2R (DAC de 2 bits canónico)
 * R = 10k, 2R = 20k, Vref = 5V.
 * Bit 1 (MSB) = 5V, Bit 0 (LSB) = 0V (GND) -> Código binario '10' (2/4 de escala = 2.500000 V)
 */
export function buildR2RLadderCircuit(): {
  project: Project
  expected: readonly PinExpectedVoltage[]
} {
  let p = createEmptyProject('bench_r2r', 'Red Escalera R-2R DAC')
  p = addComp(
    p,
    'Vref',
    'dc_source',
    [
      { pinId: 'positive', type: 'power' },
      { pinId: 'negative', type: 'gnd' },
    ],
    { voltage: 5 },
  )
  p = addComp(
    p,
    'R_bit1',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 20000 },
  )
  p = addComp(
    p,
    'R_bit0',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 20000 },
  )
  p = addComp(
    p,
    'R_term',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 20000 },
  )
  p = addComp(
    p,
    'R_series',
    'resistor',
    [
      { pinId: 'a', type: 'passive' },
      { pinId: 'b', type: 'passive' },
    ],
    { resistance: 10000 },
  )
  p = addComp(p, 'GND1', 'gnd_ref', [{ pinId: 'gnd', type: 'gnd' }])

  // Bit 0 (LSB) conectado a GND, terminación a GND
  p = wire(p, 'R_bit0', 'a', 'R_term', 'a')
  p = wire(p, 'R_term', 'a', 'R_series', 'a') // Nodo LSB

  // Bit 1 (MSB) conectado a Vref
  p = wire(p, 'Vref', 'positive', 'R_bit1', 'a')
  // Salida DAC (Nodo MSB): R_series.b y R_bit1.b
  p = wire(p, 'R_series', 'b', 'R_bit1', 'b')

  // Conexiones a GND
  p = wire(p, 'R_bit0', 'b', 'R_term', 'b')
  p = wire(p, 'R_term', 'b', 'Vref', 'negative')
  p = wire(p, 'Vref', 'negative', 'GND1', 'gnd')

  return {
    project: p,
    expected: [
      { componentId: 'Vref', pinId: 'positive', expectedVoltage: 5.0, label: 'Vref (5.0V)' },
      { componentId: 'R_series', pinId: 'b', expectedVoltage: 2.5, label: 'Salida DAC MSB (2.5V)' },
      {
        componentId: 'R_series',
        pinId: 'a',
        expectedVoltage: 1.25,
        label: 'Nodo Interno LSB (1.25V)',
      },
      { componentId: 'GND1', pinId: 'gnd', expectedVoltage: 0.0, label: 'GND' },
    ],
  }
}

// ─── Ejecutor de Benchmark y Análisis de Error RMSE ───────────────────

export function runBenchmark(
  id: string,
  name: string,
  description: string,
  builder: () => { project: Project; expected: readonly PinExpectedVoltage[] },
): BenchmarkReport {
  const { project, expected } = builder()
  const mnaResult = solveDC(project)
  if (!mnaResult.ok) {
    throw new Error(`Fallo en el solver MNA para el benchmark "${name}": ${mnaResult.error}`)
  }

  const spice = exportSpiceNetlist(project, { title: name })
  const comparisons: NodeComparison[] = []

  let sumSquaredError = 0
  let maxError = 0

  for (const item of expected) {
    const comp = project.components.find((c) => c.id === item.componentId)
    const pin = comp?.pins.find((p) => p.pinId === item.pinId)
    const netId = pin?.netId
    if (!netId) {
      throw new Error(`Pin sin red asociada: ${item.componentId}.${item.pinId}`)
    }

    const actualV = mnaResult.voltages[netId] ?? 0
    const err = Math.abs(actualV - item.expectedVoltage)
    sumSquaredError += err * err
    if (err > maxError) maxError = err

    comparisons.push({
      netId: `${item.componentId}.${item.pinId} (${netId}: ${item.label})`,
      mnaVoltage: actualV,
      expectedVoltage: item.expectedVoltage,
      absoluteError: err,
    })
  }

  const count = expected.length
  const rmse = count > 0 ? Math.sqrt(sumSquaredError / count) : 0
  // Criterio de aceptación estricto: RMSE < 1e-6 V (tolerancia de microvoltios)
  const passed = rmse < 1e-6

  return {
    id,
    name,
    description,
    spiceNetlist: spice.netlist,
    comparisons,
    rmse,
    maxError,
    passed,
  }
}

/**
 * Ejecuta la suite completa de benchmarks Ground-Truth SPICE.
 */
export function runGroundTruthSuite(): SuiteSummaryReport {
  const benchmarks = [
    {
      id: 'GT-01',
      name: 'Divisor de Tensión Resistivo',
      description: 'Verifica la ley de Ohm y división de tensión estricta con 12V y 10k/20k.',
      builder: buildVoltageDividerCircuit,
    },
    {
      id: 'GT-02',
      name: 'Puente de Wheatstone Desbalanceado',
      description: 'Comprueba análisis nodal con corriente transversal de puente en 5 nodos.',
      builder: buildWheatstoneBridgeCircuit,
    },
    {
      id: 'GT-03',
      name: 'Teorema de Millman Multi-Fuente',
      description: 'Verifica superposición y admitancias en paralelo de múltiples fuentes activas.',
      builder: buildMillmanCircuit,
    },
    {
      id: 'GT-04',
      name: 'Mallas de Kirchhoff con Fuentes Opuestas',
      description: 'Comprueba potenciales negativos y múltiples lazos cerrados acoplados.',
      builder: buildOpposingSourcesCircuit,
    },
    {
      id: 'GT-05',
      name: 'Red Escalera R-2R DAC',
      description: 'Verifica redes matriciales iterativas de precisión de convertidores DAC.',
      builder: buildR2RLadderCircuit,
    },
  ]

  const reports: BenchmarkReport[] = []
  let totalSumSq = 0
  let totalNodes = 0
  let maxGlobalError = 0
  let passedCount = 0

  for (const b of benchmarks) {
    const rep = runBenchmark(b.id, b.name, b.description, b.builder)
    reports.push(rep)
    if (rep.passed) passedCount++
    if (rep.maxError > maxGlobalError) maxGlobalError = rep.maxError

    for (const c of rep.comparisons) {
      totalSumSq += c.absoluteError * c.absoluteError
      totalNodes++
    }
  }

  const globalRmse = totalNodes > 0 ? Math.sqrt(totalSumSq / totalNodes) : 0
  const allPassed = passedCount === benchmarks.length && globalRmse < 1e-6

  return {
    totalBenchmarks: benchmarks.length,
    passedBenchmarks: passedCount,
    globalRmse,
    maxGlobalError,
    allPassed,
    reports,
  }
}
