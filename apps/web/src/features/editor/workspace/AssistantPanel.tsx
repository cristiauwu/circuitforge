import { useId } from 'react'
import { Button } from '@/ui'

export interface AssistantPanelProps {
  value: string
  onChange: (value: string) => void
  componentCount: number
  netCount: number
}

export function AssistantPanel({ value, onChange, componentCount, netCount }: AssistantPanelProps) {
  const id = useId()

  return (
    <section className="ws-panel ws-assistant" aria-label="Asistente">
      <div className="ws-panel-heading">
        <h2>Asistente</h2>
        <span className="ws-availability">No conectado</span>
      </div>
      <p className="ws-note">
        No hay un servicio de IA conectado. No se generan respuestas ni propuestas.
      </p>
      <div className="ws-context">
        <h3>Contexto del circuito</h3>
        <dl>
          <div>
            <dt>Componentes</dt>
            <dd>{componentCount}</dd>
          </div>
          <div>
            <dt>Redes</dt>
            <dd>{netCount}</dd>
          </div>
        </dl>
      </div>
      <label htmlFor={`${id}-draft`}>Borrador del mensaje</label>
      <textarea
        id={`${id}-draft`}
        className="ws-field ws-assistant-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anota lo que quieres consultar."
        aria-describedby={`${id}-reason ${id}-session`}
      />
      <p id={`${id}-session`} className="ws-note">
        Borrador de esta sesión; se pierde al recargar o salir del editor.
      </p>
      <div className="ws-panel-actions">
        <Button disabled variant="secondary" size="sm" plain aria-describedby={`${id}-reason`}>
          Enviar
        </Button>
        <p id={`${id}-reason`} className="ws-note">
          Envío no disponible: no hay un servicio conectado.
        </p>
      </div>
    </section>
  )
}
