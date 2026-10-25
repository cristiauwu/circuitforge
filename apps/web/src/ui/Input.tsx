import type { InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Alinea a la derecha y usa monoespaciada: para valores numericos. */
  numeric?: boolean
}

/**
 * Campo de entrada (DESIGN.md sección 3.6).
 *
 * Sin `outline` en foco: el borde cambia a color de acento. El anillo de foco
 * global se reserva para elementos sin borde propio.
 */
export function Input({ numeric = false, className, type = 'text', ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={cx(
        'h-8 w-full rounded-sm px-3',
        'border border-hairline bg-surface-alt',
        'text-sm text-text placeholder:text-text-muted',
        'transition-[border-color] duration-fast ease-inout',
        'focus:border-accent focus:outline-none',
        numeric && 'cf-mono text-right',
        className,
      )}
      {...rest}
    />
  )
}
