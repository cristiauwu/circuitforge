import { useId } from 'react'

export interface DiagnosticsPanelProps {
  error: string | null
}

export function DiagnosticsPanel({ error }: DiagnosticsPanelProps) {
  const id = useId()

  return (
    <section className="ws-panel ws-diagnostic-content" aria-label="Diagnóstico">
      <div className="ws-panel-heading">
        <h2>Diagnóstico</h2>
        <span className="ws-availability">Integración pendiente</span>
      </div>
      <dl className="ws-diagnostic-status">
        <div>
          <dt>Compilador</dt>
          <dd>No integrado</dd>
        </div>
        <div>
          <dt>Solver de simulación</dt>
          <dd>No integrado</dd>
        </div>
      </dl>
      <div>
        <h3>Validación de conexiones</h3>
        <p className="ws-note">
          Solo se comprueba al conectar pines. No es una validación integral del circuito.
        </p>
        {error ? (
          <p className="ws-notice" data-tone="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="ws-note">No hay un error de conexión informado.</p>
        )}
      </div>
      <section className="ws-serial" aria-labelledby={`${id}-serial`}>
        <h3 id={`${id}-serial`}>Salida serie</h3>
        <p className="ws-empty">Sin datos. No hay una fuente de salida serie conectada.</p>
      </section>
    </section>
  )
}
