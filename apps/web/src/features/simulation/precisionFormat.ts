/**
 * @circuitforge/web — Formato Numérico de Precisión y Auto-rango de Instrumentación (Tarea T-4).
 *
 * Satisface los estándares de instrumentación de laboratorio Keysight / Rohde & Schwarz:
 *  - Auto-rango dinámico de magnitudes eléctricas (nV..kV, pA..A, nW..kW, mΩ..MΩ).
 *  - Longitud determinista de caracteres y formato tabular (evita Layout Shift / CLS = 0.00).
 *  - Cálculo de escalas para barras analógicas (bargraphs) con histéresis y headroom.
 */

export type ElectricalUnit = 'V' | 'A' | 'W' | 'Ω' | 'Hz'

export interface FormattedEngineeringQuantity {
  readonly value: number
  readonly displayValue: string
  readonly unit: string
  readonly fullText: string
  readonly prefix: string
}

export interface BargraphScale {
  readonly min: number
  readonly max: number
  readonly percentage: number // 0 .. 100
  readonly formattedMax: string
}

interface ScalePrefix {
  readonly threshold: number
  readonly factor: number
  readonly prefix: string
}

const VOLTAGE_PREFIXES: readonly ScalePrefix[] = [
  { threshold: 1e3, factor: 1e-3, prefix: 'k' },
  { threshold: 1, factor: 1, prefix: '' },
  { threshold: 1e-3, factor: 1e3, prefix: 'm' },
  { threshold: 1e-6, factor: 1e6, prefix: 'µ' },
  { threshold: 0, factor: 1e9, prefix: 'n' },
]

const CURRENT_PREFIXES: readonly ScalePrefix[] = [
  { threshold: 1, factor: 1, prefix: '' },
  { threshold: 1e-3, factor: 1e3, prefix: 'm' },
  { threshold: 1e-6, factor: 1e6, prefix: 'µ' },
  { threshold: 1e-9, factor: 1e9, prefix: 'n' },
  { threshold: 0, factor: 1e12, prefix: 'p' },
]

const POWER_PREFIXES: readonly ScalePrefix[] = [
  { threshold: 1e3, factor: 1e-3, prefix: 'k' },
  { threshold: 1, factor: 1, prefix: '' },
  { threshold: 1e-3, factor: 1e3, prefix: 'm' },
  { threshold: 1e-6, factor: 1e6, prefix: 'µ' },
  { threshold: 0, factor: 1e9, prefix: 'n' },
]

const RESISTANCE_PREFIXES: readonly ScalePrefix[] = [
  { threshold: 1e6, factor: 1e-6, prefix: 'M' },
  { threshold: 1e3, factor: 1e-3, prefix: 'k' },
  { threshold: 1, factor: 1, prefix: '' },
  { threshold: 0, factor: 1e3, prefix: 'm' },
]

function getPrefixesForUnit(unit: ElectricalUnit): readonly ScalePrefix[] {
  switch (unit) {
    case 'V':
      return VOLTAGE_PREFIXES
    case 'A':
      return CURRENT_PREFIXES
    case 'W':
      return POWER_PREFIXES
    case 'Ω':
      return RESISTANCE_PREFIXES
    case 'Hz':
      return VOLTAGE_PREFIXES
  }
}

function resolveZeroUnit(baseUnit: ElectricalUnit, custom?: string): string {
  if (custom) return custom
  if (baseUnit === 'A') return 'mA'
  if (baseUnit === 'W') return 'mW'
  return baseUnit
}

function selectScalePrefix(abs: number, prefixes: readonly ScalePrefix[]): ScalePrefix {
  const fallback = prefixes[prefixes.length - 1] ?? {
    threshold: 0,
    factor: 1,
    prefix: '',
  }
  for (const p of prefixes) {
    if (abs >= p.threshold) {
      return p
    }
  }
  return fallback
}

/**
 * Formatea un valor escalar con auto-rango de ingeniería SI.
 * Siempre mantiene un número fijo de decimales (2 por defecto) para garantizar 0.00 CLS.
 */
export function formatEngineeringQuantity(
  value: number,
  baseUnit: ElectricalUnit,
  options?: {
    readonly decimals?: number
    readonly defaultZeroUnit?: string
  },
): FormattedEngineeringQuantity {
  const decimals = options?.decimals ?? 2
  const zeroUnit = resolveZeroUnit(baseUnit, options?.defaultZeroUnit)

  if (!Number.isFinite(value) || Number.isNaN(value) || value === 0) {
    const zeroStr = (0).toFixed(decimals)
    return {
      value: 0,
      displayValue: zeroStr,
      unit: zeroUnit,
      fullText: `${zeroStr} ${zeroUnit}`,
      prefix: '',
    }
  }

  const abs = Math.abs(value)
  const prefixes = getPrefixesForUnit(baseUnit)
  const chosen = selectScalePrefix(abs, prefixes)
  const scaled = value * chosen.factor
  const displayValue = scaled.toFixed(decimals)
  const unit = `${chosen.prefix}${baseUnit}`

  return {
    value,
    displayValue,
    unit,
    fullText: `${displayValue} ${unit}`,
    prefix: chosen.prefix,
  }
}

const STANDARD_VOLTAGE_STEPS = [1.8, 3.3, 5.0, 9.0, 12.0, 24.0, 48.0]
const STANDARD_CURRENT_STEPS = [0.02, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0] // Amperes
const STANDARD_POWER_STEPS = [0.05, 0.25, 1.0, 5.0, 15.0, 50.0, 100.0] // Watts

function getStepsForUnit(unit: ElectricalUnit): readonly number[] {
  if (unit === 'V') return STANDARD_VOLTAGE_STEPS
  if (unit === 'A') return STANDARD_CURRENT_STEPS
  if (unit === 'W') return STANDARD_POWER_STEPS
  return STANDARD_VOLTAGE_STEPS
}

/**
 * Calcula el rango óptimo del bargraph analógico con margen dinámico (headroom del 15%).
 */
export function calculateBargraphScale(
  value: number,
  unit: ElectricalUnit,
  customSteps?: readonly number[],
): BargraphScale {
  const abs = Math.abs(Number.isFinite(value) ? value : 0)
  const steps = customSteps ?? getStepsForUnit(unit)
  const defaultMax = steps[steps.length - 1] ?? 1.0
  const targetWithHeadroom = abs * 1.15

  let max = defaultMax
  for (const step of steps) {
    if (step >= targetWithHeadroom) {
      max = step
      break
    }
  }

  // Si sobrepasa el último escalón, redondea hacia arriba en potencia de 10
  if (targetWithHeadroom > max) {
    max = 10 ** Math.ceil(Math.log10(targetWithHeadroom))
  }

  const percentage = Math.min(100, Math.max(0, (abs / max) * 100))
  const formattedMax = formatEngineeringQuantity(max, unit, { decimals: 1 }).fullText

  return {
    min: 0,
    max,
    percentage: Math.round(percentage * 10) / 10,
    formattedMax,
  }
}
