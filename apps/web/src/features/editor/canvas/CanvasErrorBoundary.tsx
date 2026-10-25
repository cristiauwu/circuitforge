/**
 * Limite de errores del lienzo.
 *
 * **Por que existe:** si la creacion del contexto WebGL falla —un equipo sin
 * aceleracion, un navegador con WebGL desactivado, un driver roto— el error
 * sube hasta el ErrorBoundary de la ruta y **tumba toda la pantalla del editor**.
 * El usuario pierde la paleta, el inspector y la navegacion por un fallo que solo
 * afecta al lienzo.
 *
 * Este limite aisla el fallo: el resto de la herramienta sigue usable y se
 * explica que paso, en vez de mostrar una pantalla de error generica.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
  message: string | null
}

export class CanvasErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false, message: null }

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, message: error.message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Queda en consola para poder diagnosticarlo: un fallo de WebGL silencioso
    // es de los que cuestan una tarde.
    console.error('[CircuitForge] El lienzo 3D no pudo iniciarse:', error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-hairline bg-bg px-6 text-center">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-warning"
        >
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>

        <h2 className="text-md font-medium text-text">No se pudo iniciar el lienzo 3D</h2>
        <p className="max-w-[46ch] text-sm text-text-secondary">
          Tu navegador no pudo crear un contexto WebGL, que es lo que el lienzo necesita para
          dibujar. La paleta y el inspector siguen funcionando.
        </p>
        <p className="max-w-[46ch] text-xs text-text-muted">
          Suele resolverse activando la aceleración por hardware en los ajustes del navegador, o
          actualizando el controlador de la tarjeta gráfica.
        </p>

        {this.state.message !== null && (
          <details className="mt-2 max-w-[52ch] text-left">
            <summary className="cursor-pointer text-xs text-text-muted">Detalle técnico</summary>
            <pre className="cf-mono mt-2 overflow-x-auto rounded-sm border border-hairline bg-surface p-3 text-2xs text-text-muted">
              {this.state.message}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
