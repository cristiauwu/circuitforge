/**
 * @circuitforge/solver — Pruebas unitarias para modelos conductuales (RF-2.3).
 */

import { describe, expect, it } from 'vitest'
import {
  computeLdrResistance,
  computeNtcResistance,
  decodeServoPulse,
  encodeServoAngle,
  modelBatteryUnderLoad,
  readDhtSensor,
} from './behavioral.js'

describe('behavioral – LDR (Light Dependent Resistor)', () => {
  it('en oscuridad entrega una resistencia muy alta (~1 MΩ)', () => {
    const r = computeLdrResistance(0)
    expect(r).toBe(1_000_000)
  })

  it('a 10 lux entrega la resistencia de calibración nominal (10 kΩ)', () => {
    const r = computeLdrResistance(10)
    expect(r).toBeCloseTo(10_000, 0)
  })

  it('a mayor iluminación la resistencia disminuye monotónicamente', () => {
    const rDim = computeLdrResistance(50)
    const rBright = computeLdrResistance(1000)
    const rSun = computeLdrResistance(10_000)

    expect(rDim).toBeLessThan(computeLdrResistance(10))
    expect(rBright).toBeLessThan(rDim)
    expect(rSun).toBeLessThan(rBright)
  })
})

describe('behavioral – Termistor NTC', () => {
  it('a 25 °C entrega exactamente su resistencia nominal de 10 kΩ', () => {
    const r = computeNtcResistance(25)
    expect(r).toBeCloseTo(10_000, 0)
  })

  it('a mayor temperatura la resistencia disminuye (coeficiente negativo)', () => {
    const rCold = computeNtcResistance(0)
    const rRoom = computeNtcResistance(25)
    const rHot = computeNtcResistance(80)

    expect(rCold).toBeGreaterThan(rRoom)
    expect(rHot).toBeLessThan(rRoom)
  })
})

describe('behavioral – Batería con resistencia serie (ESR)', () => {
  it('sin carga la tensión en bornes es idéntica a la nominal', () => {
    const state = modelBatteryUnderLoad(0, {
      nominalVoltage: 9.0,
      esr: 1.5,
    })
    expect(state.terminalVoltage).toBe(9.0)
    expect(state.internalDrop).toBe(0)
    expect(state.internalPowerLoss).toBe(0)
  })

  it('bajo carga de 100 mA produce caída V = I * ESR', () => {
    // 9V, ESR = 2Ω, I = 0.5A -> drop = 1.0V -> V_term = 8.0V
    const state = modelBatteryUnderLoad(0.5, {
      nominalVoltage: 9.0,
      esr: 2.0,
    })
    expect(state.internalDrop).toBeCloseTo(1.0, 3)
    expect(state.terminalVoltage).toBeCloseTo(8.0, 3)
    expect(state.internalPowerLoss).toBeCloseTo(0.5, 3) // P = I² * R = 0.25 * 2 = 0.5 W
  })
})

describe('behavioral – Servomotor (PWM a ángulo)', () => {
  it('mapea correctamente pulsos estándar a 0°, 90° y 180°', () => {
    expect(decodeServoPulse(1000).angleDeg).toBe(0)
    expect(decodeServoPulse(1500).angleDeg).toBe(90)
    expect(decodeServoPulse(2000).angleDeg).toBe(180)
  })

  it('acota valores de pulso fuera de rango a [0°, 180°]', () => {
    expect(decodeServoPulse(800).angleDeg).toBe(0)
    expect(decodeServoPulse(2500).angleDeg).toBe(180)
  })

  it('codifica ángulos a pulsos en microsegundos de forma recíproca', () => {
    expect(encodeServoAngle(0)).toBe(1000)
    expect(encodeServoAngle(90)).toBe(1500)
    expect(encodeServoAngle(180)).toBe(2000)
  })
})

describe('behavioral – Sensor DHT22', () => {
  it('valida lecturas válidas de temperatura y humedad', () => {
    const t = readDhtSensor(24.5, 60.2)
    expect(t.isValid).toBe(true)
    expect(t.temperatureCelsius).toBe(24.5)
    expect(t.humidityPercent).toBe(60.2)
  })

  it('rechaza lecturas fuera del rango operacional', () => {
    const outTemp = readDhtSensor(-50, 50)
    expect(outTemp.isValid).toBe(false)
    expect(outTemp.error).toContain('Temperatura')

    const outHum = readDhtSensor(25, 120)
    expect(outHum.isValid).toBe(false)
    expect(outHum.error).toContain('Humedad')
  })
})
