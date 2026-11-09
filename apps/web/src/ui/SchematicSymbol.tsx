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
function Breadboard({ className, x, y, width, height }: EmbedProps) {
  return (
    <Frame className={className} x={x} y={y} width={width} height={height}>
      <rect x="2" y="3" width="28" height="18" rx="2" />
      <path d="M4 12h24M7 7v2m6-2v2m6-2v2m6-2v2M7 15v2m6-2v2m6-2v2m6-2v2" />
    </Frame>
  )
}

/** Familias compartidas solo cuando la notacion electrica es la misma. */
function Thermistor(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 12h6M24 12h6M8 8h16v8H8zM10 20 22 4h4" />
      <text x="3" y="6" stroke="none" fill="currentColor" fontSize="4">
        −t°
      </text>
    </Frame>
  )
}

function Varistor(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 12h6M24 12h6M8 8h16v8H8zM10 20 22 4h4" />
      <text x="3" y="6" stroke="none" fill="currentColor" fontSize="4">
        U
      </text>
    </Frame>
  )
}

function Fuse(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 12h28M8 8h16v8H8z" />
    </Frame>
  )
}

function Crystal(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 12h7M9 6v12M12 5h8v14h-8zM23 6v12M23 12h7" />
    </Frame>
  )
}

function Transformer(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M3 3h5M3 21h5M24 3h5M24 21h5M14 3v18M18 3v18" />
      <path d="M8 3a3 3 0 0 1 0 6 3 3 0 0 1 0 6 3 3 0 0 1 0 6M24 3a3 3 0 0 0 0 6 3 3 0 0 0 0 6 3 3 0 0 0 0 6" />
    </Frame>
  )
}

function SwitchSpst(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 15h7m1-1 13-8M24 15h6" />
      <circle cx="9" cy="15" r="1" />
      <circle cx="24" cy="15" r="1" />
    </Frame>
  )
}

function SwitchSpdt(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 12h7m1 0 12-6M24 5h6M24 19h6" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="24" cy="5" r="1" />
      <circle cx="24" cy="19" r="1" />
    </Frame>
  )
}

function Pushbutton(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 15h7M23 15h7M9 10h14M16 10V4M12 4h8" />
      <circle cx="9" cy="15" r="1" />
      <circle cx="23" cy="15" r="1" />
    </Frame>
  )
}

function DipSwitch(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="4" y="3" width="24" height="18" rx="1" />
      {[7, 13, 19, 25].map((cx) => (
        <path key={cx} d={`M${cx} 1v6m0 10v6m0-14-2 6`} />
      ))}
    </Frame>
  )
}

function ReedSwitch(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="5" y="7" width="22" height="10" rx="5" />
      <path d="M2 12h10l8-3M21 12h9M12 3h8m-8 18h8" />
    </Frame>
  )
}

function Encoder(props: EmbedProps) {
  return (
    <Frame {...props}>
      <circle cx="13" cy="12" r="8" />
      <circle cx="13" cy="12" r="2" />
      <path d="m8 3 2-2 3 1M6 8l4-3M21 8h9M21 16h9M13 20v3" />
      <text x="25" y="6" stroke="none" fill="currentColor" fontSize="3">
        A
      </text>
      <text x="25" y="14" stroke="none" fill="currentColor" fontSize="3">
        B
      </text>
    </Frame>
  )
}

function Relay(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 4h9v16H2zM6 1v3M6 20v3M4 16l5-8M16 14h3l7-8M27 4h3M27 20h3" />
      <path d="M11 12h8" strokeDasharray="2 2" />
      <circle cx="27" cy="4" r="1" />
      <circle cx="27" cy="20" r="1" />
    </Frame>
  )
}

/** La barra doblada identifica Zener; la doble rodilla identifica Schottky. */
function DiodeVariant({ cathode, ...props }: EmbedProps & { cathode: string }) {
  return (
    <Frame {...props}>
      <path d="M2 12h8M10 5v14l9-7-9-7ZM19 12h11" />
      <path d={cathode} />
    </Frame>
  )
}
const Zener = (props: EmbedProps) => <DiodeVariant {...props} cathode="M16 5h3v14h3" />
const Schottky = (props: EmbedProps) => <DiodeVariant {...props} cathode="M16 8V5h3v14h3v-3" />

