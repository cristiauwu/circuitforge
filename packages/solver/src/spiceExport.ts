/**
 * @circuitforge/solver — Exportador de Netlist Canónico SPICE (.cir) (Tarea T-5).
 *
 * Convierte el estado topológico de un Project de CircuitForge a una netlist
 * estándar compatible con Berkeley SPICE3f5, ngspice y Xyce.
 *
 * Invariantes del estándar SPICE:
 *  - El nodo de tierra SIEMPRE es el nodo '0'.
 *  - Nombres de nodos alfanuméricos sin espacios ni caracteres especiales.
 *  - Línea de cabecera con el título del circuito.
 *  - Directiva de punto de operación en continua (.OP).
 *  - Línea final obligatoria (.END).
 */

import type { Component, ComponentDefinition, PinEndpoint, Project } from '@circuitforge/netlist'
import { COMPONENT_INDEX, getInternalContactPairs } from '@circuitforge/netlist'
import { computeLdrResistance, computeNtcResistance } from './behavioral.js'

export interface SpiceExportOptions {
  readonly title?: string
  readonly includeOpCommand?: boolean
  readonly includeModels?: boolean
}

export interface SpiceExportResult {
  readonly netlist: string
  readonly groundNode: string
  readonly nodeMapping: ReadonlyMap<string, string>
  readonly elementCount: number
}

function pinKey(endpoint: PinEndpoint): string {
  return `${endpoint.componentId}::${endpoint.pinId}`
}

