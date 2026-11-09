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
      <p>Solo cables añadidos explícitamente, no uniones internas de la protoboard.</p>
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
  const [tool, setTool] = useState<'project' | 'part'>('part')
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
    // Run after the router shell's route-change focus effect and the pane render.
    const frame = requestAnimationFrame(() => {
      document.getElementById('nexo-notes')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [message, setMessage] = useState('')

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
    if (!code.trim()) {
      setMessage('Escribe un borrador antes de descargarlo.')
      return
    }
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
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
    // The last cable removes its list. Keep focus inside the responsive inspector.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement
        .closest<HTMLElement>('.nx-tools-content')
        ?.focus({ preventScroll: true })
    }
    useNexoSession.getState().continueWork()
    controllerRef.current?.removeWire(id)
    setMessage(`Cable ${id} desconectado. Puedes deshacer esta acción.`)
  }

  return (
    <div className="nx-editor">
      <header className="nx-topbar">
        <Link className="nx-brand" to="/" aria-label="Nexo, volver al inicio">
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
          <small>Sesión local · sin guardar</small>
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
          >
            Deshacer
          </button>
          <button
            type="button"
            className="nx-button"
            onClick={() => {
              useNexoSession.getState().continueWork()
              controllerRef.current?.redo()
            }}
            disabled={!snapshot?.canRedo}
          >
            Rehacer
          </button>
          <button
            type="button"
            className="nx-button"
            onClick={() => {
              useNexoSession.getState().continueWork()
              setDiagnosticsOpen(!diagnosticsOpen)
            }}
            aria-expanded={diagnosticsOpen}
          >
            Diagnóstico
          </button>
        </div>
      </header>
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
          Propiedades
        </button>
      </div>
      <div className="nx-workspace">
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
                aria-label="Cerrar componentes"
                onClick={() => closeDrawer('catalog')}
              >
                Cerrar
              </button>
            </div>
            <input
              id="editor-piece-search"
              className="nx-input"
              type="search"
              aria-label="Buscar pieza editable"
              placeholder="Buscar una pieza"
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
                onChange={(event) => {
                  useNexoSession.getState().continueWork()
                  setCategory(event.target.value as Category | 'all')
                }}
              >
                <option value="all">Todas las piezas</option>
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
              {catalog.length} {catalog.length === 1 ? 'pieza' : 'piezas'}
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
                      ? 'Auxiliar eléctrico'
                      : part.description}
                  </small>
                </span>
              </button>
            ))}
            {catalog.length === 0 && (
              <div className="nx-palette-empty">
                <p>No hay coincidencias.</p>
                <button
                  type="button"
                  className="nx-button"
                  onClick={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>
          <div className="nx-palette-footer">
            <button type="button" className="nx-button nx-button-primary" onClick={add}>
              Añadir {CATALOG_INDEX.get(typeId)?.name ?? 'pieza'}
            </button>
            <p className="nx-muted">
              {EDITABLE_TYPE_IDS.length} editables · {CATALOG.length} fichas
            </p>
          </div>
        </aside>
        <section className="nx-editor-center" ref={centerRef} aria-label="Montaje y código">
          <div className="nx-center-toolbar">
            <button
              type="button"
              aria-pressed={split}
              aria-controls="workspace-schematic workspace-code"
              disabled={!canShowSplit(centerWidth)}
              title={
                !canShowSplit(centerWidth) ? 'Amplía el espacio para ver ambas vistas' : undefined
              }
              onClick={() => {
                useNexoSession.getState().continueWork()
                setView('split')
              }}
            >
              Ambas vistas
            </button>
            <button
              type="button"
              aria-pressed={showMount && !split}
              aria-controls="workspace-schematic"
              onClick={() => {
                useNexoSession.getState().continueWork()
                setView('mount')
              }}
            >
              Montaje
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
              Código
            </button>
            <button
              type="button"
              onClick={(event) => toggleDrawer('tools', event.currentTarget)}
              aria-expanded={toolsOpen}
              aria-controls="editor-tools"
            >
              Propiedades
            </button>
            {snapshot?.wiring.pending && (
              <button type="button" onClick={cancel}>
                Cancelar conexión
              </button>
            )}
          </div>
          <div className="nx-split">
            <section
              id="workspace-schematic"
              className="nx-mount"
              hidden={!showMount}
              style={split ? ({ flex: `0 0 ${schematicWidth}px` } as CSSProperties) : undefined}
              aria-label="Montaje 3D editable"
            >
              <div className="nx-mount-head">
                {project?.components.length === 0 ? (
                  <div>
                    <h2>
                      Tu circuito
                      <br />
                      empieza aquí.
                    </h2>
                    <p>Añade una pieza, sin elegir una plantilla.</p>
                  </div>
                ) : (
                  <span>
                    {project?.components.length}{' '}
                    {project?.components.length === 1 ? 'pieza' : 'piezas'} · {wires.length}{' '}
                    {wires.length === 1 ? 'cable' : 'cables'} · {project?.nets.length}{' '}
                    {project?.nets.length === 1 ? 'red eléctrica' : 'redes eléctricas'}
                  </span>
                )}
                <span>3D · Sin simulación</span>
              </div>
              <NexoScene
                mode="lab"
                {...(snapshot ? { snapshot } : {})}
                actions={actions}
                onReady={onSceneReady}
                className="nx-scene-host"
              />
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
            <section
              id="workspace-code"
              className="nx-code"
              hidden={!showCode}
              aria-label="Borrador C++"
            >
              <header>
                <strong>main.cpp</strong>
                <span>C++ · Borrador</span>
              </header>
              <label className="sr-only" htmlFor="nexo-code">
                Código C++
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
                placeholder="// Tu código empieza aquí. No se compila ni ejecuta todavía."
              />
              <p>Conservado entre rutas de esta sesión; se pierde al recargar.</p>
              <button type="button" className="nx-button" onClick={download}>
                Descargar main.cpp
              </button>
            </section>
          </div>
          <div className="nx-workspace-utility">
            <div className="nx-workspace-controls" hidden={!showMount}>
              <p className="nx-workspace-hint">
                Pieza: arrastrar · Fondo: girar · Ctrl + rueda: zoom
              </p>
              <section className="nx-camera-actions" aria-label="Cámara del montaje">
                <button
                  type="button"
                  className="nx-button"
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    sceneRef.current?.setView('top')
                  }}
                >
                  Superior
                </button>
                <button
                  type="button"
                  className="nx-button"
                  onClick={() => {
                    useNexoSession.getState().continueWork()
                    sceneRef.current?.frameProject()
                  }}
                >
                  Encuadrar
                </button>
              </section>
            </div>
            <div className="nx-companion-dock">
              <ContextHelp />
            </div>
          </div>
        </section>
        <aside
          id="editor-tools"
          ref={toolsRef}
          tabIndex={-1}
          className="nx-editor-tools"
          data-open={toolsOpen}
          aria-label="Contexto del proyecto"
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
              La pieza
            </button>
            <button
              type="button"
              aria-pressed={tool === 'project'}
              onClick={() => {
                useNexoSession.getState().continueWork()
                setTool('project')
              }}
            >
              Tu idea
            </button>
            <button
              type="button"
              className="nx-tools-close"
              aria-label="Cerrar propiedades"
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
              {fixture?.name ?? 'Selecciona una pieza'}
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
                        ? 'Utiliza la orientación de Recolocar para girar una pieza insertada.'
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
                      setMessage(`Parámetro de ${selected.id} actualizado. Sin simulación.`)
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
                        setMessage(
                          `${selected.id} insertado en ${boardId}.${anchor}. Puedes deshacer esta acción.`,
                        )
                      return result
                    }}
                    onUnmount={() => {
                      useNexoSession.getState().continueWork()
                      const result = controllerRef.current?.unmountComponent(selected.id) ?? {
                        ok: false,
                        error: 'El proyecto aún no está disponible.',
                      }
                      if (result.ok)
                        setMessage(
                          `${selected.id} extraído. Puedes moverlo libremente o deshacer la acción.`,
                        )
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
                    <h3>Terminales</h3>
                    <p>Elige origen y destino. Pines ilustrativos, no certificados.</p>
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
                          {terminal.pinId} · {terminal.netId ?? 'sin conectar'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <WireList
                  wires={selectedWires}
                  onRemove={removeWire}
                  label="Cables de esta pieza"
                />
              </>
            ) : (
              <button type="button" className="nx-button nx-button-primary" onClick={add}>
                Añadir al montaje
              </button>
            )}
            <h3>En tu montaje</h3>
            <div className="nx-instance-list">
              {project?.components.map((part) => (
                <button
                  type="button"
                  className="nx-button"
                  key={part.id}
                  aria-pressed={part.id === snapshot?.selectedId}
                  onClick={() => selectInstance(part.id)}
                >
                  {part.id} · {CATALOG_INDEX.get(part.typeId)?.name ?? part.typeId}
                </button>
              ))}
            </div>
          </div>
          <div className="nx-tools-content" tabIndex={-1} hidden={tool !== 'project'}>
            <h2>¿Qué quieres construir?</h2>
            <p>Guarda tu intención como nota de sesión. El asistente de IA no está conectado.</p>
            <label htmlFor="nexo-notes">Tu idea</label>
            <textarea
              className="nx-input"
              id="nexo-notes"
              rows={7}
              value={notes}
              onChange={(event) => {
                useNexoSession.getState().continueWork()
                setNotes(event.target.value)
              }}
              placeholder="Describe lo que te gustaría que hiciera tu circuito…"
            />
            <h3>Conectividad del proyecto</h3>
            <p>
              {wires.length} {wires.length === 1 ? 'cable explícito' : 'cables explícitos'} ·{' '}
              {project?.nets.length ?? 0}{' '}
              {project?.nets.length === 1 ? 'red eléctrica' : 'redes eléctricas'}. Una red puede
              unir varios cables y contactos internos.
            </p>
            <WireList wires={wires} onRemove={removeWire} label="Cables del proyecto" />
          </div>
        </aside>
      </div>
      {diagnosticsOpen && (
        <section className="nx-diagnostics" aria-label="Diagnóstico">
          <h2>Estado del entorno</h2>
          <p>Validación al conectar: activa. Compilador y simulador: no integrados.</p>
          <p>
            {snapshot?.wiring.error ??
              'No se ha ejecutado una validación integral ni una simulación.'}
          </p>
        </section>
      )}
      <footer className="nx-statusbar">
        <span>Montaje editable · Sin simulación</span>
        <span role="status">
          {snapshot?.wiring.error ??
            (snapshot?.wiring.pending
              ? `Origen ${snapshot.wiring.pending.componentId}.${snapshot.wiring.pending.pinId}. Elige un destino o cancela.`
              : message ||
                (project?.components.length
                  ? `${project.components.length} ${project.components.length === 1 ? 'pieza' : 'piezas'} · ${wires.length} ${wires.length === 1 ? 'cable' : 'cables'} en esta sesión.`
                  : snapshot
                    ? 'Montaje vacío. Elige tu primera pieza.'
                    : 'Preparando el proyecto…'))}
        </span>
        <Link to="/proyectos">Tu sesión</Link>
      </footer>
    </div>
  )
}
