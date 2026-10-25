import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { useSpotlight } from './useSpotlight'

export interface PanelProps {
  children: ReactNode
  className?: string
}

/**
 * Superficie solida — uso por defecto.
 *
 * Radio `lg` (20px), derivado de los 17.28px y 12.8px medidos en la referencia.
 * Sin `box-shadow` de elevacion: la profundidad la da el contraste del relleno
 * contra el fondo mas el borde gris al 10% (regla V-2) y el halo de la capa de
 * atmosfera.
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
  /**
   * Activa el reflejo que sigue al cursor sobre el panel.
   *
   * Por defecto `false`: en los paneles del editor el reflejo competiria con el
   * contenido denso (listas de pines, campos) y con el propio lienzo. Se activa
   * donde el panel esta solo —la vista compartida, por ejemplo— y aporta.
   */
  spotlight?: boolean
}

/**
 * Superficie glass (M-3) — el patron dominante de la referencia.
 *
 * `backdrop-filter` obliga a la GPU a releer el bufer de fondo en cada frame.
 * Con el solver en Web Worker y el lienzo a 60 fps, el presupuesto es de
 * **exactamente tres** superficies: paleta, inspector y barra. El resto usa
 * `Panel` o `Tile`.
 */
export function PanelGlass({ children, className, spotlight = false }: PanelGlassProps) {
  // El hook se llama SIEMPRE, antes de cualquier return: las reglas de hooks no
  // permiten llamarlo condicionalmente, y hacerlo tras un `return` temprano
  // rompe el orden de hooks entre renders.
  const { ref, onPointerMove } = useSpotlight<HTMLDivElement>()

  return (
    <div
      ref={spotlight ? ref : undefined}
      onPointerMove={spotlight ? onPointerMove : undefined}
      className={cx('cf-glass flex flex-col p-4', spotlight && 'cf-spotlight', className)}
    >
      {children}
    </div>
  )
}

export interface TileProps {
  children: ReactNode
  className?: string
  /**
   * Activa el borde que se ilumina siguiendo al cursor.
   *
   * Se reserva a las rejillas de pocas fichas. Con 22 tarjetas el efecto se
   * multiplica y el borde encendido deja de significar nada.
   */
  borderGlow?: boolean
}

/**
 * Tarjeta con relleno tenue y sin blur.
 *
 * Para rejillas densas (la biblioteca con 22 fichas): da el mismo tono de
 * material que el glass sin el coste de GPU, porque no relee el fondo.
 *
 * Lleva grano (`cf-grain`): a esta escala, una superficie plana se lee como un
 * rectangulo de color, y el grano es lo que le da cuerpo.
 */
export function Tile({ children, className, borderGlow = false }: TileProps) {
  // Igual que en `PanelGlass`: el hook se llama siempre y luego se decide si se
  // conecta. Llamarlo tras un return condicional romperia las reglas de hooks.
  const { ref, onPointerMove } = useSpotlight<HTMLDivElement>()

  return (
    <div
      ref={borderGlow ? ref : undefined}
      onPointerMove={borderGlow ? onPointerMove : undefined}
      className={cx(
        'cf-tile cf-grain relative flex flex-col p-4',
        borderGlow && 'cf-border-glow',
        className,
      )}
    >
      {children}
    </div>
  )
}
