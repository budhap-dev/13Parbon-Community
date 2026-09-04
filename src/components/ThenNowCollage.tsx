import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Lightbox } from './Lightbox'
import styles from './ThenNowCollage.module.css'

export type CollageImage = {
  src: string
  alt: string
  /** One line naming the old and the new this photograph holds. */
  caption?: string
  /** Where to hold the picture as its cell crops it, as a CSS object-position. */
  focus?: string
}

type Props = {
  images: readonly CollageImage[]
  credit?: string
  /** Accessible name for the whole thing. */
  label: string
}

/** Far enough that the viewer meant to drag the seam rather than tap a photograph. */
const DRAG_THRESHOLD = 6

/**
 * The same photographs twice: black and white underneath, colour on top, with a seam that
 * sweeps across on its own. Colour leads and black and white trails, so dragging to the
 * right carries the present forward over the past, which is the way the gesture reads.
 *
 * Dragging and tapping share the same surface. A pointer that travels moves the seam; one
 * that does not opens that photograph full size. Anyone who cannot drag still gets the sweep,
 * and reaches every picture by tabbing to it.
 */
export function ThenNowCollage({ images, credit, label }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; moved: boolean } | null>(null)
  const [position, setPosition] = useState<number | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const held = position !== null

  if (images.length === 0) return null

  const seamFrom = (clientX: number) => {
    const box = frameRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    return Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    startRef.current = { x: event.clientX, moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    if (!start.moved && Math.abs(event.clientX - start.x) < DRAG_THRESHOLD) return
    start.moved = true
    frameRef.current?.setPointerCapture?.(event.pointerId)
    const next = seamFrom(event.clientX)
    if (next !== null) setPosition(next)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    frameRef.current?.releasePointerCapture?.(event.pointerId)
    // Left in place for the click handler, then cleared on the next frame.
    requestAnimationFrame(() => {
      startRef.current = null
    })
  }

  const grid = (colour: boolean) => (
    <div className={styles.grid} aria-hidden={colour ? true : undefined}>
      {images.map((image, index) => (
        <figure key={image.src} className={styles.cell}>
          {colour ? (
            <img
              className={styles.image}
              src={image.src}
              alt=""
              style={image.focus ? { objectPosition: image.focus } : undefined}
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              className={styles.open}
              onClick={() => {
                if (startRef.current?.moved) return
                setOpen(index)
              }}
              aria-label={`See ${image.caption ?? image.alt} full size`}
            >
              <img
                className={styles.image}
                src={image.src}
                alt={image.alt}
                style={image.focus ? { objectPosition: image.focus } : undefined}
                loading="lazy"
              />
            </button>
          )}
          {image.caption ? <figcaption className={styles.cellCaption}>{image.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div
        ref={frameRef}
        className={held ? styles.frameHeld : styles.frame}
        style={held ? { ['--seam' as string]: `${position}%` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={styles.then}>{grid(false)}</div>
        <div className={styles.now}>{grid(true)}</div>
        <span className={styles.seam} aria-hidden="true">
          <span className={styles.handle} />
        </span>
      </div>

      <p className={styles.foot}>
        <span>{label}</span>
        <span className={styles.hint}>Drag across, or open any picture</span>
        {credit ? <span className={styles.credit}>{credit}</span> : null}
      </p>

      <Lightbox
        items={images.map((image) => ({
          id: image.src,
          src: image.src,
          alt: image.alt,
          caption: image.caption,
        }))}
        index={open}
        onChange={setOpen}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
