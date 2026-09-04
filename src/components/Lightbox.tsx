import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Icon } from './Icon'
import styles from './Lightbox.module.css'

export type LightboxItem = { id: string; src: string; alt: string; caption?: string }

type Props = {
  items: LightboxItem[]
  /** Index of the open item, or null when closed. */
  index: number | null
  onChange: (index: number) => void
  onClose: () => void
}

/** Full-screen photo viewer: previous/next, arrow keys, Escape, focus kept inside while open. */
export function Lightbox({ items, index, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
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
      // Keep focus among the dialog's buttons.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? []
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

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
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
        <img src={item.src} alt={item.alt} className={styles.image} />
        <figcaption className={styles.caption}>
          {item.caption ? <span>{item.caption}</span> : null}
          <span className={styles.count}>
            {index + 1} of {count}
          </span>
        </figcaption>
      </figure>
      {count > 1 ? (
        <button type="button" className={styles.next} onClick={() => go(index + 1)} aria-label="Next photo">
          <Icon name="chevronRight" size={28} />
        </button>
      ) : null}
    </div>
  )
}
