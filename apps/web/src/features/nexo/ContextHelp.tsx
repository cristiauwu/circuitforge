import { useEffect, useId, useRef } from 'react'
import { OrangeCat } from './OrangeCat'
import { useNexoSession } from './session'

const questions = {
  add: '¿Quieres una guía para colocar y editar tu componente?',
  connect: '¿Quieres una guía para conectar los pines?',
}

/** Local, non-modal project guidance with an original sleeping companion. */
export function ContextHelp() {
  const help = useNexoSession((state) => state.help)
  const continueWork = useNexoSession((state) => state.continueWork)
  const openHelp = useNexoSession((state) => state.openHelp)
  const dismissHelp = useNexoSession((state) => state.dismissHelp)
  const disableHelp = useNexoSession((state) => state.disableHelp)
  const enableHelp = useNexoSession((state) => state.enableHelp)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const invitationRef = useRef<HTMLElement>(null)
  const panelId = useId()
  const headingId = useId()

  useEffect(() => {
    if (!help.invitation) return
    const timer = window.setTimeout(() => {
      // Do not remove an invitation while someone is using its keyboard controls.
      if (!invitationRef.current?.contains(document.activeElement)) continueWork()
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [help.invitation, continueWork])

  useEffect(() => {
    if (help.open) headingRef.current?.focus()
  }, [help.open])

  const close = () => {
    dismissHelp()
    triggerRef.current?.focus()
  }

  const ignore = () => {
    continueWork()
    triggerRef.current?.focus()
  }

  const disable = () => {
    disableHelp()
    triggerRef.current?.focus()
  }

  return (
    <aside className="nx-help nx-cat-help" aria-label="Guía local del proyecto">
      <button
        ref={triggerRef}
        className="nx-help-trigger nx-cat-trigger"
        type="button"
        aria-label="Ayuda del proyecto"
        title="Ayuda del proyecto"
        aria-expanded={help.open}
        aria-controls={help.open ? panelId : undefined}
        onClick={help.open ? close : openHelp}
      >
        <OrangeCat awake={help.invitation || help.open} />
        <span className="nx-companion-label">Guía del proyecto</span>
      </button>

      {help.invitation && !help.open && (
        <section
          ref={invitationRef}
          className="nx-help-invitation"
          aria-label="Sugerencia de ayuda"
          onBlur={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              !event.currentTarget.contains(event.relatedTarget)
            )
              continueWork()
          }}
        >
          <p role="status">
            {help.context ? questions[help.context] : '¿Quieres una guía del proyecto?'}
          </p>
          <div className="nx-help-actions">
            <button className="nx-button" type="button" onClick={openHelp}>
              Ver guía
            </button>
            <button className="nx-button" type="button" onClick={ignore}>
              Ahora no
            </button>
            <button className="nx-button" type="button" onClick={disable}>
              Desactivar sugerencias
            </button>
          </div>
        </section>
      )}

      {help.open && (
        <section
          id={panelId}
          className="nx-help-panel"
          aria-labelledby={headingId}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.stopPropagation()
            event.preventDefault()
            close()
          }}
        >
          <h2 id={headingId} ref={headingRef} tabIndex={-1}>
            Ayuda del proyecto
          </h2>
          <p className="nx-muted">
            Guía local de las herramientas. No usa IA ni analiza tu circuito.
          </p>
          {help.context === 'connect' ? (
            <p>
              Selecciona un pin y después otro para crear una conexión. Pulsa Escape para cancelar
              una conexión pendiente.
            </p>
          ) : (
            <p>
              Añade un componente desde la biblioteca, selecciónalo en el montaje y ajusta sus
              propiedades en el inspector.
            </p>
          )}
          <p>Puedes seguir trabajando con la guía abierta.</p>
          <div className="nx-help-actions">
            <button className="nx-button" type="button" onClick={close}>
              Cerrar ayuda
            </button>
            {help.enabled ? (
              <button className="nx-button" type="button" onClick={disable}>
                Desactivar sugerencias
              </button>
            ) : (
              <button className="nx-button" type="button" onClick={enableHelp}>
                Activar sugerencias
              </button>
            )}
          </div>
        </section>
      )}
    </aside>
  )
}
