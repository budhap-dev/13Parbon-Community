import { useEffect, useRef, type KeyboardEvent, type ReactNode, type TouchEvent } from 'react'
import { Icon } from './Icon'
import styles from './Lightbox.module.css'

export type LightboxItem = {
  id: string
  src: string
  alt: string
  caption?: string
  /** Where this photograph lives, for callers that offer a way through to it. */
  album?: { slug: string; title: string }
}

type Props = {
  items: LightboxItem[]
  /** Index of the open item, or null when closed. */
  index: number | null
  onChange: (index: number) => void
  onClose: () => void
  /**
   * Somewhere to go from the photograph, drawn under the caption — the album it came from,
   * say. Given a function rather than a node so it can differ per picture, and returned by
   * the caller so this component needs to know nothing about routing.
   */
  renderAction?: (item: LightboxItem) => ReactNode
}

/** How far a thumb has to travel before it counts as a swipe rather than a tap or a wobble. */
const SWIPE_PX = 48

/**
 * Full-screen photo viewer: previous/next, arrow keys, swipe, Escape, focus kept inside while
 * open.
 */
export function Lightbox({ items, index, onChange, onClose, renderAction }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  /** Where a finger went down, so touchend can tell a swipe from a tap. Null while idle. */
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const open = index !== null && items[index] !== undefined

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  const item = items[index]
  const count = items.length
  const go = (next: number) => onChange(((next % count) + count) % count)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(index + 1)
    } else if (event.key === 'Tab') {
      // Keep focus inside the dialog. Links count: a photograph may offer the album it came
      // from, and with a single-photograph album there are no arrows to tab past it with.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? []
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    // More than one finger is a pinch to zoom, not a swipe: leave it to the browser.
    if (event.touches.length !== 1) {
      touchStart.current = null
      return
    }
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || count < 2) return
    const touch = event.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    // Horizontal travel has to win, or scrolling a tall photograph would change the picture.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy)) return
    go(dx < 0 ? index + 1 : index - 1)
  }

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={item.caption ? `Photo: ${item.caption}` : `Photo ${index + 1} of ${count}`}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      {count > 1 ? (
        <button type="button" className={styles.prev} onClick={() => go(index - 1)} aria-label="Previous photo">
          <Icon name="chevronLeft" size={28} />
        </button>
      ) : null}
      <figure className={styles.figure}>
        {/* Above the photograph, not under it: at the foot of a tall picture on a phone the
            caption fell past the bottom of the screen, and the page behind read through it.
            A figcaption may be the first child or the last, and first is what reads here. */}
        <figcaption className={styles.caption}>
          {item.caption ? <span>{item.caption}</span> : null}
          {renderAction ? <span className={styles.action}>{renderAction(item)}</span> : null}
          <span className={styles.count}>
            {index + 1} of {count}
          </span>
        </figcaption>
        <img src={item.src} alt={item.alt} className={styles.image} />
      </figure>
      {count > 1 ? (
        <button type="button" className={styles.next} onClick={() => go(index + 1)} aria-label="Next photo">
          <Icon name="chevronRight" size={28} />
        </button>
      ) : null}
    </div>
  )
}
