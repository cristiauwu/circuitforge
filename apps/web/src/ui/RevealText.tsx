import { useEffect, useRef, useState } from 'react'
import { cx } from '@/lib/cx'

export interface RevealTextProps {
  text: string
  /** Etiqueta semantica del texto. Por defecto `h1`. */
  as?: 'h1' | 'h2' | 'p' | 'span'
  className?: string
  /** Retardo inicial antes de la primera letra, en ms. */
  delay?: number
  /** Fuerza el estado revelado sin animación (para pruebas o reduced-motion). */
  immediate?: boolean
}

/**
 * Revelado de titular letra por letra con desenfoque (M-1, DESIGN.md sección 4).
 *
 * Cada letra parte de blur(2px) + opacity 0 y anima a blur(0) + opacity 1,
 * escalonada por indice, produciendo un barrido de izquierda a derecha.
 *
 * Tres decisiones de implementacion:
 *
 * 1. **El texto completo vive en un `aria-label` y las letras en `aria-hidden`.**
 *    Sin esto, un lector de pantalla deletrea el titular ("C, i, r, c...") y las
 *    palabras se oyen entrecortadas. El nodo accesible es uno solo.
 * 2. **`IntersectionObserver` con umbral 0.2** en vez de animar al montar: en una
 *    lista larga, solo se revela lo que entra en pantalla.
 * 3. **`will-change` se retira al terminar** (`is-done`). Dejarlo activo mantiene
 *    una capa de composicion por letra, lo que penaliza el lienzo que corre detras.
 */
export function RevealText({
  text,
  as: Tag = 'h1',
  className,
  delay = 0,
  immediate = false,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(immediate)
  const [done, setDone] = useState(immediate)

  useEffect(() => {
    if (immediate) return

    const node = ref.current
    if (!node) return

    // Sin IntersectionObserver (entorno de prueba o navegador antiguo) se revela
    // de inmediato en vez de quedar invisible: degradar a "visible" es seguro.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      setDone(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [immediate])

  // Retirar will-change cuando la última letra termino su transición.
  useEffect(() => {
    if (!visible || done) return
    const total = delay + text.length * 18 + 600
    const timer = window.setTimeout(() => setDone(true), total)
    return () => window.clearTimeout(timer)
  }, [visible, done, text.length, delay])

  const words = text.split(' ')
  let index = 0

  return (
    <Tag
      // biome-ignore lint/suspicious/noExplicitAny: el ref cambia de tipo con la etiqueta
      ref={ref as any}
      className={cx('cf-reveal', visible && 'is-visible', done && 'is-done', className)}
      aria-label={text}
    >
      <span aria-hidden="true">
        {words.map((word, wordIndex) => {
          const letters = [...word].map((char, charIndex) => {
            const i = index + charIndex
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: la posición de una letra dentro de su palabra es su identidad estable; el texto nunca se reordena
                key={`${wordIndex}-${charIndex}`}
                className="cf-reveal-letter"
                style={{ '--i': i + delay / 18 } as React.CSSProperties}
              >
                {char}
              </span>
            )
          })
          index += word.length
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: la posición de la palabra es su identidad estable; el texto nunca se reordena
              key={wordIndex}
              className="inline-block whitespace-nowrap"
            >
              {letters}
              {wordIndex < words.length - 1 && <span>&nbsp;</span>}
            </span>
          )
        })}
      </span>
    </Tag>
  )
}
