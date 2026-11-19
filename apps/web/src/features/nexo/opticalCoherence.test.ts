/**
 * @circuitforge/web — Tests de coherencia óptica y calibración física (Tarea T-2).
 *
 * Valida la alineación trigonométrica entre la iluminación Three.js (estudio 5200K)
 * y las sombras DOM de los paneles de telemetría y docks flotantes.
 */

import { describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('Tarea T-2: Unificación Óptica y Material de Laboratorio', () => {
  it('garantiza iluminación Three.js calibrada a 5200K daylight neutral', () => {
    const sceneFile = fs.readFileSync(
      path.resolve(__dirname, 'scene.ts'),
      'utf-8',
    )

    // Key light debe ser blanco neutro de laboratorio (#ffffff), no tungsteno (#fff3e2)
    expect(sceneFile).toContain("THREE.DirectionalLight('#ffffff', 2.7)")
    // Vector de posición debe estar calibrado en (-3.5, 11, 4.2)
    expect(sceneFile).toContain('key.position.set(-3.5, 11, 4.2)')
    // Luz de relleno azul tenue de laboratorio
    expect(sceneFile).toContain("THREE.DirectionalLight('#e0e7ff', 0.6)")
    // Sombra de contacto en tono pizarra (#0f172a)
    expect(sceneFile).toContain("color: '#0f172a'")
  })

  it('verifica que las sombras DOM en tokens.css respetan la proyección trigonométrica', () => {
    const tokensFile = fs.readFileSync(
      path.resolve(__dirname, '../../styles/tokens.css'),
      'utf-8',
    )

    // Las sombras deben poseer desplazamiento horizontal positivo coherente con key light X=-3.5
    expect(tokensFile).toContain('--cf-shadow-card: 1px 2px 5px')
    expect(tokensFile).toContain('--cf-shadow-elevated: 2px 4px 10px')
    expect(tokensFile).toContain('--cf-shadow-dock: 1px 3px 8px')
    expect(tokensFile).toContain('--cf-shadow-tray: 2px 4px 12px')

    // Bisel de luz física superior (highlight bevel)
    expect(tokensFile).toContain('inset 0 1px 0 rgba(255, 255, 255, 0.95)')
  })

  it('verifica que los materiales de cristal poseen desenfoque y saturación iOS', () => {
    const tokensFile = fs.readFileSync(
      path.resolve(__dirname, '../../styles/tokens.css'),
      'utf-8',
    )

    expect(tokensFile).toContain('--cf-glass-blur: 24px')
    expect(tokensFile).toContain('--cf-glass-sat: 180%')
  })
})
