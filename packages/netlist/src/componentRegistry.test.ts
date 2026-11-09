import { describe, expect, it } from 'vitest'
import {
  COMPONENT_DEFINITIONS,
  COMPONENT_INDEX,
  getDefaultParameters,
  validateParameterValue,
} from './componentRegistry.js'

const NEW_IDS = [
  'capacitor_ceramic',
  'capacitor_film',
  'thermistor_ntc',
  'varistor_mov',
  'fuse',
  'crystal',
  'transformer',
  'switch_spst',
  'switch_spdt',
  'pushbutton',
  'dip_switch_4',
  'reed_switch',
  'rotary_encoder',
  'relay_spdt',
  'diode_zener',
  'diode_schottky',
  'bridge_rectifier',
  'bjt_pnp',
  'mosfet_n',
  'mosfet_p',
  'led_rgb',
  'photodiode',
  'optocoupler_pc817',
  'timer_ne555',
  'opamp_lm358',
  'comparator_lm393',
  'logic_74hc595',
  'logic_74hc165',
  'logic_74hc00',
  'regulator_7805',
  'regulator_lm317',
  'buck_lm2596',
  'boost_mt3608',
  'arduino_nano',
  'raspberry_pi_pico',
  'attiny85',
  'ds18b20',
  'lm35',
  'bmp280',
  'mpu6050',
  'pir_hcsr501',
  'hall_a3144',
  'ir_receiver_tsop38238',
  'stepper_28byj48',
  'driver_uln2003',
  'driver_l298n',
  'terminal_block_2',
  'seven_segment',
  'lcd1602',
  'keypad_4x4',
]

const LEGACY_PINS = {
  resistor: ['a', 'b'],
  capacitor: ['a', 'b'],
  inductor: ['a', 'b'],
  potentiometer: ['a', 'wiper', 'b'],
  led: ['anode', 'cathode'],
  diode: ['anode', 'cathode'],
  bjt_npn: ['base', 'collector', 'emitter'],
  arduino_uno: ['5V', 'GND', 'D13', 'D9', 'A0', 'SDA', 'SCL', 'TX', 'RX'],
  esp32: ['3V3', 'GND', 'GPIO2', 'GPIO4', 'GPIO34'],
  ldr: ['a', 'b'],
  dht22: ['VCC', 'GND', 'DATA'],
  ultrasonic_hc_sr04: ['VCC', 'GND', 'TRIG', 'ECHO'],
  servo: ['VCC', 'GND', 'SIG'],
  dc_motor: ['a', 'b'],
  buzzer: ['positive', 'negative'],
  esc_30a: ['BAT', 'GND', 'SIG'],
  dc_source: ['positive', 'negative'],
  gnd_ref: ['gnd'],
  battery_9v: ['positive', 'negative'],
  lipo_3s: ['positive', 'negative'],
  i2c_oled: ['VCC', 'GND', 'SDA', 'SCL'],
  spi_flash: ['VCC', 'GND', 'MOSI', 'MISO', 'SCK'],
}

const pins = (typeId: string) => COMPONENT_INDEX.get(typeId)?.pins.map((pin) => pin.id)

