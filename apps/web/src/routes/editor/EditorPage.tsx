import { BREADBOARD_TYPE_ID, type Category, type Wire } from '@circuitforge/netlist'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resolveShortcut, toKeyEventLike } from '@/features/editor/canvas/keyboardShortcuts'
import { WorkspaceSplit } from '@/features/editor/workspace/WorkspaceSplit'
import { canShowSplit, clampSplitWidth } from '@/features/editor/workspace/workspaceLayout'
import { BreadboardContacts } from '@/features/nexo/BreadboardContacts'
import { BreadboardMountPanel } from '@/features/nexo/BreadboardMountPanel'
import { ComponentParameters } from '@/features/nexo/ComponentParameters'
import { ComponentPreview } from '@/features/nexo/ComponentPreview'
import { ContextHelp } from '@/features/nexo/ContextHelp'
import { EDITABLE_TYPE_IDS, isEditableType } from '@/features/nexo/capabilities'
import { NexoScene, type ProjectSceneActions, type SceneAPI } from '@/features/nexo/NexoScene'
import { createProjectController, type ProjectSnapshot } from '@/features/nexo/projectController'
import { useNexoSession } from '@/features/nexo/session'
import { CATALOG, CATALOG_INDEX, CATEGORIES, CATEGORY_LABELS } from '@/lib/fixtures/components'

