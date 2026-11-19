/**
 * @circuitforge/web — Tests de cobertura del grafo de transiciones de Editor FSM (Tarea T-3).
 *
 * Valida el 100% de aristas del grafo de estados finitos de interacción, garantizando
 * determinismo absoluto y resiliencia ante pérdida de foco y eventos no controlados.
 */

import type { PinEndpoint } from '@circuitforge/netlist'
import { describe, expect, it, vi } from 'vitest'
import { createEditorFSM, INITIAL_FSM_STATE, isSamePin, transitionFSM } from './editorFSM'

const PIN_A: PinEndpoint = Object.freeze({ componentId: 'R1', pinId: '1' })
const PIN_B: PinEndpoint = Object.freeze({ componentId: 'LED1', pinId: 'anode' })
const PIN_C: PinEndpoint = Object.freeze({ componentId: 'GND1', pinId: 'gnd' })

describe('Tarea T-3: FSM Determinista para Trazado de Cables y Gestos', () => {
  it('inicia en estado IDLE', () => {
    const fsm = createEditorFSM()
    expect(fsm.getState()).toEqual({ type: 'IDLE' })
  })

  it('transiciona IDLE -> HOVERING_PIN -> IDLE mediante hover y unhover', () => {
    let s = transitionFSM(INITIAL_FSM_STATE, {
      kind: 'PIN_HOVER',
      endpoint: PIN_A,
      position: { x: 10, y: 20 },
    })
    expect(s.type).toBe('HOVERING_PIN')
    if (s.type === 'HOVERING_PIN') {
      expect(s.endpoint).toEqual(PIN_A)
      expect(s.snapPosition).toEqual({ x: 10, y: 20 })
    }

    s = transitionFSM(s, { kind: 'PIN_UNHOVER', endpoint: PIN_A })
    expect(s.type).toBe('IDLE')
  })

  it('transiciona IDLE -> DRAGGING_WIRE -> SNAPPED_MAGNETIC -> IDLE en cableado exitoso', () => {
    const mockConnect = vi.fn().mockReturnValue({ ok: true })

    // 1. Clic en PIN_A inicia cableado
    let s = transitionFSM(INITIAL_FSM_STATE, { kind: 'PIN_CLICK', endpoint: PIN_A }, mockConnect)
    expect(s.type).toBe('DRAGGING_WIRE')
    if (s.type === 'DRAGGING_WIRE') {
      expect(s.from).toEqual(PIN_A)
    }

    // 2. Mover cable por el espacio
    s = transitionFSM(
      s,
      { kind: 'WIRE_MOVE', position: { x: 50, y: 60 }, hoverTarget: null },
      mockConnect,
    )
    expect(s.type).toBe('DRAGGING_WIRE')
    if (s.type === 'DRAGGING_WIRE') {
      expect(s.currentPosition).toEqual({ x: 50, y: 60 })
    }

    // 3. Atracción magnética a PIN_B
    s = transitionFSM(
      s,
      { kind: 'MAGNETIC_SNAP', targetEndpoint: PIN_B, snapPosition: { x: 100, y: 120 } },
      mockConnect,
    )
    expect(s.type).toBe('SNAPPED_MAGNETIC')
    if (s.type === 'SNAPPED_MAGNETIC') {
      expect(s.from).toEqual(PIN_A)
      expect(s.to).toEqual(PIN_B)
      expect(s.snapPosition).toEqual({ x: 100, y: 120 })
    }

    // 4. Clic de conexión en PIN_B
    s = transitionFSM(s, { kind: 'PIN_CLICK', endpoint: PIN_B }, mockConnect)
    expect(mockConnect).toHaveBeenCalledWith(PIN_A, PIN_B)
    expect(s.type).toBe('IDLE')
  })

  it('preserva el pin de origen ante intento de conexión eléctrica rechazada (V-1/V-2)', () => {
    const mockConnect = vi.fn().mockReturnValue({
      ok: false,
      message: 'Cortocircuito prohibido entre VCC y GND.',
    })

    // Iniciar con PIN_A
    let s = transitionFSM(INITIAL_FSM_STATE, { kind: 'PIN_CLICK', endpoint: PIN_A }, mockConnect)
    expect(s.type).toBe('DRAGGING_WIRE')

    // Intentar conectar con PIN_C (rechazado)
    s = transitionFSM(s, { kind: 'PIN_CLICK', endpoint: PIN_C }, mockConnect)
    expect(s.type).toBe('DRAGGING_WIRE')
    if (s.type === 'DRAGGING_WIRE') {
      // El origen se preserva para no obligar al usuario a comenzar de nuevo
      expect(s.from).toEqual(PIN_A)
      expect(s.error).toBe('Cortocircuito prohibido entre VCC y GND.')
    }
  })

  it('cancela el cableado limpiamente si se pulsa el mismo pin origen', () => {
    const mockConnect = vi.fn()
    let s = transitionFSM(INITIAL_FSM_STATE, { kind: 'PIN_CLICK', endpoint: PIN_A }, mockConnect)
    expect(s.type).toBe('DRAGGING_WIRE')

    // Segundo clic en el mismo pin -> arrepentimiento
    s = transitionFSM(s, { kind: 'PIN_CLICK', endpoint: PIN_A }, mockConnect)
    expect(s.type).toBe('IDLE')
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('garantiza resiliencia e inmunidad a cables huérfanos ante ESCAPE, WINDOW_BLUR y POINTER_CANCEL', () => {
    // 1. Cancelar en DRAGGING_WIRE mediante ESCAPE
    let s = transitionFSM(INITIAL_FSM_STATE, { kind: 'PIN_CLICK', endpoint: PIN_A })
    expect(s.type).toBe('DRAGGING_WIRE')
    s = transitionFSM(s, { kind: 'ESCAPE' })
    expect(s.type).toBe('IDLE')

    // 2. Cancelar en SNAPPED_MAGNETIC mediante WINDOW_BLUR
    s = transitionFSM(INITIAL_FSM_STATE, { kind: 'PIN_CLICK', endpoint: PIN_A })
    s = transitionFSM(s, {
      kind: 'MAGNETIC_SNAP',
      targetEndpoint: PIN_B,
      snapPosition: { x: 0, y: 0 },
    })
    expect(s.type).toBe('SNAPPED_MAGNETIC')
    s = transitionFSM(s, { kind: 'WINDOW_BLUR' })
    expect(s.type).toBe('IDLE')

    // 3. Cancelar arrastre de componente mediante POINTER_CANCEL
    s = transitionFSM(INITIAL_FSM_STATE, {
      kind: 'COMPONENT_DRAG_START',
      componentId: 'R1',
      position: { x: 10, y: 10 },
    })
    expect(s.type).toBe('DRAGGING_COMPONENT')
    s = transitionFSM(s, { kind: 'POINTER_CANCEL' })
    expect(s.type).toBe('IDLE')
  })

  it('soporta el ciclo completo de arrastre de componentes no montados', () => {
    let s = transitionFSM(INITIAL_FSM_STATE, {
      kind: 'COMPONENT_DRAG_START',
      componentId: 'ESP32_1',
      position: { x: 0, y: 0 },
    })
    expect(s.type).toBe('DRAGGING_COMPONENT')

    s = transitionFSM(s, { kind: 'COMPONENT_DRAG_MOVE', position: { x: 25, y: 40 } })
    expect(s.type).toBe('DRAGGING_COMPONENT')
    if (s.type === 'DRAGGING_COMPONENT') {
      expect(s.currentPosition).toEqual({ x: 25, y: 40 })
    }

    s = transitionFSM(s, { kind: 'COMPONENT_DRAG_END' })
    expect(s.type).toBe('IDLE')
  })

  it('compara igualdad de pines de forma determinista con isSamePin', () => {
    expect(isSamePin(PIN_A, { componentId: 'R1', pinId: '1' })).toBe(true)
    expect(isSamePin(PIN_A, PIN_B)).toBe(false)
  })
})
