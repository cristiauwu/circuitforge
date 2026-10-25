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

import type { Category, Component, PinEndpoint, Project, Rotation } from '@circuitforge/netlist'
import { connectPins as connectPinsInNetlist, createEmptyProject } from '@circuitforge/netlist'
import type { Catalog, CatalogEntry } from '@circuitforge/validation'
import { canConnect } from '@circuitforge/validation'
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

/** Prefijo por defecto si la categoría no se conoce. */
const DEFAULT_PREFIX = 'X'

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
  for (const [typeId, fixture] of CATALOG_INDEX) {
    entries.push([
      typeId,
      {
        typeId,
        category: fixture.category,
        pins: fixture.pins.map((p) => ({ id: p.id, type: p.type })),
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

/** Quita un componente de todos los nets y elimina los que queden con un solo pin. */
function detachFromNets(project: Project, componentId: string): Project {
  const nets = project.nets
    .map((net) => ({
      ...net,
      pins: net.pins.filter((pin) => pin.componentId !== componentId),
    }))
    // Un net con un solo pin no es una conexión: se descarta. El aviso V-3 lo
    // reporta el validador, pero aquí ya no hay nada que conectar.
    .filter((net) => net.pins.length >= 2)

  return { ...project, nets }
}

/**
 * Crea un componente nuevo a partir de su ficha.
 *
 * Los pines salen de la biblioteca: el netlist no los inventa. Un `typeId`
 * desconocido produce un componente sin pines en vez de romper.
 */
function createComponent(id: string, typeId: string, position: CanvasPosition): Component {
  const fixture = CATALOG_INDEX.get(typeId)
  return {
    id,
    typeId,
    position: { x: position.x, y: position.y, rotation: 0 },
    params: {},
    pins: (fixture?.pins ?? []).map((pin) => ({ pinId: pin.id, type: pin.type, netId: null })),
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  history: createHistory(createEmptyProject('draft', 'Circuito sin título')),
  project: createEmptyProject('draft', 'Circuito sin título'),
  selectedId: null,

  addComponent: (typeId, position) => {
    const { history } = get()
    const fixture = CATALOG_INDEX.get(typeId)
    const prefix = fixture ? PREFIX_BY_CATEGORY[fixture.category] : DEFAULT_PREFIX
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
    if (!exists) return

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
    if (!exists) return

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

    const withoutComponent: Project = {
      ...history.present,
      components: history.present.components.filter((c) => c.id !== id),
      metadata: { ...history.present.metadata, updatedAt: new Date().toISOString() },
    }

    const nextHistory = push(history, detachFromNets(withoutComponent, id))
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
