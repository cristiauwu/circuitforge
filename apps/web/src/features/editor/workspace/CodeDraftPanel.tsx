import { useId } from 'react'

export interface CodeDraftPanelProps {
  value: string
  onChange: (value: string) => void
}

export function CodeDraftPanel({ value, onChange }: CodeDraftPanelProps) {
  const id = useId()

  return (
    <section className="ws-panel ws-draft" aria-label="Borrador de código">
      <div className="ws-panel-heading">
        <label htmlFor={`${id}-code`}>Borrador de código</label>
        <span className="ws-availability">Sin compilación</span>
      </div>
      <p id={`${id}-note`} className="ws-note">
        Solo se conserva durante esta sesión. Se pierde al recargar o salir del editor. El código no
        se compila ni se ejecuta.
      </p>
      <textarea
        id={`${id}-code`}
        className="ws-field ws-code-input"
        aria-describedby={`${id}-note`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe aquí tu borrador de código."
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="off"
      />
    </section>
  )
}
