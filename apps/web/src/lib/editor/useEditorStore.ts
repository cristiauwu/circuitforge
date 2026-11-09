/**
 * Store del editor.
 *
 * Envuelve un `Project` de `@circuitforge/netlist` — la fuente de verdad (D-1) —
 * y expone las acciones que el lienzo, la paleta y el inspector comparten.
 *
 * **Toda mutación pasa por el historial**, salvo la selección: seleccionar no es
 * una edición y no debería llenar la pila de deshacer.
 *
 * Por qué Zustand y no `useState`: hasta ahora el estado cabía en un componente.
 * Con netlist, selección, historial y un arrastre en curso, el estado es de
 * dominio y lo consumen tres paneles distintos. Elevarlo a un store evita
 * pasarlo por props a través de componentes que no lo usan.
 */

import type {
  Category,
  Component,
  ParamValue,
  PinEndpoint,
  Project,
  Rotation,
} from '@circuitforge/netlist'
import {
  buildMount,
  COMPONENT_INDEX,
  connectPins as connectPinsInNetlist,
  createEmptyProject,
  getDefaultParameters,
  materializeWires,
  recomputeNets,
  removeComponent as removeComponentInNetlist,
  removeWire as removeWireInNetlist,
  resolveMountedPose,
  validateParameterValue,
} from '@circuitforge/netlist'
import type { Catalog, CatalogEntry } from '@circuitforge/validation'
import { canConnect, ruleV1 } from '@circuitforge/validation'
import { create } from 'zustand'
import { CATALOG_INDEX } from '@/lib/fixtures/components'
import { canRedo, canUndo, createHistory, type History, push, redo, undo } from './history'

/** Posición en el lienzo, en coordenadas de mundo. */
export interface CanvasPosition {
  x: number
  y: number
}

/** Resultado de intentar una conexión. */
export interface ConnectResult {
  ok: boolean
  /** Mensaje en español para mostrar en la interfaz. Solo si `ok` es false. */
  message?: string
}

export interface EditResult {
  ok: boolean
  error?: string
}

export interface EditorState {
  /** El proyecto con su historial de deshacer/rehacer. */
  history: History<Project>
  /** Proyecto activo. Es `history.present`, expuesto por comodidad. */
  project: Project
  /** Componente seleccionado, o `null`. No forma parte del historial. */
  selectedId: string | null

  addComponent: (typeId: string, position: CanvasPosition) => string
  moveComponent: (id: string, position: CanvasPosition) => void
  rotateComponent: (id: string) => void
  removeComponent: (id: string) => void
  selectComponent: (id: string | null) => void
  connectPins: (a: PinEndpoint, b: PinEndpoint) => ConnectResult
  removeWire: (wireId: string) => void
  mountComponent: (
    componentId: string,
    boardId: string,
    anchorContactId: string,
    rotation?: Rotation,
  ) => EditResult
  unmountComponent: (componentId: string) => EditResult
  updateParameter: (componentId: string, key: string, value: ParamValue) => EditResult
  undo: () => void
  redo: () => void
  reset: () => void
}

/**
 * Prefijo del identificador legible según la categoría.
 *
 * Se usa la categoría y no el `typeId` para que el id sea corto y estable:
 * `R1`, `C2`, `D1`, `U1`. Es la convención de cualquier editor de esquemáticos.
 */
const PREFIX_BY_CATEGORY: Record<Category, string> = {
  passive: 'R',
  semiconductor: 'D',
  mcu: 'U',
  sensor: 'S',
  actuator: 'M',
  esc: 'ESC',
  source: 'V',
  battery: 'BT',
  connectivity: 'J',
}

/**
 * Prefijos que la categoría NO distingue bien.
 *
 * `gnd_ref` esta en la categoria `source` porque electricamente es una
 * referencia de potencial, pero **rotularlo `V2` es un error de lectura**: en
 * cualquier esquematico la tierra es `GND`, y un `V` significa fuente. Medido en
 * el navegador: al colocar una tierra salia etiquetada `V2`, que se confunde con
 * la fuente `V1` de al lado.
 *
 * Este mapa tiene prioridad sobre la categoria. Solo recoge los casos donde la
 * taxonomia electrica y la convencion de rotulado no coinciden.
 */
