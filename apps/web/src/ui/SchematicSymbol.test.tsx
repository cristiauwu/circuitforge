import { COMPONENT_DEFINITIONS } from '@circuitforge/netlist'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { hasSchematicSymbol, SchematicSymbol } from './SchematicSymbol'

const render = (typeId: string) => renderToStaticMarkup(<SchematicSymbol typeId={typeId} />)

const contactTypes = [
  'switch_spst',
  'switch_spdt',
  'pushbutton',
  'dip_switch_4',
  'reed_switch',
  'rotary_encoder',
  'relay_spdt',
]
const semiconductorTypes = [
  'diode',
  'diode_zener',
  'diode_schottky',
  'bridge_rectifier',
  'bjt_npn',
  'bjt_pnp',
  'mosfet_n',
  'mosfet_p',
  'led',
  'led_rgb',
  'photodiode',
  'optocoupler_pc817',
]

describe('SchematicSymbol catalog coverage', () => {
  it('has an explicit, non-fallback SVG for all 73 registered entries', () => {
    expect(COMPONENT_DEFINITIONS).toHaveLength(73)
    const fallback = render('unknown-component')
    for (const { typeId } of COMPONENT_DEFINITIONS) {
      expect(hasSchematicSymbol(typeId), typeId).toBe(true)
      const markup = render(typeId)
      expect(markup, typeId).toMatch(/^<svg /)
      expect(markup, typeId).toContain('viewBox="0 0 32 24"')
      expect(markup, typeId).toContain('stroke="currentColor"')
      expect(markup, typeId).toContain('stroke-width="1.5"')
      expect(markup, typeId).toContain('aria-hidden="true"')
      expect(markup, typeId).not.toBe(fallback)
      expect(markup, typeId).not.toContain('m16 8 3 4-3 4-3-4 3-4Z')
    }
  })

  it('uses distinct electrical families, not a single generic box with type labels', () => {
    const markup = COMPONENT_DEFINITIONS.map(({ typeId }) => render(typeId))
    expect(new Set(markup).size).toBeGreaterThanOrEqual(60)
    for (const types of [contactTypes, semiconductorTypes]) {
      expect(new Set(types.map(render)).size).toBe(types.length)
    }
  })

  it('shares notation only for appropriate family aliases', () => {
    for (const typeId of ['capacitor_ceramic', 'capacitor_film']) {
      expect(render(typeId)).toBe(render('capacitor'))
    }
    for (const typeId of ['arduino_nano', 'raspberry_pi_pico', 'attiny85']) {
      expect(render(typeId)).toBe(render('arduino_uno'))
    }
    expect(render('lipo_3s')).toBe(render('battery_9v'))
    expect(render('seven_segment')).not.toBe(render('lcd1602'))
    expect(render('lcd1602')).not.toBe(render('i2c_oled'))
  })

  it.each(['unknown-component', '', 'toString', 'constructor', '__proto__'])(
    'reserves the generic fallback for unknown IDs, including %s',
    (typeId) => {
      expect(hasSchematicSymbol(typeId)).toBe(false)
      expect(render(typeId)).toBe(render('unknown-component'))
    },
  )

  it('retains embedding coordinates, class and the existing SVG frame', () => {
    const markup = renderToStaticMarkup(
      <SchematicSymbol
        typeId="relay_spdt"
        className="selected"
        x={4}
        y={6}
        width={64}
        height={48}
      />,
    )
    expect(markup).toContain('class="selected"')
    expect(markup).toContain('x="4" y="6" width="64" height="48"')
    expect(markup).toContain('fill="none"')
    expect(markup).toContain('focusable="false"')
    expect(render('relay_spdt')).not.toContain('width="64"')
  })
})

describe('SchematicSymbol meaningful notation', () => {
  it('draws open contacts, independent DIP poles and a relay coil/contact linkage', () => {
    expect(render('switch_spst')).toContain('m1-1 13-8')
    expect(render('switch_spdt')).toContain('cy="19"')
    expect(render('pushbutton')).toContain('M16 10V4')
    expect(render('dip_switch_4').match(/<path /g)).toHaveLength(4)
    expect(render('relay_spdt')).toContain('M2 4h9v16H2z')
    expect(render('relay_spdt')).toContain('stroke-dasharray="2 2"')
  })

  it('distinguishes cathode shapes, PNP direction and isolated MOS gates', () => {
    expect(render('diode_zener')).toContain('M16 5h3v14h3')
    expect(render('diode_schottky')).toContain('M16 8V5h3v14h3v-3')
    expect(render('bjt_pnp')).toContain('m11 18v-3l4 1')
    expect(render('mosfet_n')).toContain('M9 6v12M13 5v4')
    expect(render('mosfet_n')).toContain('m17 10-3 2 3 2')
    expect(render('mosfet_p')).toContain('m15 10 3 2-3 2')
  })

  it('draws four-terminal RGB, incident light and an optically isolated pair', () => {
    expect(render('led_rgb')).toContain('RGB')
    expect(render('led_rgb').match(/<path /g)).toHaveLength(4)
    expect(render('photodiode')).toContain('M22 2l-5 5')
    expect(render('optocoupler_pc817')).toContain('stroke-dasharray="1 2"')
    expect(render('optocoupler_pc817')).toContain('M22 8v9')
  })

  it.each([
    ['timer_ne555', '555', 'TRIG', 'OUT'],
    ['logic_74hc595', 'S → P', 'SER', 'QA'],
    ['logic_74hc165', 'P → S', 'A–H', 'QH'],
    ['regulator_7805', '7805', 'IN', 'OUT'],
    ['regulator_lm317', '317', 'ADJ', 'OUT'],
    ['buck_lm2596', 'DC ↓ DC', 'IN+', 'OUT+'],
    ['boost_mt3608', 'DC ↑ DC', 'IN+', 'OUT+'],
    ['driver_uln2003', '7 × Q', 'IN1', 'COM'],
    ['driver_l298n', '2 × H', 'EN', 'OUT1'],
  ])('annotates the %s functional block and its representative pins', (typeId, ...labels) => {
    for (const label of labels) expect(render(typeId)).toContain(`>${label}</text>`)
  })

  it('keeps display segments, LCD character rows, keypad matrix and terminal screws distinct', () => {
    expect(render('seven_segment')).toContain('M12 5h7')
    expect(render('seven_segment')).toContain('cx="22" cy="20"')
    expect(render('lcd1602')).toContain('M8 8v2m0 2v2')
    expect(render('keypad_4x4').match(/<rect /g)).toHaveLength(17)
    expect(render('terminal_block_2').match(/<circle /g)).toHaveLength(2)
    expect(render('terminal_block_2')).toContain('M16 3v18')
  })
})
