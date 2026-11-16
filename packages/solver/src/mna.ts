/**
 * @circuitforge/solver — Modified Nodal Analysis (MNA) DC solver.
 *
 * Builds the MNA system of equations from a circuit description and
 * solves for node voltages and voltage-source currents.
 *
 * Requirements satisfied:
 *   RF-2.1  DC solver with <10% error vs theory (Ohm, voltage divider, Kirchhoff)
 *   RNF-1   Pure TypeScript, runs in browser + Web Worker + Node
 *
 * Supported element stamps:
 *   • Resistor  (two-terminal passive)
 *   • DC voltage source  (ideal, fixed or from component param)
 *   • DC current source  (ideal)
 *   • Short circuit / ideal wire  (switch in closed state)
 *   • Potentiometer  (modeled as two resistors)
 *   • LDR / Thermistor  (treated as simple resistor with its param value)
 *
 * Ground convention:
 *   The solver auto-detects a ground node. Priority:
 *     1. A `gnd_ref` component's `gnd` pin
 *     2. The `negative` pin of the first `dc_source` or battery
 *     3. The first `GND`-type pin encountered
 *   That node is eliminated (V = 0) and becomes the reference.
 */

import type { Component, Net, PinEndpoint, Project } from '@circuitforge/netlist'
import { COMPONENT_INDEX, getDefaultParameters } from '@circuitforge/netlist'
import { getInternalContactPairs } from '@circuitforge/netlist'
import { computeLdrResistance, computeNtcResistance } from './behavioral.js'
import { solve, zeros, zeroVec } from './matrix.js'

// ─── Public result types ──────────────────────────────────────────────

/** Voltage at every net (node), keyed by net id. */
export interface NodeVoltages {
  readonly [netId: string]: number
}

/** Current flowing through a branch, keyed by a descriptive id. */
export interface BranchCurrents {
  readonly [branchId: string]: number
}

/** Full solver result. */
export interface SolverResult {
  /** `true` when the system was solved successfully. */
  readonly ok: true
  /** Node (net) voltages relative to ground. */
  readonly voltages: NodeVoltages
  /** Currents through voltage sources and shorts. */
  readonly currents: BranchCurrents
  /** Power delivered/consumed per component (positive = consumed). */
  readonly power: Record<string, number>
}

export interface SolverError {
  readonly ok: false
  readonly error: string
}

export type DCResult = SolverResult | SolverError

// ─── Internal element descriptors ─────────────────────────────────────

interface Resistor {
  kind: 'resistor'
  id: string
  nodeA: string // net id or pin key
  nodeB: string
  resistance: number // ohms
}

interface VoltageSource {
  kind: 'vsource'
  id: string
  nodePos: string
  nodeNeg: string
  voltage: number // volts
}

interface CurrentSource {
  kind: 'isource'
  id: string
  nodePos: string
  nodeNeg: string
  current: number // amps, positive flows from neg to pos internally
}

/** A zero-resistance connection (closed switch, relay contact). */
interface Short {
  kind: 'short'
  id: string
  nodeA: string
  nodeB: string
}

type Element = Resistor | VoltageSource | CurrentSource | Short

// ─── Helpers ──────────────────────────────────────────────────────────

function pinKey(endpoint: PinEndpoint): string {
  return `${endpoint.componentId}::${endpoint.pinId}`
}

/** Map every component pin → its net id. Unconnected pins get a unique virtual id. */
function buildPinNetMap(project: Project): Map<string, string> {
  const map = new Map<string, string>()
  let virtualSeq = 0
  for (const net of project.nets) {
    for (const pin of net.pins) {
      map.set(pinKey(pin), net.id)
    }
  }
  // Assign virtual net ids to unconnected pins so the solver sees them.
  for (const comp of project.components) {
    for (const pin of comp.pins) {
      const k = pinKey({ componentId: comp.id, pinId: pin.pinId })
      if (!map.has(k)) {
        map.set(k, `__virtual_${virtualSeq++}`)
      }
    }
  }
  return map
}

