/**
 * Reglas de validación de conexiones (D-4).
 *
 * Deterministas, testeables y explicables. Un LLM puede sugerir después sobre este
 * mismo motor de reglas, pero no puede ser la base: una sugerencia eléctricamente
 * inválida rompería el OE-1. Ver spec §5.2.
 */

import type { PinRef, Project } from '@circuitforge/netlist'

/** Severidad de una violación. `error` bloquea la conexión; `warning` solo avisa. */
export type Severity = 'error' | 'warning'

/** Identificadores de regla. Lista cerrada — ver spec §5.2. */
export type RuleId = 'V-1' | 'V-2' | 'V-3' | 'V-4' | 'V-5' | 'V-6'

/** Una violación detectada en el circuito o en una conexión propuesta. */
export interface Violation {
  rule: RuleId
  severity: Severity
  /** Net afectado, si la regla opera sobre un net. */
  netId?: string
  /** Componente afectado, si la regla opera sobre uno. */
  componentId?: string
  /** Mensaje en español para mostrar en la interfaz (RNF-10). */
  message: string
}

/** Resultado de evaluar si dos pines pueden conectarse (RF-1.4). */
export interface ConnectCheck {
  allowed: boolean
  violation?: Violation
}

/**
 * Contrato mínimo de una ficha de la biblioteca.
 *
 * Se declara aquí —y no importando `ComponentType`— para que `validation` no
 * dependa de `component-library` en runtime. Evita un ciclo de dependencias:
 * `component-library` conoce a `netlist`, y `validation` solo necesita esta forma.
 */
export interface CatalogEntry {
  typeId: string
  category: string
  pins: { id: string; type: string }[]
  /** Tensión máxima admitida por el componente, para V-6. Opcional. */
  maxVoltage?: number
}

/** Catálogo indexado por `typeId`. */
export type Catalog = ReadonlyMap<string, CatalogEntry>

/** Proyecto con tensiones nodales resueltas (salida del solver, para V-6). */
export interface ProjectWithVoltages extends Project {
  netVoltages?: Record<string, number>
}

export type { PinRef, Project }