function BridgeRectifier(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="m16 3 10 9-10 9L6 12 16 3ZM16 1v2M16 21v2M1 12h5M26 12h5" />
      <path
        d="m10 9 3-3v4l-3-1Zm3-3 2 2m5 0 3 3h-4l1-3Zm3 3-2 2m-1 4-3 3v-4l3 1Zm-3 3-2-2m-5 0-3-3h4l-1 3Zm-3-3 2-2"
        strokeWidth="1"
      />
      <text x="19" y="4" stroke="none" fill="currentColor" fontSize="4">
        +
      </text>
      <text x="19" y="24" stroke="none" fill="currentColor" fontSize="4">
        −
      </text>
    </Frame>
  )
}

function BjtPnp(props: EmbedProps) {
  return (
    <Frame {...props}>
      <circle cx="16" cy="12" r="9" />
      <path d="M2 12h7M9 6v12m0-9 7-5M9 15l7 5M16 4h5V1M16 20h5v3" />
      <path d="m11 18v-3l4 1" />
    </Frame>
  )
}

function Mosfet({ channel, ...props }: EmbedProps & { channel: 'n' | 'p' }) {
  return (
    <Frame {...props}>
      <path d="M2 12h7M9 6v12M13 5v4m0 2v2m0 2v4M13 7h10V2M13 17h10v5M23 17v-5h-7" />
      <path d={channel === 'n' ? 'm17 10-3 2 3 2' : 'm15 10 3 2-3 2'} />
    </Frame>
  )
}
const MosfetN = (props: EmbedProps) => <Mosfet {...props} channel="n" />
const MosfetP = (props: EmbedProps) => <Mosfet {...props} channel="p" />

function RgbLed(props: EmbedProps) {
  return (
    <Frame {...props}>
      {[7, 15, 23].map((cx) => (
        <path key={cx} d={`M${cx} 22v-6m-3-7h6l-3 5-3-5Zm0 5h6m-3 0v2m0-7V6`} />
      ))}
      <path d="M7 6h16M15 6V2m10 4 4-3m-2 6 4-3" />
      <text x="4" y="5" stroke="none" fill="currentColor" fontSize="3">
        RGB
      </text>
    </Frame>
  )
}

function Photodiode(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 15h8M10 9v12l9-6-9-6ZM19 9v12M19 15h11M22 2l-5 5m0-3v3h3M28 3l-5 5m0-3v3h3" />
    </Frame>
  )
}

function Optocoupler(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="4" y="2" width="24" height="20" rx="1" />
      <path
        d="M1 6h7v3m-3 0h6l-3 5-3-5Zm0 5h6M8 14v4H1M22 8v9m0-7 5-4h4m-9 9 5 3h4m-6-2 2 2-3 1M12 8l6 3m-2-3 2 3h-3M12 13l6 3m-2-3 2 3h-3"
        strokeWidth="1"
      />
      <path d="M19 4v16" strokeDasharray="1 2" strokeWidth="0.75" />
    </Frame>
  )
}

/** Bloques funcionales, no modelos de simulacion ni pinouts a escala.
 * Los nombres de terminales representativos hacen explicita la funcion; los
 * terminales completos del componente siguen perteneciendo al registro/lienzo.
 */
