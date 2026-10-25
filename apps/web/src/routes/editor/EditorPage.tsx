import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasErrorBoundary } from '@/features/editor/canvas/CanvasErrorBoundary'
import { CircuitCanvas } from '@/features/editor/canvas/CircuitCanvas'
import { findFreePosition } from '@/features/editor/canvas/findFreePosition'
import type { EditorAction } from '@/features/editor/canvas/keyboardShortcuts'
import { resolveShortcut, toKeyEventLike } from '@/features/editor/canvas/keyboardShortcuts'
import { SceneComponent } from '@/features/editor/canvas/SceneComponent'
import type { OrthoCamera, Viewport } from '@/features/editor/canvas/useGridSnap'
import { Inspector } from '@/features/editor/Inspector'
import { Palette } from '@/features/editor/Palette'
import { useEditorStore } from '@/lib/editor/useEditorStore'
import { Button, IconButton, PanelGlass } from '@/ui'

/**
 * Editor — la pantalla nucleo del OE-1.
 *
 * **Presupuesto de glass: 3.** Paleta, inspector y barra flotante.
 * `backdrop-filter` obliga a la GPU a releer el fondo en cada frame y el lienzo
 * necesita esos ciclos para el arrastre a 60 fps.
 *
 * **Estado:** todo el estado del circuito vive en `useEditorStore` (netlist como
 * fuente de verdad). Aquí solo se orquesta la UI y los atajos de teclado.
 */

/** Zoom inicial, el mismo que usa `CircuitCanvas`. */
const CANVAS_ZOOM = 1.25

/** Ancho del frustum con zoom 1, en unidades de mundo. */
const FRUSTUM_WIDTH = 800