function nodeOf(map: Map<string, string>, compId: string, pinId: string): string {
  const k = `${compId}::${pinId}`
  const n = map.get(k)
  if (n === undefined) throw new Error(`Pin not in net map: ${k}`)
  return n
}

function paramNum(comp: Component, key: string, fallback: number): number {
  const v = comp.params[key]
  return typeof v === 'number' ? v : fallback
}

// ─── Circuit extraction ───────────────────────────────────────────────

function extractElements(project: Project, pinNet: Map<string, string>): Element[] {
  const elements: Element[] = []

  for (const comp of project.components) {
    const def = COMPONENT_INDEX.get(comp.typeId)
    if (!def) continue

    switch (comp.typeId) {
      // ── Passive two-terminal resistive ──────────────────────
      case 'resistor': {
        const r = paramNum(comp, 'resistance', 220)
        const unit = def.parameters.find((p) => p.key === 'resistance')?.kind === 'number'
          ? (def.parameters.find((p) => p.key === 'resistance') as { unit?: string }).unit
          : undefined
        const ohms = unit === 'kohm' ? r * 1000 : r
        if (ohms > 0) {
          elements.push({
            kind: 'resistor',
            id: comp.id,
            nodeA: nodeOf(pinNet, comp.id, 'a'),
            nodeB: nodeOf(pinNet, comp.id, 'b'),
            resistance: ohms,
          })
        }
        break
      }

      case 'thermistor_ntc': {
        let ohms = 10_000
        if (typeof comp.params['temperature'] === 'number') {
          ohms = computeNtcResistance(comp.params['temperature'])
        } else {
          const r = paramNum(comp, 'resistance', 10)
          const unit = def.parameters.find((p) => p.key === 'resistance')?.kind === 'number'
            ? (def.parameters.find((p) => p.key === 'resistance') as { unit?: string }).unit
            : undefined
          ohms = unit === 'kohm' ? r * 1000 : r
        }
        if (ohms > 0) {
          elements.push({
            kind: 'resistor',
            id: comp.id,
            nodeA: nodeOf(pinNet, comp.id, 'a'),
            nodeB: nodeOf(pinNet, comp.id, 'b'),
            resistance: ohms,
          })
        }
        break
      }

      case 'ldr': {
        // LDR conductual (RF-2.3): varía resistencia con lux o resistencia explícita
        let ohms = 10_000
        if (typeof comp.params['lux'] === 'number') {
          ohms = computeLdrResistance(comp.params['lux'])
        } else if (typeof comp.params['resistance'] === 'number') {
          ohms = comp.params['resistance']
        }
        if (ohms > 0) {
          elements.push({
            kind: 'resistor',
            id: comp.id,
            nodeA: nodeOf(pinNet, comp.id, 'a'),
            nodeB: nodeOf(pinNet, comp.id, 'b'),
            resistance: ohms,
          })
        }
        break
      }

      case 'fuse': {
        // Fuse: treated as a short (0 Ω) in DC analysis
        elements.push({
          kind: 'short',
          id: comp.id,
          nodeA: nodeOf(pinNet, comp.id, 'a'),
          nodeB: nodeOf(pinNet, comp.id, 'b'),
        })
        break
      }

      // ── Potentiometer: modeled as two series resistors ──────
      case 'potentiometer': {
        const totalR = paramNum(comp, 'resistance', 10)
        const unit = (def.parameters.find((p) => p.key === 'resistance') as { unit?: string } | undefined)?.unit
        const ohms = unit === 'kohm' ? totalR * 1000 : totalR
        const pos = paramNum(comp, 'position', 0.5)
        const rAW = ohms * pos
        const rWB = ohms * (1 - pos)
        const wiperNode = nodeOf(pinNet, comp.id, 'wiper')
        if (rAW > 1e-12) {
          elements.push({
            kind: 'resistor',
            id: `${comp.id}_AW`,
            nodeA: nodeOf(pinNet, comp.id, 'a'),
            nodeB: wiperNode,
            resistance: rAW,
          })
        } else {
          elements.push({
            kind: 'short',
            id: `${comp.id}_AW`,
            nodeA: nodeOf(pinNet, comp.id, 'a'),
            nodeB: wiperNode,
          })
        }
        if (rWB > 1e-12) {
          elements.push({
            kind: 'resistor',
            id: `${comp.id}_WB`,
            nodeA: wiperNode,
            nodeB: nodeOf(pinNet, comp.id, 'b'),
            resistance: rWB,
          })
        } else {
          elements.push({
            kind: 'short',
            id: `${comp.id}_WB`,
            nodeA: wiperNode,
            nodeB: nodeOf(pinNet, comp.id, 'b'),
          })
        }
        break
      }

      // ── DC voltage sources and batteries (con ESR RF-2.3) ───
      case 'dc_source': {
        const v = paramNum(comp, 'voltage', 5)
        elements.push({
          kind: 'vsource',
          id: comp.id,
          nodePos: nodeOf(pinNet, comp.id, 'positive'),
          nodeNeg: nodeOf(pinNet, comp.id, 'negative'),
          voltage: v,
        })
        break
      }

      case 'battery_9v':
      case 'lipo_3s': {
        const v = paramNum(comp, 'voltage', comp.typeId === 'battery_9v' ? 9 : 11.1)
        const esr = paramNum(comp, 'esr', 0)
        if (esr > 0) {
          const intNode = `__esr_${comp.id}`
          elements.push({
            kind: 'vsource',
            id: comp.id,
            nodePos: intNode,
            nodeNeg: nodeOf(pinNet, comp.id, 'negative'),
            voltage: v,
          })
          elements.push({
            kind: 'resistor',
            id: `${comp.id}_esr`,
            nodeA: intNode,
            nodeB: nodeOf(pinNet, comp.id, 'positive'),
            resistance: esr,
          })
        } else {
          elements.push({
            kind: 'vsource',
            id: comp.id,
            nodePos: nodeOf(pinNet, comp.id, 'positive'),
            nodeNeg: nodeOf(pinNet, comp.id, 'negative'),
            voltage: v,
          })
        }
        break
      }

      // ── Switches (closed = short) ───────────────────────────
      case 'switch_spst':
      case 'pushbutton':
      case 'reed_switch': {
        // Internal contact pairs handle shorts via topology, but the solver
        // also needs to see them if we want branch currents.
        const pairs = getInternalContactPairs(comp)
        for (const [a, b] of pairs) {
          elements.push({
            kind: 'short',
            id: `${comp.id}_${a}_${b}`,
            nodeA: nodeOf(pinNet, comp.id, a),
            nodeB: nodeOf(pinNet, comp.id, b),
          })
        }
        break
      }

      case 'switch_spdt': {
        const pairs = getInternalContactPairs(comp)
        for (const [a, b] of pairs) {
          elements.push({
            kind: 'short',
            id: `${comp.id}_${a}_${b}`,
            nodeA: nodeOf(pinNet, comp.id, a),
            nodeB: nodeOf(pinNet, comp.id, b),
          })
        }
        break
      }

      // ── LED: simplified model as 0.7V drop + small series R ──
      case 'led': {
        elements.push({
          kind: 'vsource',
          id: `${comp.id}_vd`,
          nodePos: nodeOf(pinNet, comp.id, 'anode'),
          nodeNeg: nodeOf(pinNet, comp.id, 'cathode'),
          voltage: 2.0, // typical forward voltage
        })
        break
      }

      // ── Diode: simplified as 0.7V drop when forward biased ──
      case 'diode': {
        elements.push({
          kind: 'vsource',
          id: `${comp.id}_vd`,
          nodePos: nodeOf(pinNet, comp.id, 'anode'),
          nodeNeg: nodeOf(pinNet, comp.id, 'cathode'),
          voltage: 0.7,
        })
        break
      }

      case 'diode_zener': {
        const vz = paramNum(comp, 'zenerVoltage', 5.1)
        elements.push({
          kind: 'vsource',
          id: `${comp.id}_vd`,
          nodePos: nodeOf(pinNet, comp.id, 'anode'),
          nodeNeg: nodeOf(pinNet, comp.id, 'cathode'),
          voltage: 0.7, // Forward mode; reverse zener clamping not modeled in DC linear
        })
        break
      }

      case 'diode_schottky': {
        const vf = paramNum(comp, 'forwardVoltage', 0.3)
        elements.push({
          kind: 'vsource',
          id: `${comp.id}_vd`,
          nodePos: nodeOf(pinNet, comp.id, 'anode'),
          nodeNeg: nodeOf(pinNet, comp.id, 'cathode'),
          voltage: vf,
        })
        break
      }

      // ── Capacitor / inductor: open / short in DC ────────────
      case 'capacitor':
      case 'capacitor_ceramic':
      case 'capacitor_film':
        // Open circuit in DC — do not stamp anything
        break

      case 'inductor':
        // Short circuit in DC
        elements.push({
          kind: 'short',
          id: comp.id,
          nodeA: nodeOf(pinNet, comp.id, 'a'),
          nodeB: nodeOf(pinNet, comp.id, 'b'),
        })
        break

      // ── Crystal: open in DC ─────────────────────────────────
      case 'crystal':
        break

      // ── Transformer: not modeled in DC (open) ───────────────
      case 'transformer':
        break

      // ── Relay: coil as resistor, contacts as switch ─────────
      case 'relay_spdt': {
        // Coil: typical 100 Ω
        elements.push({
          kind: 'resistor',
          id: `${comp.id}_coil`,
          nodeA: nodeOf(pinNet, comp.id, 'coil_a'),
          nodeB: nodeOf(pinNet, comp.id, 'coil_b'),
          resistance: 100,
        })
        const pairs = getInternalContactPairs(comp)
        for (const [a, b] of pairs) {
          elements.push({
            kind: 'short',
            id: `${comp.id}_${a}_${b}`,
            nodeA: nodeOf(pinNet, comp.id, a),
            nodeB: nodeOf(pinNet, comp.id, b),
          })
        }
        break
      }

      // ── Varistor: high resistance in normal operation ───────
      case 'varistor_mov': {
        elements.push({
          kind: 'resistor',
          id: comp.id,
          nodeA: nodeOf(pinNet, comp.id, 'a'),
          nodeB: nodeOf(pinNet, comp.id, 'b'),
          resistance: 1e6, // very high R in normal DC
        })
        break
      }

      // ── DIP switch ──────────────────────────────────────────
      case 'dip_switch_4': {
        const pairs = getInternalContactPairs(comp)
        for (const [a, b] of pairs) {
          elements.push({
            kind: 'short',
            id: `${comp.id}_${a}_${b}`,
            nodeA: nodeOf(pinNet, comp.id, a),
            nodeB: nodeOf(pinNet, comp.id, b),
          })
        }
        break
      }

      // ── MCU power pins: modeled as ideal current sinks ──────
      case 'arduino_uno': {
        // Arduino 5V supply → modeled as voltage source when
        // the solver detects it's a source. For now, skip.
        break
      }

      case 'esp32': {
        break
      }

      // ── Breadboard, ground reference: no stamp ──────────────
      case 'breadboard':
      case 'gnd_ref':
        break

      // ── Everything else: skip (no electrical model) ─────────
      default:
        break
    }
  }

  return elements
}