interface BlockDefinition {
  label: string
  left: readonly string[]
  right: readonly string[]
  detail?: ReactNode
}
function functionalBlock(
  label: string,
  left: readonly string[],
  right: readonly string[],
  detail?: ReactNode,
): BlockDefinition {
  return { label, left, right, detail }
}
function FunctionalBlock({ label, left, right, detail, ...props }: EmbedProps & BlockDefinition) {
  return (
    <Frame {...props}>
      <rect x="5" y="2" width="22" height="20" rx="1" />
      <path d="M14 2a2 2 0 0 0 4 0" strokeWidth="1" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        stroke="none"
        fill="currentColor"
        fontSize="3"
        fontFamily="sans-serif"
      >
        {label}
      </text>
      {left.map((pin, index) => (
        <g key={pin}>
          <path d={`M1 ${6 + index * 6}h4`} />
          <text
            x="6"
            y={7 + index * 6}
            stroke="none"
            fill="currentColor"
            fontSize="2.3"
            fontFamily="sans-serif"
          >
            {pin}
          </text>
        </g>
      ))}
      {right.map((pin, index) => (
        <g key={pin}>
          <path d={`M27 ${6 + index * 6}h4`} />
          <text
            x="26"
            y={7 + index * 6}
            textAnchor="end"
            stroke="none"
            fill="currentColor"
            fontSize="2.3"
            fontFamily="sans-serif"
          >
            {pin}
          </text>
        </g>
      ))}
      {detail}
    </Frame>
  )
}
const Timer = functionalBlock('555', ['TRIG', 'THR', 'RST'], ['VCC', 'OUT', 'DIS'])
const ShiftOut = functionalBlock('S → P', ['SER', 'CLK', 'LAT'], ['VCC', 'QA', 'QH'])
const ShiftIn = functionalBlock('P → S', ['A–H', 'CLK', 'LD'], ['VCC', 'QH', 'GND'])
const Regulator = functionalBlock('7805', ['IN'], ['OUT', 'GND'])
const AdjustableRegulator = functionalBlock('317', ['IN'], ['OUT', 'ADJ'])
const Buck = functionalBlock('DC ↓ DC', ['IN+', 'IN−'], ['OUT+', 'OUT−'])
const Boost = functionalBlock('DC ↑ DC', ['IN+', 'IN−'], ['OUT+', 'OUT−'])
const DarlingtonDriver = functionalBlock('7 × Q', ['IN1', 'IN7', 'GND'], ['OUT1', 'OUT7', 'COM'])
const HBridgeDriver = functionalBlock('2 × H', ['IN', 'EN', 'VCC'], ['OUT1', 'OUT4', 'GND'])

function Amplifier({ comparator, ...props }: EmbedProps & { comparator: boolean }) {
  return (
    <Frame {...props}>
      <path d="M8 3v18l17-9L8 3ZM2 7h6M2 17h6M25 12h5M15 7V1M15 17v6M10 7h3M10 16h3m-1.5-1.5v3" />
      {comparator && <path d="M22 11v3h3m-3 0v4" />}
    </Frame>
  )
}
const OpAmp = (props: EmbedProps) => <Amplifier {...props} comparator={false} />
const Comparator = (props: EmbedProps) => <Amplifier {...props} comparator />

function Nand(props: EmbedProps) {
  return (
    <Frame {...props}>
      <path d="M2 8h7M2 16h7M9 4v16h6a8 8 0 0 0 0-16H9ZM27 12h3" />
      <circle cx="25" cy="12" r="2" />
      <text x="11" y="14" stroke="none" fill="currentColor" fontSize="5">
        &amp;
      </text>
    </Frame>
  )
}

function temperatureSensor(output: string) {
  return functionalBlock(
    output,
    ['VCC', 'GND'],
    ['OUT'],
    <g strokeWidth="1">
      <path d="M16 5a1 1 0 0 1 2 0v10a3 3 0 1 1-2 0V5ZM17 10v8" />
    </g>,
  )
}
const DigitalThermometer = temperatureSensor('1-W')
const AnalogThermometer = temperatureSensor('°C')
const PressureSensor = functionalBlock(
  'P / T',
  ['VCC', 'GND'],
  ['SDA', 'SCL'],
  <path d="M12 17h8m-4-2v5m-2-2 2 2 2-2" strokeWidth="1" />,
)
const InertialSensor = functionalBlock(
  '6 AXIS',
  ['VCC', 'GND'],
  ['SDA', 'SCL'],
  <path d="M14 16v4h6m-6 0 4-4" strokeWidth="1" />,
)
const PirSensor = functionalBlock(
  'PIR',
  ['VCC', 'GND'],
  ['OUT'],
  <path d="M12 17q4-4 8 0m-10 3q6-7 12 0" strokeWidth="1" />,
)
const HallSensor = functionalBlock(
  'HALL',
  ['VCC', 'GND'],
  ['OUT'],
  <path d="M12 16v3h8v-3m-6 0v1h4v-1" strokeWidth="1" />,
)
const IrSensor = functionalBlock(
  'IR',
  ['VCC', 'GND'],
  ['OUT'],
  <path d="m11 17 4 2m-1-2 1 2h-2m4-4 4 2m-1-2 1 2h-2" strokeWidth="1" />,
)

function Stepper(props: EmbedProps) {
  return (
    <Frame {...props}>
      <circle cx="16" cy="12" r="8" />
      <path d="M1 8h7M1 16h7M24 8h7M24 16h7M16 20v3M12 14v-4l4 3 4-3v4M12 6h3v2h3V6h2" />
    </Frame>
  )
}