describe('domain component registry', () => {
  it('contains exactly the approved 73 types and 70 electronic components', () => {
    expect(COMPONENT_DEFINITIONS).toHaveLength(73)
    expect(COMPONENT_INDEX.size).toBe(73)
    expect(COMPONENT_DEFINITIONS.filter((definition) => definition.electronic)).toHaveLength(70)
    expect(
      COMPONENT_DEFINITIONS.filter((definition) => !definition.electronic)
        .map((d) => d.typeId)
        .sort(),
    ).toEqual(['breadboard', 'dc_source', 'gnd_ref'])
    expect(COMPONENT_DEFINITIONS.slice(23).map((definition) => definition.typeId)).toEqual(NEW_IDS)
    expect(new Set(COMPONENT_DEFINITIONS.map((definition) => definition.category)).size).toBe(9)
  })

  it('preserves all legacy logical pin identifiers, including reduced subsets and 420 breadboard contacts', () => {
    for (const [typeId, expected] of Object.entries(LEGACY_PINS))
      expect(pins(typeId)).toEqual(expected)
    expect(pins('breadboard')).toHaveLength(420)
    expect(COMPONENT_INDEX.get('dc_motor')?.pins.map((pin) => pin.type)).toEqual(['power', 'gnd'])
    expect(COMPONENT_INDEX.get('spi_flash')?.description).toContain('subconjunto')
    expect(COMPONENT_INDEX.get('arduino_uno')?.description).toContain('Subconjunto')
  })

  it('gives every type unique logical pins, positive footprints and valid independent defaults', () => {
    for (const definition of COMPONENT_DEFINITIONS) {
      expect(definition.name.length).toBeGreaterThan(0)
      expect(definition.description.length).toBeGreaterThan(0)
      expect(definition.referencePrefix.length).toBeGreaterThan(0)
      expect(definition.visualFamily.length).toBeGreaterThan(0)
      expect(definition.footprint.width).toBeGreaterThan(0)
      expect(definition.footprint.depth).toBeGreaterThan(0)
      expect(definition.pins.length).toBeGreaterThan(0)
      expect(new Set(definition.pins.map((pin) => pin.id)).size).toBe(definition.pins.length)
      expect(new Set(definition.parameters.map((parameter) => parameter.key)).size).toBe(
        definition.parameters.length,
      )
      const defaults = getDefaultParameters(definition.typeId)
      for (const [key, value] of Object.entries(defaults)) {
        expect(validateParameterValue(definition.typeId, key, value)).toBe(true)
      }
      expect(getDefaultParameters(definition.typeId)).not.toBe(defaults)
    }
    const defaults = getDefaultParameters('resistor')
    defaults.resistance = 999
    expect(getDefaultParameters('resistor')).toEqual({ resistance: 220 })
  })

  it('provides complete DIP package pin counts and full board header counts', () => {
    for (const [typeId, count] of Object.entries({
      optocoupler_pc817: 4,
      timer_ne555: 8,
      opamp_lm358: 8,
      comparator_lm393: 8,
      logic_74hc595: 16,
      logic_74hc165: 16,
      logic_74hc00: 14,
      attiny85: 8,
      driver_uln2003: 16,
      arduino_nano: 30,
      raspberry_pi_pico: 40,
    }))
      expect(pins(typeId)).toHaveLength(count)
  })

  it('makes new contact, transistor and motor terminals passive instead of power sources', () => {
    for (const typeId of [
      'switch_spst',
      'switch_spdt',
      'pushbutton',
      'dip_switch_4',
      'reed_switch',
      'rotary_encoder',
      'relay_spdt',
      'keypad_4x4',
      'bjt_pnp',
      'mosfet_n',
      'mosfet_p',
      'stepper_28byj48',
      'terminal_block_2',
    ])
      expect(COMPONENT_INDEX.get(typeId)?.pins.every((pin) => pin.type === 'passive')).toBe(true)
    expect(COMPONENT_INDEX.get('battery_9v')?.pins[0]?.powerRole).toBe('output')
    expect(COMPONENT_INDEX.get('dht22')?.pins[0]?.powerRole).toBe('input')
    expect(
      COMPONENT_INDEX.get('timer_ne555')?.pins.find((pin) => pin.id === 'CTRL')?.required,
    ).toBe(false)
  })
})

describe('parameter schema validation', () => {
  it('rejects unknown types and keys, coercion and non-finite numeric values', () => {
    expect(getDefaultParameters('unknown')).toEqual({})
    expect(validateParameterValue('unknown', 'closed', true)).toBe(false)
    expect(validateParameterValue('resistor', 'unknown', 220)).toBe(false)
    for (const value of [undefined, null, '', '220', true, NaN, Infinity, -Infinity, -1]) {
      expect(validateParameterValue('resistor', 'resistance', value)).toBe(false)
    }
    expect(validateParameterValue('resistor', 'resistance', 220.5)).toBe(true)
  })

  it('enforces contact booleans, masks, enum options and bounded numeric values', () => {
    expect(getDefaultParameters('switch_spst')).toEqual({ closed: false })
    expect(getDefaultParameters('relay_spdt')).toEqual({ energized: false })
    expect(validateParameterValue('switch_spst', 'closed', true)).toBe(true)
    expect(validateParameterValue('switch_spst', 'closed', 1)).toBe(false)
    for (const value of [0, 1, 7, 15])
      expect(validateParameterValue('dip_switch_4', 'closedMask', value)).toBe(true)
    for (const value of [-1, 16, 0.5])
      expect(validateParameterValue('dip_switch_4', 'closedMask', value)).toBe(false)
    for (const value of ['throw_a', 'throw_b'])
      expect(validateParameterValue('switch_spdt', 'position', value)).toBe(true)
    expect(validateParameterValue('switch_spdt', 'position', 'unknown')).toBe(false)
    for (const value of ['none', '1', '16'])
      expect(validateParameterValue('keypad_4x4', 'key', value)).toBe(true)
    for (const value of ['0', '17', 1])
      expect(validateParameterValue('keypad_4x4', 'key', value)).toBe(false)
    expect(validateParameterValue('potentiometer', 'position', 1)).toBe(true)
    expect(validateParameterValue('potentiometer', 'position', 1.01)).toBe(false)
  })
})
