import type { PinType } from '@circuitforge/netlist'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Marca el chip como filtro activo. */
  active?: boolean
  className?: string
}

/** Chip de categoría o filtro (DESIGN.md sección 3.3). */
export function Chip({ children, active = false, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'inline-flex h-6 items-center gap-1 rounded-full px-3',
        'text-xs font-medium leading-none whitespace-nowrap',
        'transition-[background-color,color,transform] duration-fast ease-inout',
        'hover:-translate-y-px',
        active ? 'bg-accent text-[#10161f]' : 'bg-surface-alt text-text-secondary hover:text-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * Colores por tipo de pin (DESIGN.md sección 3.3).
 *
 * El color asocia visualmente el pin con su funcion eléctrica. No es decorativo:
 * alimentacion en rojo, tierra en apagado, digital en azul, PWM en violeta,
 * I2C en el cian de instrumentacion.
 */
const PIN_STYLES: Record<PinType, string> = {
  power: 'text-error bg-[rgb(248_113_113/0.1)]',
  gnd: 'text-text-muted',
  digital: 'text-[#60a5fa] bg-[rgb(96_165_250/0.1)]',
  analog: 'text-[#a78bfa] bg-[rgb(167_139_250/0.1)]',
  pwm: 'text-[#a78bfa] bg-[rgb(167_139_250/0.1)]',
  i2c_sda: 'text-signal bg-[rgb(34_211_238/0.1)]',
  i2c_scl: 'text-signal bg-[rgb(34_211_238/0.1)]',
  spi_mosi: 'text-[#34d399] bg-[rgb(52_211_153/0.1)]',
  spi_miso: 'text-[#34d399] bg-[rgb(52_211_153/0.1)]',
  spi_sck: 'text-[#34d399] bg-[rgb(52_211_153/0.1)]',
  uart_tx: 'text-[#fb923c] bg-[rgb(251_146_60/0.1)]',
  uart_rx: 'text-[#fb923c] bg-[rgb(251_146_60/0.1)]',
}

/** Etiqueta compacta del tipo de pin. */
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
  /** Etiqueta del pin en la ficha ("D13", "A0"). Si falta, se usa la abreviatura del tipo. */
  pinName?: string
  className?: string
}

/**
 * Chip de pin — siempre monoespaciado (DESIGN.md sección 2.2: todo
 * identificador y todo valor técnico va en JetBrains Mono).
 */
export function PinChip({ pinType, pinName, className }: PinChipProps) {
  return (
    <span
      data-pin={pinType}
      className={cx(
        'inline-flex h-5 items-center rounded-full px-2',
        'cf-mono text-2xs font-medium uppercase leading-none',
        PIN_STYLES[pinType],
        className,
      )}
    >
      {pinName ?? PIN_LABELS[pinType]}
    </span>
  )
}
