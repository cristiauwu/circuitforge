/**
 * @circuitforge/solver — Pruebas unitarias para el kernel digital y temporal (RF-2.2).
 */

import { describe, expect, it } from 'vitest'
import {
  computePwmAverageVoltage,
  DigitalKernel,
  evaluateLogicLevel,
  isPwmHighAt,
} from './digital.js'

describe('digital – Niveles lógicos', () => {
  it('evalúa tensiones bajas como LOW', () => {
    expect(evaluateLogicLevel(0.0)).toBe('LOW')
    expect(evaluateLogicLevel(0.7)).toBe('LOW')
  })

  it('evalúa tensiones altas como HIGH', () => {
    expect(evaluateLogicLevel(2.5)).toBe('HIGH')
    expect(evaluateLogicLevel(3.3)).toBe('HIGH')
    expect(evaluateLogicLevel(5.0)).toBe('HIGH')
  })

  it('evalúa la zona intermedia como UNDEFINED', () => {
    expect(evaluateLogicLevel(1.4)).toBe('UNDEFINED')
  })
})

describe('digital – Modulación por ancho de pulsos (PWM)', () => {
  it('calcula la tensión media equivalente proporcional al ciclo de trabajo', () => {
    const pwm50 = { dutyCycle: 0.5, frequencyHz: 490, vHigh: 5.0 }
    expect(computePwmAverageVoltage(pwm50)).toBeCloseTo(2.5, 3)

    const pwm20 = { dutyCycle: 0.2, frequencyHz: 490, vHigh: 5.0 }
    expect(computePwmAverageVoltage(pwm20)).toBeCloseTo(1.0, 3)

    const pwm100 = { dutyCycle: 1.0, frequencyHz: 490, vHigh: 5.0 }
    expect(computePwmAverageVoltage(pwm100)).toBeCloseTo(5.0, 3)
  })

  it('determina el estado instantáneo de la onda en el tiempo', () => {
    const pwm = { dutyCycle: 0.25, frequencyHz: 1000, vHigh: 5.0 }
    // Periodo = 1000 µs; HIGH durante los primeros 250 µs
    expect(isPwmHighAt(pwm, 100)).toBe(true)
    expect(isPwmHighAt(pwm, 249)).toBe(true)
    expect(isPwmHighAt(pwm, 251)).toBe(false)
    expect(isPwmHighAt(pwm, 800)).toBe(false)
    // Siguiente periodo (1000 µs a 2000 µs)
    expect(isPwmHighAt(pwm, 1100)).toBe(true)
  })
})

describe('digital – Kernel de simulación temporal', () => {
  it('gestiona reloj virtual y delay()', () => {
    const kernel = new DigitalKernel()
    expect(kernel.currentTimeMs).toBe(0)

    kernel.delay(100)
    expect(kernel.currentTimeMs).toBe(100)

    kernel.delay(250)
    expect(kernel.currentTimeMs).toBe(350)

    kernel.reset()
    expect(kernel.currentTimeMs).toBe(0)
  })

  it('soporta escritura y lectura digital', () => {
    const kernel = new DigitalKernel()
    kernel.digitalWrite('D13', 'HIGH')
    expect(kernel.digitalRead('D13')).toBe('HIGH')
    expect(kernel.getEquivalentVoltage('D13')).toBe(5.0)

    kernel.digitalWrite('D13', 'LOW')
    expect(kernel.digitalRead('D13')).toBe('LOW')
    expect(kernel.getEquivalentVoltage('D13')).toBe(0.0)
  })

  it('soporta escritura analógica PWM (analogWrite 0-255)', () => {
    const kernel = new DigitalKernel()
    kernel.analogWrite('D9', 128) // ~50% duty
    expect(kernel.getEquivalentVoltage('D9')).toBeCloseTo(2.51, 1)

    kernel.analogWrite('D9', 0)
    expect(kernel.getEquivalentVoltage('D9')).toBe(0.0)

    kernel.analogWrite('D9', 255)
    expect(kernel.getEquivalentVoltage('D9')).toBe(5.0)
  })
})
