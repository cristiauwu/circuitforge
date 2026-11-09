/**
 * Tipos del netlist — fuente de verdad del circuito (D-1).
 *
 * El lienzo, los símbolos y los cables son VISTAS derivadas de estas estructuras.
 * Este paquete no depende de React, del DOM ni de ninguna librería: es TypeScript
 * puro para que sea testeable en Node y reutilizable en el Web Worker y el backend.
 *
 * Ver docs/specs/2026-10-25-circuitforge-especificacion.md §5.
 */

/** Tipos de pin del sistema. Lista cerrada — ver Global Constraints del plan. */
export type PinType =
  | 'passive'
  | 'power'
  | 'gnd'
  | 'digital'
  | 'analog'
  | 'pwm'
  | 'i2c_sda'
  | 'i2c_scl'
  | 'spi_mosi'
  | 'spi_miso'
  | 'spi_sck'
  | 'uart_tx'
  | 'uart_rx'

/** Categorías de la biblioteca de componentes (OE-3). */
export type Category =
  | 'passive'
  | 'semiconductor'
  | 'mcu'
  | 'sensor'
  | 'actuator'
  | 'esc'
  | 'source'
  | 'battery'
  | 'connectivity'

/** Rotaciones permitidas, en grados. Solo múltiplos de 90 (RF-1.2). */
export type Rotation = 0 | 90 | 180 | 270

/** Valor de un parámetro editable de un componente. */
export type ParamValue = number | string | boolean

/** Posición y orientación de un componente en el lienzo. */
export interface Position {
  x: number
  y: number
  rotation: Rotation
}

/**
 * Referencia a un pin concreto de un componente.
 *
 * `netId` es `null` cuando el pin no está conectado. Invariante fundamental:
 * un pin pertenece a **como máximo un net**.
 */
export interface PinRef {
  pinId: string
  type: PinType
  netId: string | null
}

/** Un componente colocado en el circuito. */
export interface Component {
  /** Identificador legible: "R1", "D1", "U1". */
  id: string
  /** Clave en la biblioteca: "resistor", "led", "arduino_uno". */
  typeId: string
  position: Position
  /** Optional world-space vertical offset; retained when detaching from a board. */
  elevation?: number
  params: Record<string, ParamValue>
  /** Derivados de la ficha del tipo en la biblioteca. */
  pins: PinRef[]
}

/** Extremo de una conexión: un pin identificado por componente + pin. */
export interface PinEndpoint {
  componentId: string
  pinId: string
}

/** A physical user-authored cable; internal breadboard strips are never wires. */
export interface Wire {
  id: string
  from: PinEndpoint
  to: PinEndpoint
}

/**
 * Un nodo eléctrico: todos sus pines comparten un potencial común.
 * Invariante: un pin aparece en como máximo un net.
 */
export interface Net {
  /** Identificador generado: "N1", "N2", … */
  id: string
  pins: PinEndpoint[]
}

/** A complete mechanical attachment, not a collection of user-authored wires. */
export interface MountContact {
  readonly pinId: string
  readonly contactId: string
}

export interface Mount {
  componentId: string
  boardId: string
  anchorContactId: string
  /** Orientation relative to the board, not the world. */
  rotation: Rotation
  contacts: readonly MountContact[]
}

export interface MountedPose extends Position {
  /** World-space vertical offset, unlike the x/y domain coordinates (24 units/world). */
  elevation: number
}

/** Metadatos del proyecto. */
export interface ProjectMetadata {
  createdAt: string
  updatedAt: string
  author: string
}

/** El proyecto completo: lo único que se serializa y persiste. */
export interface Project {
  id: string
  name: string
  schemaVersion: number
  components: Component[]
  nets: Net[]
  /** Missing only for legacy net-only snapshots; [] means no physical cables. */
  wires?: Wire[]
  /** Missing in legacy projects is equivalent to no mechanical attachments. */
  mounts?: Mount[]
  /** Monotone physical cable id counter, persisted across deletions. */
  nextWireSeq?: number
  metadata: ProjectMetadata
  /**
   * Contador monótono para generar ids de net.
   *
   * Se persiste porque el máximo histórico **no** es reconstruible desde el estado
   * actual: al mergear dos nets, el id absorbido desaparece de la estructura y
   * reutilizarlo crearía *aliasing* (una selección de net en la interfaz apuntaría
   * a un net distinto). Este campo garantiza que los ids nunca se reciclen.
   *
   * Es opcional en la lectura por compatibilidad; `createEmptyProject` siempre lo
   * inicializa.
   */
  nextNetSeq?: number
}
