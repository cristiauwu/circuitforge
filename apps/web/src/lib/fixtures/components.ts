/**
 * Fixtures de la biblioteca de componentes.
 *
 * Son datos de mentira, pero **tipados con los tipos reales** de
 * `@circuitforge/netlist`: si el modelo del dominio cambia, el compilador avisa
 * en vez de dejar pasar una ficha obsoleta.
 *
 * Cubren las 9 categorías del OE-3 con al menos una ficha cada una, para que el
 * filtro de la biblioteca tenga algo real que filtrar. Las 60 fichas completas
 * llegan en F6.
 */

import type { Category, PinType } from '@circuitforge/netlist'

export interface CatalogFixture {
  typeId: string
  name: string
  category: Category
  /** Descripción corta: que hace el componente. */
  description: string
  /** Referencia del símbolo esquemático, en notacion de la profesion. */
  symbol: string
  pins: { id: string; type: PinType }[]
  /** Unidad y valor por defecto del parámetro principal, para el inspector. */
  primaryParam?: { name: string; unit: string; value: number }
}

export const CATEGORY_LABELS: Record<Category, string> = {
  passive: 'Pasivos',
  semiconductor: 'Semiconductores',
  mcu: 'Microcontroladores',
  sensor: 'Sensores',
  actuator: 'Actuadores',
  esc: 'ESC',
  source: 'Fuentes',
  battery: 'Baterías',
  connectivity: 'Conectividad',
}

export const CATEGORIES: Category[] = [
  'passive',
  'semiconductor',
  'mcu',
  'sensor',
  'actuator',
  'esc',
  'source',
  'battery',
  'connectivity',
]

