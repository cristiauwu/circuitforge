import { cx } from '@/lib/cx'

export type Severity = 'error' | 'warning' | 'success'

const VEILS: Record<Severity, string> = {
  error: 'bg-[var(--cf-error-veil)] text-error',
  warning: 'bg-[var(--cf-warning-veil)] text-warning',
  success: 'bg-[var(--cf-success-veil)] text-success',
}

/**
 * Icono por severidad.
 *
 * El estado NUNCA se comunica solo con color: cada mensaje lleva icono además
 * del texto. Es el requisito WCAG 1.4.1 y una regla de DESIGN.md sección 3.4.
 */
function SeverityIcon({ severity }: { severity: Severity }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'mt-px shrink-0',
  }

  if (severity === 'error') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m4.9 4.9 14.2 14.2" />
      </svg>
    )
  }

  if (severity === 'warning') {
    return (
      <svg {...common}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M21.8 10.9A10 10 0 1 1 17 3.5" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

export interface ViolationMessageProps {
  severity: Severity
  /** Codigo de regla (V-1..V-6). Opcional: no todo aviso viene de una regla. */
  rule?: string
  message: string
  className?: string
}

/** Mensaje de validación (DESIGN.md sección 3.4). */
export function ViolationMessage({ severity, rule, message, className }: ViolationMessageProps) {
  return (
    <div
      data-severity={severity}
      role={severity === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-start gap-2 rounded-sm p-3',
        'text-sm leading-snug',
        VEILS[severity],
        className,
      )}
    >
      <SeverityIcon severity={severity} />
      <span>
        {rule && <span className="cf-mono mr-1.5 text-2xs font-medium">{rule}</span>}
        {message}
      </span>
    </div>
  )
}
