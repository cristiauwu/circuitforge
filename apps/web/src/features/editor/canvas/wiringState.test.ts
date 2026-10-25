import { describe, expect, it, vi } from 'vitest'
import { EMPTY_WIRING, isSamePin, resolvePinClick, type WiringState } from './wiringState'

const R1_A = { componentId: 'R1', pinId: 'a' }
const D1_ANODE = { componentId: 'D1', pinId: 'anode' }

/** Conexion que siempre funciona. */
const alwaysOk = () => ({ ok: true })

/** Conexion que siempre falla, con el mensaje que daria V-1. */
const alwaysFails = () => ({
  ok: false,
  message: 'Cortocircuito entre alimentación y tierra',
})

describe('isSamePin', () => {
  it('el mismo componente y pin es el mismo pin', () => {
    expect(isSamePin(R1_A, { componentId: 'R1', pinId: 'a' })).toBe(true)
  })

  it('distinto componente no es el mismo pin', () => {
    expect(isSamePin(R1_A, { componentId: 'R2', pinId: 'a' })).toBe(false)
  })

  it('distinto pin del mismo componente no es el mismo pin', () => {
    expect(isSamePin(R1_A, { componentId: 'R1', pinId: 'b' })).toBe(false)
  })
})

describe('resolvePinClick — primer clic', () => {
  it('selecciona el pin y no llama a conectar', () => {
    const connect = vi.fn(alwaysOk)
    const outcome = resolvePinClick(EMPTY_WIRING, R1_A, connect)

    expect(outcome.kind).toBe('selected')
    expect(outcome.state.pending).toEqual(R1_A)
    expect(connect).not.toHaveBeenCalled()
  })

  it('limpia cualquier error anterior', () => {
    const withError: WiringState = { pending: null, error: 'algo falló antes' }
    const outcome = resolvePinClick(withError, R1_A, alwaysOk)

    expect(outcome.state.error).toBeNull()
  })
})

describe('resolvePinClick — conexion valida', () => {
  it('conecta, limpia el pendiente y no deja error', () => {
    const state: WiringState = { pending: R1_A, error: null }
    const outcome = resolvePinClick(state, D1_ANODE, alwaysOk)

    expect(outcome.kind).toBe('connected')
    expect(outcome.state.pending).toBeNull()
    expect(outcome.state.error).toBeNull()
  })

  it('llama a conectar con el origen y el destino en orden', () => {
    const connect = vi.fn(alwaysOk)
    resolvePinClick({ pending: R1_A, error: null }, D1_ANODE, connect)

    expect(connect).toHaveBeenCalledWith(R1_A, D1_ANODE)
  })
})

describe('resolvePinClick — conexion rechazada', () => {
  it('MANTIENE el origen para poder intentar otro destino', () => {
    // Perder el origen obligaria al usuario a empezar de nuevo tras un rechazo,
    // que es justo cuando mas probable es que quiera probar otra cosa.
    const state: WiringState = { pending: R1_A, error: null }
    const outcome = resolvePinClick(state, D1_ANODE, alwaysFails)

    expect(outcome.kind).toBe('rejected')
    expect(outcome.state.pending).toEqual(R1_A)
  })

  it('expone el mensaje de la validacion', () => {
    const outcome = resolvePinClick({ pending: R1_A, error: null }, D1_ANODE, alwaysFails)
    expect(outcome.state.error).toBe('Cortocircuito entre alimentación y tierra')
  })

  it('usa un mensaje por defecto si la validacion no da uno', () => {
    const outcome = resolvePinClick({ pending: R1_A, error: null }, D1_ANODE, () => ({ ok: false }))
    expect(outcome.state.error).toBeTruthy()
  })

  it('un segundo rechazo conserva el origen y actualiza el mensaje', () => {
    const primero = resolvePinClick({ pending: R1_A, error: null }, D1_ANODE, alwaysFails)
    const segundo = resolvePinClick(primero.state, { componentId: 'V1', pinId: 'neg' }, () => ({
      ok: false,
      message: 'Otro motivo',
    }))

    expect(segundo.state.pending).toEqual(R1_A)
    expect(segundo.state.error).toBe('Otro motivo')
  })
})

describe('resolvePinClick — cancelar', () => {
  it('pulsar el mismo pin cancela y NO llama a conectar', () => {
    const connect = vi.fn(alwaysOk)
    const outcome = resolvePinClick({ pending: R1_A, error: null }, R1_A, connect)

    expect(outcome.kind).toBe('cancelled')
    expect(outcome.state.pending).toBeNull()
    expect(connect).not.toHaveBeenCalled()
  })

  it('cancelar limpia tambien el error', () => {
    const outcome = resolvePinClick({ pending: R1_A, error: 'algo' }, R1_A, alwaysOk)

    expect(outcome.state.error).toBeNull()
  })
})
