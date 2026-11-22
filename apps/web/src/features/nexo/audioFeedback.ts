/**
 * @circuitforge/web — Audio Feedback háptico y mecánico (Fase T-8).
 *
 * Sintetiza con Web Audio API un clic acústico realista de interruptor y
 * pulsador mecánico, sin descargas de ficheros de audio externos (cero latencia,
 * cero ancho de banda y 100% resiliente a entornos offline).
 */

let sharedAudioContext: AudioContext | null = null

interface WindowWithAudio {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

function getAudioContext(): AudioContext | null {
  const target = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
      ? globalThis
      : null) as WindowWithAudio | null
  if (!target) return null
  const AudioCtx = target.AudioContext ?? target.webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx()
  }
  if (sharedAudioContext?.state === 'suspended') {
    void sharedAudioContext.resume().catch(() => {})
  }
  return sharedAudioContext
}

export function resetAudioContextForTesting(): void {
  sharedAudioContext = null
}

export type ClickVariant = 'press' | 'release' | 'toggle'

/**
 * Reproduce un sonido de clic mecánico táctil sintetizado.
 */
export function playMechanicalClick(variant: ClickVariant = 'toggle'): void {
  try {
    const ctx = getAudioContext()
    if (ctx?.state !== 'running') return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // Configuración según el tipo de acción mecánica
    let startFreq = 1800
    let endFreq = 120
    let duration = 0.028
    let peakGain = 0.22

    if (variant === 'press') {
      startFreq = 1500
      endFreq = 100
      duration = 0.025
      peakGain = 0.2
    } else if (variant === 'release') {
      startFreq = 2200
      endFreq = 250
      duration = 0.018
      peakGain = 0.15
    }

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(startFreq, now)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)

    gain.gain.setValueAtTime(peakGain, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + duration + 0.005)
  } catch {
    // Ignorar fallos de audio silenciosamente si el contexto está bloqueado
  }
}
