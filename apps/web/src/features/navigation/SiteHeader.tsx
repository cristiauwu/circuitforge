import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { IconButton } from '@/ui'

const NAV_ITEMS = [
  { to: '/editor', label: 'Editor' },
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/proyectos', label: 'Proyectos' },
]

/**
 * Cabecera de la herramienta.
 *
 * ANATOMIA medida de la referencia, no inventada. iyo.ai usa una **pildora
 * flotante centrada** con glass, no una barra de ancho completo:
 * - contenedor de radio completo, flotando sobre el contenido (no pegado al borde)
 * - relleno translucido + backdrop-filter blur(19px)
 * - los controles viven DENTRO de la pildora
 *
 * La version anterior era una barra a ancho completo con borde inferior: es el
 * patron generico de dashboard y no se parecia en nada a la referencia.
 *
 * Se conserva `sticky` para que siga disponible al desplazar, y la ruta activa
 * se marca con color Y con un fondo: el estado nunca se comunica solo por color.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] justify-center">
        {/*
          La pildora: glass, radio completo, alto fijo. `w-fit` para que abrace
          su contenido en vez de estirarse — asi es como flota en la referencia.
        */}
        <nav
          aria-label="Principal"
          className={cx('cf-glass flex w-fit max-w-full items-center gap-1 p-1.5', 'rounded-pill')}
        >
          {/* Marca */}
          <NavLink
            to="/"
            viewTransition
            className="flex shrink-0 items-center gap-2 rounded-pill px-3 py-1.5 text-text no-underline transition-colors duration-fast ease-inout hover:bg-surface-alt"
            aria-label="CircuitForge, ir a la portada"
          >
            <CircuitMark />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              CircuitForge
            </span>
          </NavLink>

          {/* Separador vertical, como el de la referencia */}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-hairline-strong" />

          {/* Enlaces */}
          <ul className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} viewTransition>
                  {({ isActive }) => (
                    <span
                      className={cx(
                        'inline-flex h-8 items-center rounded-pill px-3.5 text-sm no-underline',
                        'transition-colors duration-fast ease-inout',
                        isActive
                          ? 'bg-[var(--cf-fill-strong)] text-text'
                          : 'text-text-secondary hover:bg-surface-alt hover:text-text',
                      )}
                    >
                      {item.label}
                      {isActive && <span className="sr-only"> (página actual)</span>}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Accion de icono circular — el control caracteristico de la referencia */}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-hairline-strong" />
          <IconButton label="Nuevo proyecto" variant="light" size="sm" disabled className="mr-0.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </IconButton>
        </nav>
      </div>
    </header>
  )
}

/** Marca de la aplicacion: una resistencia en notacion esquematica. */
function CircuitMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-accent"
    >
      <path d="M2 12h3l1.5-4 2 8 2-8 2 8 1.5-4h3" />
      <circle cx="20" cy="12" r="2" />
    </svg>
  )
}
