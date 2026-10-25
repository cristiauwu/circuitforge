import { beforeEach, describe, expect, it } from 'vitest'
import { canRedo, canUndo } from './history'
import { useEditorStore } from './useEditorStore'

/** Atajo: el estado actual del store. */
const state = () => useEditorStore.getState()

/** Atajo: el proyecto actual. */
const project = () => state().project

beforeEach(() => {
  state().reset()
})

describe('addComponent', () => {
  it('genera identificadores correlativos por categoria', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 48, y: 0 })
    const d1 = state().addComponent('led', { x: 96, y: 0 })
    const u1 = state().addComponent('arduino_uno', { x: 0, y: 96 })

    expect(r1).toBe('R1')
    expect(r2).toBe('R2')
    expect(d1).toBe('D1')
    expect(u1).toBe('U1')
  })

  it('crea los pines desde la ficha de la biblioteca', () => {
    state().addComponent('led', { x: 0, y: 0 })
    const led = project().components[0]

    expect(led?.pins.map((p) => p.pinId)).toEqual(['anode', 'cathode'])
    expect(led?.pins.every((p) => p.netId === null)).toBe(true)
  })

  it('deja el componente nuevo seleccionado', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    expect(state().selectedId).toBe(id)
  })

  it('no reutiliza el id de un componente eliminado', () => {
    state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 0, y: 0 })
    state().removeComponent(r2)

    const r3 = state().addComponent('resistor', { x: 0, y: 0 })
    expect(r3).toBe('R3')
  })

  it('un typeId desconocido no rompe: crea un componente sin pines', () => {
    const id = state().addComponent('no_existe', { x: 0, y: 0 })
    expect(id).toMatch(/^X\d+$/)
    expect(project().components[0]?.pins).toEqual([])
  })
})

describe('moveComponent', () => {
  it('cambia la posicion y es deshacible', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    state().moveComponent(id, { x: 120, y: 240 })

    expect(project().components[0]?.position.x).toBe(120)

    state().undo()
    expect(project().components[0]?.position.x).toBe(0)
  })

  it('ignora un componente inexistente sin lanzar', () => {
    expect(() => state().moveComponent('NO_EXISTE', { x: 10, y: 10 })).not.toThrow()
    expect(project().components).toHaveLength(0)
  })
})

describe('rotateComponent', () => {
  it('cicla 0 -> 90 -> 180 -> 270 -> 0', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    const rotation = () => project().components[0]?.position.rotation

    expect(rotation()).toBe(0)
    state().rotateComponent(id)
    expect(rotation()).toBe(90)
    state().rotateComponent(id)
    expect(rotation()).toBe(180)
    state().rotateComponent(id)
    expect(rotation()).toBe(270)
    state().rotateComponent(id)
    expect(rotation()).toBe(0)
  })

  it('nunca produce un angulo fuera de 0/90/180/270', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    for (let i = 0; i < 9; i++) {
      state().rotateComponent(id)
      expect([0, 90, 180, 270]).toContain(project().components[0]?.position.rotation)
    }
  })
})

describe('removeComponent', () => {
  it('elimina el componente y sus pines de los nets', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 96, y: 0 })
    state().connectPins({ componentId: r1, pinId: 'a' }, { componentId: r2, pinId: 'a' })

    expect(project().nets).toHaveLength(1)

    state().removeComponent(r1)

    expect(project().components).toHaveLength(1)
    // El net queda con un solo pin, asi que se descarta: un pin suelto no es
    // una conexion (el aviso V-3 lo reporta el validador sobre el componente).
    expect(project().nets).toHaveLength(0)
  })

  it('limpia la seleccion si se elimina el seleccionado', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    expect(state().selectedId).toBe(id)

    state().removeComponent(id)
    expect(state().selectedId).toBeNull()
  })
})

describe('selectComponent', () => {
  it('NO entra en el historial', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    const before = state().history.past.length

    state().selectComponent(id)
    state().selectComponent(null)
    state().selectComponent(id)

    expect(state().history.past.length).toBe(before)
  })
})

describe('connectPins', () => {
  it('rechaza power -> gnd y NO modifica el proyecto (V-1 bloquea)', () => {
    const v1 = state().addComponent('dc_source', { x: 0, y: 0 })
    const netsBefore = JSON.stringify(project().nets)
    const pastBefore = state().history.past.length

    const result = state().connectPins(
      { componentId: v1, pinId: 'positive' },
      { componentId: v1, pinId: 'negative' },
    )

    expect(result.ok).toBe(false)
    expect(result.message).toBeTruthy()
    expect(JSON.stringify(project().nets)).toBe(netsBefore)
    // Un rechazo no debe ensuciar el historial
    expect(state().history.past.length).toBe(pastBefore)
  })

  it('crea un net con una conexion valida', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 96, y: 0 })

    const result = state().connectPins(
      { componentId: r1, pinId: 'a' },
      { componentId: r2, pinId: 'a' },
    )

    expect(result.ok).toBe(true)
    expect(project().nets).toHaveLength(1)
    expect(project().nets[0]?.pins).toHaveLength(2)
  })

  it('el net creado es deshacible', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 96, y: 0 })
    state().connectPins({ componentId: r1, pinId: 'a' }, { componentId: r2, pinId: 'a' })

    state().undo()
    expect(project().nets).toHaveLength(0)
  })

  it('rechaza un pin inexistente sin romper', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const result = state().connectPins(
      { componentId: r1, pinId: 'zzz' },
      { componentId: r1, pinId: 'a' },
    )
    expect(result.ok).toBe(false)
  })
})

describe('historial', () => {
  it('undo tras addComponent deja el proyecto vacio', () => {
    state().addComponent('resistor', { x: 0, y: 0 })
    expect(project().components).toHaveLength(1)
    expect(canUndo(state().history)).toBe(true)

    state().undo()
    expect(project().components).toHaveLength(0)
  })

  it('redo vuelve a aplicar el cambio', () => {
    state().addComponent('resistor', { x: 0, y: 0 })
    state().undo()
    expect(canRedo(state().history)).toBe(true)

    state().redo()
    expect(project().components).toHaveLength(1)
  })

  it('undo con historial vacio no lanza', () => {
    expect(() => state().undo()).not.toThrow()
    expect(project().components).toHaveLength(0)
  })

  it('reset limpia proyecto, historial y seleccion', () => {
    const id = state().addComponent('resistor', { x: 0, y: 0 })
    state().selectComponent(id)
    state().reset()

    expect(project().components).toHaveLength(0)
    expect(state().history.past).toHaveLength(0)
    expect(state().selectedId).toBeNull()
    expect(canUndo(state().history)).toBe(false)
  })
})
