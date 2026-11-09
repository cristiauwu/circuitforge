import './orange-cat.css'

export interface OrangeCatProps {
  awake: boolean
}

/** Original rubber-hose character, authored for Nexo; decorative inside the help button. */
export function OrangeCat({ awake }: OrangeCatProps) {
  return (
    <svg
      className="nx-cat"
      data-awake={awake}
      viewBox="0 0 160 124"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="nx-cat-ground"
        d="M15 111c16-7 107-8 129-1 8 3-5 7-19 8H39c-19-1-30-4-24-7Z"
      />
      <g className="nx-cat-ink">
        {/* Round back, tucked haunch, and a single long rubber-hose tail. */}
        <path
          className="nx-cat-orange"
          d="M59 68c4-22 20-35 43-32 25 3 39 24 35 47-2 14-13 24-31 25l-41-2c-16-5-18-23-6-38Z"
        />
        <path className="nx-cat-detail" d="M111 42c-6 0-10 2-13 6m26 2c-6-1-10 1-13 5" />
        <path
          className="nx-cat-tail"
          d="M132 76c13 18-2 35-25 34-19 0-35-8-32-22 2-11 17-16 25-9 6 5 1 13-5 10"
        />
        <path
          className="nx-cat-tail-core"
          d="M132 76c13 18-2 35-25 34-19 0-35-8-32-22 2-11 17-16 25-9 6 5 1 13-5 10"
        />
        <path className="nx-cat-detail" d="m125 104 3-9m-17 12 1-10" />
        {/* The rear mitten is tucked beneath the cheek, not a separate floating paw. */}
        <path
          className="nx-cat-cream"
          d="M51 92c-8-6-17-3-17 3-10-2-15 5-10 10-3 7 5 12 14 9l22-6Z"
        />
        <path className="nx-cat-detail" d="m31 103 3 5m6-7 3 6" />
        <g className="nx-cat-head">
          <path
            className="nx-cat-orange"
            d="M23 61c-6-9-7-24-3-38 1-4 4-5 7-2l19 17c7-2 14-2 21 0L84 23c4-3 7-1 6 4l-3 30c8 12 8 25 0 35-11 13-41 16-57 5-12-8-16-23-7-36Z"
          />
          <path className="nx-cat-ear" d="m25 31 14 13-13 7Zm57 4-12 12 11 6Z" />
          <path className="nx-cat-detail" d="m49 40 4 9m7-10 1 9" />
          <path
            className="nx-cat-cream"
            d="M29 76c3-7 13-9 24-4 9-7 21-5 27 1 9 10-1 24-22 25-20 1-36-9-29-22Z"
          />
          <g className="nx-cat-sleeping">
            <path className="nx-cat-detail" d="M31 64c3 6 9 7 14 2m20-1c4 5 10 5 14-1" />
            <path className="nx-cat-detail" d="m32 67-3 3m49-3 3 2" />
          </g>
          <g className="nx-cat-waking">
            <path
              className="nx-cat-eye"
              d="M34 66c-3-11 0-17 6-16 6 1 9 9 7 17-4 2-9 2-13-1Zm29 0c-2-11 2-18 8-16 6 2 8 10 5 17-4 2-9 2-13-1Z"
            />
            <path className="nx-cat-glint" d="m37 52 7 5-8 2Zm30 0 7 5-8 2Z" />
            <path className="nx-cat-detail" d="M31 46c3-3 7-4 10-3m24 0c4-2 8-1 11 2" />
          </g>
          <path className="nx-cat-nose" d="M48 75c1-4 13-5 16-1 1 3-4 8-7 8s-9-4-9-7Z" />
          <path className="nx-cat-detail" d="m57 82 1 5m-12-1c3 5 8 5 12 1 4 4 9 3 12-1" />
          <path className="nx-cat-whisker" d="m31 80-16-3m16 10-17 3m66-11 16-5m-16 12 17 2" />
        </g>
        {/* Oversized three-finger glove and curved cuff complete the curled silhouette. */}
        <path
          className="nx-cat-cream"
          d="M61 97c4-8 12-10 16-5 7-3 13 2 11 8 7 4 4 13-3 14l-23 1c-12-1-15-10-8-15Z"
        />
        <path className="nx-cat-detail" d="m66 99 1 8m9-10 1 9m-20 3c7 3 15 4 22 2" />
      </g>
      {/* An authored speech glyph, never a text/emoji substitute for the character. */}
      <g className="nx-cat-message nx-cat-ink">
        <path
          className="nx-cat-cream"
          d="M111 10h29c6 0 9 4 9 10v9c0 6-3 9-9 9h-14l-10 8 1-8h-6c-6 0-9-3-9-9v-9c0-6 3-10 9-10Z"
        />
        <path className="nx-cat-detail" d="M116 21h19m-19 7h12" />
      </g>
    </svg>
  )
}