const PREFIX_BY_TYPE: Record<string, string> = {
  gnd_ref: 'GND',
  breadboard: 'BB',
  // Los capacitores e inductores comparten la categoria `passive` con las
  // resistencias, asi que sin esto los tres saldrian `R3`, `R4`, `R5`.
  capacitor: 'C',
  inductor: 'L',
  potentiometer: 'RV',
  // Diodos y LED comparten `semiconductor` con el transistor.
  led: 'D',
  diode: 'D',
  bjt_npn: 'Q',
}

/** Prefijo por defecto si la categoría no se conoce. */
const DEFAULT_PREFIX = 'X'

/**
 * Elige el prefijo de un componente.
 *
 * El `typeId` gana a la categoria cuando esta en el mapa de excepciones.
 */
function prefixFor(typeId: string, category: Category | undefined): string {
  const byType = PREFIX_BY_TYPE[typeId]
  if (byType !== undefined) return byType
  if (category === undefined) return DEFAULT_PREFIX
  return PREFIX_BY_CATEGORY[category]
}

/**
 * Contador de componentes por prefijo.
 *
 * **Por qué no se deriva del proyecto:** el máximo histórico no es
 * reconstruible desde el estado actual. Si se eliminara `R2` teniendo solo `R1`,
 * escanear los componentes vivos devolvería `R2` otra vez, y reutilizar un id
 * crea *aliasing*: una selección o un cable que apuntara a `R2` pasaría a
 * apuntar a un componente distinto.
 *
 * Es el mismo problema —y la misma solución— que el contador `nextNetSeq` del
 * netlist, y por la misma razón.
 */
const idCounters = new Map<string, number>()

/**
 * Genera el siguiente id libre para un prefijo dado.
 *
 * Usa el contador monótono. Si el prefijo no tiene contador todavía, lo
 * inicializa desde el mayor sufijo visible, que es una aproximación
 * conservadora: nunca reutiliza un id que exista en pantalla.
 */
function nextComponentId(components: Component[], prefix: string): string {
  const known = idCounters.get(prefix)

  if (known === undefined) {
    let max = 0
    const pattern = new RegExp(`^${prefix}(\\d+)$`)
    for (const component of components) {
      const digits = pattern.exec(component.id)?.[1]
      if (digits === undefined) continue
      const n = Number.parseInt(digits, 10)
      if (Number.isFinite(n) && n > max) max = n
    }
    idCounters.set(prefix, max + 1)
    return `${prefix}${max + 1}`
  }

  const next = known + 1
  idCounters.set(prefix, next)
  return `${prefix}${next}`
}

/**
 * Construye el catálogo que espera `@circuitforge/validation`.
 *
 * `validation` declara su propio `CatalogEntry` en vez de importar el tipo de la
 * biblioteca, para no acoplarse. Aquí se hace la traducción, en el único punto
 * donde ambos mundos se encuentran.
 */
function buildCatalog(): Catalog {
  const entries: [string, CatalogEntry][] = []
  for (const [typeId, fixture] of COMPONENT_INDEX) {
    entries.push([
      typeId,
      {
        typeId,
        category: fixture.category,
        pins: fixture.pins.map((p) => ({ ...p })),
      },
    ])
  }
  return new Map(entries)
}

/** Rota un cuarto de vuelta en sentido horario, sin salirse de 0/90/180/270. */
function nextRotation(current: Rotation): Rotation {
  const order: Rotation[] = [0, 90, 180, 270]
  const index = order.indexOf(current)
  // Si el valor fuera inesperado, volver a 0 en vez de producir un ángulo inválido.
  const next = order[(index + 1) % order.length]
  return next ?? 0
}

/**
 * Crea un componente nuevo a partir de su ficha.
 *
 * Los pines salen de la biblioteca: el netlist no los inventa. Un `typeId`
 * desconocido produce un componente sin pines en vez de romper.
 */
