/**
 * Simbolos esquematicos de componentes.
 *
 * Por que existen: el OE-3 exige que cada componente declare "simbolo, pines
 * tipados, parametros editables y modelo". Un editor de circuitos que dibuja
 * rectangulos con una letra dentro no cumple eso: el simbolo ES la interfaz.
 *
 * Convencion de dibujo (la de la profesion, no inventada):
 * - trazo de 1.5 unidades, sin relleno salvo donde el simbolo lo pide
 * - `currentColor` para que hereden el color del contexto (asi el estado
 *   seleccionado los tinta sin duplicar el SVG)
 * - viewBox 0 0 32 24, apaisado, porque un simbolo esquematico es horizontal
 * - los pines logicos NO se dibujan aqui: los dibuja el lienzo segun la ficha,
 *   para que el simbolo sea independiente de cuantos pines tenga el componente
 *
 * Cada simbolo esta dibujado a mano sobre la rejilla de 2 unidades para que
 * escale nitido a cualquier tamano.
 */

import type { ReactNode } from 'react'

/**
 * Props de un simbolo.
 *
 * Todas son opcionales y admiten `undefined` explicito porque
 * `exactOptionalPropertyTypes` distingue "ausente" de "presente con undefined",
 * y aqui se propagan tal cual desde el contenedor.
 *
 * Cuando el lienzo dibuja el componente pasa `x`/`y`/`width`/`height` para
 * anidar el simbolo en su SVG. Suelto (en la biblioteca) van indefinidos y el
 * simbolo ocupa su contenedor HTML.
 */
export interface SymbolProps {
  className?: string | undefined
  x?: number | undefined
  y?: number | undefined
  width?: number | undefined
  height?: number | undefined
}

/** Alias historico: el lienzo y la biblioteca usan el mismo tipo. */
export type EmbedProps = SymbolProps

/**
 * Envoltorio comun: viewBox apaisado, trazo fino, sin relleno por defecto.
 *
 * Acepta `x`, `y`, `width` y `height` para poder anidarse dentro del SVG del
 * lienzo. Un `<svg>` anidado es valido en SVG 2 y evita duplicar cada simbolo
 * en dos variantes (suelto y embebido).
 */
