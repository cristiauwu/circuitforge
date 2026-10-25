import type { PinType } from '@circuitforge/netlist'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Marca el chip como filtro activo. */
  active?: boolean
  className?: string
}

/**
 * Chip de categoria o filtro.
 *
 * Radio de pildora y altura 28px. El estado activo usa el relleno fuerte en vez
 * del acento: en la referencia el acento cromatico se reserva a la accion
 * primaria, y un filtro activo no es una accion primaria. Con 9 categorias
 * pintadas de naranja, el naranja dejaria de significar "haz esto".
 */
export function Chip({ children, active = false, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'inline-flex h-7 items-center gap-1.5 rounded-pill px-3',
        'text-xs font-medium leading-none whitespace-nowrap',
        'border transition-[background-color,border-color,color,transform] duration-fast ease-inout',
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-35',
        active
          ? 'border-transparent bg-[var(--cf-fill-strong)] text-text'
          : 'border-hairline bg-transparent text-text-secondary hover:border-hairline-strong hover:text-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Colores por tipo de pin.
 *
 * El color asocia visualmente el pin con su funcion electrica (V-4): no es
 * decorativo. Todos los valores salen de los tokens de la paleta de cables, no
 * de literales: un hex suelto en un componente es un token que falta.
 */
const PIN_STYLES: Record<PinType, string> = {
  power: 'text-error bg-[color-mix(in_srgb,var(--cf-error)_12%,transparent)]',
  gnd: 'text-text-muted bg-[var(--cf-fill-dim)]',
  digital: 'text-[var(--cf-wire-7)] bg-[color-mix(in_srgb,var(--cf-wire-7)_12%,transparent)]',
  analog: 'text-[var(--cf-wire-5)] bg-[color-mix(in_srgb,var(--cf-wire-5)_12%,transparent)]',
  pwm: 'text-[var(--cf-wire-5)] bg-[color-mix(in_srgb,var(--cf-wire-5)_12%,transparent)]',
  i2c_sda: 'text-signal bg-[color-mix(in_srgb,var(--cf-signal)_12%,transparent)]',
  i2c_scl: 'text-signal bg-[color-mix(in_srgb,var(--cf-signal)_12%,transparent)]',
  spi_mosi: 'text-[var(--cf-wire-3)] bg-[color-mix(in_srgb,var(--cf-wire-3)_12%,transparent)]',
  spi_miso: 'text-[var(--cf-wire-3)] bg-[color-mix(in_srgb,var(--cf-wire-3)_12%,transparent)]',
  spi_sck: 'text-[var(--cf-wire-3)] bg-[color-mix(in_srgb,var(--cf-wire-3)_12%,transparent)]',
  uart_tx: 'text-[var(--cf-wire-8)] bg-[color-mix(in_srgb,var(--cf-wire-8)_12%,transparent)]',
  uart_rx: 'text-[var(--cf-wire-8)] bg-[color-mix(in_srgb,var(--cf-wire-8)_12%,transparent)]',
}

/** Abreviatura del tipo de pin. */
const PIN_LABELS: Record<PinType, string> = {
  power: 'PWR',
  gnd: 'GND',
  digital: 'DIO',
  analog: 'ADC',
  pwm: 'PWM',
  i2c_sda: 'SDA',
  i2c_scl: 'SCL',
  spi_mosi: 'MOSI',
  spi_miso: 'MISO',
  spi_sck: 'SCK',
  uart_tx: 'TX',
  uart_rx: 'RX',
}

export interface PinChipProps {
  pinType: PinType
  /** Etiqueta del pin en la ficha ("D13", "A0"). */
  pinName?: string
  className?: string
}

/**
 * Chip de pin — siempre monoespaciado.
 * Todo identificador y todo valor tecnico va en JetBrains Mono.
 */
export function PinChip({ pinType, pinName, className }: PinChipProps) {
  return (
    <span
      data-pin={pinType}
      className={cx(
        'inline-flex h-5 items-center rounded-pill px-2',
        'cf-mono text-2xs font-medium uppercase leading-none',
        PIN_STYLES[pinType],
        className,
      )}
    >
      {pinName ?? PIN_LABELS[pinType]}
    </span>
  )
}
