import type { Category, PinEndpoint } from '@circuitforge/netlist'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveShortcut, toKeyEventLike } from '@/features/editor/canvas/keyboardShortcuts'
import { ActuatorControlHUD } from '@/features/editor/components/ActuatorControlHUD'
import { EditorCatalogDrawer } from '@/features/editor/components/EditorCatalogDrawer'
import { EditorFloatingDock } from '@/features/editor/components/EditorFloatingDock'
import { EditorHeader } from '@/features/editor/components/EditorHeader'
import { EditorInspectorDrawer } from '@/features/editor/components/EditorInspectorDrawer'
import { TelemetryDashboardTray } from '@/features/editor/components/TelemetryDashboardTray'
import { WiringGuideOverlay } from '@/features/editor/components/WiringGuideOverlay'
import { WorkspaceSplit } from '@/features/editor/workspace/WorkspaceSplit'
import { canShowSplit, clampSplitWidth } from '@/features/editor/workspace/workspaceLayout'
import { isEditableType } from '@/features/nexo/capabilities'
import { NexoScene, type ProjectSceneActions, type SceneAPI } from '@/features/nexo/NexoScene'
import { createProjectController, type ProjectSnapshot } from '@/features/nexo/projectController'
import { useNexoSession } from '@/features/nexo/session'
import { useErcStore } from '@/features/simulation/useErcStore'
import { useSimulationStore } from '@/features/simulation/useSimulationStore'
import { CATALOG, CATALOG_INDEX } from '@/lib/fixtures/components'

