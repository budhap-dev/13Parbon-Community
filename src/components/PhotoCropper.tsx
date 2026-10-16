import { useId, useRef, useState } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'
import type { Crop } from '@/lib/images/prepare'
import { centred, cropOf, FRAME, held, MAX_ZOOM, scaleOf, STEP, zoomed, type Place, type Size } from '@/domain/crop'
import styles from './PhotoCropper.module.css'

/**
 * Placing a photograph in its circle before it is sent: drag it, and zoom in.
 *
 * Every place a face is drawn is a disc, so the disc is what is shown here, with the rest of the
 * picture dimmed around it. Nothing leaves the machine until "Use this photo": the picture is
 * read from the file where it is, and what is sent is only the square chosen here, redrawn.
 *
 * For a keyboard, the arrow keys move it and + and − zoom, with the slider for the same.
 */
export function PhotoCropper({
  src,
  who,
  onUse,
  onCancel,
}: {
  /** The chosen file's own address in this browser, made and let go of by whoever opened this. */
  src: string
  who: string
  onUse: (crop: Crop) => void
  onCancel: () => void
}) {
  const [size, setSize] = useState<Size | null>(null)
  const [place, setPlace] = useState<Place>({ zoom: 1, x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const hint = useId()

  const move = (dx: number, dy: number) => size && setPlace((now) => held(size, { ...now, x: now.x + dx, y: now.y + dy }))
  const zoom = (to: number) => size && setPlace((now) => zoomed(size, now, to))
  const s = size ? scaleOf(size, place.zoom) : 1

  return (
    <Modal open title={`Place the photograph of ${who}`} eyebrow="Profile photo" onClose={onCancel}>
      <div className={styles.actions}>
        <Button variant="line" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="gold" size="sm" disabled={!size} onClick={() => size && onUse(cropOf(size, place))}>
          Use this photo
        </Button>
      </div>

      <div
        className={styles.frame}
        style={{ width: FRAME, height: FRAME }}
        tabIndex={0}
        role="group"
        aria-label="The photograph in its circle"
        aria-describedby={hint}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          move(e.clientX - drag.current.x, e.clientY - drag.current.y)
          drag.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const keys: Record<string, () => void> = {
            ArrowLeft: () => move(STEP, 0),
            ArrowRight: () => move(-STEP, 0),
            ArrowUp: () => move(0, STEP),
            ArrowDown: () => move(0, -STEP),
            '+': () => zoom(place.zoom + 0.1),
            '=': () => zoom(place.zoom + 0.1),
            '-': () => zoom(place.zoom - 0.1),
          }
          if (!keys[e.key]) return
          e.preventDefault()
          keys[e.key]()
        }}
      >
        <img
            className={styles.picture}
            src={src}
            alt=""
            draggable={false}
            style={size ? { width: size.width * s, height: size.height * s, transform: `translate(${place.x}px, ${place.y}px)` } : { opacity: 0 }}
            onLoad={(e) => {
              const loaded = { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }
              if (!loaded.width || !loaded.height) return
              setSize(loaded)
              setPlace(centred(loaded))
            }}
          />
        <span className={styles.ring} aria-hidden="true" />
      </div>

      <label className={styles.zoom}>
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={place.zoom}
          disabled={!size}
          onChange={(e) => zoom(Number(e.target.value))}
        />
      </label>
      <p id={hint} className={styles.hint}>
        Drag the photo to move it, or use the arrow keys; zoom with the slider or + and −. What is inside the circle is
        what everybody sees.
      </p>
    </Modal>
  )
}
