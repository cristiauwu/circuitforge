import type { Component } from '@circuitforge/netlist'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ActuatorControlHUD } from './ActuatorControlHUD'

describe('ActuatorControlHUD', () => {
  it('returns null when no component is selected', () => {
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={null} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toBe('')
  })

  it('returns null for non-interactive component', () => {
    const resistor: Component = {
      id: 'R1',
      typeId: 'resistor',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'a', type: 'passive', netId: null },
        { pinId: 'b', type: 'passive', netId: null },
      ],
      params: { resistance: 220 },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={resistor} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toBe('')
  })

  it('renders potentiometer controls with position percentage and derived R_AW / R_WB', () => {
    const pot: Component = {
      id: 'RV1',
      typeId: 'potentiometer',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'a', type: 'passive', netId: null },
        { pinId: 'wiper', type: 'passive', netId: null },
        { pinId: 'b', type: 'passive', netId: null },
      ],
      params: { resistance: 10, position: 0.5 },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={pot} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toContain('RV1')
    expect(html).toContain('potentiometer')
    expect(html).toContain('50%')
    expect(html).toContain('R(A-W)')
    expect(html).toContain('R(W-B)')
    expect(html).toContain('5.00 kΩ')
  })

  it('renders LDR controls with lux level and calculated resistance', () => {
    const ldr: Component = {
      id: 'S1',
      typeId: 'ldr',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'a', type: 'passive', netId: null },
        { pinId: 'b', type: 'passive', netId: null },
      ],
      params: { lux: 100 },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={ldr} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toContain('S1')
    expect(html).toContain('100 lux')
    expect(html).toContain('Resistencia efectiva:')
  })

  it('renders NTC controls with temperature and calculated resistance', () => {
    const ntc: Component = {
      id: 'RT1',
      typeId: 'thermistor_ntc',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'a', type: 'passive', netId: null },
        { pinId: 'b', type: 'passive', netId: null },
      ],
      params: { temperature: 25 },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={ntc} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toContain('RT1')
    expect(html).toContain('25 °C')
    expect(html).toContain('10.00 kΩ')
  })

  it('renders servo controls with angle and PWM pulse in microseconds', () => {
    const servo: Component = {
      id: 'M1',
      typeId: 'servo',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'VCC', type: 'power', netId: null },
        { pinId: 'GND', type: 'gnd', netId: null },
        { pinId: 'SIG', type: 'pwm', netId: null },
      ],
      params: { angle: 90 },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={servo} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toContain('M1')
    expect(html).toContain('90°')
    expect(html).toContain('1500 µs')
  })

  it('renders pushbutton and switch toggle states', () => {
    const button: Component = {
      id: 'SW1',
      typeId: 'pushbutton',
      position: { x: 0, y: 0, rotation: 0 },
      pins: [
        { pinId: 'a', type: 'passive', netId: null },
        { pinId: 'b', type: 'passive', netId: null },
      ],
      params: { pressed: false },
    }
    const html = renderToStaticMarkup(
      <ActuatorControlHUD selectedComponent={button} onUpdateParameter={vi.fn()} />,
    )
    expect(html).toContain('SW1')
    expect(html).toContain('En reposo (Abierto)')
  })
})
