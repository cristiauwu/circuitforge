import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'

const NAV_ITEMS = [
  { to: '/editor', label: 'Editor' },
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/proyectos', label: 'Proyectos' },
]

/**
 * Cabecera de la herramienta.
 *
 * La ruta activa se marca con color Y con un subrayado (no solo color): el
 * estado nunca se comunica únicamente por color.
 *
 * `viewTransition` en cada enlace activa la transición nativa del navegador al
 * cambiar de ruta (React Router 7). Degrada sin animación donde no hay soporte.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg/80 backdrop-blur-md">
      {/*
        A 320 px la marca y los tres enlaces no caben en una fila: medido, el
        nav necesitaba 237 px y desbordaba 72. Se permite el ajuste de linea
        (`flex-wrap`) y se reduce el espaciado, en vez de recortar o esconder
        opciones, que obligaria a un menú desplegable y dejaria acciones fuera
        de alcance en la pantalla mas estrecha.
      */}
      <div className="mx-auto flex h-14 w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:gap-x-6 sm:px-6">
        <NavLink
          to="/"
          viewTransition
          className="flex shrink-0 items-center gap-2 text-text no-underline"
          aria-label="CircuitForge, ir a la portada"
        >
          <CircuitMark />
          <span className="text-md font-semibold tracking-tight">CircuitForge</span>
        </NavLink>

        <nav aria-label="Principal" className="flex min-w-0 flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} viewTransition className="group relative">
              {({ isActive }) => (
                <span
                  className={cx(
                    'inline-flex h-8 items-center rounded-sm px-2.5 text-sm no-underline sm:px-3',
                    'transition-colors duration-fast ease-inout',
                    isActive
                      ? 'text-text'
                      : 'text-text-secondary hover:text-text hover:bg-surface-alt',
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute inset-x-2.5 -bottom-px h-px origin-left bg-accent sm:inset-x-3',
                      'transition-transform duration-base ease-out',
                      isActive ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                  {isActive && <span className="sr-only">(página actual)</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

/** Marca de la aplicación: una resistencia en notacion esquematica. */
function CircuitMark() {
  return (
    <svg
      width="20"
      height="20"
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
