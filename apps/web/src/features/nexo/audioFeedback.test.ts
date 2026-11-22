import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playMechanicalClick, resetAudioContextForTesting } from './audioFeedback'

describe('audioFeedback', () => {
  let mockOscillator: {
    type: string
    frequency: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }
    connect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
  }
  let mockGain: {
    gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }
    connect: ReturnType<typeof vi.fn>
  }
  let mockContext: {
    currentTime: number
    state: string
    createOscillator: ReturnType<typeof vi.fn>
    createGain: ReturnType<typeof vi.fn>
    destination: Record<string, unknown>
    resume: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    resetAudioContextForTesting()
    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }
    mockContext = {
      currentTime: 1.0,
      state: 'running',
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
    }

    vi.stubGlobal('AudioContext', vi.fn(() => mockContext))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('synthesizes toggle mechanical click with triangle oscillator and ramps', () => {
    playMechanicalClick('toggle')

    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockContext.createGain).toHaveBeenCalled()
    expect(mockOscillator.type).toBe('triangle')
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1800, 1.0)
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.22, 1.0)
    expect(mockOscillator.start).toHaveBeenCalledWith(1.0)
    expect(mockOscillator.stop).toHaveBeenCalled()
  })

  it('adjusts frequency and gain for press and release variants', () => {
    playMechanicalClick('press')
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1500, 1.0)

    playMechanicalClick('release')
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(2200, 1.0)
  })

  it('handles suspended audio context gracefully without throwing', () => {
    mockContext.state = 'suspended'
    expect(() => playMechanicalClick('toggle')).not.toThrow()
  })
})
