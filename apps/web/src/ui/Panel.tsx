import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface PanelProps {
  children: ReactNode
  className?: string
}

/**
 * Superficie solida — uso por defecto.
 *
 * Radio `lg` (20px), derivado de los 17.28px y 12.8px medidos en la referencia.
 * Sin `box-shadow` de elevacion: la profundidad la da el contraste del relleno
 * contra el fondo mas el borde gris al 10% (regla V-2).
 */
export function Panel({ children, className }: PanelProps) {
  return <div className={cx('cf-panel flex flex-col p-4', className)}>{children}</div>
}

export interface PanelTitleProps {
  children: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Encabezado de panel.
 *
 * Usa el tratamiento de "eyebrow" de la referencia: versalitas micro con
 * tracking amplio en color apagado. Es un recurso que iyo.ai repite mucho y que
 * da jerarquia sin gastar peso tipografico.
 */
export function PanelTitle({ children, action, className }: PanelTitleProps) {
  return (
    <div className={cx('mb-3 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="cf-eyebrow">{children}</span>
        {action}
      </div>
      {/* Separador que se desvanece en los extremos, como en la referencia */}
      <span aria-hidden="true" className="cf-divider" />
    </div>
  )
}

export interface PanelGlassProps {
  children: ReactNode
  className?: string
}

/**
 * Superficie glass (M-3) — el patron dominante de la referencia.
 *
 * `backdrop-filter` obliga a la GPU a releer el bufer de fondo en cada frame.
 * Con el solver en Web Worker y el lienzo a 60 fps, el presupuesto es de
 * **exactamente tres** superficies: paleta, inspector y barra. El resto usa
 * `Panel` o `Tile`.
 */
export function PanelGlass({ children, className }: PanelGlassProps) {
  return <div className={cx('cf-glass flex flex-col p-4', className)}>{children}</div>
}

export interface TileProps {
  children: ReactNode
  className?: string
}

/**
 * Tarjeta con relleno tenue y sin blur.
 *
 * Para rejillas densas (la biblioteca con 22 fichas): da el mismo tono de
 * material que el glass sin el coste de GPU, porque no relee el fondo.
 */
export function Tile({ children, className }: TileProps) {
  return <div className={cx('cf-tile flex flex-col p-4', className)}>{children}</div>
}