export function EditorPage() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const controllerRef = useRef<ReturnType<typeof createProjectController> | null>(null)
  const sceneRef = useRef<SceneAPI | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [centerWidth, setCenterWidth] = useState(800)
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [typeId] = useState('esp32')
  const [tool, setTool] = useState<'part' | 'project'>('part')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const catalogRef = useRef<HTMLElement>(null)
  const toolsRef = useRef<HTMLElement>(null)
  const catalogTriggerRef = useRef<HTMLButtonElement | null>(null)
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const location = useLocation()
  const [hoveredPin, setHoveredPin] = useState<PinEndpoint | null>(null)

  const closeDrawer = useCallback((drawer: 'catalog' | 'tools', restoreFocus = true) => {
    const panel = drawer === 'catalog' ? catalogRef.current : toolsRef.current
    const trigger = drawer === 'catalog' ? catalogTriggerRef.current : toolsTriggerRef.current
    const responsive = window.innerWidth <= (drawer === 'catalog' ? 650 : 1000)
    if (restoreFocus && responsive && panel?.contains(document.activeElement)) {
      const fallback = document.querySelector<HTMLButtonElement>(
        '.nx-center-toolbar button[aria-controls="editor-tools"]',
      )
      ;(trigger ?? fallback)?.focus({ preventScroll: true })
    }
    if (drawer === 'catalog') setCatalogOpen(false)
    else setToolsOpen(false)
  }, [])

  const toggleDrawer = (drawer: 'catalog' | 'tools', trigger: HTMLButtonElement) => {
    useNexoSession.getState().continueWork()
    if (drawer === 'catalog') {
      catalogTriggerRef.current = trigger
      setToolsOpen(false)
      if (catalogOpen) closeDrawer('catalog')
      else setCatalogOpen(true)
    } else {
      toolsTriggerRef.current = trigger
      setCatalogOpen(false)
      if (toolsOpen) closeDrawer('tools')
      else setToolsOpen(true)
    }
  }

  useEffect(() => {
    if (catalogOpen && window.innerWidth <= 650) catalogRef.current?.focus()
    if (toolsOpen && window.innerWidth <= 1000) toolsRef.current?.focus()
  }, [catalogOpen, toolsOpen])

  useEffect(() => {
    if (new URLSearchParams(location.search).get('help') !== 'idea') return
    setTool('project')
    setCatalogOpen(false)
    setToolsOpen(true)
    const frame = requestAnimationFrame(() => {
      document.getElementById('nexo-notes')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])

  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [cameraView, setCameraView] = useState<'perspective' | 'top'>('perspective')

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 4500)
    return () => window.clearTimeout(timer)
  }, [message])

  const code = useNexoSession((s) => s.code)
  const notes = useNexoSession((s) => s.notes)
  const view = useNexoSession((s) => s.view)
  const ratio = useNexoSession((s) => s.splitRatio)

  const isSimRunning = useSimulationStore((s) => s.isRunning)
  const simError = useSimulationStore((s) => s.error)
  const toggleSimRunning = useSimulationStore((s) => s.toggleRunning)
  const executeSimulation = useSimulationStore((s) => s.execute)

  const ercViolationsCount = useErcStore((s) => s.violationsCount)
  const hasErcError = useErcStore((s) => s.hasError)

  // Sincronización atómica desacoplada de proyecto y simulación con el store ERC
  useEffect(() => {
    const proj = snapshot?.project ?? null
    if (!proj) {
      useErcStore.getState().syncWithProject(null)
      return
    }

    if (isSimRunning) {
      executeSimulation(proj).then((res) => {
        if (res.ok) {
          useErcStore.getState().syncWithProject(proj, res.voltages)
        } else {
          useErcStore.getState().syncWithProject(proj)
        }
      })
    } else {
      useErcStore.getState().syncWithProject(proj)
    }
  }, [isSimRunning, snapshot?.project, executeSimulation])

  const setCode = useNexoSession((s) => s.setCode)
  const setNotes = useNexoSession((s) => s.setNotes)
  const setView = useNexoSession((s) => s.setView)
  const setSplitRatio = useNexoSession((s) => s.setSplitRatio)
  const split = view === 'split' && canShowSplit(centerWidth)
  const showMount = view !== 'code'
  const showCode = view === 'code' || split
  const schematicWidth = clampSplitWidth(centerWidth * ratio, centerWidth)
  const project = snapshot?.project
  const selected = project?.components.find((c) => c.id === snapshot?.selectedId)
  const fixture = CATALOG_INDEX.get(selected?.typeId ?? typeId)
  const wires = project?.wires ?? []

  const catalog = CATALOG.filter(
    (item) =>
      isEditableType(item.typeId) &&
      (category === 'all' || item.category === category) &&
      `${item.name} ${item.typeId} ${item.description}`
        .toLocaleLowerCase('es')
        .includes(query.toLocaleLowerCase('es')),
  )

  useEffect(() => {
    const controller = createProjectController(setSnapshot, setMessage)
    controllerRef.current = controller
    setSnapshot(controller.getSnapshot())
    return () => {
      controller.cancel()
      controller.dispose()
      controllerRef.current = null
    }
  }, [])

  useEffect(() => {
    const center = centerRef.current
    if (!center) return
    const update = () => {
      setCenterWidth(center.clientWidth)
      setWindowWidth(window.innerWidth)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(center)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const addPiece = useCallback((pTypeId: string) => {
    useNexoSession.getState().continueWork()
    controllerRef.current?.add(pTypeId)
  }, [])

  const cancel = useCallback(() => {
    useNexoSession.getState().continueWork()
    controllerRef.current?.cancel()
  }, [])

  const pin = useCallback((endpoint: PinEndpoint) => {
    useNexoSession.getState().continueWork()
    controllerRef.current?.pin(endpoint)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const isInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
      if (isInput) return

      if (event.key === 'Escape') {
        event.preventDefault()
        controllerRef.current?.cancel()
        return
      }

      const action = resolveShortcut(toKeyEventLike(event), {
        hasSelection: Boolean(snapshot?.selectedId),
      })
      if (action.kind === 'none') return

      useNexoSession.getState().continueWork()
      switch (action.kind) {
        case 'undo':
          event.preventDefault()
          controllerRef.current?.undo()
          break
        case 'redo':
          event.preventDefault()
          controllerRef.current?.redo()
          break
        case 'rotate':
          event.preventDefault()
          controllerRef.current?.rotate()
          break
        case 'delete':
          event.preventDefault()
          controllerRef.current?.remove()
          break
      }
    }
    const onBlur = () => {
      controllerRef.current?.cancel()
    }
    const onPointerCancel = () => {
      controllerRef.current?.cancel()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [snapshot?.selectedId])

  const actions: ProjectSceneActions = useMemo(
    () => ({
      onSelect: (id) => controllerRef.current?.select(id),
      onPin: (endpoint) => controllerRef.current?.pin(endpoint),
      onDragStart: (id) => controllerRef.current?.beginDrag(id),
      onDragPreview: (pos) => controllerRef.current?.previewDrag(pos),
      onDragCommit: () => controllerRef.current?.commitDrag(),
      onDragCancel: () => controllerRef.current?.cancelDrag(),
      onPinHover: (endpoint) => setHoveredPin(endpoint),
      onUpdateParameter: (componentId, key, value) => {
        controllerRef.current?.updateParameter(componentId, key, value)
      },
    }),
    [],
  )

  const onSceneReady = useCallback((api: SceneAPI | null) => {
    sceneRef.current = api
  }, [])

  return (
    <div className="nexo-app nexo-app-editor" data-theme="light">
      <EditorHeader
        projectName={project?.name ?? 'Circuito sin título'}
        stats={{
          pieces: project?.components.length ?? 0,
          wires: wires.length,
          nets: project?.nets.length ?? 0,
        }}
        view={view}
        onViewChange={(newView) => {
          useNexoSession.getState().continueWork()
          setView(newView)
        }}
        canSplit={canShowSplit(centerWidth)}
        isSimRunning={isSimRunning}
        simError={simError}
        onToggleSim={() => {
          useNexoSession.getState().continueWork()
          if (!isSimRunning && project) {
            executeSimulation(project)
          }
          toggleSimRunning()
        }}
        diagnosticsOpen={diagnosticsOpen}
        onToggleDiagnostics={() => {
          useNexoSession.getState().continueWork()
          setDiagnosticsOpen(!diagnosticsOpen)
        }}
        ercViolationsCount={ercViolationsCount}
        hasErcError={hasErcError}
        toolsOpen={toolsOpen}
        onToggleTools={(trigger) => toggleDrawer('tools', trigger)}
        onUndo={() => {
          useNexoSession.getState().continueWork()
          controllerRef.current?.undo()
        }}
        onRedo={() => {
          useNexoSession.getState().continueWork()
          controllerRef.current?.redo()
        }}
        canUndoState={snapshot?.canUndo}
        canRedoState={snapshot?.canRedo}
        wiringPending={snapshot?.wiring.pending}
        onCancelWiring={cancel}
        toolsTriggerRef={toolsTriggerRef}
      />

      {/* Tabs compactos en mobile */}
      <div className="nx-compact-tabs">
        <button
          type="button"
          className="nx-button"
          onClick={(event) => toggleDrawer('catalog', event.currentTarget)}
          aria-expanded={catalogOpen}
          aria-controls="editor-catalog"
        >
          Componentes
        </button>
        <button
          type="button"
          className="nx-button"
          onClick={(event) => toggleDrawer('tools', event.currentTarget)}
          aria-expanded={toolsOpen}
          aria-controls="editor-tools"
        >
          Inspector
        </button>
      </div>

      <div className="nx-workspace">
        <EditorCatalogDrawer
          catalogOpen={catalogOpen}
          onClose={() => closeDrawer('catalog')}
          catalogRef={catalogRef}
          query={query}
          onQueryChange={(q) => {
            useNexoSession.getState().continueWork()
            setQuery(q)
          }}
          category={category}
          onCategoryChange={(c) => {
            useNexoSession.getState().continueWork()
            setCategory(c)
          }}
          catalog={catalog}
          onAddPiece={addPiece}
          windowWidth={windowWidth}
        />

        <div className="nx-center" ref={centerRef}>
          <div className="nx-split">
            <section
              id="workspace-schematic"
              className="nx-mount"
              hidden={!showMount}
              style={split ? ({ flex: `0 0 ${schematicWidth}px` } as CSSProperties) : undefined}
              aria-label="Montaje 3D interactivo"
            >
              <div className="nx-mount-hud-top">
                <div
                  className="nx-feature-chip"
                  style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    color: '#0f172a',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <span className="nx-hud-badge-dot" />
                  <span>
                    {project?.components.length === 0
                      ? 'Lienzo 3D listo · Añade componentes desde el catálogo'
                      : `${project?.components.length} piezas · ${wires.length} cables · Snap magnético`}
                  </span>
                </div>

                <span className="nx-hud-badge">
                  <span>PBR 60 FPS</span>
                </span>
              </div>

              <WiringGuideOverlay
                pending={snapshot?.wiring.pending}
                hoveredPin={hoveredPin}
                onCancel={cancel}
                error={snapshot?.wiring.error}
                totalWires={wires.length}
              />

              {!snapshot?.wiring.pending && (
                <ActuatorControlHUD
                  selectedComponent={selected}
                  onUpdateParameter={(componentId, key, value) => {
                    controllerRef.current?.updateParameter(componentId, key, value)
                  }}
                  onDeselect={() => controllerRef.current?.select(null)}
                />
              )}

              <NexoScene
                mode="lab"
                {...(snapshot ? { snapshot } : {})}
                actions={actions}
                onReady={onSceneReady}
                className="nx-scene-host"
              />

              <EditorFloatingDock
                cameraView={cameraView}
                onPerspectiveClick={() => {
                  setCameraView('perspective')
                  sceneRef.current?.setView('perspective')
                }}
                onTopClick={() => {
                  setCameraView('top')
                  sceneRef.current?.setView('top')
                }}
                onFrameClick={() => {
                  sceneRef.current?.frameProject()
                }}
                onResetClick={() => {
                  sceneRef.current?.reset()
                }}
              />
            </section>

            {split && (
              <WorkspaceSplit
                width={centerWidth}
                value={schematicWidth}
                onChange={(w) => setSplitRatio(centerWidth > 0 ? w / centerWidth : 0.5)}
              />
            )}

            <section
              id="workspace-code"
              className="nx-code-panel"
              hidden={!showCode}
              aria-label="Firmware C++"
            >
              <header className="nx-code-header">
                <div>
                  <h2>Firmware C++</h2>
                  <p>Código fuente embebido para microcontroladores (Arduino UNO / ESP32).</p>
                </div>
              </header>

              <textarea
                className="nx-code-textarea"
                value={code}
                onChange={(e) => {
                  useNexoSession.getState().continueWork()
                  setCode(e.target.value)
                }}
                placeholder="// Escribe aquí el sketch de Arduino o ESP32..."
                spellCheck={false}
              />
            </section>
          </div>
        </div>

        <EditorInspectorDrawer
          toolsOpen={toolsOpen}
          onClose={() => closeDrawer('tools')}
          toolsRef={toolsRef}
          tool={tool}
          onToolChange={(t) => {
            useNexoSession.getState().continueWork()
            setTool(t)
          }}
          selected={selected ?? null}
          fixture={fixture}
          project={project ?? null}
          controller={controllerRef.current}
          setMessage={setMessage}
          snapshotPendingWiring={snapshot?.wiring.pending}
          onPin={pin}
          notes={notes}
          onNotesChange={(n) => {
            useNexoSession.getState().continueWork()
            setNotes(n)
          }}
          windowWidth={windowWidth}
          onWireRemove={(id) => {
            useNexoSession.getState().continueWork()
            controllerRef.current?.removeWire(id)
          }}
        />
      </div>

      <TelemetryDashboardTray
        open={diagnosticsOpen}
        onToggle={() => {
          useNexoSession.getState().continueWork()
          setDiagnosticsOpen(!diagnosticsOpen)
        }}
        project={project ?? null}
        wiringError={snapshot?.wiring.error}
        onSelectComponent={(id) => controllerRef.current?.select(id)}
      />

      <footer className="nx-statusbar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="nx-hud-badge-dot" />
          <span>CircuitForge 3D &bull; Reglas ERC y validación física activas</span>
        </span>

        <span role="status">
          {snapshot?.wiring.error ??
            (snapshot?.wiring.pending
              ? `Conectando desde ${snapshot.wiring.pending.componentId}.${snapshot.wiring.pending.pinId}`
              : message || 'Listo para editar')}
        </span>
      </footer>
    </div>
  )
}
