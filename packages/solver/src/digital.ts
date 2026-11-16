/**
 * @circuitforge/solver — Kernel digital y temporal (RF-2.2).
 *
 * Implementa:
 *   - Evaluación de niveles lógicos HIGH / LOW / INDEFINIDO según umbrales de tensión.
 *   - Generación y cálculo de modulación por ancho de pulsos (PWM) y tensión media.
 *   - Kernel de temporización con reloj virtual y soporte para `delay()`.
 */

export type LogicLevel = 'LOW' | 'HIGH' | 'UNDEFINED'

export interface LogicThresholds {
  /** Tensión máxima para considerar estado LOW (por defecto 0.8 V en TTL). */
  vLowMax?: number
  /** Tensión mínima para considerar estado HIGH (por defecto 2.0 V en TTL). */
  vHighMin?: number
}

/**
 * Evalúa el nivel lógico digital a partir de una tensión continua.
 *
 * @param voltage Tensión en voltios.
 * @param thresholds Umbrales configurables (TTL / CMOS).
 */
export function evaluateLogicLevel(voltage: number, thresholds: LogicThresholds = {}): LogicLevel {
  const vLow = thresholds.vLowMax ?? 0.8
  const vHigh = thresholds.vHighMin ?? 2.0

  if (voltage <= vLow) return 'LOW'
  if (voltage >= vHigh) return 'HIGH'
  return 'UNDEFINED'
}

// ─── PWM (Pulse-Width Modulation) ─────────────────────────────────────

export interface PwmSignal {
  /** Ciclo de trabajo normalizado de 0.0 (0%) a 1.0 (100%). */
  dutyCycle: number
  /** Frecuencia de modulación en hercios (Hz), por defecto 490 Hz (estándar Arduino). */
  frequencyHz: number
  /** Tensión de nivel alto en voltios (por defecto 5.0 V). */
  vHigh: number
}

/**
 * Calcula la tensión media eficaz de una señal PWM.
 *
 * Fórmula: V_avg = V_high * dutyCycle
 */
export function computePwmAverageVoltage(signal: PwmSignal): number {
  const duty = Math.max(0, Math.min(1, signal.dutyCycle))
  return signal.vHigh * duty
}

/**
 * Determina si la señal PWM se encuentra en estado HIGH en un instante de tiempo dado.
 *
 * @param signal Parámetros de la señal PWM.
 * @param timeUs Tiempo en microsegundos transcurrido desde el inicio de la simulación.
 */
export function isPwmHighAt(signal: PwmSignal, timeUs: number): boolean {
  const duty = Math.max(0, Math.min(1, signal.dutyCycle))
  if (duty <= 0) return false
  if (duty >= 1) return true

  const periodUs = 1_000_000 / signal.frequencyHz
  const timeInPeriodUs = timeUs % periodUs
  const highDurationUs = periodUs * duty

  return timeInPeriodUs < highDurationUs
}

// ─── Kernel de Temporización Digital ──────────────────────────────────

export interface DigitalPinState {
  mode: 'INPUT' | 'OUTPUT' | 'PWM'
  level: LogicLevel
  pwm?: PwmSignal
}

/**
 * Kernel de simulación temporal para microcontroladores y lógica digital (RF-2.2).
 *
 * Permite simular la secuencia de ejecución de firmware con avances controlados del reloj virtual.
 */
export class DigitalKernel {
  private _currentTimeMs = 0
  private pins = new Map<string, DigitalPinState>()

  /** Tiempo simulado actual en milisegundos. */
  get currentTimeMs(): number {
    return this._currentTimeMs
  }

  /**
   * Avanza el reloj virtual de simulación (`delay()` del firmware).
   *
   * @param durationMs Milisegundos a avanzar.
   */
  delay(durationMs: number): void {
    if (durationMs > 0) {
      this._currentTimeMs += durationMs
    }
  }

  /** Configura un pin en modo salida con nivel digital. */
  digitalWrite(pinId: string, level: 'HIGH' | 'LOW'): void {
    this.pins.set(pinId, {
      mode: 'OUTPUT',
      level,
    })
  }

  /** Configura un pin en modo salida PWM con ciclo de trabajo. */
  analogWrite(pinId: string, value8Bit: number, frequencyHz = 490, vHigh = 5.0): void {
    const duty = Math.max(0, Math.min(255, value8Bit)) / 255
    const signal: PwmSignal = {
      dutyCycle: duty,
      frequencyHz,
      vHigh,
    }
    this.pins.set(pinId, {
      mode: 'PWM',
      level: duty >= 0.5 ? 'HIGH' : 'LOW',
      pwm: signal,
    })
  }

  /** Lee el estado de un pin en el instante actual de tiempo simulado. */
  digitalRead(pinId: string): LogicLevel {
    const pin = this.pins.get(pinId)
    if (!pin) return 'UNDEFINED'
    if (pin.mode === 'PWM' && pin.pwm) {
      const timeUs = this._currentTimeMs * 1000
      return isPwmHighAt(pin.pwm, timeUs) ? 'HIGH' : 'LOW'
    }
    return pin.level
  }

  /** Obtiene la tensión continua equivalente de un pin (para solver MNA). */
  getEquivalentVoltage(pinId: string): number {
    const pin = this.pins.get(pinId)
    if (!pin) return 0
    if (pin.mode === 'PWM' && pin.pwm) {
      return computePwmAverageVoltage(pin.pwm)
    }
    return pin.level === 'HIGH' ? 5.0 : 0.0
  }

  /** Reinicia el reloj y los estados del kernel. */
  reset(): void {
    this._currentTimeMs = 0
    this.pins.clear()
  }
}