function createComponent(id: string, typeId: string, position: CanvasPosition): Component {
  const fixture = COMPONENT_INDEX.get(typeId)
  return {
    id,
    typeId,
    position: { x: position.x, y: position.y, rotation: 0 },
    params: getDefaultParameters(typeId),
    pins: (fixture?.pins ?? []).map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
  }
}

/** A complete hypothetical edit is checked once, before any history/selection mutation. */
function safeCandidate(candidate: Project): Project {
  const project = recomputeNets(candidate)
  const blocking = ruleV1(project, buildCatalog())[0]
  if (blocking) throw new Error(blocking.message)
  return { ...project, metadata: { ...project.metadata, updatedAt: new Date().toISOString() } }
}
const editError = (error: unknown): EditResult => ({
  ok: false,
  error: error instanceof Error ? error.message : 'No se puede realizar esta edición.',
})

export const useEditorStore = create<EditorState>((set, get) => ({
  history: createHistory(createEmptyProject('draft', 'Circuito sin título')),
  project: createEmptyProject('draft', 'Circuito sin título'),
  selectedId: null,

  addComponent: (typeId, position) => {
    const { history } = get()
    const fixture = CATALOG_INDEX.get(typeId)
    // El prefijo sale del `typeId` cuando la categoria no basta: `gnd_ref` es
    // `source` para la taxonomia electrica, pero se rotula `GND`, no `V`.
    const prefix =
      COMPONENT_INDEX.get(typeId)?.referencePrefix ?? prefixFor(typeId, fixture?.category)
    const id = nextComponentId(history.present.components, prefix)
    const component = createComponent(id, typeId, position)

    const next: Project = {
      ...history.present,
      components: [...history.present.components, component],
      metadata: { ...history.present.metadata, updatedAt: new Date().toISOString() },
    }

    const nextHistory = push(history, next)
    set({ history: nextHistory, project: nextHistory.present, selectedId: id })
    return id
  },

  moveComponent: (id, position) => {
    const { history } = get()
    const exists = history.present.components.some((c) => c.id === id)
    if (!exists || history.present.mounts?.some((mount) => mount.componentId === id)) return

    const next: Project = {
      ...history.present,
      components: history.present.components.map((c) =>
        c.id === id ? { ...c, position: { ...c.position, x: position.x, y: position.y } } : c,
      ),
      metadata: { ...history.present.metadata, updatedAt: new Date().toISOString() },
    }

    const nextHistory = push(history, next)
    set({ history: nextHistory, project: nextHistory.present })
  },

  rotateComponent: (id) => {
    const { history } = get()
    const exists = history.present.components.some((c) => c.id === id)
    if (!exists || history.present.mounts?.some((mount) => mount.componentId === id)) return

    const next: Project = {
      ...history.present,
      components: history.present.components.map((c) =>
        c.id === id
          ? { ...c, position: { ...c.position, rotation: nextRotation(c.position.rotation) } }
          : c,
      ),
      metadata: { ...history.present.metadata, updatedAt: new Date().toISOString() },
    }

    const nextHistory = push(history, next)
    set({ history: nextHistory, project: nextHistory.present })
  },

  removeComponent: (id) => {
    const { history, selectedId } = get()
    const exists = history.present.components.some((c) => c.id === id)
    if (!exists) return

    const nextHistory = push(history, removeComponentInNetlist(history.present, id))
    set({
      history: nextHistory,
      project: nextHistory.present,
      // Si se elimina el seleccionado, la selección deja de tener sentido.
      selectedId: selectedId === id ? null : selectedId,
    })
  },

  selectComponent: (id) => {
    // Fuera del historial a propósito: seleccionar no es editar.
    set({ selectedId: id })
  },

  connectPins: (a, b) => {
    const { history } = get()
    const project = history.present

    const check = canConnect(project, a, b, buildCatalog())
    if (!check.allowed) {
      return {
        ok: false,
        message: check.violation?.message ?? 'No se pueden conectar esos pines.',
      }
    }

    let connected: Project
    try {
      connected = connectPinsInNetlist(project, a, b)
    } catch {
      // El netlist lanza si los pines ya comparten net o no existen.
      return { ok: false, message: 'Esos pines ya están conectados.' }
    }

    const nextHistory = push(history, connected)
    set({ history: nextHistory, project: nextHistory.present })
    return { ok: true }
  },

  removeWire: (wireId) => {
    const { history } = get()
    const next = removeWireInNetlist(history.present, wireId)
    if (next === history.present) return
    const nextHistory = push(history, next)
    set({ history: nextHistory, project: nextHistory.present })
  },

  mountComponent: (componentId, boardId, anchorContactId, rotation = 0) => {
    const { history } = get()
    try {
      const base = materializeWires(history.present)
      const mount = buildMount(base, componentId, boardId, anchorContactId, rotation)
      const existing = base.mounts?.find((item) => item.componentId === componentId)
      if (existing && JSON.stringify(existing) === JSON.stringify(mount)) return { ok: true }
      const next = safeCandidate({
        ...base,
        mounts: [...(base.mounts ?? []).filter((item) => item.componentId !== componentId), mount],
      })
      const nextHistory = push(history, next)
      set({ history: nextHistory, project: nextHistory.present })
      return { ok: true }
    } catch (error) {
      return editError(error)
    }
  },

  unmountComponent: (componentId) => {
    const { history } = get()
    if (!history.present.components.some((item) => item.id === componentId))
      return { ok: false, error: 'Componente desconocido.' }
    if (!history.present.mounts?.some((item) => item.componentId === componentId))
      return { ok: true }
    try {
      const base = materializeWires(history.present)
      const pose = resolveMountedPose(base, componentId)
      if (!pose) throw new Error('Montaje inválido.')
      const next = safeCandidate({
        ...base,
        mounts: (base.mounts ?? []).filter((item) => item.componentId !== componentId),
        components: base.components.map((item) =>
          item.id === componentId
            ? {
                ...item,
                position: { x: pose.x, y: pose.y, rotation: pose.rotation },
                elevation: pose.elevation,
              }
            : item,
        ),
      })
      const nextHistory = push(history, next)
      set({ history: nextHistory, project: nextHistory.present })
      return { ok: true }
    } catch (error) {
      return editError(error)
    }
  },

  updateParameter: (componentId, key, value) => {
    const { history } = get()
    const component = history.present.components.find((item) => item.id === componentId)
    if (!component || !validateParameterValue(component.typeId, key, value))
      return { ok: false, error: 'Valor de parámetro inválido.' }
    if (component.params[key] === value) return { ok: true }
    try {
      const base = materializeWires(history.present)
      const next = safeCandidate({
        ...base,
        components: base.components.map((item) =>
          item.id === componentId ? { ...item, params: { ...item.params, [key]: value } } : item,
        ),
      })
      const nextHistory = push(history, next)
      set({ history: nextHistory, project: nextHistory.present })
      return { ok: true }
    } catch (error) {
      return editError(error)
    }
  },

  undo: () => {
    const { history } = get()
    const nextHistory = undo(history)
    if (nextHistory === history) return
    set({ history: nextHistory, project: nextHistory.present })
  },

  redo: () => {
    const { history } = get()
    const nextHistory = redo(history)
    if (nextHistory === history) return
    set({ history: nextHistory, project: nextHistory.present })
  },

  reset: () => {
    const fresh = createEmptyProject('draft', 'Circuito sin título')
    // Los contadores de id también se reinician: si no, tras un reset el primer
    // componente nuevo sería `R7` en vez de `R1`, que es desconcertante.
    idCounters.clear()
    set({ history: createHistory(fresh), project: fresh, selectedId: null })
  },
}))

/** Selector: ¿se puede deshacer? */
export const selectCanUndo = (state: EditorState): boolean => canUndo(state.history)

/** Selector: ¿se puede rehacer? */
export const selectCanRedo = (state: EditorState): boolean => canRedo(state.history)

// En desarrollo se expone el store para poder medir y depurar desde la consola
// del navegador (por ejemplo, para la medición de fps de la tarea 4).
if (import.meta.env.DEV) {
  ;(globalThis as unknown as { __editor?: unknown }).__editor = useEditorStore
}
