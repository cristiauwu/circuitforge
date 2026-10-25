import type { InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Alinea a la derecha y usa monoespaciada: para valores numericos. */
  numeric?: boolean
}

/**
 * Campo de entrada.
 *
 * Radio de pildora y altura 36px, coherente con los controles medidos en la
 * referencia (37-44px). El relleno es translucido y no un color solido: sobre el
 * fondo oscuro un campo solido se lee como un agujero, mientras que el relleno
 * tenue se lee como una superficie.
 *
 * Sin `outline` en foco: el borde pasa a color de acento, que es mas preciso
 * para un campo de una sola linea.
 */
export function Input({ numeric = false, className, type = 'text', ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={cx(
        'h-9 w-full rounded-pill px-4',
        'border border-hairline bg-[var(--cf-fill-dim)]',
        'text-sm text-text placeholder:text-text-muted',
        'transition-[border-color,background-color] duration-fast ease-inout',
        'hover:border-hairline-strong',
        'focus:border-accent focus:bg-[var(--cf-fill)] focus:outline-none',
        numeric && 'cf-mono text-right',
        className,
      )}
      {...rest}
    />
  )
}
