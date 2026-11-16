/**
 * @circuitforge/solver — MNA DC solver tests.
 *
 * Validates RF-2.1: <10% error vs. theoretical values for:
 *   - Ohm's law (single resistor + voltage source)
 *   - Voltage divider (two resistors in series)
 *   - Kirchhoff mesh (multiple loops with multiple sources)
 *   - Potentiometer voltage division
 *   - Inductor as short in DC
 *   - Series resistors
 *   - Parallel resistors
 */

import { describe, expect, it } from 'vitest'
import type { Project } from '@circuitforge/netlist'
import { createEmptyProject, connectPins } from '@circuitforge/netlist'
import { solveDC } from './mna.js'
import type { SolverResult } from './mna.js'

// ─── Test helpers ─────────────────────────────────────────────────────

function addComponent(
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

function wire(project: Project, compA: string, pinA: string, compB: string, pinB: string): Project {
  return connectPins(project, { componentId: compA, pinId: pinA }, { componentId: compB, pinId: pinB })
}

function expectOk(result: ReturnType<typeof solveDC>): SolverResult {
  expect(result.ok).toBe(true)
  return result as SolverResult
}

function relError(actual: number, expected: number): number {
  if (expected === 0) return Math.abs(actual)
  return Math.abs((actual - expected) / expected)
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('solveDC – Ohm\'s law (RF-2.1)', () => {
  it('single resistor + DC source: V = IR', () => {
    // Circuit: DC source 10V → Resistor 1kΩ → GND
    //   V1.positive ──── R1.a
    //   R1.b ──── GND.gnd
    //   GND.gnd ──── V1.negative
    let p = createEmptyProject('test', 'Ohm')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))

    // Current through resistor: I = V/R = 10/1000 = 0.01 A
    // Current through V1 should be -0.01 A (convention: flows into positive terminal)
    const i = result.currents['V1']!
    expect(relError(Math.abs(i), 0.01)).toBeLessThan(0.10) // <10% error

    // Power in resistor: P = V²/R = 100/1000 = 0.1 W
    expect(relError(result.power['R1']!, 0.1)).toBeLessThan(0.10)
  })

  it('different resistor values', () => {
    let p = createEmptyProject('test', 'Ohm2')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 5 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 470 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    const i = Math.abs(result.currents['V1']!)
    const expected = 5 / 470
    expect(relError(i, expected)).toBeLessThan(0.10)
  })
})

describe('solveDC – Voltage divider (RF-2.1)', () => {
  it('two resistors in series: Vout = Vin × R2/(R1+R2)', () => {
    // V1(12V).positive → R1(1k).a
    // R1.b → R2(2k).a  ← this is Vout
    // R2.b → GND → V1.negative
    let p = createEmptyProject('test', 'Divider')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 12 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'R2', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 2000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'R2', 'a')
    p = wire(p, 'R2', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))

    // Theoretical: Vout = 12 × 2000/(1000+2000) = 8V
    // Find the net at R1.b / R2.a junction
    const midNet = p.components.find((c) => c.id === 'R1')!
      .pins.find((pin) => pin.pinId === 'b')!.netId!
    const vMid = result.voltages[midNet]!
    expect(relError(vMid, 8)).toBeLessThan(0.10)

    // Current: I = 12/3000 = 0.004 A
    const i = Math.abs(result.currents['V1']!)
    expect(relError(i, 0.004)).toBeLessThan(0.10)
  })

  it('equal resistors give half voltage', () => {
    let p = createEmptyProject('test', 'HalfDivider')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 500 },
    )
    p = addComponent(p, 'R2', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 500 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'R2', 'a')
    p = wire(p, 'R2', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    const midNet = p.components.find((c) => c.id === 'R1')!
      .pins.find((pin) => pin.pinId === 'b')!.netId!
    expect(relError(result.voltages[midNet]!, 5)).toBeLessThan(0.10)
  })
})

describe('solveDC – Kirchhoff mesh (RF-2.1)', () => {
  it('two voltage sources in a loop with two resistors', () => {
    // V1(10V).pos → R1(1k).a
    // R1.b → R2(1k).a
    // R2.b → V2(5V).pos
    // V2.neg → GND → V1.neg
    //
    // KVL: 10 - I*1000 - I*1000 - 5 = 0  →  I = 5/2000 = 2.5 mA
    let p = createEmptyProject('test', 'Kirchhoff')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'V2', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 5 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'R2', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'R2', 'a')
    p = wire(p, 'R2', 'b', 'V2', 'positive')
    p = wire(p, 'V2', 'negative', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))

    // I = 2.5 mA
    const i1 = Math.abs(result.currents['V1']!)
    expect(relError(i1, 0.0025)).toBeLessThan(0.10)

    // Node at V1.pos should be 10V
    const topNet = p.components.find((c) => c.id === 'V1')!
      .pins.find((pin) => pin.pinId === 'positive')!.netId!
    expect(relError(result.voltages[topNet]!, 10)).toBeLessThan(0.10)

    // Node at V2.pos should be 5V
    const v2Net = p.components.find((c) => c.id === 'V2')!
      .pins.find((pin) => pin.pinId === 'positive')!.netId!
    expect(relError(result.voltages[v2Net]!, 5)).toBeLessThan(0.10)

    // Mid-point: V = 10 - 0.0025*1000 = 7.5V
    const midNet = p.components.find((c) => c.id === 'R1')!
      .pins.find((pin) => pin.pinId === 'b')!.netId!
    expect(relError(result.voltages[midNet]!, 7.5)).toBeLessThan(0.10)
  })
})

