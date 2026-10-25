import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CanvasErrorBoundary } from '@/features/editor/canvas/CanvasErrorBoundary'
import { CircuitCanvas } from '@/features/editor/canvas/CircuitCanvas'
import { findFreePosition } from '@/features/editor/canvas/findFreePosition'
import type { EditorAction } from '@/features/editor/canvas/keyboardShortcuts'
import { resolveShortcut, toKeyEventLike } from '@/features/editor/canvas/keyboardShortcuts'
import { SceneComponent } from '@/features/editor/canvas/SceneComponent'
import type { OrthoCamera, Viewport } from '@/features/editor/canvas/useGridSnap'
import { useWiringProvider, WiringProviderContext } from '@/features/editor/canvas/useWiring'
import { WireLayer } from '@/features/editor/canvas/WireLayer'
import { Inspector } from '@/features/editor/Inspector'
import { Palette } from '@/features/editor/Palette'
import { cx } from '@/lib/cx'
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
   * Estado del cableado.
   *
   * Vive AQUI y no en cada `SceneComponent` porque es compartido: el primer clic
   * se registra en un componente y el segundo llega a otro distinto. Con el
   * estado dentro del componente, el pin de origen se perderia entre los dos
   * clics y el cable nunca se completaria.
   */
  const wiring = useWiringProvider()

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
      /*
       * Escape cancela el cableado en curso.
       *
       * Se comprueba ANTES que los demas atajos y sin pasar por
       * `resolveShortcut`: es un atajo contextual que solo existe mientras hay
       * un cable a medias, y meterlo en la tabla pura obligaria a pasarle el
       * estado del cableado, ensuciando una funcion que hoy solo depende de la
       * tecla y la seleccion.
       */
      if (event.key === 'Escape' && wiring.pending !== null) {
        event.preventDefault()
        wiring.cancel()
        return
      }

      const action = resolveShortcut(toKeyEventLike(event), { hasSelection: selectedId !== null })
      if (action.kind === 'none') return
      event.preventDefault()
      actions[action.kind]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, removeComponent, rotateComponent, undo, redo, wiring])

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
        {/*
          `relative` es necesario: el aviso de cableado se posiciona en absoluto
          respecto a este contenedor, no a la pagina.
        */}
        <div
          ref={canvasRef}
          className="relative order-1 flex min-h-[420px] min-w-0 flex-col lg:order-2"
        >
          {/*
            El limite aisla un fallo de WebGL: sin el, el error sube al
            ErrorBoundary de la ruta y tumba toda la pantalla del editor. Con el,
            el usuario pierde el lienzo pero conserva la paleta, el inspector y la
            navegacion.
          */}
          <CanvasErrorBoundary>
            {/*
              El proveedor de cableado envuelve SOLO el canvas: los pines viven
              dentro de la escena, y montarlo mas arriba expondria el contexto a
              la paleta y al inspector, que no lo necesitan.
            */}
            <WiringProviderContext.Provider value={wiring}>
              <CircuitCanvas
                onPointerMissed={() => {
                  // Pulsar el vacio deselecciona Y cancela el cableado: si el
                  // usuario hace clic fuera, lo que quiere es salir de lo que
                  // estaba haciendo.
                  selectComponent(null)
                  if (wiring.pending !== null) wiring.cancel()
                }}
              >
                {/* Cables: se dibujan ANTES que los componentes para que queden
                    por debajo de los simbolos y no tapen los pines. */}
                <WireLayer components={project.components} nets={project.nets} />

                {project.components.map((component) => (
                  <SceneComponent
                    key={component.id}
                    componentId={component.id}
                    camera={camera}
                    viewport={viewport}
                  />
                ))}
              </CircuitCanvas>
            </WiringProviderContext.Provider>
          </CanvasErrorBoundary>

          {/*
            Aviso del cableado en curso.
            Va fuera del canvas, sobre el lienzo, porque un mensaje dentro de la
            escena 3D no seria accesible: los lectores de pantalla no leen
            texturas. Aqui es HTML real, con `role="status"` para que se anuncie.
          */}
          <WiringHint
            pending={wiring.pending !== null}
            error={wiring.error}
            onCancel={wiring.cancel}
          />
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

/**
 * Aviso flotante del cableado.
 *
 * Aparece sobre el lienzo cuando hay un cable a medias o cuando el ultimo intento
 * fue rechazado. Se monta en HTML y no dentro de la escena 3D por accesibilidad:
 * un mensaje dibujado como textura no lo lee un lector de pantalla, y `role`
 * tampoco se aplica a una malla de Three.js.
 *
 * Tres estados, en orden de prioridad:
 *  1. **Error**: la conexion se rechazo. Se explica por que (V-1, V-4...) y se
 *     recuerda que el pin de origen sigue activo, que es lo que el usuario no
 *     puede deducir de la pantalla.
 *  2. **En curso**: hay un pin de origen. Se dice que hacer a continuacion.
 *  3. **Oculto**: no pasa nada, no se muestra nada.
 */
function WiringHint({
  pending,
  error,
  onCancel,
}: {
  pending: boolean
  error: string | null
  onCancel: () => void
}) {
  if (!pending && error === null) return null

  const isError = error !== null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"
    >
      <div
        className={cx(
          'cf-glass pointer-events-auto flex max-w-[560px] items-center gap-3 px-4 py-2.5',
          isError ? 'border-warning' : 'border-accent',
        )}
      >
        <span
          aria-hidden="true"
          className={cx('size-2 shrink-0 rounded-pill', isError ? 'bg-warning' : 'bg-accent')}
        />

        <p className="min-w-0 text-xs leading-snug text-text">
          {isError ? (
            <>
              <span className="font-medium text-warning">{error}</span>
              <span className="text-text-secondary"> · elige otro destino</span>
            </>
          ) : (
            <>
              <span className="font-medium text-accent">Cableando</span>
              <span className="text-text-secondary">
                {' '}
                · pulsa otro pin para conectar, o Escape para cancelar
              </span>
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-pill px-2 py-1 text-2xs font-medium text-text-muted transition-colors duration-fast hover:bg-[var(--cf-fill-dim)] hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
