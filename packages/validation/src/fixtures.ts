/**
 * Fixtures de prueba para el validador.
 *
 * Construyen proyectos mínimos y válidos sin depender de la biblioteca de
 * componentes, para que las pruebas del validador sean independientes del catálogo.
 */

import type { PinRef, PinType, Project } from '@circuitforge/netlist'
import { createEmptyProject } from '@circuitforge/netlist'

/** Pin con su tipo, para describir un net en una fixture. */
export interface PinSpec {
  componentId: string
  pinId: string
  type: PinType
}

/** Proyecto vacío. Review Focus #1. */
export function emptyProject(): Project {
  return createEmptyProject('test', 'test')
}

/**
 * Proyecto con un único net que contiene los pines indicados.
 *
 * Agrupa los pines por componente para construir la estructura correcta:
 * cada componente tiene sus pines, y el net referencia los que se indican.
 */
export function projectWithNet(
  pins: PinSpec[],
  extraComponents: { id: string; typeId: string }[] = [],
): Project {
  const base = createEmptyProject('test', 'test')

  // Agrupar los pines por componente, preservando el orden de aparición.
  const byComponent = new Map<string, PinSpec[]>()
  for (const pin of pins) {
    const list = byComponent.get(pin.componentId)
    if (list) list.push(pin)
    else byComponent.set(pin.componentId, [pin])
  }

  const netId = 'N1'

  const components = [...byComponent.entries()].map(([componentId, spec]) => ({
    id: componentId,
    typeId: 'generic',
    position: { x: 0, y: 0, rotation: 0 as const },
    params: {},
    pins: spec.map((s): PinRef => ({ pinId: s.pinId, type: s.type, netId })),
  }))

  // Componentes extra sin pines conectados (para probar typeId desconocido).
  for (const extra of extraComponents) {
    components.push({
      id: extra.id,
      typeId: extra.typeId,
      position: { x: 0, y: 0, rotation: 0 },
      params: {},
      pins: [{ pinId: 'a', type: 'power', netId: null }],
    })
  }

  const nets =
    pins.length > 0
      ? [{ id: netId, pins: pins.map((p) => ({ componentId: p.componentId, pinId: p.pinId })) }]
      : []

  return { ...base, components, nets }
}
