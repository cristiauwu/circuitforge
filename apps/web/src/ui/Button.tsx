import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

/**
 * Boton del sistema.
 *
 * ANATOMIA medida de la referencia, no inventada:
 * - radio de **pildora** (la referencia usa 160px y 100% en sus controles)
 * - altura 40px (los controles medidos van de 37 a 44px)
 * - padding horizontal generoso, proporcional a la pildora
 * - transicion de 0.3s con la curva firma, y de 0.6s en el movimiento grande
 *
 * El text roll de doble capa se conserva: es el patron M-2 y aporta la sensacion
 * de respuesta que la referencia consigue con Webflow IX2.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary:
    'bg-[var(--cf-fill)] text-text border border-hairline hover:bg-[var(--cf-fill-strong)] hover:border-hairline-strong',
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-surface-alt',
  danger: 'bg-error text-on-accent hover:brightness-110',
  light: 'bg-text text-bg hover:bg-text-strong',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-md',
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: string
  variant?: Variant
  size?: Size
  /** Icono a la izquierda del texto. */
  icon?: ReactNode
  /** Desactiva el text roll para contenido que no es texto simple. */
  plain?: boolean
  /** Ocupa todo el ancho disponible. */
  block?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  plain = false,
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'cf-btn cf-shine group relative inline-flex shrink-0 items-center justify-center gap-2',
        'rounded-pill font-medium leading-none',
        'transition-[background-color,color,transform,filter,box-shadow] duration-base ease-out',
        'hover:-translate-y-px active:scale-[0.97] active:translate-y-0',
        'disabled:pointer-events-none disabled:opacity-40',
        SIZES[size],
        VARIANTS[variant],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {plain ? (
        children
      ) : (
        <span className="cf-btn__roll">
          <span className="cf-btn__text">{children}</span>
          <span className="cf-btn__text" aria-hidden="true">
            {children}
          </span>
        </span>
      )}
    </button>
  )
}

export interface LinkButtonProps {
  children: string
  href: string
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
  onClick?: () => void
  'aria-label'?: string
}

/** Version de `Button` para navegacion: es un `<a>` porque navega. */
export function LinkButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  onClick,
  ...rest
}: LinkButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cx(
        'cf-btn cf-shine group relative inline-flex shrink-0 items-center justify-center gap-2',
        'rounded-pill font-medium leading-none no-underline',
        'transition-[background-color,color,transform,filter,box-shadow] duration-base ease-out',
        'hover:-translate-y-px active:scale-[0.97] active:translate-y-0',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      <span className="cf-btn__roll">
        <span className="cf-btn__text">{children}</span>
        <span className="cf-btn__text" aria-hidden="true">
          {children}
        </span>
      </span>
    </a>
  )
}

/**
 * Boton circular de icono — el control mas caracteristico de la referencia.
 *
 * Evidencia: iyo.ai usa circulos perfectos (radius 100%) con relleno claro sobre
 * el fondo oscuro, tanto en la barra de navegacion como en las acciones. Es el
 * elemento que mas define su lenguaje y el que faltaba por completo.
 *
 * `label` es obligatorio y se convierte en aria-label: un boton sin texto
 * visible necesita nombre accesible (WCAG 4.1.2).
 */
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  children: ReactNode
  variant?: 'light' | 'dark' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}

const ICON_VARIANTS = {
  light: 'bg-text text-bg hover:bg-text-strong',
  dark: 'bg-[var(--cf-fill)] text-text border border-hairline hover:bg-[var(--cf-fill-strong)] hover:border-hairline-strong',
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-surface-alt',
  accent: 'bg-accent text-on-accent hover:bg-accent-hover',
} as const

const ICON_SIZES = {
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-11',
} as const

export function IconButton({
  label,
  children,
  variant = 'dark',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-pill',
        'transition-[background-color,color,transform,box-shadow] duration-base ease-out',
        'hover:scale-105 active:scale-95',
        'disabled:pointer-events-none disabled:opacity-40',
        ICON_SIZES[size],
        ICON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
