import { arePinsConnected, getDefaultParameters, resolveMountedPose } from '@circuitforge/netlist'
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

describe('transactional mounting and parameters', () => {
  const add = (type: string) => state().addComponent(type, { x: 0, y: 0 })
  const pin = (componentId: string, pinId: string) => ({ componentId, pinId })

  it('initializes registry defaults and validates finite bounds without mutating history', () => {
    const id = add('resistor')
    expect(project().components[0]?.params).toEqual(getDefaultParameters('resistor'))
    const key = Object.keys(getDefaultParameters('resistor'))[0]
    if (!key) throw new Error('resistor parameter')
    const before = state()
    for (const [name, value] of [
      ['unknown', 3],
      [key, Number.NaN],
      [key, Number.POSITIVE_INFINITY],
      [key, -1],
    ] as const) {
      expect(state().updateParameter(id, name, value).ok).toBe(false)
      expect(state().history).toBe(before.history)
      expect(project()).toBe(before.project)
    }
    expect(state().updateParameter(id, key, 470).ok).toBe(true)
    expect(state().history.past.length).toBe(before.history.past.length + 1)
    state().undo()
    expect(project()).toBe(before.project)
    state().redo()
    expect(project().components[0]?.params[key]).toBe(470)
  })

  it('rejects closing an otherwise-open source-to-ground switch atomically', () => {
    const source = add('dc_source')
    const sw = add('switch_spst')
    expect(state().connectPins(pin(source, 'positive'), pin(sw, 'a')).ok).toBe(true)
    expect(state().connectPins(pin(source, 'negative'), pin(sw, 'b')).ok).toBe(true)
    const before = state()
    expect(state().updateParameter(sw, 'closed', true)).toMatchObject({ ok: false })
    expect(state().history).toBe(before.history)
    expect(project()).toBe(before.project)
    expect(state().selectedId).toBe(before.selectedId)
  })

  it('closed contacts join, opening splits, and undo/redo restores exactly one step', () => {
    const sw = add('switch_spst')
    const before = project()
    expect(state().updateParameter(sw, 'closed', true).ok).toBe(true)
    expect(arePinsConnected(project(), pin(sw, 'a'), pin(sw, 'b'))).toBe(true)
    expect(project().wires).toEqual([])
    state().undo()
    expect(project()).toBe(before)
    state().redo()
    expect(arePinsConnected(project(), pin(sw, 'a'), pin(sw, 'b'))).toBe(true)
    expect(state().updateParameter(sw, 'closed', false).ok).toBe(true)
    expect(arePinsConnected(project(), pin(sw, 'a'), pin(sw, 'b'))).toBe(false)
  })

  it('rejects a mount whose LAST transistor leg would bridge source and ground', () => {
    const board = add('breadboard')
    const child = add('bjt_npn')
    const source = add('dc_source')
    // The transistor itself is never a conductor. The last attachment activates
    // the already occupied row, so the global hypothetical topology must be checked.
    expect(state().connectPins(pin(source, 'positive'), pin(child, 'emitter')).ok).toBe(true)
    expect(state().connectPins(pin(source, 'negative'), pin(board, 'b3')).ok).toBe(true)
    const before = state()
    expect(state().mountComponent(child, board, 'a1', 0).ok).toBe(false)
    expect(state().history).toBe(before.history)
    expect(project()).toBe(before.project)
    expect(project().mounts).toEqual([])
  })

  it('mount/unmount/reposition each form one undoable edit, with occupancy failure untouched', () => {
    const board = add('breadboard')
    const child = add('resistor')
    const other = add('led')
    const base = project()
    const length = state().history.past.length
    expect(state().mountComponent(child, board, 'a1').ok).toBe(true)
    expect(state().history.past).toHaveLength(length + 1)
    const mounted = project()
    expect(state().mountComponent(other, board, 'a1').ok).toBe(false)
    expect(project()).toBe(mounted)
    state().moveComponent(child, { x: 999, y: 999 })
    state().rotateComponent(child)
    expect(project()).toBe(mounted)
    expect(state().mountComponent(child, board, 'c5', 0).ok).toBe(true)
    expect(state().history.past).toHaveLength(length + 2)
    state().undo()
    expect(project()).toBe(mounted)
    state().undo()
    expect(project()).toBe(base)
    state().redo()
    const pose = resolveMountedPose(project(), child)
    expect(state().unmountComponent(child).ok).toBe(true)
    expect(project().components.find((item) => item.id === child)).toMatchObject({
      position: { x: pose?.x, y: pose?.y, rotation: pose?.rotation },
      elevation: pose?.elevation,
    })
    expect(project().mounts).toEqual([])
    state().undo()
    expect(project()).toBe(mounted)
  })

  it('board move/rotation derives child pose and delete preserves external wires with one undo', () => {
    const board = add('breadboard')
    const child = add('resistor')
    const external = add('led')
    expect(state().mountComponent(child, board, 'a1').ok).toBe(true)
    const storedChild = project().components.find((item) => item.id === child)?.position
    state().moveComponent(board, { x: 120, y: 240 })
    state().rotateComponent(board)
    expect(project().components.find((item) => item.id === child)?.position).toBe(storedChild)
    expect(state().connectPins(pin(child, 'a'), pin(external, 'anode')).ok).toBe(true)
    expect(state().connectPins(pin(board, 'a8'), pin(external, 'cathode')).ok).toBe(true)
    const before = project()
    const pose = resolveMountedPose(before, child)
    const length = state().history.past.length
    state().removeComponent(board)
    expect(state().history.past).toHaveLength(length + 1)
    expect(project().wires).toHaveLength(1)
    expect(project().mounts).toEqual([])
    expect(project().components.find((item) => item.id === child)).toMatchObject({
      position: { x: pose?.x, y: pose?.y, rotation: pose?.rotation },
      elevation: pose?.elevation,
    })
    state().undo()
    expect(project()).toBe(before)
  })

  it('unmount retains an alternate authored path instead of deleting external cables', () => {
    const board = add('breadboard')
    const child = add('resistor')
    expect(state().mountComponent(child, board, 'a1').ok).toBe(true)
    expect(state().connectPins(pin(child, 'a'), pin(board, 'b1')).ok).toBe(true)
    const wires = project().wires
    expect(state().unmountComponent(child).ok).toBe(true)
    expect(project().wires).toEqual(wires)
    expect(arePinsConnected(project(), pin(child, 'a'), pin(board, 'a1'))).toBe(true)
  })
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

  it('la tierra se rotula GND, no V', () => {
    // `gnd_ref` es categoria `source` en la taxonomia electrica, pero rotularlo
    // `V2` se confunde con la fuente de al lado. En un esquematico la tierra es
    // `GND` y un `V` significa fuente.
    const gnd = state().addComponent('gnd_ref', { x: 0, y: 0 })
    expect(gnd).toBe('GND1')
  })

  it('los pasivos no comparten prefijo R entre si', () => {
    // Resistencia, capacitor e inductor son los tres de categoria `passive`.
    // Sin distinguirlos por tipo, los tres saldrian `R1`, `R2`, `R3`.
    expect(state().addComponent('resistor', { x: 0, y: 0 })).toBe('R1')
    expect(state().addComponent('capacitor', { x: 0, y: 0 })).toBe('C1')
    expect(state().addComponent('inductor', { x: 0, y: 0 })).toBe('L1')
    expect(state().addComponent('potentiometer', { x: 0, y: 0 })).toBe('RV1')
  })

  it('el transistor no comparte prefijo D con los diodos', () => {
    expect(state().addComponent('led', { x: 0, y: 0 })).toBe('D1')
    expect(state().addComponent('diode', { x: 0, y: 0 })).toBe('D2')
    expect(state().addComponent('bjt_npn', { x: 0, y: 0 })).toBe('Q1')
  })

  it('la fuente sigue siendo V y la bateria BT', () => {
    expect(state().addComponent('dc_source', { x: 0, y: 0 })).toBe('V1')
    expect(state().addComponent('battery_9v', { x: 0, y: 0 })).toBe('BT1')
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
    // La red singleton se descarta y el pin superviviente queda desconectado.
    expect(project().nets).toHaveLength(0)
    expect(project().components[0]?.pins.find((p) => p.pinId === 'a')?.netId).toBeNull()
  })

  it('permite reconectar el superviviente a una red existente y conserva snapshots', () => {
    const ids = Array.from({ length: 4 }, (_, i) =>
      state().addComponent('resistor', { x: i * 96, y: 0 }),
    )
    const endpoint = (i: number) => {
      const componentId = ids[i]
      if (!componentId) throw new Error('Falta el componente de prueba')
      return { componentId, pinId: 'a' }
    }
    state().connectPins(endpoint(0), endpoint(1))
    state().connectPins(endpoint(2), endpoint(3))
    const before = project()
    const pastLength = state().history.past.length
    state().removeComponent(endpoint(0).componentId)
    expect(state().history.past).toHaveLength(pastLength + 1)
    const after = project()
    expect(after.components.find((c) => c.id === ids[1])?.pins[0]?.netId).toBeNull()
    expect(before.components.find((c) => c.id === ids[1])?.pins[0]?.netId).not.toBeNull()
    state().undo()
    expect(project()).toBe(before)
    state().redo()
    expect(project()).toBe(after)
    expect(state().connectPins(endpoint(1), endpoint(2)).ok).toBe(true)
    expect(project().nets).toHaveLength(1)
    expect(project().nets[0]?.pins).toHaveLength(3)
  })

  it('conserva una red de tres pines cuando quedan dos', () => {
    const ids = Array.from({ length: 3 }, (_, i) =>
      state().addComponent('resistor', { x: i * 96, y: 0 }),
    )
    const endpoint = (i: number) => {
      const componentId = ids[i]
      if (!componentId) throw new Error('Falta el componente de prueba')
      return { componentId, pinId: 'a' }
    }
    state().connectPins(endpoint(0), endpoint(1))
    state().connectPins(endpoint(1), endpoint(2))
    const netId = project().nets[0]?.id
    state().removeComponent(endpoint(0).componentId)
    expect(project().nets[0]?.id).toBe(netId)
    expect(project().nets[0]?.pins).toHaveLength(2)
    expect(project().components.every((c) => c.pins[0]?.netId === netId)).toBe(true)
  })

  it('limpia varias redes descartadas y permite una nueva conexión sin reciclar IDs', () => {
    const r1 = state().addComponent('resistor', { x: 0, y: 0 })
    const r2 = state().addComponent('resistor', { x: 96, y: 0 })
    const r3 = state().addComponent('resistor', { x: 192, y: 0 })
    state().connectPins({ componentId: r1, pinId: 'a' }, { componentId: r2, pinId: 'a' })
    state().connectPins({ componentId: r1, pinId: 'b' }, { componentId: r3, pinId: 'a' })
    const discarded = project().nets.map((net) => net.id)
    state().removeComponent(r1)
    expect(
      project()
        .components.flatMap((c) => c.pins)
        .every((p) => p.netId === null),
    ).toBe(true)
    expect(
      state().connectPins({ componentId: r2, pinId: 'a' }, { componentId: r3, pinId: 'a' }).ok,
    ).toBe(true)
    expect(discarded).not.toContain(project().nets[0]?.id)
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
  it.each(['resistor', 'inductor', 'led', 'diode'])('crea terminales neutros para %s', (typeId) => {
    const id = state().addComponent(typeId, { x: 0, y: 0 })
    expect(
      project()
        .components.find((c) => c.id === id)
        ?.pins.every((p) => p.type === 'passive'),
    ).toBe(true)
  })

  it.each(['resistor', 'inductor'])(
    'permite %s entre alimentación y tierra en redes distintas',
    (typeId) => {
      const load = state().addComponent(typeId, { x: 0, y: 0 })
      const source = state().addComponent('dc_source', { x: 96, y: 0 })
      expect(
        state().connectPins(
          { componentId: load, pinId: 'a' },
          { componentId: source, pinId: 'positive' },
        ).ok,
      ).toBe(true)
      expect(
        state().connectPins(
          { componentId: load, pinId: 'b' },
          { componentId: source, pinId: 'negative' },
        ).ok,
      ).toBe(true)
      expect(project().nets).toHaveLength(2)
      expect(
        state().connectPins({ componentId: load, pinId: 'a' }, { componentId: load, pinId: 'b' })
          .ok,
      ).toBe(false)
      expect(project().nets).toHaveLength(2)
    },
  )
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

describe('breadboard infrastructure', () => {
  const endpoint = (componentId: string, pinId: string) => ({ componentId, pinId })
  const setup = () => ({
    board: state().addComponent('breadboard', { x: 0, y: 0 }),
    r1: state().addComponent('resistor', { x: 3, y: 0 }),
    r2: state().addComponent('resistor', { x: 5, y: 0 }),
    source: state().addComponent('dc_source', { x: 7, y: 0 }),
  })

  it('creates 420 passive editable contacts with no idle wires/nets', () => {
    const id = state().addComponent('breadboard', { x: 0, y: 0 })
    expect(id).toBe('BB1')
    expect(project().components[0]?.pins).toHaveLength(420)
    expect(
      project().components[0]?.pins.every((pin) => pin.type === 'passive' && pin.netId === null),
    ).toBe(true)
    expect(project().wires).toEqual([])
    expect(project().nets).toEqual([])
    state().moveComponent(id, { x: 2, y: 4 })
    state().rotateComponent(id)
    expect(project().components[0]?.position).toEqual({ x: 2, y: 4, rotation: 90 })
  })

  it('rejects a short through a strip without history or cable mutation', () => {
    const { board, source } = setup()
    expect(state().connectPins(endpoint(source, 'positive'), endpoint(board, 'a1')).ok).toBe(true)
    const before = project()
    const history = state().history
    expect(state().connectPins(endpoint(source, 'negative'), endpoint(board, 'e1')).ok).toBe(false)
    expect(project()).toBe(before)
    expect(state().history).toBe(history)
    expect(state().connectPins(endpoint(source, 'negative'), endpoint(board, 'f1')).ok).toBe(true)
  })

  it('removes one wire with one undoable history entry, rebuilding connectivity', () => {
    const { board, r1, r2 } = setup()
    state().connectPins(endpoint(r1, 'a'), endpoint(board, 'a1'))
    state().connectPins(endpoint(r2, 'a'), endpoint(board, 'e1'))
    const before = project()
    const wireId = before.wires?.[0]?.id
    if (!wireId) throw new Error('Missing wire')
    const length = state().history.past.length
    state().removeWire(wireId)
    const after = project()
    expect(state().history.past).toHaveLength(length + 1)
    expect(after.wires).toHaveLength(1)
    expect(after.components.find((component) => component.id === r1)?.pins[0]?.netId).toBeNull()
    expect(after.components.find((component) => component.id === r2)?.pins[0]?.netId).not.toBeNull()
    state().undo()
    expect(project()).toBe(before)
    state().redo()
    expect(project()).toBe(after)
    state().removeWire('missing')
    expect(project()).toBe(after)
  })

  it('deleting board disconnects outside pins and undo restores cables and topology', () => {
    const { board, r1, r2 } = setup()
    state().connectPins(endpoint(r1, 'a'), endpoint(board, 'a1'))
    state().connectPins(endpoint(r2, 'a'), endpoint(board, 'e1'))
    const before = project()
    state().removeComponent(board)
    expect(project().wires).toEqual([])
    expect(project().nets).toEqual([])
    expect(
      project()
        .components.flatMap((component) => component.pins)
        .every((pin) => pin.netId === null),
    ).toBe(true)
    state().undo()
    expect(project()).toBe(before)
  })

  it.each(['capacitor', 'ldr', 'potentiometer', 'bjt_npn'])(
    'uses neutral non-source terminals for %s',
    (typeId) => {
      const id = state().addComponent(typeId, { x: 0, y: 0 })
      expect(
        project()
          .components.find((component) => component.id === id)
          ?.pins.every((pin) => pin.type === 'passive'),
      ).toBe(true)
    },
  )
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
