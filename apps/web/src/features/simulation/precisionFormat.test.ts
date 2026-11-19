import { describe, expect, it } from 'vitest'
import { calculateBargraphScale, formatEngineeringQuantity } from './precisionFormat'

describe('Tarea T-4: Precision Instrument Auto-ranging and Formatting', () => {
  it('formatea tensión con auto-rango dinámico (nV .. kV)', () => {
    // 0V
    expect(formatEngineeringQuantity(0, 'V').fullText).toBe('0.00 V')
    // Microvoltios
    expect(formatEngineeringQuantity(45e-6, 'V').fullText).toBe('45.00 µV')
    // Milivoltios
    expect(formatEngineeringQuantity(0.25, 'V').fullText).toBe('250.00 mV')
    // Voltios
    expect(formatEngineeringQuantity(3.3, 'V').fullText).toBe('3.30 V')
    expect(formatEngineeringQuantity(12, 'V').fullText).toBe('12.00 V')
    // Kilovoltios
    expect(formatEngineeringQuantity(1500, 'V').fullText).toBe('1.50 kV')
  })

  it('formatea corriente con auto-rango dinámico (pA .. A)', () => {
    // 0A en reposo se expresa en mA por convención de instrumentación
    expect(formatEngineeringQuantity(0, 'A').fullText).toBe('0.00 mA')
    // Picoamperios y nanoamperios
    expect(formatEngineeringQuantity(800e-12, 'A').fullText).toBe('800.00 pA')
    expect(formatEngineeringQuantity(15e-9, 'A').fullText).toBe('15.00 nA')
    // Microamperios
    expect(formatEngineeringQuantity(450e-6, 'A').fullText).toBe('450.00 µA')
    // Miliamperios
    expect(formatEngineeringQuantity(0.025, 'A').fullText).toBe('25.00 mA')
    // Amperios completos
    expect(formatEngineeringQuantity(2.45, 'A').fullText).toBe('2.45 A')
  })

  it('formatea potencia con auto-rango dinámico (nW .. W .. kW)', () => {
    expect(formatEngineeringQuantity(0, 'W').fullText).toBe('0.00 mW')
    expect(formatEngineeringQuantity(50e-6, 'W').fullText).toBe('50.00 µW')
    expect(formatEngineeringQuantity(0.125, 'W').fullText).toBe('125.00 mW')
    expect(formatEngineeringQuantity(15.5, 'W').fullText).toBe('15.50 W')
  })

  it('garantiza longitud determinista de decimales ante variaciones de 10x (0.00 CLS)', () => {
    // Variaciones sucesivas de 10x no alteran la cantidad de decimales formateados
    const step1 = formatEngineeringQuantity(0.01, 'V')
    const step2 = formatEngineeringQuantity(0.1, 'V')
    const step3 = formatEngineeringQuantity(1.0, 'V')
    const step4 = formatEngineeringQuantity(10.0, 'V')

    expect(step1.displayValue.split('.')[1]?.length).toBe(2)
    expect(step2.displayValue.split('.')[1]?.length).toBe(2)
    expect(step3.displayValue.split('.')[1]?.length).toBe(2)
    expect(step4.displayValue.split('.')[1]?.length).toBe(2)
  })

  it('calcula la escala del bargraph analógico con headroom', () => {
    // 3.3V entra en escala de 5.0V
    const scale3v3 = calculateBargraphScale(3.3, 'V')
    expect(scale3v3.max).toBe(5.0)
    expect(scale3v3.percentage).toBeCloseTo(66.0, 1)
    expect(scale3v3.formattedMax).toBe('5.0 V')

    // 0V resulta en 0%
    const scaleZero = calculateBargraphScale(0, 'V')
    expect(scaleZero.percentage).toBe(0)

    // 20mA (0.02A) sobre escala
    const scaleCurrent = calculateBargraphScale(0.015, 'A')
    expect(scaleCurrent.max).toBe(0.02)
    expect(scaleCurrent.percentage).toBe(75)
  })
})
