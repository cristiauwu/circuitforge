import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-[#10161f] hover:bg-accent-hover',
  secondary: 'bg-surface-alt text-text border border-hairline hover:bg-surface-raised',
  ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-surface-alt',
  danger: 'bg-error text-[#10161f] hover:brightness-110',
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: string
  variant?: Variant
  /**
   * Desactiva el text roll. Necesario cuando el contenido no es texto simple
   * (un icono, o un label que cambia de ancho) porque las dos capas deben medir
   * lo mismo para que el relevo no salte.
   */
  plain?: boolean
}

/**
 * Botón del sistema (DESIGN.md sección 3.1).
 *
 * El text roll usa dos copias del texto: la segunda lleva aria-hidden para que
 * el lector de pantalla no lo anuncie dos veces. La animación vive en
 * animations.css (M-2) y se dispara en :hover y :focus-visible.
 */
export function Button({
  children,
  variant = 'primary',
  plain = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'cf-btn inline-flex h-9 items-center justify-center rounded-sm px-4',
        'text-md font-medium leading-none',
        'transition-[background-color,transform,filter] duration-instant ease-inout',
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
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

/** Enlace con la misma apariencia que el botón, para navegación. */
export interface LinkButtonProps {
  children: string
  href: string
  variant?: Variant
  className?: string
  onClick?: () => void
  'aria-label'?: string
}

/**
 * Version de `Button` para navegación.
 *
 * Es un `<a>` y no un `<button>` porque navega: asi el navegador ofrece abrir en
 * pestana nueva, copiar la direccion y anunciarlo como enlace. React Router lo
 * intercepta para hacer la transición de vista.
 */
export function LinkButton({
  children,
  href,
  variant = 'primary',
  className,
  onClick,
  ...rest
}: LinkButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cx(
        'cf-btn inline-flex h-9 items-center justify-center rounded-sm px-4',
        'text-md font-medium leading-none no-underline',
        'transition-[background-color,transform,filter] duration-instant ease-inout',
        'active:scale-[0.97]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <span className="cf-btn__roll">
        <span className="cf-btn__text">{children}</span>
        <span className="cf-btn__text" aria-hidden="true">
          {children}
        </span>
      </span>
    </a>
  )
}

/** Contenedor de icono + texto para botones con contenido compuesto. */
export function ButtonContent({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2">{children}</span>
}
