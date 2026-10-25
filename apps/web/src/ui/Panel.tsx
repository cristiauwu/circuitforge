import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface PanelProps {
  children: ReactNode
  className?: string
}

/**
 * Superficie solida (DESIGN.md sección 3.2) — el uso por defecto.
 *
 * Sin `box-shadow`: la elevación se expresa con el borde hairline sobre el fondo
 * mas oscuro. Es la regla V-2 del sistema.
 */
export function Panel({ children, className }: PanelProps) {
  return <div className={cx('cf-panel flex flex-col p-4', className)}>{children}</div>
}

export interface PanelTitleProps {
  children: ReactNode
  /** Acción opcional alineada a la derecha (un botón, un contador). */
  action?: ReactNode
  className?: string
}

/** Encabezado de panel: versalitas monoespaciadas en color apagado. */
export function PanelTitle({ children, action, className }: PanelTitleProps) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-2 pb-3',
        'border-b border-hairline mb-3',
        className,
      )}
    >
      <span className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
        {children}
      </span>
      {action}
    </div>
  )
}

export interface PanelGlassProps {
  children: ReactNode
  className?: string
}

/**
 * Superficie glass (M-3).
 *
 * `backdrop-filter` obliga a la GPU a leer el bufer de fondo en cada frame. Con
 * el solver en Web Worker y el lienzo a 60 fps, el presupuesto es de **exactamente
 * tres** superficies: paleta, inspector y barra. El resto usa `Panel`.
 */
export function PanelGlass({ children, className }: PanelGlassProps) {
  return <div className={cx('cf-glass flex flex-col p-4', className)}>{children}</div>
}