describe('solveDC – Parallel resistors', () => {
  it('two resistors in parallel have equivalent R_eq = R1*R2/(R1+R2)', () => {
    // V1(10V) → R1(1k) ┐ → GND
    //           R2(1k) ┘
    // R_eq = 500Ω, I_total = 10/500 = 20 mA
    let p = createEmptyProject('test', 'Parallel')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'R2', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    // Both R1 and R2 connect from V1.pos to GND
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'V1', 'positive', 'R2', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'R2', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    const i = Math.abs(result.currents['V1']!)
    expect(relError(i, 0.02)).toBeLessThan(0.10) // 20 mA total

    // Each resistor dissipates P = V²/R = 100/1000 = 0.1W
    expect(relError(result.power['R1']!, 0.1)).toBeLessThan(0.10)
    expect(relError(result.power['R2']!, 0.1)).toBeLessThan(0.10)
  })
})

describe('solveDC – Battery', () => {
  it('9V battery with 1k resistor gives 9 mA', () => {
    let p = createEmptyProject('test', 'Battery')
    p = addComponent(p, 'BT1', 'battery_9v',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 9 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'BT1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'BT1', 'negative')

    const result = expectOk(solveDC(p))
    expect(relError(Math.abs(result.currents['BT1']!), 0.009)).toBeLessThan(0.10)
  })
})

describe('solveDC – Inductor as short in DC', () => {
  it('inductor behaves as wire in DC', () => {
    // V1(5V) → L1 → R1(500Ω) → GND
    // I = 5/500 = 10 mA (inductor is a short)
    let p = createEmptyProject('test', 'Inductor')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 5 },
    )
    p = addComponent(p, 'L1', 'inductor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { inductance: 10 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 500 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'L1', 'a')
    p = wire(p, 'L1', 'b', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    expect(relError(Math.abs(result.currents['V1']!), 0.01)).toBeLessThan(0.10)
  })
})

describe('solveDC – Closed switch', () => {
  it('closed SPST switch passes current', () => {
    // V1(10V) → SW1(closed) → R1(1k) → GND
    // I = 10/1000 = 10 mA
    let p = createEmptyProject('test', 'Switch')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'SW1', 'switch_spst',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { closed: true },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'SW1', 'a')
    p = wire(p, 'SW1', 'b', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    expect(relError(Math.abs(result.currents['V1']!), 0.01)).toBeLessThan(0.10)
  })
})

describe('solveDC – Error cases', () => {
  it('returns error for empty circuit', () => {
    const p = createEmptyProject('test', 'Empty')
    const result = solveDC(p)
    expect(result.ok).toBe(false)
  })

  it('returns error when no ground is present', () => {
    let p = createEmptyProject('test', 'NoGND')
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    const result = solveDC(p)
    expect(result.ok).toBe(false)
  })

  it('uses voltage source negative as ground when no gnd_ref', () => {
    let p = createEmptyProject('test', 'AutoGND')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 5 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1000 },
    )
    p = wire(p, 'V1', 'positive', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    expect(relError(Math.abs(result.currents['V1']!), 0.005)).toBeLessThan(0.10)
  })
})

describe('solveDC – Potentiometer', () => {
  it('potentiometer at 50% acts as equal divider', () => {
    // V1(10V) → POT.a, POT.wiper → R_load(10k), POT.b → GND, R_load → GND
    // With pot at 50%, R_AW = 5k, R_WB = 5k
    // Vout = 10 * (5k || 10k) / (5k + (5k || 10k))
    // 5k || 10k = 3333Ω
    // Vout = 10 * 3333 / (5000 + 3333) = 4V
    // But without load: Vout = 10 * 5/10 = 5V
    // Let's test without external load first.
    let p = createEmptyProject('test', 'Pot')
    p = addComponent(p, 'V1', 'dc_source',
      [{ pinId: 'positive', type: 'power' }, { pinId: 'negative', type: 'gnd' }],
      { voltage: 10 },
    )
    p = addComponent(p, 'RV1', 'potentiometer',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'wiper', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 10, position: 0.5 },
    )
    p = addComponent(p, 'R1', 'resistor',
      [{ pinId: 'a', type: 'passive' }, { pinId: 'b', type: 'passive' }],
      { resistance: 1e6 }, // very high load → negligible
    )
    p = addComponent(p, 'GND1', 'gnd_ref',
      [{ pinId: 'gnd', type: 'gnd' }],
    )
    p = wire(p, 'V1', 'positive', 'RV1', 'a')
    p = wire(p, 'RV1', 'wiper', 'R1', 'a')
    p = wire(p, 'R1', 'b', 'GND1', 'gnd')
    p = wire(p, 'RV1', 'b', 'GND1', 'gnd')
    p = wire(p, 'GND1', 'gnd', 'V1', 'negative')

    const result = expectOk(solveDC(p))
    const wiperNet = p.components.find((c) => c.id === 'RV1')!
      .pins.find((pin) => pin.pinId === 'wiper')!.netId!
    // Should be ~5V (half of 10V)
    expect(relError(result.voltages[wiperNet]!, 5)).toBeLessThan(0.10)
  })
})