function TerminalBlock(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="5" y="3" width="22" height="18" rx="1" />
      <path d="M16 3v18M1 12h4M27 12h4M8 14l5-5M19 14l5-5" />
      <circle cx="10.5" cy="11.5" r="4" />
      <circle cx="21.5" cy="11.5" r="4" />
    </Frame>
  )
}

function SevenSegment(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="7" y="1" width="18" height="22" rx="1" />
      <path d="M12 5h7M11 7v3m0 4v3M12 19h7M21 7v3m0 4v3M12 12h7" />
      <circle cx="22" cy="20" r="0.75" fill="currentColor" stroke="none" />
      <path d="M2 6h5M2 12h5M2 18h5M25 6h5M25 12h5M25 18h5" />
    </Frame>
  )
}

function Lcd(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="2" y="3" width="28" height="16" rx="1" />
      <path d="M5 6h22v10H5zM5 19v3m4-3v3m4-3v3m4-3v3m4-3v3m4-3v3" />
      {[8, 12, 16, 20, 24].map((cx) => (
        <path key={cx} d={`M${cx} 8v2m0 2v2`} />
      ))}
    </Frame>
  )
}

function Keypad(props: EmbedProps) {
  return (
    <Frame {...props}>
      <rect x="5" y="1" width="22" height="22" rx="1" />
      {[5, 10, 15, 20].flatMap((cy) =>
        [9, 14, 19, 24].map((cx) => (
          <rect key={`${cx}-${cy}`} x={cx - 1} y={cy - 1} width="2" height="2" strokeWidth="1" />
        )),
      )}
      <path d="M1 6h4M1 10h4M1 14h4M1 18h4M27 6h4M27 10h4M27 14h4M27 18h4" />
    </Frame>
  )
}

const SYMBOLS: Record<string, ((p: EmbedProps) => ReactNode) | BlockDefinition> = {
  breadboard: Breadboard,
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
  capacitor_ceramic: Capacitor,
  capacitor_film: Capacitor,
  thermistor_ntc: Thermistor,
  varistor_mov: Varistor,
  fuse: Fuse,
  crystal: Crystal,
  transformer: Transformer,
  switch_spst: SwitchSpst,
  switch_spdt: SwitchSpdt,
  pushbutton: Pushbutton,
  dip_switch_4: DipSwitch,
  reed_switch: ReedSwitch,
  rotary_encoder: Encoder,
  relay_spdt: Relay,
  diode_zener: Zener,
  diode_schottky: Schottky,
  bridge_rectifier: BridgeRectifier,
  bjt_pnp: BjtPnp,
  mosfet_n: MosfetN,
  mosfet_p: MosfetP,
  led_rgb: RgbLed,
  photodiode: Photodiode,
  optocoupler_pc817: Optocoupler,
  timer_ne555: Timer,
  opamp_lm358: OpAmp,
  comparator_lm393: Comparator,
  logic_74hc595: ShiftOut,
  logic_74hc165: ShiftIn,
  logic_74hc00: Nand,
  regulator_7805: Regulator,
  regulator_lm317: AdjustableRegulator,
  buck_lm2596: Buck,
  boost_mt3608: Boost,
  arduino_nano: Microcontroller,
  raspberry_pi_pico: Microcontroller,
  attiny85: Microcontroller,
  ds18b20: DigitalThermometer,
  lm35: AnalogThermometer,
  bmp280: PressureSensor,
  mpu6050: InertialSensor,
  pir_hcsr501: PirSensor,
  hall_a3144: HallSensor,
  ir_receiver_tsop38238: IrSensor,
  stepper_28byj48: Stepper,
  driver_uln2003: DarlingtonDriver,
  driver_l298n: HBridgeDriver,
  terminal_block_2: TerminalBlock,
  seven_segment: SevenSegment,
  lcd1602: Lcd,
  keypad_4x4: Keypad,
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
  const Glyph = Object.hasOwn(SYMBOLS, typeId) ? (SYMBOLS[typeId] ?? Generic) : Generic
  const props = { className, x, y, width, height }
  return typeof Glyph === 'function' ? (
    <Glyph {...props} />
  ) : (
    <FunctionalBlock {...props} {...Glyph} />
  )
}

/** `true` si el typeId tiene un simbolo propio (util para tests). */
export function hasSchematicSymbol(typeId: string): boolean {
  return Object.hasOwn(SYMBOLS, typeId)
}
