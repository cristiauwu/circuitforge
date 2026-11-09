import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from 'react'
import { clampSplitWidth, MIN_SCHEMATIC } from './workspaceLayout'

interface Props {
  width: number
  value: number
  onChange: (width: number) => void
}

/** Tirador separado del historial del circuito; soporta teclado y puntero. */
export function WorkspaceSplit({ width, value, onChange }: Props) {
  const drag = useRef<{ x: number; value: number; pointerId: number } | null>(null)
  const frame = useRef<number | null>(null)
  const requested = useRef(value)
  const change = (next: number) => onChange(clampSplitWidth(next, width))

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const move = (event: PointerEvent<HTMLHRElement>) => {
    const origin = drag.current
    if (!origin || event.pointerId !== origin.pointerId) return
    requested.current = origin.value + event.clientX - origin.x
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        change(requested.current)
      })
    }
  }

  const finish = (event: PointerEvent<HTMLHRElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
      change(requested.current)
    }
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const keyDown = (event: KeyboardEvent<HTMLHRElement>) => {
    const step = event.shiftKey ? 48 : 16
    const next = {
      ArrowLeft: value - step,
      ArrowRight: value + step,
      Home: MIN_SCHEMATIC,
      End: width,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    change(next)
  }

  return (
    <hr
      className="ws-divider"
      aria-label="Ancho del esquema"
      aria-orientation="vertical"
      aria-controls="workspace-schematic workspace-code"
      aria-valuemin={MIN_SCHEMATIC}
      aria-valuemax={clampSplitWidth(width, width)}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onKeyDown={keyDown}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        requested.current = value
        drag.current = { x: event.clientX, value, pointerId: event.pointerId }
      }}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    />
  )
}
