/**
 * @circuitforge/solver — Modelos conductuales para sensores, actuadores y energía (RF-2.3).
 *
 * Implementa las relaciones físicas y paramétricas de:
 *   - LDR: resistencia variable dependiente del nivel de iluminación (lux).
 *   - Termistor NTC: ecuación de Steinhart-Hart / parámetro B para temperatura.
 *   - Batería: tensión en bornes dependiente de corriente de carga y resistencia serie (ESR).
 *   - DHT22: encapsulación y verificación de telemetría de temperatura y humedad.
 *   - Servomotor: decodificación de pulso PWM a ángulo físico (0° - 180°).
 */

// ─── LDR (Light Dependent Resistor) ───────────────────────────────────

export interface LdrModelOptions {
  /** Resistencia de referencia a 10 lux (por defecto 10,000 Ω). */
  r10?: number
  /** Coeficiente gamma de sensibilidad lumínica (típico 0.7). */
  gamma?: number
}

/**
 * Calcula la resistencia de una fotorresistencia LDR para un nivel de iluminancia dado.
 *
 * Fórmula: R(lux) = R_10 * (10 / max(lux, 0.01))^gamma
 *
 * @param lux Nivel de luz en lux (≥ 0).
 * @param options Parámetros característicos del componente.
 * @returns Resistencia en ohmios (Ω).
 */
export function computeLdrResistance(lux: number, options: LdrModelOptions = {}): number {
  const r10 = options.r10 ?? 10_000
  const gamma = options.gamma ?? 0.7

  if (lux <= 0) return 1_000_000 // En oscuridad casi total ~ 1 MΩ

  const effectiveLux = Math.max(0.01, lux)
  const r = r10 * Math.pow(10 / effectiveLux, gamma)

  // Acotar entre resistencia mínima de saturación y resistencia en oscuridad
  return Math.max(10, Math.min(1_000_000, r))
}

// ─── Termistor NTC (Negative Temperature Coefficient) ─────────────────

export interface NtcModelOptions {
  /** Resistencia nominal a 25 °C (por defecto 10,000 Ω). */
  r25?: number
  /** Coeficiente Beta (K) (por defecto 3950 K). */
  beta?: number
}

/**
 * Calcula la resistencia de un termistor NTC para una temperatura en grados Celsius.
 *
 * Fórmula: R(T) = R_25 * exp(B * (1/(T + 273.15) - 1/298.15))
 *
 * @param tempCelsius Temperatura en °C.
 * @param options Parámetros del modelo.
 * @returns Resistencia en ohmios (Ω).
 */
export function computeNtcResistance(tempCelsius: number, options: NtcModelOptions = {}): number {
  const r25 = options.r25 ?? 10_000
  const beta = options.beta ?? 3950
  const tKelvin = tempCelsius + 273.15
  const t0 = 298.15 // 25 °C en Kelvin

  if (tKelvin <= 0) return 10_000_000

  return r25 * Math.exp(beta * (1 / tKelvin - 1 / t0))
}

// ─── Batería con Resistencia Serie Equivalente (ESR) ───────────────────

export interface BatteryModelOptions {
  /** Tensión de circuito abierto (V). */
  nominalVoltage: number
  /** Resistencia interna / serie equivalente (ESR) en ohmios (Ω). */
  esr: number
  /** Capacidad nominal en mAh (opcional). */
  capacityMah?: number
}

export interface BatteryTerminalState {
  /** Tensión en bornes bajo carga: V_term = V_nom - I_load * ESR */
  terminalVoltage: number
  /** Caída de tensión interna en la ESR */
  internalDrop: number
  /** Potencia disipada internamente en la batería (W) */
  internalPowerLoss: number
}

/**
 * Calcula el estado de una batería bajo una corriente de carga dada.
 *
 * @param loadCurrent Corriente que entrega la batería en amperios (A).
 * @param options Parámetros de la batería (tensión nominal y ESR).
 */
export function modelBatteryUnderLoad(
  loadCurrent: number,
  options: BatteryModelOptions,
): BatteryTerminalState {
  const current = Math.max(0, loadCurrent)
  const internalDrop = current * options.esr
  const terminalVoltage = Math.max(0, options.nominalVoltage - internalDrop)
  const internalPowerLoss = current * internalDrop

  return {
    terminalVoltage,
    internalDrop,
    internalPowerLoss,
  }
}

// ─── Servomotor (Decodificación PWM a Ángulo) ─────────────────────────

export interface ServoAngleResult {
  /** Ángulo resultante acotado entre 0° y 180°. */
  angleDeg: number
  /** Ancho de pulso efectivo en microsegundos (µs). */
  pulseWidthUs: number
}

/**
 * Decodifica un pulso PWM estándar (1000 µs - 2000 µs) a un ángulo de 0° a 180°.
 *
 * @param pulseWidthUs Ancho de pulso en microsegundos.
 */
export function decodeServoPulse(pulseWidthUs: number): ServoAngleResult {
  const clamped = Math.max(1000, Math.min(2000, pulseWidthUs))
  const angle = ((clamped - 1000) / 1000) * 180
  return {
    angleDeg: Math.round(angle * 10) / 10,
    pulseWidthUs: clamped,
  }
}

/**
 * Codifica un ángulo de servomotor (0° - 180°) al ancho de pulso PWM en microsegundos.
 *
 * @param angleDeg Ángulo deseado en grados.
 */
export function encodeServoAngle(angleDeg: number): number {
  const clamped = Math.max(0, Math.min(180, angleDeg))
  return 1000 + (clamped / 180) * 1000
}

// ─── Sensor DHT22 / DHT11 ─────────────────────────────────────────────

export interface DhtTelemetry {
  temperatureCelsius: number
  humidityPercent: number
  isValid: boolean
  error?: string
}

/**
 * Valida y formatea las lecturas del sensor DHT22.
 */
export function readDhtSensor(temp: number, humidity: number): DhtTelemetry {
  if (temp < -40 || temp > 80) {
    return {
      temperatureCelsius: temp,
      humidityPercent: humidity,
      isValid: false,
      error: `Temperatura ${temp} °C fuera de rango operacional (-40 °C a 80 °C)`,
    }
  }
  if (humidity < 0 || humidity > 100) {
    return {
      temperatureCelsius: temp,
      humidityPercent: humidity,
      isValid: false,
      error: `Humedad ${humidity} % fuera de rango operacional (0 % a 100 %)`,
    }
  }
  return {
    temperatureCelsius: Math.round(temp * 10) / 10,
    humidityPercent: Math.round(humidity * 10) / 10,
    isValid: true,
  }
}