// ─── Ground detection ─────────────────────────────────────────────────

function findGroundNode(project: Project, pinNet: Map<string, string>): string | null {
  // Priority 1: explicit gnd_ref component
  for (const comp of project.components) {
    if (comp.typeId === 'gnd_ref') {
      return nodeOf(pinNet, comp.id, 'gnd')
    }
  }
  // Priority 2: negative terminal of first voltage source / battery
  for (const comp of project.components) {
    if (comp.typeId === 'dc_source' || comp.typeId === 'battery_9v' || comp.typeId === 'lipo_3s') {
      return nodeOf(pinNet, comp.id, 'negative')
    }
  }
  // Priority 3: any GND-type pin
  for (const comp of project.components) {
    for (const pin of comp.pins) {
      if (pin.type === 'gnd') {
        return nodeOf(pinNet, comp.id, pin.pinId)
      }
    }
  }
  return null
}

// ─── MNA builder ──────────────────────────────────────────────────────

/**
 * Solve a DC circuit using Modified Nodal Analysis.
 *
 * @param project A CircuitForge Project with components, nets, and wires.
 * @returns The solver result with voltages, currents, and power.
 */
export function solveDC(project: Project): DCResult {
  const pinNet = buildPinNetMap(project)
  const elements = extractElements(project, pinNet)

  if (elements.length === 0) {
    return { ok: false, error: 'No hay elementos eléctricos en el circuito.' }
  }

  const groundNode = findGroundNode(project, pinNet)
  if (groundNode === null) {
    return { ok: false, error: 'No se encontró un nodo de tierra (GND). Añade un componente Tierra o una fuente DC.' }
  }

  // Collect all unique nodes, merge shorted nodes via union-find
  const parent = new Map<string, string>()
  const allNodes = new Set<string>()

  for (const el of elements) {
    switch (el.kind) {
      case 'resistor':
        allNodes.add(el.nodeA)
        allNodes.add(el.nodeB)
        break
      case 'vsource':
        allNodes.add(el.nodePos)
        allNodes.add(el.nodeNeg)
        break
      case 'isource':
        allNodes.add(el.nodePos)
        allNodes.add(el.nodeNeg)
        break
      case 'short':
        allNodes.add(el.nodeA)
        allNodes.add(el.nodeB)
        break
    }
  }

  for (const n of allNodes) parent.set(n, n)

  function root(n: string): string {
    let r = parent.get(n)!
    while (r !== parent.get(r)!) r = parent.get(r)!
    // Path compression
    let c = n
    while (c !== r) {
      const next = parent.get(c)!
      parent.set(c, r)
      c = next
    }
    return r
  }

  function unite(a: string, b: string): void {
    const ra = root(a)
    const rb = root(b)
    if (ra !== rb) parent.set(rb, ra)
  }

  // Merge shorted nodes
  const shorts: Short[] = []
  for (const el of elements) {
    if (el.kind === 'short') {
      unite(el.nodeA, el.nodeB)
      shorts.push(el)
    }
  }

  // Build node index (excluding ground)
  const gndRoot = root(groundNode)
  const nodeRoots = new Set<string>()
  for (const n of allNodes) {
    const r = root(n)
    if (r !== gndRoot) nodeRoots.add(r)
  }

  const nodeIndex = new Map<string, number>()
  let idx = 0
  for (const r of nodeRoots) {
    nodeIndex.set(r, idx++)
  }
  const numNodes = idx

  // Count voltage sources (each adds an extra unknown: current through it)
  const vsources = elements.filter((el): el is VoltageSource => el.kind === 'vsource')
  const numVS = vsources.length
  const n = numNodes + numVS

  if (n === 0) {
    return { ok: false, error: 'El circuito no tiene nodos activos.' }
  }

  // MNA matrix: [G  B; C  D] x = [i; e]
  const A = zeros(n, n)
  const b = zeroVec(n)

  function nodeIdx(node: string): number | null {
    const r = root(node)
    if (r === gndRoot) return null
    const i = nodeIndex.get(r)
    return i !== undefined ? i : null
  }

  // Stamp resistors
  for (const el of elements) {
    if (el.kind !== 'resistor') continue
    const g = 1 / el.resistance
    const iA = nodeIdx(el.nodeA)
    const iB = nodeIdx(el.nodeB)

    if (iA !== null) {
      A[iA]![iA] += g
    }
    if (iB !== null) {
      A[iB]![iB] += g
    }
    if (iA !== null && iB !== null) {
      A[iB]![iA] -= g
      A[iA]![iB] -= g
    }
  }

  // Stamp voltage sources
  for (let k = 0; k < numVS; k++) {
    const vs = vsources[k]!
    const iPos = nodeIdx(vs.nodePos)
    const iNeg = nodeIdx(vs.nodeNeg)
    const iK = numNodes + k // current variable index

    // B and C stamps
    if (iPos !== null) {
      A[iK]![iPos] += 1  // B: node equation gets +I_k for positive node
      A[iPos]![iK] += 1  // C: KVL row
    }
    if (iNeg !== null) {
      A[iK]![iNeg] -= 1  // B: node equation gets -I_k for negative node
      A[iNeg]![iK] -= 1  // C: KVL row
    }

    // D is 0 for ideal voltage source
    // e stamp: voltage value
    b[iK] = vs.voltage
  }

  // Stamp current sources
  for (const el of elements) {
    if (el.kind !== 'isource') continue
    const iPos = nodeIdx(el.nodePos)
    const iNeg = nodeIdx(el.nodeNeg)

    // Current source: I flows from neg to pos inside, so inject I at pos, extract at neg
    if (iPos !== null) b[iPos] += el.current
    if (iNeg !== null) b[iNeg] -= el.current
  }

  // Solve
  const x = solve(A, b)
  if (x === null) {
    return { ok: false, error: 'El sistema de ecuaciones es singular. Verifica que el circuito no tenga cortocircuitos o nodos flotantes.' }
  }

  // Extract voltages
  const voltages: Record<string, number> = {}
  // Ground node voltage
  voltages[groundNode] = 0
  // For nets that map to the ground root
  for (const net of project.nets) {
    for (const pin of net.pins) {
      const pk = pinKey(pin)
      const netId = pinNet.get(pk)!
      const r = root(netId)
      if (r === gndRoot) {
        voltages[net.id] = 0
      } else {
        const i = nodeIndex.get(r)
        if (i !== undefined) {
          voltages[net.id] = x[i]!
        }
      }
    }
  }

  // Also store voltages keyed by canonical net id for all known nodes
  for (const [nodeId, i] of nodeIndex) {
    // Find which original net ids map to this root
    for (const n of allNodes) {
      if (root(n) === nodeId) {
        voltages[n] = x[i]!
      }
    }
  }

  // Extract voltage-source currents
  const currents: Record<string, number> = {}
  for (let k = 0; k < numVS; k++) {
    currents[vsources[k]!.id] = x[numNodes + k]!
  }

  // Calculate power
  const power: Record<string, number> = {}
  for (const el of elements) {
    switch (el.kind) {
      case 'resistor': {
        const vA = voltages[root(el.nodeA)] ?? 0
        const vB = voltages[root(el.nodeB)] ?? 0
        const v = vA - vB
        power[el.id] = (v * v) / el.resistance
        break
      }
      case 'vsource': {
        const i = currents[el.id] ?? 0
        // Power = V * I; convention: positive = source delivers
        power[el.id] = -el.voltage * i
        break
      }
      case 'isource': {
        const vPos = voltages[root(el.nodePos)] ?? 0
        const vNeg = voltages[root(el.nodeNeg)] ?? 0
        power[el.id] = -(vPos - vNeg) * el.current
        break
      }
      default:
        break
    }
  }

  return { ok: true, voltages, currents, power }
}
