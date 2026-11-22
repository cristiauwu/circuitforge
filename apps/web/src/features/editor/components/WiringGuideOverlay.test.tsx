import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WiringGuideOverlay } from './WiringGuideOverlay'

describe('WiringGuideOverlay (Interactive Wiring & HUD Stepper)', () => {
  it('no renderiza nada en estado inactivo sin eventos', () => {
    const html = renderToStaticMarkup(<WiringGuideOverlay />)
    expect(html).toBe('')
  })

  it('muestra la píldora informativa al posar el cursor sobre un terminal (hover)', () => {
    const html = renderToStaticMarkup(
      <WiringGuideOverlay hoveredPin={{ componentId: 'R1', pinId: 'a' }} />,
    )
    expect(html).toContain('nx-wiring-hover-pill')
    expect(html).toContain('Terminal')
    expect(html).toContain('R1.a')
    expect(html).toContain('Haz clic o arrastra para tender cable')
  })

  it('renderiza el asistente de pasos cuando hay un cableado en progreso (Paso 2)', () => {
    const onCancel = vi.fn()
    const html = renderToStaticMarkup(
      <WiringGuideOverlay pending={{ componentId: 'R1', pinId: 'b' }} onCancel={onCancel} />,
    )

    expect(html).toContain('nx-wiring-hud-card')
    expect(html).toContain('Modo Cableado')
    expect(html).toContain('Paso 2 de 2')
    expect(html).toContain('Terminal de Origen')
    expect(html).toContain('R1')
    expect(html).toContain('.b')
    expect(html).toContain('Terminal de Destino')
    expect(html).toContain('Selecciona o arrastra hacia otro pin...')
    expect(html).toContain('Cancelar (Esc)')
  })

  it('destaca el terminal de destino cuando se activa el snap magnético', () => {
    const html = renderToStaticMarkup(
      <WiringGuideOverlay
        pending={{ componentId: 'R1', pinId: 'b' }}
        hoveredPin={{ componentId: 'LED1', pinId: 'anode' }}
      />,
    )

    expect(html).toContain('target-locked')
    expect(html).toContain('🎯 LED1')
    expect(html).toContain('.anode')
    expect(html).toContain('¡Atracción magnética activada!')
  })

  it('muestra una tarjeta de alerta con animación cuando hay un error de conexión', () => {
    const onCancel = vi.fn()
    const html = renderToStaticMarkup(
      <WiringGuideOverlay
        error="Cortocircuito evitado: no se puede conectar alimentación a tierra."
        onCancel={onCancel}
      />,
    )

    expect(html).toContain('nx-wiring-alert-card')
    expect(html).toContain('Cortocircuito evitado: no se puede conectar alimentación a tierra.')
    expect(html).toContain('Entendido')
  })
})