function buildPinNetMap(project: Project): Map<string, string> {
  const map = new Map<string, string>()
  let virtualSeq = 0
  for (const net of project.nets) {
    for (const pin of net.pins) {
      map.set(pinKey(pin), net.id)
    }
  }
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

function findGroundNode(project: Project, pinNet: Map<string, string>): string | null {
  for (const comp of project.components) {
    if (comp.typeId === 'gnd_ref') {
      return nodeOf(pinNet, comp.id, 'gnd')
    }
  }
  for (const comp of project.components) {
    if (comp.typeId === 'dc_source' || comp.typeId === 'battery_9v' || comp.typeId === 'lipo_3s') {
      return nodeOf(pinNet, comp.id, 'negative')
    }
  }
  for (const comp of project.components) {
    for (const pin of comp.pins) {
      if (pin.type === 'gnd') {
        return nodeOf(pinNet, comp.id, pin.pinId)
      }
    }
  }
  return null
}

function paramNum(comp: Component, key: string, fallback: number): number {
  const v = comp.params[key]
  return typeof v === 'number' ? v : fallback
}

function sanitizeNode(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_')
}

type NodeLookup = (netId: string) => string

function formatPotentiometer(
  comp: Component,
  def: ComponentDefinition,
  pinNet: Map<string, string>,
  lookup: NodeLookup,
): string[] {
  const compId = sanitizeNode(comp.id)
  const totalR = paramNum(comp, 'resistance', 10)
  const unit = (def.parameters.find((p) => p.key === 'resistance') as { unit?: string } | undefined)
    ?.unit
  const ohms = unit === 'kohm' ? totalR * 1000 : totalR
  const pos = paramNum(comp, 'position', 0.5)
  const rAW = Math.max(1e-3, ohms * pos)
  const rWB = Math.max(1e-3, ohms * (1 - pos))
  const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
  const nW = lookup(nodeOf(pinNet, comp.id, 'wiper'))
  const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
  return [`R_${compId}_AW ${nA} ${nW} ${rAW}`, `R_${compId}_WB ${nW} ${nB} ${rWB}`]
}

function formatResistiveElement(
  comp: Component,
  def: ComponentDefinition,
  pinNet: Map<string, string>,
  lookup: NodeLookup,
): string[] {
  const compId = sanitizeNode(comp.id)

  if (comp.typeId === 'resistor') {
    const r = paramNum(comp, 'resistance', 220)
    const unit = (
      def.parameters.find((p) => p.key === 'resistance') as { unit?: string } | undefined
    )?.unit
    const ohms = unit === 'kohm' ? r * 1000 : r
    const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
    const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
    return [`R_${compId} ${nA} ${nB} ${ohms}`]
  }

  if (comp.typeId === 'thermistor_ntc') {
    const temp = typeof comp.params.temperature === 'number' ? comp.params.temperature : undefined
    const ohms =
      temp !== undefined ? computeNtcResistance(temp) : paramNum(comp, 'resistance', 10) * 1000
    const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
    const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
    return [`R_${compId} ${nA} ${nB} ${ohms}`]
  }

  if (comp.typeId === 'ldr') {
    const lux = typeof comp.params.lux === 'number' ? comp.params.lux : undefined
    const ohms =
      lux !== undefined ? computeLdrResistance(lux) : paramNum(comp, 'resistance', 10_000)
    const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
    const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
    return [`R_${compId} ${nA} ${nB} ${ohms}`]
  }

  if (comp.typeId === 'potentiometer') {
    return formatPotentiometer(comp, def, pinNet, lookup)
  }

  return []
}

function formatSourceElement(
  comp: Component,
  pinNet: Map<string, string>,
  lookup: NodeLookup,
): string[] {
  const compId = sanitizeNode(comp.id)

  if (comp.typeId === 'dc_source') {
    const v = paramNum(comp, 'voltage', 5)
    const nPos = lookup(nodeOf(pinNet, comp.id, 'positive'))
    const nNeg = lookup(nodeOf(pinNet, comp.id, 'negative'))
    return [`V_${compId} ${nPos} ${nNeg} DC ${v}`]
  }

  if (comp.typeId === 'battery_9v' || comp.typeId === 'lipo_3s') {
    const v = paramNum(comp, 'voltage', comp.typeId === 'battery_9v' ? 9 : 11.1)
    const esr = paramNum(comp, 'esr', 0)
    const nPos = lookup(nodeOf(pinNet, comp.id, 'positive'))
    const nNeg = lookup(nodeOf(pinNet, comp.id, 'negative'))
    if (esr > 0) {
      const intNode = `N_${compId}_int`
      return [`V_${compId} ${intNode} ${nNeg} DC ${v}`, `R_${compId}_esr ${intNode} ${nPos} ${esr}`]
    }
    return [`V_${compId} ${nPos} ${nNeg} DC ${v}`]
  }

  return []
}

function formatSemiconductorOrReactive(
  comp: Component,
  def: ComponentDefinition,
  pinNet: Map<string, string>,
  lookup: NodeLookup,
): string[] {
  const compId = sanitizeNode(comp.id)

  if (comp.typeId === 'diode') {
    const nA = lookup(nodeOf(pinNet, comp.id, 'anode'))
    const nK = lookup(nodeOf(pinNet, comp.id, 'cathode'))
    return [`D_${compId} ${nA} ${nK} DMOD_1N4148`]
  }

  if (comp.typeId === 'led') {
    const nA = lookup(nodeOf(pinNet, comp.id, 'anode'))
    const nK = lookup(nodeOf(pinNet, comp.id, 'cathode'))
    return [`D_${compId} ${nA} ${nK} DMOD_LED`]
  }

  if (
    comp.typeId === 'capacitor' ||
    comp.typeId === 'capacitor_ceramic' ||
    comp.typeId === 'capacitor_film'
  ) {
    const cVal = paramNum(comp, 'capacitance', 100)
    const unit = (
      def.parameters.find((p) => p.key === 'capacitance') as { unit?: string } | undefined
    )?.unit
    const farads = unit === 'uf' ? cVal * 1e-6 : unit === 'nf' ? cVal * 1e-9 : cVal * 1e-12
    const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
    const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
    return [`C_${compId} ${nA} ${nB} ${farads}`]
  }

  if (comp.typeId === 'inductor') {
    const lVal = paramNum(comp, 'inductance', 10)
    const unit = (
      def.parameters.find((p) => p.key === 'inductance') as { unit?: string } | undefined
    )?.unit
    const henries = unit === 'mh' ? lVal * 1e-3 : unit === 'uh' ? lVal * 1e-6 : lVal
    const nA = lookup(nodeOf(pinNet, comp.id, 'a'))
    const nB = lookup(nodeOf(pinNet, comp.id, 'b'))
    return [`L_${compId} ${nA} ${nB} ${henries}`]
  }

  return []
}

function buildNodeLookup(
  project: Project,
  pinNet: Map<string, string>,
  groundNode: string,
): { lookup: NodeLookup; nodeMapping: Map<string, string> } {
  const parent = new Map<string, string>()
  const root = (n: string): string => {
    let p = parent.get(n) ?? n
    if (p !== n) {
      p = root(p)
      parent.set(n, p)
    }
    return p
  }

  const union = (a: string, b: string) => {
    const ra = root(a)
    const rb = root(b)
    if (ra !== rb) {
      if (ra === groundNode) parent.set(rb, ra)
      else if (rb === groundNode) parent.set(ra, rb)
      else parent.set(rb, ra)
    }
  }

  for (const comp of project.components) {
    if (
      comp.typeId === 'fuse' ||
      comp.typeId === 'switch_spst' ||
      comp.typeId === 'pushbutton' ||
      comp.typeId === 'reed_switch' ||
      comp.typeId === 'switch_spdt'
    ) {
      const pairs = getInternalContactPairs(comp)
      for (const [pA, pB] of pairs) {
        union(nodeOf(pinNet, comp.id, pA), nodeOf(pinNet, comp.id, pB))
      }
    }
  }

  const gndRoot = root(groundNode)
  const nodeMapping = new Map<string, string>()
  let nodeCounter = 1

  const lookup = (netId: string): string => {
    const r = root(netId)
    if (r === gndRoot) return '0'
    let mapped = nodeMapping.get(r)
    if (!mapped) {
      mapped = sanitizeNode(r.startsWith('N') || r.startsWith('net_') ? r : `N_${nodeCounter++}`)
      nodeMapping.set(r, mapped)
    }
    return mapped
  }

  return { lookup, nodeMapping }
}

/**
 * Genera la netlist canónica .cir desde un proyecto de CircuitForge.
 */
export function exportSpiceNetlist(
  project: Project,
  options?: SpiceExportOptions,
): SpiceExportResult {
  const title = options?.title ?? project.name ?? 'CircuitForge Export'
  const includeOp = options?.includeOpCommand ?? true
  const includeModels = options?.includeModels ?? true

  const pinNet = buildPinNetMap(project)
  const gndCandidate = findGroundNode(project, pinNet)
  const groundNode = gndCandidate ?? '__default_gnd'
  const { lookup: getSpiceNode, nodeMapping } = buildNodeLookup(project, pinNet, groundNode)

  const lines: string[] = [
    `* CircuitForge Canonical SPICE Netlist`,
    `* Title: ${title}`,
    `* Standard: Berkeley SPICE3f5 / ngspice compatible`,
    '',
  ]

  let elementCount = 0

  for (const comp of project.components) {
    const def = COMPONENT_INDEX.get(comp.typeId)
    if (!def) continue

    const resLines = formatResistiveElement(comp, def, pinNet, getSpiceNode)
    const srcLines = formatSourceElement(comp, pinNet, getSpiceNode)
    const semiLines = formatSemiconductorOrReactive(comp, def, pinNet, getSpiceNode)

    const all = [...resLines, ...srcLines, ...semiLines]
    for (const l of all) {
      lines.push(l)
      elementCount++
    }
  }

  if (includeModels) {
    lines.push('')
    lines.push('* ─── Modelos Semiconductores ───')
    lines.push('.MODEL DMOD_1N4148 D (IS=2.52n RS=0.568 N=1.752 CJO=4p)')
    lines.push('.MODEL DMOD_LED D (IS=1e-18 RS=10 N=2.0)')
  }

  if (includeOp) {
    lines.push('')
    lines.push('.OP')
  }

  lines.push('.END')
  lines.push('')

  return {
    netlist: lines.join('\n'),
    groundNode,
    nodeMapping,
    elementCount,
  }
}