function WireList({
  wires,
  onRemove,
  label,
}: {
  wires: readonly Wire[]
  onRemove: (id: string) => void
  label: string
}) {
  if (wires.length === 0) return null
  return (
    <section className="nx-project-wires" aria-label={label}>
      <h3>
        {label} ({wires.length})
      </h3>
      <p>Cables añadidos explícitamente entre terminales.</p>
      <ul>
        {wires.map((wire) => (
          <li key={wire.id}>
            <span>
              {wire.id}: {wire.from.componentId}.{wire.from.pinId} — {wire.to.componentId}.
              {wire.to.pinId}
            </span>
            <button
              type="button"
              className="nx-button"
              aria-label={`Desconectar cable ${wire.id}: ${wire.from.componentId}.${wire.from.pinId} a ${wire.to.componentId}.${wire.to.pinId}`}
              onClick={() => onRemove(wire.id)}
            >
              Desconectar
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function EditorPage() {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null)
  const controllerRef = useRef<ReturnType<typeof createProjectController> | null>(null)
  const sceneRef = useRef<SceneAPI | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [centerWidth, setCenterWidth] = useState(800)
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [typeId, setTypeId] = useState('esp32')
  const [tool, setTool] = useState<'part' | 'project'>('part')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const catalogRef = useRef<HTMLElement>(null)
  const toolsRef = useRef<HTMLElement>(null)
  const catalogTriggerRef = useRef<HTMLButtonElement | null>(null)
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const location = useLocation()

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
  const selectedWires = selected
    ? wires.filter(
        (wire) => wire.from.componentId === selected.id || wire.to.componentId === selected.id,
      )
    : []
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
    const observer = new ResizeObserver(() => {
      const width = center.getBoundingClientRect().width
      if (width > 0) setCenterWidth(width)
    })
    observer.observe(center)
    const resize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    if (!showMount) {
      sceneRef.current?.cancelGesture()
      controllerRef.current?.cancel()
    }
  }, [showMount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const controller = controllerRef.current
      if (!controller) return
      if (event.key === 'Escape') {
        if ((window.innerWidth <= 650 && catalogOpen) || (window.innerWidth <= 1000 && toolsOpen)) {
          closeDrawer('tools')
          closeDrawer('catalog')
          event.preventDefault()
          return
        }
        if (controller.getSnapshot().wiring.pending || controller.getSnapshot().preview) {
          sceneRef.current?.cancelGesture()
          controller.cancel()
          event.preventDefault()
          return
        }
        closeDrawer('tools')
        closeDrawer('catalog')
      }
      const action = resolveShortcut(toKeyEventLike(event), {
        hasSelection: controller.getSnapshot().selectedId !== null,
      })
      if (action.kind === 'none') return
      event.preventDefault()
      const actions = {
        undo: controller.undo,
        redo: controller.redo,
        rotate: controller.rotate,
        delete: controller.remove,
      }
      useNexoSession.getState().continueWork()
      actions[action.kind]()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [catalogOpen, toolsOpen, closeDrawer])

  const pin = useCallback((componentId: string, pinId: string) => {
    const session = useNexoSession.getState()
    session.continueWork()
    const outcome = controllerRef.current?.pin({ componentId, pinId })
    if (outcome?.kind === 'selected') session.notifyHelp('connect')
    else if (outcome?.kind === 'connected') setMessage('Conexión creada en el proyecto.')
  }, [])

  const actions = useMemo<ProjectSceneActions>(
    () => ({
      onSelect: (id) => {
        useNexoSession.getState().continueWork()
        controllerRef.current?.select(id)
        if (id) setTool('part')
      },
      onPin: (endpoint) => pin(endpoint.componentId, endpoint.pinId),
      onDragStart: (id) => {
        useNexoSession.getState().continueWork()
        controllerRef.current?.beginDrag(id)
      },
      onDragPreview: (position) => controllerRef.current?.previewDrag(position),
      onDragCommit: () => controllerRef.current?.commitDrag(),
      onDragCancel: () => controllerRef.current?.cancelDrag(),
    }),
    [pin],
  )

  const onSceneReady = useCallback((api: SceneAPI | null) => {
    sceneRef.current = api
  }, [])

  const add = () => {
    useNexoSession.getState().continueWork()
    const id = controllerRef.current?.add(typeId)
    if (!id) return
    setMessage(`${id} añadido al proyecto.`)
    useNexoSession.getState().notifyHelp('add')
    closeDrawer('catalog')
    closeDrawer('tools')
  }

  const cancel = () => {
    controllerRef.current?.cancel()
    setMessage('Conexión cancelada sin modificar el proyecto.')
    useNexoSession.getState().continueWork()
  }

  const download = () => {
    useNexoSession.getState().continueWork()
    const codeContent =
      code.trim() ||
      `// Firmware generado para ${project?.name ?? 'Circuito CircuitForge'}\n#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  // Inicialización de componentes...\n}\n\nvoid loop() {\n  // Lógica principal de ejecución...\n}\n`
    const url = URL.createObjectURL(new Blob([codeContent], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'main.cpp'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const selectInstance = (id: string) => {
    useNexoSession.getState().continueWork()
    controllerRef.current?.select(id)
    setTool('part')
    sceneRef.current?.locateProject(id)
  }

  const clearSelection = () => {
    controllerRef.current?.select(null)
  }

  const removeWire = (id: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement
        .closest<HTMLElement>('.nx-tools-content')
        ?.focus({ preventScroll: true })
    }
    useNexoSession.getState().continueWork()
    controllerRef.current?.removeWire(id)
    setMessage(`Cable ${id} desconectado.`)
  }

  return (
    <div className="nx-editor">
      {/* ── TOPBAR ELEGANTE CON ESTADO DEL PROYECTO ──────────────── */}
      <header className="nx-topbar">
        <Link className="nx-brand" to="/" aria-label="CircuitForge, volver al inicio">
          nexo
          <svg
            className="nx-brand-mark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 20 20 4M4 4h16v16" />
          </svg>
        </Link>

        <div className="nx-project-name">
          <strong>{project?.name ?? 'Tu circuito'}</strong>
          <small style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00f0ff',
                boxShadow: '0 0 6px #00f0ff',
              }}
            />
            <span>
              {project?.components.length ?? 0} piezas · {wires.length} cables · {project?.nets.length ?? 0} redes
            </span>
          </small>
        </div>

        <div className="nx-editor-actions">
          <Link className="nx-button" to="/biblioteca">
            Biblioteca
          </Link>

          <button
            type="button"
            className="nx-button"
            onClick={() => {
              useNexoSession.getState().continueWork()
              controllerRef.current?.undo()
            }}
            disabled={!snapshot?.canUndo}
            title="Deshacer (Ctrl+Z)"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 7h7a4 4 0 0 1 0 8H8M3 7l3-3M3 7l3 3" />
            </svg>
            <span>Deshacer</span>
          </button>

          <button
            type="button"
            className="nx-button"
            onClick={() => {
              useNexoSession.getState().continueWork()
              controllerRef.current?.redo()
            }}
            disabled={!snapshot?.canRedo}
            title="Rehacer (Ctrl+Y)"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M13 7H6a4 4 0 0 0 0 8h2M13 7l-3-3m3 3-3 3" />
            </svg>
            <span>Rehacer</span>
          </button>

          <button
            type="button"
            className="nx-button"
            onClick={() => {
              useNexoSession.getState().continueWork()
              setDiagnosticsOpen(!diagnosticsOpen)
            }}
            aria-expanded={diagnosticsOpen}
            style={
              diagnosticsOpen
                ? { borderColor: 'var(--nx-accent)', color: 'var(--nx-accent)' }
                : undefined
            }
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: snapshot?.wiring.error ? '#f59e0b' : '#10b981',
                boxShadow: snapshot?.wiring.error ? '0 0 6px #f59e0b' : '0 0 6px #10b981',
              }}
            />
            <span>Reglas ERC</span>
          </button>
        </div>
      </header>

      {/* Tabs compactos en mobile */}
      <div className="nx-compact-tabs">
        <button
          type="button"
          className="nx-button"
          onClick={(event) => toggleDrawer('catalog', event.currentTarget)}
          aria-expanded={catalogOpen}
          aria-controls="editor-catalog"
        >
          Piezas
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
        {/* ── PANEL LATERAL IZQUIERDO: CATÁLOGO DE PIEZAS ──────────── */}
        <aside
          id="editor-catalog"
          ref={catalogRef}
          tabIndex={-1}
          className="nx-editor-catalog"
          data-open={catalogOpen}
          aria-label="Piezas editables"
          onBlur={(event) => {
            if (windowWidth <= 650 && !event.currentTarget.contains(event.relatedTarget))
              closeDrawer('catalog', false)
          }}
        >
          <div className="nx-palette-header">
            <div className="nx-palette-heading">
              <h2>Componentes</h2>
              <button
                type="button"
                className="nx-catalog-close nx-button"
                aria-label="Cerrar catálogo de componentes"
                onClick={() => closeDrawer('catalog')}
              >
                Cerrar
              </button>
            </div>

            <input
              id="editor-piece-search"
              className="nx-input"
              type="search"
              aria-label="Buscar componente en catálogo"
              placeholder="Buscar componente…"
              autoCapitalize="none"
              enterKeyHint="search"
              value={query}
              onChange={(event) => {
                useNexoSession.getState().continueWork()
                setQuery(event.target.value)
              }}
            />

            <label className="nx-palette-category" htmlFor="editor-piece-category">
              Categoría
              <select
                id="editor-piece-category"
                className="nx-input"
                value={category}
                style={{ colorScheme: 'dark' }}
                onChange={(event) => {
                  useNexoSession.getState().continueWork()
                  setCategory(event.target.value as Category | 'all')
                }}
              >
                <option value="all">Todas las categorías ({CATALOG.filter((p) => isEditableType(p.typeId)).length})</option>
                {CATEGORIES.filter((item) =>
                  CATALOG.some((part) => part.category === item && isEditableType(part.typeId)),
                ).map((item) => (
                  <option key={item} value={item}>
                    {CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>

            <p className="nx-palette-count" role="status">
              {catalog.length} {catalog.length === 1 ? 'componente disponible' : 'componentes disponibles'}
            </p>
          </div>

          <section className="nx-palette-results" aria-label="Resultados de componentes">
            {catalog.map((part) => (
              <button
                type="button"
                key={part.typeId}
                className="nx-part-row"
                aria-pressed={typeId === part.typeId}
                onClick={() => {
                  useNexoSession.getState().continueWork()
                  setTypeId(part.typeId)
                  clearSelection()
                  setTool('part')
                }}
              >
                <ComponentPreview typeId={part.typeId} name={part.name} size="compact" />
                <span className="nx-part-copy">
                  <strong>{part.name}</strong>
                  <small>
                    {part.typeId === 'dc_source' || part.typeId === 'gnd_ref'
                      ? 'Auxiliar de alimentación'
                      : part.description}
                  </small>
                </span>
              </button>
            ))}

            {catalog.length === 0 && (
              <div className="nx-palette-empty">
                <p>No hay coincidencias para la búsqueda.</p>
                <button
                  type="button"
                  className="nx-button"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                >
                  Restablecer filtros
                </button>
              </div>
            )}
          </section>

          <div className="nx-palette-footer">
            <button type="button" className="nx-button nx-button-primary" onClick={add}>
              Añadir {CATALOG_INDEX.get(typeId)?.name ?? 'pieza'}
            </button>
            <p className="nx-muted">
              {EDITABLE_TYPE_IDS.length} modelos en 3D interactivo
            </p>
          </div>
        </aside>

        {/* ── SECCIÓN CENTRAL: LIENZO 3D CON HUD FLOTANTE Y CÓDIGO ─── */}
        <section className="nx-editor-center" ref={centerRef} aria-label="Espacio de trabajo">
          {/* Toolbar de visualización */}
          <div className="nx-center-toolbar">
            <button
              type="button"
              aria-pressed={showMount && !split}
              aria-controls="workspace-schematic"
              onClick={() => {
                useNexoSession.getState().continueWork()
                setView('mount')
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 1 1 5l7 4 7-4-7-4zM1 11l7 4 7-4M1 8l7 4 7-4" />
              </svg>
              <span>3D Montaje</span>
            </button>

            <button
              type="button"
              aria-pressed={view === 'code'}
              aria-controls="workspace-code"
              onClick={() => {
                useNexoSession.getState().continueWork()
                setView('code')
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 4 1 8l4 4M11 4l4 4-4 4M9 2 7 14" />
              </svg>
              <span>C++ Firmware</span>
            </button>

            <button
              type="button"
              aria-pressed={split}
              aria-controls="workspace-schematic workspace-code"
              disabled={!canShowSplit(centerWidth)}
              title={
                !canShowSplit(centerWidth)
                  ? 'Amplía la ventana para ver simultáneamente el montaje 3D y el código'
                  : undefined
              }
              onClick={() => {
                useNexoSession.getState().continueWork()
                setView('split')
              }}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M8 2v12" />
              </svg>
              <span>Vista Dividida</span>
            </button>

            {snapshot?.wiring.pending && (
              <div className="nx-toolbar-status-badge">
                <span>
                  ⚡ Conectando {snapshot.wiring.pending.componentId}.{snapshot.wiring.pending.pinId}
                </span>
                <button
                  type="button"
                  onClick={cancel}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar (Esc)
                </button>
              </div>
            )}

            <button
              type="button"
              style={{ marginLeft: 'auto' }}
              onClick={(event) => toggleDrawer('tools', event.currentTarget)}
              aria-expanded={toolsOpen}
              aria-controls="editor-tools"
            >
              Inspector
            </button>
          </div>

          <div className="nx-split">
            {/* ── LIENZO 3D CON HUD FLOTANTE (ESTILO NOOMO LABS) ─────── */}
            <section
              id="workspace-schematic"
              className="nx-mount"
              hidden={!showMount}
              style={split ? ({ flex: `0 0 ${schematicWidth}px` } as CSSProperties) : undefined}
              aria-label="Montaje 3D interactivo"
            >
              {/* Badges superiores flotantes */}
              <div className="nx-mount-hud-top">
                <div
                  className="nx-feature-chip"
                  style={{
                    background: 'rgba(14, 17, 24, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
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

              {/* Three.js Canvas */}
              <NexoScene
                mode="lab"
                {...(snapshot ? { snapshot } : {})}
                actions={actions}
                onReady={onSceneReady}
                className="nx-scene-host"
              />

              {/* HUD Flotante Dock Inferior (Noomo Labs Style) */}
              <div
                className="nx-mount-hud-dock"
                role="toolbar"
                aria-label="Controles de cámara y perspectiva 3D"
              >
                <button
                  type="button"
                  className="nx-hud-dock-btn"
                  aria-pressed={cameraView === 'perspective'}
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    setCameraView('perspective')
                    sceneRef.current?.setView('perspective')
                  }}
                  title="Vista en perspectiva 3D libre"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M8 1 1 5l7 4 7-4-7-4zM1 11l7 4 7-4M1 8l7 4 7-4" />
                  </svg>
                  <span>3D Órbita</span>
                </button>

                <button
                  type="button"
                  className="nx-hud-dock-btn"
                  aria-pressed={cameraView === 'top'}
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    setCameraView('top')
                    sceneRef.current?.setView('top')
                  }}
                  title="Vista cenital desde arriba"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="12" height="12" rx="2" />
                    <circle cx="8" cy="8" r="2" />
                  </svg>
                  <span>Cenital</span>
                </button>

                <div className="nx-hud-dock-divider" />

                <button
                  type="button"
                  className="nx-hud-dock-btn"
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    sceneRef.current?.frameProject()
                  }}
                  title="Encuadra todos los componentes del circuito"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
                  </svg>
                  <span>Encuadrar</span>
                </button>

                <button
                  type="button"
                  className="nx-hud-dock-btn"
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    sceneRef.current?.reset()
                  }}
                  title="Restablece la posición de la cámara"
                >
                  ↺ Reset
                </button>
              </div>

              {/* Ayuda y guía del proyecto flotante en la esquina inferior */}
              <div className="nx-companion-floating-dock">
                <ContextHelp />
              </div>
            </section>

            {split && (
              <WorkspaceSplit
                width={centerWidth}
                value={schematicWidth}
                onChange={(width) => {
                  useNexoSession.getState().continueWork()
                  setSplitRatio(width / centerWidth)
                }}
              />
            )}

            {/* ── VISOR Y EDITOR DE CÓDIGO C++ ─────────────────────── */}
            <section
              id="workspace-code"
              className="nx-code"
              hidden={!showCode}
              aria-label="Editor de código C++"
            >
              <header>
                <strong>main.cpp</strong>
                <span className="nx-hud-badge">C++ 17 · Arduino</span>
              </header>

              <label className="sr-only" htmlFor="nexo-code">
                Código fuente C++
              </label>

              <textarea
                id="nexo-code"
                value={code}
                onChange={(event) => {
                  useNexoSession.getState().continueWork()
                  setCode(event.target.value)
                }}
                spellCheck={false}
                autoCapitalize="none"
                placeholder={`// Firmware para microcontrolador\n#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  // Inicialización de hardware...\n}\n\nvoid loop() {\n  // Lógica principal...\n}`}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--nx-muted)' }}>
                  Código sincronizado en la sesión local. Exportable para Arduino IDE / PlatformIO.
                </p>

                <button
                  type="button"
                  className="nx-button nx-button-primary cf-glow"
                  onClick={download}
                >
                  <span className="cf-btn__roll">
                    <span className="cf-btn__text">Descargar main.cpp</span>
                    <span className="cf-btn__text" aria-hidden="true">
                      Descargar main.cpp
                    </span>
                  </span>
                </button>
              </div>
            </section>
          </div>
        </section>

        {/* ── PANEL LATERAL DERECHO: INSPECTOR DE PROPIEDADES ──────── */}
        <aside
          id="editor-tools"
          ref={toolsRef}
          tabIndex={-1}
          className="nx-editor-tools"
          data-open={toolsOpen}
          aria-label="Inspector de propiedades y componentes"
          onBlur={(event) => {
            if (windowWidth <= 1000 && !event.currentTarget.contains(event.relatedTarget))
              closeDrawer('tools', false)
          }}
        >
          <div className="nx-tool-tabs">
            <button
              type="button"
              aria-pressed={tool === 'part'}
              onClick={() => {
                useNexoSession.getState().continueWork()
                setTool('part')
              }}
            >
              Componente
            </button>
            <button
              type="button"
              aria-pressed={tool === 'project'}
              onClick={() => {
                useNexoSession.getState().continueWork()
                setTool('project')
              }}
            >
              Especificaciones
            </button>
            <button
              type="button"
              className="nx-tools-close"
              aria-label="Cerrar inspector"
              onClick={() => closeDrawer('tools')}
            >
              Cerrar
            </button>
          </div>

          <div className="nx-tools-content" tabIndex={-1} hidden={tool !== 'part'}>
            {fixture && (
              <ComponentPreview
                typeId={fixture.typeId}
                name={fixture.name}
                size="detail"
                className="nx-inspector-preview"
              />
            )}

            <h2>
              {selected ? `${selected.id} · ` : ''}
              {fixture?.name ?? 'Selecciona un componente'}
            </h2>
            <p>{fixture?.description}</p>

            {selected ? (
              <>
                <div className="nx-instance-actions">
                  <button
                    type="button"
                    className="nx-button"
                    disabled={project?.mounts?.some((mount) => mount.componentId === selected.id)}
                    title={
                      project?.mounts?.some((mount) => mount.componentId === selected.id)
                        ? 'Utiliza la orientación de montaje para rotar la pieza insertada en el protoboard.'
                        : undefined
                    }
                    onClick={() => {
                      useNexoSession.getState().continueWork()
                      controllerRef.current?.rotate()
                    }}
                  >
                    Rotar 90°
                  </button>
                  <button
                    type="button"
                    className="nx-button"
                    style={{ borderColor: 'rgba(244, 63, 94, 0.35)', color: '#f43f5e' }}
                    onClick={() => {
                      useNexoSession.getState().continueWork()
                      controllerRef.current?.remove()
                    }}
                  >
                    Eliminar
                  </button>
                </div>

                <ComponentParameters
                  component={selected}
                  onUpdate={(key, value) => {
                    useNexoSession.getState().continueWork()
                    const result = controllerRef.current?.updateParameter(
                      selected.id,
                      key,
                      value,
                    ) ?? { ok: false, error: 'El proyecto aún no está disponible.' }
                    if (result.ok)
                      setMessage(`Parámetro de ${selected.id} actualizado.`)
                    return result
                  }}
                />

                {project && (
                  <BreadboardMountPanel
                    key={selected.id}
                    project={project}
                    component={selected}
                    onMount={(boardId, anchor, rotation) => {
                      useNexoSession.getState().continueWork()
                      const result = controllerRef.current?.mountComponent(
                        selected.id,
                        boardId,
                        anchor,
                        rotation,
                      ) ?? { ok: false, error: 'El proyecto aún no está disponible.' }
                      if (result.ok)
                        setMessage(`${selected.id} montado en ${boardId}.${anchor}.`)
                      return result
                    }}
                    onUnmount={() => {
                      useNexoSession.getState().continueWork()
                      const result = controllerRef.current?.unmountComponent(selected.id) ?? {
                        ok: false,
                        error: 'El proyecto aún no está disponible.',
                      }
                      if (result.ok)
                        setMessage(`${selected.id} desmontado del protoboard.`)
                      return result
                    }}
                  />
                )}

                {selected.typeId === BREADBOARD_TYPE_ID ? (
                  <BreadboardContacts
                    key={selected.id}
                    component={selected}
                    pending={snapshot?.wiring.pending ?? null}
                    onPin={pin}
                  />
                ) : (
                  <>
                    <h3>Terminales y Conexiones</h3>
                    <p>Haz clic en un terminal para trazar una conexión hacia otro pin o protoboard.</p>
                    <div className="nx-pin-list">
                      {selected.pins.map((terminal) => (
                        <button
                          type="button"
                          className="nx-button"
                          key={terminal.pinId}
                          aria-pressed={
                            snapshot?.wiring.pending?.componentId === selected.id &&
                            snapshot.wiring.pending.pinId === terminal.pinId
                          }
                          onClick={() => pin(selected.id, terminal.pinId)}
                        >
                          <span>{terminal.pinId}</span>
                          <span style={{ color: terminal.netId ? 'var(--nx-accent)' : 'var(--nx-muted)' }}>
                            {terminal.netId ? `[${terminal.netId}]` : 'sin conectar'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <WireList
                  wires={selectedWires}
                  onRemove={removeWire}
                  label="Cables conectados a este componente"
                />
              </>
            ) : (
              <button type="button" className="nx-button nx-button-primary" onClick={add}>
                Añadir al laboratorio 3D
              </button>
            )}

            <h3>Componentes en el proyecto</h3>
            <div className="nx-instance-list">
              {project?.components.map((part) => (
                <button
                  type="button"
                  className="nx-button"
                  key={part.id}
                  aria-pressed={part.id === snapshot?.selectedId}
                  onClick={() => selectInstance(part.id)}
                >
                  <strong>{part.id}</strong>
                  <span style={{ color: 'var(--nx-muted)' }}>
                    {CATALOG_INDEX.get(part.typeId)?.name ?? part.typeId}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="nx-tools-content" tabIndex={-1} hidden={tool !== 'project'}>
            <h2>Especificaciones del Circuito</h2>
            <p>Define los objetivos, rangos de voltaje y notas técnicas de tu prototipo.</p>

            <label htmlFor="nexo-notes">Notas técnicas del proyecto</label>
            <textarea
              className="nx-input"
              id="nexo-notes"
              rows={7}
              value={notes}
              onChange={(event) => {
                useNexoSession.getState().continueWork()
                setNotes(event.target.value)
              }}
              placeholder="Ejemplo: Entrada regulada de 5V, lectura analógica en pin A0, bus I2C para pantalla OLED…"
            />

            <h3>Resumen de Conectividad</h3>
            <p>
              {wires.length} {wires.length === 1 ? 'cable activo' : 'cables activos'} ·{' '}
              {project?.nets.length ?? 0}{' '}
              {project?.nets.length === 1 ? 'red eléctrica' : 'redes eléctricas'}. Cada red unifica los puntos equipotenciales del circuito.
            </p>

            <WireList wires={wires} onRemove={removeWire} label="Cables del proyecto" />
          </div>
        </aside>
      </div>

      {/* ── PANEL DE DIAGNÓSTICO ERC ──────────────────────────────── */}
      {diagnosticsOpen && (
        <section className="nx-diagnostics" aria-label="Verificación de Reglas Eléctricas">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2>Verificación de Reglas Eléctricas (ERC)</h2>
            <span className="nx-hud-badge">
              <span className="nx-hud-badge-dot" />
              <span>Análisis Continuo</span>
            </span>
          </div>
          <p style={{ color: 'var(--nx-muted)', marginBottom: '10px' }}>
            Comprobación automática de continuidad, polaridades y buses en tiempo real:
          </p>
          <div
            style={{
              padding: '12px 16px',
              background: snapshot?.wiring.error ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0, 240, 255, 0.06)',
              border: snapshot?.wiring.error
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : '1px solid rgba(0, 240, 255, 0.25)',
              borderRadius: '8px',
              color: 'var(--nx-ink)',
            }}
          >
            {snapshot?.wiring.error ??
              '✓ Reglas ERC satisfechas: No se detectan cortocircuitos ni conflictos de polaridad.'}
          </div>
        </section>
      )}

      {/* ── BARRA DE ESTADO INFERIOR ──────────────────────────────── */}
      <footer className="nx-statusbar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="nx-hud-badge-dot" />
          <span>CircuitForge 3D &bull; Reglas ERC y validación física activas</span>
        </span>

        <span role="status">
          {snapshot?.wiring.error ??
            (snapshot?.wiring.pending
              ? `⚡ Origen seleccionado: ${snapshot.wiring.pending.componentId}.${snapshot.wiring.pending.pinId}. Haz clic en el pin de destino o pulsa Escape para cancelar.`
              : message ||
                (project?.components.length
                  ? `${project.components.length} ${project.components.length === 1 ? 'componente' : 'componentes'} · ${wires.length} ${wires.length === 1 ? 'cable' : 'cables'} · ${project.nets.length} redes eléctricas.`
                  : snapshot
                    ? 'Lienzo listo. Añade tu primer componente desde el catálogo.'
                    : 'Preparando entorno 3D…'))}
        </span>

        <Link to="/proyectos">Mis proyectos ↗</Link>
      </footer>
    </div>
  )
}