export function EditorPage() {
  const project = useEditorStore((s) => s.project)
  const selectedId = useEditorStore((s) => s.selectedId)
  const selectComponent = useEditorStore((s) => s.selectComponent)
  const removeComponent = useEditorStore((s) => s.removeComponent)
  const rotateComponent = useEditorStore((s) => s.rotateComponent)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ width: 1200, height: 700 })

  /**
   * El viewport se mide del DOM en vez de asumirlo: la conversion
   * pantalla→mundo depende de él, y un valor equivocado desviaria el arrastre
   * exactamente en la diferencia.
   */
  useEffect(() => {
    const element = canvasRef.current
    if (!element) return

    const update = () => {
      const rect = element.getBoundingClientRect()
      setViewport({ width: rect.width, height: rect.height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  /** Cámara descrita para la conversión de coordenadas. */
  const camera = useMemo<OrthoCamera>(
    () => ({
      frustumWidth: FRUSTUM_WIDTH,
      center: { x: 0, y: 0 },
      zoom: CANVAS_ZOOM,
    }),
    [],
  )

  /**
   * Atajos de teclado.
   *
   * Toda la decision vive en `resolveShortcut` y `toKeyEventLike`, que son
   * funciones puras y por eso **se prueban sin navegador**. Aqui solo queda
   * ejecutar la accion, y el despacho se hace con una tabla para que anadir un
   * atajo no anada una rama.
   */
  useEffect(() => {
    const actions: Record<Exclude<EditorAction['kind'], 'none'>, () => void> = {
      undo,
      redo,
      delete: () => selectedId !== null && removeComponent(selectedId),
      rotate: () => selectedId !== null && rotateComponent(selectedId),
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveShortcut(toKeyEventLike(event), { hasSelection: selectedId !== null })
      if (action.kind === 'none') return
      event.preventDefault()
      actions[action.kind]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, removeComponent, rotateComponent, undo, redo])

  /**
   * Añade un componente en el primer hueco libre del lienzo.
   *
   * **Por qué no al centro sin más:** al añadir varios seguidos, todos caían en
   * (0,0) y el lienzo mostraba una sola mancha.
   *
   * **Por qué lee el estado con `getState()` y no del cierre:** un cierre captura
   * el valor de `project.components` del render en que se creó. Si el usuario
   * pulsa dos fichas en el mismo tick —un doble clic, o dos clics rápidos— ambas
   * llamadas ven la MISMA lista, calculan el mismo hueco y el segundo componente
   * cae encima del primero. Medido: con clics síncronos, tres componentes daban
   * una sola posición; con clics espaciados 250 ms, tres posiciones correctas.
   *
   * Leyendo del store en el momento de la acción, la segunda llamada ya ve el
   * componente que añadió la primera. El cierre deja de ser una trampa.
   *
   * El arrastre directo desde la paleta al lienzo es una mejora posterior: con el
   * clic ya se construye un circuito completo, que es lo que exige el OE-1.
   */
  const handleAdd = useCallback((typeId: string) => {
    const current = useEditorStore.getState()
    const free = findFreePosition(current.project.components.map((c) => c.position))
    current.addComponent(typeId, free)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/*
        Barra de simulacion flotante — superficie glass 1 de 3.
        El titulo vive aqui, integrado en la barra: da orientacion sin costar
        altura vertical, que es el recurso escaso en una herramienta de lienzo.
      */}
      <div className="px-3 pt-3">
        <div className="cf-glass mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 rounded-pill px-3 py-2">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-text-strong">Editor</h1>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-hairline-strong sm:block"
          />

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="primary" size="sm" plain disabled>
              Simular
            </Button>
            <IconButton
              label="Deshacer"
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!useEditorStore.getState().history.past.length}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </IconButton>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-hairline-strong sm:block"
          />

          {/* Lecturas de instrumentacion */}
          <dl className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
            <Reading label="V" value="5.00" unit="V" />
            <Reading label="I" value="0.00" unit="mA" />
            <Reading label="P" value="0.00" unit="mW" />
          </dl>

          <p className="w-full text-xs text-text-muted lg:ml-auto lg:w-auto">
            {project.components.length} componentes · {project.nets.length} nets
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[248px_minmax(0,1fr)_264px]">
        {/* Paleta — superficie glass 2 de 3 */}
        <PanelGlass className="order-2 min-h-0 min-w-0 overflow-hidden lg:order-1">
          <Palette onAdd={handleAdd} />
        </PanelGlass>

        {/* Lienzo R3F, aislado tras un limite de errores */}
        <div ref={canvasRef} className="order-1 flex min-h-[420px] min-w-0 flex-col lg:order-2">
          {/*
            El limite aisla un fallo de WebGL: sin el, el error sube al
            ErrorBoundary de la ruta y tumba toda la pantalla del editor. Con el,
            el usuario pierde el lienzo pero conserva la paleta, el inspector y la
            navegacion.
          */}
          <CanvasErrorBoundary>
            <CircuitCanvas onPointerMissed={() => selectComponent(null)}>
              {project.components.map((component) => (
                <SceneComponent
                  key={component.id}
                  componentId={component.id}
                  camera={camera}
                  viewport={viewport}
                />
              ))}
            </CircuitCanvas>
          </CanvasErrorBoundary>
        </div>

        {/* Inspector — superficie glass 3 de 3 */}
        <PanelGlass className="order-3 min-h-0 min-w-0 overflow-hidden">
          <Inspector selectedId={selectedId} />
        </PanelGlass>
      </div>
    </div>
  )
}

/**
 * Lectura de instrumentacion.
 *
 * Etiqueta en eyebrow y valor en monoespaciada con el color del texto principal.
 * Pintar el valor en cian lo volveria decoracion: con tres lecturas cian, el
 * cian dejaria de significar "esto es una medicion en vivo".
 */
function Reading({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="cf-eyebrow">{label}</dt>
      <dd className="cf-mono text-sm font-medium text-text-strong">{value}</dd>
      <dd className="cf-mono text-2xs text-text-muted">{unit}</dd>
    </div>
  )
}
