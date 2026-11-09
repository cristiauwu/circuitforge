import { useEffect, useRef, useState } from 'react'
import type { ProjectSnapshot } from './projectController'
import type { ProjectSceneActions, SceneAPI } from './scene'

export type { ProjectSceneActions, SceneAPI } from './scene'

export interface NexoSceneProps {
  mode: 'hero' | 'lab'
  snapshot?: ProjectSnapshot
  actions?: ProjectSceneActions
  onReady?: (api: SceneAPI | null) => void
  className?: string
}

/** The route owns project state; this host owns only its progressively loaded scene. */
export function NexoScene({ mode, snapshot, actions, onReady, className }: NexoSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneAPI | null>(null)
  const modeRef = useRef(mode)
  const snapshotRef = useRef(snapshot)
  const actionsRef = useRef(actions)
  const onReadyRef = useRef(onReady)
  const [loadError, setLoadError] = useState(false)

  modeRef.current = mode
  snapshotRef.current = snapshot
  actionsRef.current = actions
  onReadyRef.current = onReady

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let ownedApi: SceneAPI | null = null
    const forwardingActions: ProjectSceneActions = {
      onSelect: (id) => actionsRef.current?.onSelect(id),
      onPin: (endpoint) => actionsRef.current?.onPin(endpoint),
      onDragStart: (id) => actionsRef.current?.onDragStart(id),
      onDragPreview: (position) => actionsRef.current?.onDragPreview(position),
      onDragCommit: () => actionsRef.current?.onDragCommit(),
      onDragCancel: () => actionsRef.current?.onDragCancel(),
    }

    async function initialize(host: HTMLDivElement) {
      try {
        const { createElectronicsScene } = await import('./scene')
        // StrictMode can clean up this effect while the shared module is still loading.
        if (cancelled) return
        ownedApi = createElectronicsScene(host, forwardingActions)
        ownedApi.setMode(modeRef.current)
        if (snapshotRef.current) ownedApi.updateProject(snapshotRef.current)
        apiRef.current = ownedApi
      } catch {
        ownedApi?.dispose()
        ownedApi = null
        if (!cancelled) setLoadError(true)
        return
      }
      onReadyRef.current?.(ownedApi)
    }
    void initialize(host)

    return () => {
      cancelled = true
      apiRef.current = null
      try {
        ownedApi?.cancelGesture()
      } finally {
        try {
          ownedApi?.dispose()
        } finally {
          onReadyRef.current?.(null)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (snapshot) apiRef.current?.updateProject(snapshot)
  }, [snapshot])

  useEffect(() => {
    apiRef.current?.setMode(mode)
  }, [mode])

  return (
    <div ref={hostRef} className={className}>
      {loadError ? (
        <p role="status">
          No se pudo cargar la vista 3D. Los controles del proyecto siguen disponibles.
        </p>
      ) : null}
    </div>
  )
}