function Frame({
  children,
  className,
  x,
  y,
  width,
  height,
}: SymbolProps & { children: ReactNode }) {
  const embedded = x !== undefined || y !== undefined
  return (
    <svg
      viewBox="0 0 32 24"
      className={className}
      // Solo se emiten las coordenadas cuando el simbolo vive dentro de otro SVG
      {...(embedded ? { x, y, width, height } : {})}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Resistencia: zigzag sobre el eje horizontal. */
function Resistor({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h4l2-5 3 10 3-10 3 10 3-10 2 5h4" />
    </Frame>
  )
}

/** Capacitor: dos placas paralelas. */
function Capacitor({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h11M19 12h11" />
      <path d="M13 5v14M19 5v14" />
    </Frame>
  )
}

/** Inductor: serie de arcos. */
function Inductor({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h3" />
      <path d="M5 12a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0" />
      <path d="M25 12h5" />
    </Frame>
  )
}

/** Potenciometro: resistencia con flecha de toma. */
function Potentiometer({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h4l2-4 3 8 3-8 3 8 3-8 2 4h4" />
      <path d="M16 2v4" />
      <path d="m13.5 4.5 2.5 2.5 2.5-2.5" />
    </Frame>
  )
}

/** LED: triangulo, barra de catodo y dos flechas de emision. */
function Led({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h8" />
      <path d="M10 5v14l9-7-9-7Z" />
      <path d="M19 5v14" />
      <path d="M19 12h11" />
      <path d="M23 4l3-2M26 6l3-2" />
    </Frame>
  )
}

/** Diodo: triangulo y barra, sin flechas. */
function Diode({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h8" />
      <path d="M10 5v14l9-7-9-7Z" />
      <path d="M19 5v14" />
      <path d="M19 12h11" />
    </Frame>
  )
}

/**
 * Transistor NPN: circulo, base vertical, colector y emisor con flecha.
 * La flecha apunta hacia FUERA del transistor en NPN — es lo que lo distingue
 * del PNP y lo que un estudiante mira para no equivocarse.
 */
function BjtNpn({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <circle cx="16" cy="12" r="9" />
      <path d="M2 12h7" />
      <path d="M9 6v12" />
      <path d="m9 9 7-5M9 15l7 5" />
      <path d="m13 11 3-2 .5 3.5" />
    </Frame>
  )
}

/** Fuente DC: circulo con polaridad marcada. */
function DcSource({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <circle cx="16" cy="12" r="9" />
      <path d="M12 12h8M16 8v8" />
      <path d="M25 12h5" />
      <path d="M2 12h5" />
    </Frame>
  )
}

/** Tierra: tres barras decrecientes. */
function Ground({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M16 2v7" />
      <path d="M6 9h20M9 14h14M12 19h8" />
    </Frame>
  )
}

/** Bateria: placas larga y corta, con el signo de la positiva. */
function Battery({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M2 12h10M20 12h10" />
      <path d="M12 5v14M20 8v8" />
      <path d="M14 6h3M15.5 4.5v3" />
    </Frame>
  )
}

/** Microcontrolador: cuerpo con pines a ambos lados y muesca de orientacion. */
function Microcontroller({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="8" y="4" width="16" height="16" rx="2" />
      <path d="M12 4V2M16 4V2M20 4V2M12 20v2M16 20v2M20 20v2" />
      <path d="M8 8H6M8 12H6M8 16H6M24 8h2M24 12h2M24 16h2" />
      <circle cx="12" cy="8" r="1" />
    </Frame>
  )
}

/** Sensor de luz: resistencia con flechas entrantes. */
function LightSensor({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M8 12h4l2-4 3 8 3-8 2 4h4" />
      <path d="M4 4l4 4M9 3l3 4" />
    </Frame>
  )
}

/** Sensor de distancia: dos transductores enfrentados. */
function Ultrasonic({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="4" y="5" width="24" height="14" rx="2" />
      <circle cx="11" cy="12" r="3" />
      <circle cx="21" cy="12" r="3" />
    </Frame>
  )
}

/** Motor DC: circulo con la letra M. */
function Motor({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <circle cx="16" cy="12" r="9" />
      <path d="M12 15V9l4 4 4-4v6" />
    </Frame>
  )
}

/** Servomotor: cuerpo con eje y conexion de control. */
function Servo({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="6" y="6" width="18" height="12" rx="2" />
      <circle cx="15" cy="12" r="2" />
      <path d="M15 10V6M24 12h6" />
      <path d="M2 12h4" />
    </Frame>
  )
}

/** Zumbador: semicirculo con ondas. */
function Buzzer({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <path d="M10 18a8 8 0 0 1 0-12Z" />
      <path d="M10 12H2" />
      <path d="M22 8a5 5 0 0 1 0 8M26 5a9 9 0 0 1 0 14" />
    </Frame>
  )
}

/** ESC: controlador con bateria, tierra y senal. */
function Esc({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="8" y="5" width="16" height="14" rx="2" />
      <path d="M2 9h6M2 15h6" />
      <path d="M24 12h6" />
      <path d="M13 10h6M13 14h6" />
    </Frame>
  )
}

/** Pantalla: display con marco. */
function Display({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="3" y="5" width="26" height="14" rx="2" />
      <path d="M7 9h10M7 12h14M7 15h7" />
    </Frame>
  )
}

/** Memoria SPI: chip con pines en ambos lados. */
function MemoryChip({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="9" y="4" width="14" height="16" rx="1.5" />
      <path d="M13 4V2M17 4V2M13 20v2M17 20v2M9 9H7M9 15H7M23 9h2M23 15h2" />
      <circle cx="20" cy="7" r="1" />
    </Frame>
  )
}

/**
 * Mapa de `typeId` a simbolo.
 *
 * El fallback es el simbolo generico: un rectangulo con un rombo, que en
 * notacion esquematica significa "bloque no especificado". Preferible a no
 * dibujar nada, porque un hueco se lee como un error de render.
 */
const SYMBOLS: Record<string, (p: EmbedProps) => ReactNode> = {
  resistor: Resistor,
  capacitor: Capacitor,
  inductor: Inductor,
  potentiometer: Potentiometer,
  led: Led,
  diode: Diode,
  bjt_npn: BjtNpn,
  arduino_uno: Microcontroller,
  esp32: Microcontroller,
  ldr: LightSensor,
  dht22: Microcontroller,
  ultrasonic_hc_sr04: Ultrasonic,
  servo: Servo,
  dc_motor: Motor,
  buzzer: Buzzer,
  esc_30a: Esc,
  dc_source: DcSource,
  gnd_ref: Ground,
  battery_9v: Battery,
  lipo_3s: Battery,
  i2c_oled: Display,
  spi_flash: MemoryChip,
}

/** Simbolo generico para un typeId sin dibujo propio. */
function Generic({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="6" y="5" width="20" height="14" rx="2" />
      <path d="m16 8 3 4-3 4-3-4 3-4Z" />
      <path d="M2 12h4M26 12h4" />
    </Frame>
  )
}

export interface SchematicSymbolProps {
  typeId: string
  className?: string
  /** Coordenadas para anidar el simbolo dentro de otro SVG (el lienzo). */
  x?: number | undefined
  y?: number | undefined
  width?: number | undefined
  height?: number | undefined
}

/**
 * Dibuja el simbolo del componente.
 *
 * @param typeId Clave de la ficha. Un `typeId` desconocido dibuja el simbolo
 *               generico en vez de dejar un hueco.
 *
 * Cuando se pasan `x`/`y`/`width`/`height` el simbolo se anida en el SVG
 * contenedor (el lienzo); sin ellos se dibuja suelto y ocupa el contenedor HTML.
 */
export function SchematicSymbol({ typeId, className, x, y, width, height }: SchematicSymbolProps) {
  // No se llama `Symbol`: sombrearia el global de JS y confunde su origen.
  const Glyph = SYMBOLS[typeId] ?? Generic
  return <Glyph className={className} x={x} y={y} width={width} height={height} />
}

/** `true` si el typeId tiene un simbolo propio (util para tests). */
export function hasSchematicSymbol(typeId: string): boolean {
  return typeId in SYMBOLS
}
