import { useState } from 'react'
import { resolveThumbnail, unavailableThumbnailReasons } from './thumbnailManifest'
import './component-preview.css'

export interface ComponentPreviewProps {
  typeId: string
  name?: string
  size?: 'compact' | 'detail'
  className?: string
}

/** A static model photograph, not another WebGL context in a scrolling catalog. */
export function ComponentPreview({
  typeId,
  name,
  size = 'compact',
  className,
}: ComponentPreviewProps) {
  const src = resolveThumbnail(typeId)
  const [failedSource, setFailedSource] = useState<string>()
  const available = Boolean(src && failedSource !== src)
  const label = name || typeId.replaceAll('_', ' ')
  const reason = Object.hasOwn(unavailableThumbnailReasons, typeId)
    ? unavailableThumbnailReasons[typeId]
    : 'No hay una miniatura renderizada disponible para este componente.'

  return (
    <span
      className={['component-preview', `component-preview--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      data-preview={available ? 'rendered' : 'unavailable'}
      data-component-type={typeId}
    >
      {available ? (
        <img
          src={src}
          alt={`${label} · vista ilustrativa del modelo 3D`}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedSource(src)}
        />
      ) : (
        <span
          className="component-preview__unavailable"
          role="img"
          aria-label={`${label}: vista previa no disponible. ${reason}`}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true">
            <path
              d="m16 3 11 6v14l-11 6-11-6V9l11-6Zm0 0v13m0 0L5 9m11 7 11-7m-11 7v13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path d="m6 27 21-22" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Vista no disponible</span>
        </span>
      )}
    </span>
  )
}

export default ComponentPreview
