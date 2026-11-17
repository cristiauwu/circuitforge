/**
 * @circuitforge/web — SegmentedControl estilo Apple iOS (Apple HIG & Emil Design Eng).
 *
 * Proporciona un selector de modo excluyente con estética de cápsula (pill),
 * sombra de elevación física, feedback instantáneo en pointerdown (`scale(0.97)`)
 * y accesibilidad mediante ARIA tablist/tab y navegación por teclado.
 */

import React, { useRef } from 'react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  disabled?: boolean | undefined
  title?: string | undefined
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string | undefined
  size?: 'sm' | 'md' | undefined
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextIndex = (currentIndex + 1) % options.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextIndex = (currentIndex - 1 + options.length) % options.length
    }

    if (nextIndex !== currentIndex) {
      const targetOption = options[nextIndex]
      if (targetOption && !targetOption.disabled) {
        onChange(targetOption.value)
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        buttons?.[nextIndex]?.focus()
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`nx-segmented-control ${size === 'sm' ? 'nx-segmented-sm' : ''} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt, index) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            disabled={opt.disabled}
            title={opt.title}
            className={`nx-segmented-pill ${isSelected ? 'active' : ''}`}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value)
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {opt.icon && <span className="nx-segmented-icon" aria-hidden="true">{opt.icon}</span>}
            <span className="nx-segmented-label">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
