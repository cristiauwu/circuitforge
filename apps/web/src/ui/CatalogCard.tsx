/**
 * Tarjeta de catalogo.
 *
 * Existe como componente propio —en vez de repetir clases de Tailwind en cada
 * rejilla— porque necesita el hook del reflejo: el borde que se ilumina sigue al
 * cursor, y eso requiere handlers de puntero que no pueden vivir en un `class`.
 *
 * El `article` es semantico: cada ficha es una unidad de contenido independiente.
 */

import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { useSpotlight } from './useSpotlight'

export interface CatalogCardProps {
  children: ReactNode
  className?: string
  /** Retardo de entrada escalonada, en ms. Se pasa como `--i`. */
  index?: number
}

export function CatalogCard({ children, className, index }: CatalogCardProps) {
  const { ref, onPointerMove } = useSpotlight<HTMLElement>()

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      className={cx('cf-tile cf-grain cf-border-glow relative h-full', className)}
      style={
        index === undefined
          ? undefined
          : ({ ['--i' as string]: String(index) } as React.CSSProperties)
      }
    >
      {children}
    </article>
  )
}