export const CATALOG: CatalogFixture[] = [
  // --- Pasivos ---------------------------------------------------------------
  {
    typeId: 'resistor',
    name: 'Resistencia',
    category: 'passive',
    description: 'Limita la corriente en una rama.',
    symbol: 'R',
    primaryParam: { name: 'Resistencia', unit: 'ohm', value: 220 },
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'power' },
    ],
  },
  {
    typeId: 'capacitor',
    name: 'Capacitor',
    category: 'passive',
    description: 'Almacena carga y filtra ruido.',
    symbol: 'C',
    primaryParam: { name: 'Capacitancia', unit: 'uF', value: 100 },
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'gnd' },
    ],
  },
  {
    typeId: 'inductor',
    name: 'Inductor',
    category: 'passive',
    description: 'Almacena energía en un campo magnético.',
    symbol: 'L',
    primaryParam: { name: 'Inductancia', unit: 'mH', value: 10 },
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'power' },
    ],
  },
  {
    typeId: 'potentiometer',
    name: 'Potenciómetro',
    category: 'passive',
    description: 'Resistencia variable de tres terminales.',
    symbol: 'RV',
    primaryParam: { name: 'Resistencia', unit: 'kohm', value: 10 },
    pins: [
      { id: 'a', type: 'power' },
      { id: 'wiper', type: 'analog' },
      { id: 'b', type: 'gnd' },
    ],
  },

  // --- Semiconductores -------------------------------------------------------
  {
    typeId: 'led',
    name: 'LED',
    category: 'semiconductor',
    description: 'Diodo emisor de luz.',
    symbol: 'D',
    pins: [
      { id: 'anode', type: 'power' },
      { id: 'cathode', type: 'gnd' },
    ],
  },
  {
    typeId: 'diode',
    name: 'Diodo',
    category: 'semiconductor',
    description: 'Conduce en un solo sentido.',
    symbol: 'D',
    pins: [
      { id: 'anode', type: 'power' },
      { id: 'cathode', type: 'gnd' },
    ],
  },
  {
    typeId: 'bjt_npn',
    name: 'Transistor NPN',
    category: 'semiconductor',
    description: 'Amplifica o conmuta corriente.',
    symbol: 'Q',
    pins: [
      { id: 'base', type: 'analog' },
      { id: 'collector', type: 'power' },
      { id: 'emitter', type: 'gnd' },
    ],
  },

  // --- Microcontroladores ----------------------------------------------------
  {
    typeId: 'arduino_uno',
    name: 'Arduino UNO',
    category: 'mcu',
    description: 'Placa de desarrollo ATmega328P.',
    symbol: 'U',
    pins: [
      { id: '5V', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'D13', type: 'digital' },
      { id: 'D9', type: 'pwm' },
      { id: 'A0', type: 'analog' },
      { id: 'SDA', type: 'i2c_sda' },
      { id: 'SCL', type: 'i2c_scl' },
      { id: 'TX', type: 'uart_tx' },
      { id: 'RX', type: 'uart_rx' },
    ],
  },
  {
    typeId: 'esp32',
    name: 'ESP32',
    category: 'mcu',
    description: 'Microcontrolador con WiFi y Bluetooth.',
    symbol: 'U',
    pins: [
      { id: '3V3', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'GPIO2', type: 'digital' },
      { id: 'GPIO4', type: 'pwm' },
      { id: 'GPIO34', type: 'analog' },
    ],
  },

  // --- Sensores --------------------------------------------------------------
  {
    typeId: 'ldr',
    name: 'Fotorresistencia',
    category: 'sensor',
    description: 'Resistencia que varía con la luz.',
    symbol: 'R',
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'analog' },
    ],
  },
  {
    typeId: 'dht22',
    name: 'DHT22',
    category: 'sensor',
    description: 'Sensor digital de temperatura y humedad.',
    symbol: 'U',
    pins: [
      { id: 'VCC', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'DATA', type: 'digital' },
    ],
  },
  {
    typeId: 'ultrasonic_hc_sr04',
    name: 'HC-SR04',
    category: 'sensor',
    description: 'Sensor de distancia por ultrasonido.',
    symbol: 'U',
    pins: [
      { id: 'VCC', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'TRIG', type: 'digital' },
      { id: 'ECHO', type: 'digital' },
    ],
  },

  // --- Actuadores ------------------------------------------------------------
  {
    typeId: 'servo',
    name: 'Servomotor',
    category: 'actuator',
    description: 'Motor con ángulo controlado por PWM.',
    symbol: 'M',
    pins: [
      { id: 'VCC', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'SIG', type: 'pwm' },
    ],
  },
  {
    typeId: 'dc_motor',
    name: 'Motor DC',
    category: 'actuator',
    description: 'Motor de giro continuo.',
    symbol: 'M',
    pins: [
      { id: 'a', type: 'power' },
      { id: 'b', type: 'gnd' },
    ],
  },
  {
    typeId: 'buzzer',
    name: 'Zumbador',
    category: 'actuator',
    description: 'Emite tono cuando recibe señal.',
    symbol: 'BZ',
    pins: [
      { id: 'positive', type: 'power' },
      { id: 'negative', type: 'gnd' },
    ],
  },

  // --- ESC -------------------------------------------------------------------
  {
    typeId: 'esc_30a',
    name: 'ESC 30A',
    category: 'esc',
    description: 'Controlador de velocidad para motor brushless.',
    symbol: 'ESC',
    pins: [
      { id: 'BAT', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'SIG', type: 'pwm' },
    ],
  },

  // --- Fuentes ---------------------------------------------------------------
  {
    typeId: 'dc_source',
    name: 'Fuente DC',
    category: 'source',
    description: 'Fuente de tensión continua ajustable.',
    symbol: 'V',
    primaryParam: { name: 'Tensión', unit: 'V', value: 5 },
    pins: [
      { id: 'positive', type: 'power' },
      { id: 'negative', type: 'gnd' },
    ],
  },
  {
    typeId: 'gnd_ref',
    name: 'Tierra',
    category: 'source',
    description: 'Referencia de 0 V del circuito.',
    symbol: 'GND',
    pins: [{ id: 'gnd', type: 'gnd' }],
  },

  // --- Baterías --------------------------------------------------------------
  {
    typeId: 'battery_9v',
    name: 'Batería 9V',
    category: 'battery',
    description: 'Batería rectangular de 9 voltios.',
    symbol: 'BT',
    primaryParam: { name: 'Tensión', unit: 'V', value: 9 },
    pins: [
      { id: 'positive', type: 'power' },
      { id: 'negative', type: 'gnd' },
    ],
  },
  {
    typeId: 'lipo_3s',
    name: 'LiPo 3S',
    category: 'battery',
    description: 'Batería de polímero de litio, 11.1 V nominales.',
    symbol: 'BT',
    primaryParam: { name: 'Tensión', unit: 'V', value: 11.1 },
    pins: [
      { id: 'positive', type: 'power' },
      { id: 'negative', type: 'gnd' },
    ],
  },

  // --- Conectividad ----------------------------------------------------------
  {
    typeId: 'i2c_oled',
    name: 'Pantalla OLED I2C',
    category: 'connectivity',
    description: 'Display de 128x64 por bus I2C.',
    symbol: 'DS',
    pins: [
      { id: 'VCC', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'SDA', type: 'i2c_sda' },
      { id: 'SCL', type: 'i2c_scl' },
    ],
  },
  {
    typeId: 'spi_flash',
    name: 'Memoria SPI',
    category: 'connectivity',
    description: 'Memoria flash por bus SPI.',
    symbol: 'U',
    pins: [
      { id: 'VCC', type: 'power' },
      { id: 'GND', type: 'gnd' },
      { id: 'MOSI', type: 'spi_mosi' },
      { id: 'MISO', type: 'spi_miso' },
      { id: 'SCK', type: 'spi_sck' },
    ],
  },
]

/** Indice por typeId, para busquedas O(1) desde el inspector. */
export const CATALOG_INDEX = new Map(CATALOG.map((c) => [c.typeId, c]))

/** Fichas de una categoría. */
export function byCategory(category: Category | 'all'): CatalogFixture[] {
  return category === 'all' ? CATALOG : CATALOG.filter((c) => c.category === category)
}

/** Búsqueda por nombre o typeId, insensible a mayusculas y acentos. */
export function searchCatalog(query: string): CatalogFixture[] {
  const q = normalize(query)
  if (!q) return CATALOG
  return CATALOG.filter((c) => normalize(c.name).includes(q) || normalize(c.typeId).includes(q))
}

/** Quita acentos y baja a minusculas, para que "batería" encuentre "Batería". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
