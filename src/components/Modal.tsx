import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import styles from './Modal.module.css'

/** Everything a keyboard can land on inside the panel, for keeping Tab within it. */
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A form over the page, rather than in place of it.
 *
 * For a job somebody does and then returns from, such as adding a household, the list they were
 * on stays behind it. Takes the focus and keeps Tab inside, and Escape or the close button put it
 * back where it came from. A click on the backdrop does nothing: one stray click would throw away
 * a half-filled form.
 *
 * Drawn inside the portal's shell when there is one, so it picks up the portal's buttons and
 * corners, and on the body otherwise.
 */
export function Modal({
  open,
  title,
  eyebrow,
  children,
  onClose,
  busy,
}: {
  open: boolean
  title: string
  /** A small line over the title: what kind of job this is. */
  eyebrow?: string
  children: ReactNode
  onClose: () => void
  /** While a save is in flight, closing would leave it with nowhere to report back. */
  busy?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    // The first field rather than the close button: the panel was opened to be filled in.
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea') ?? panel.current
    first?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      before?.focus?.()
    }
  }, [open])

  if (!open) return null

  const keys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!busy) onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
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

  const host = document.querySelector<HTMLElement>('[data-modal-root]') ?? document.body
  return createPortal(
    <div className={styles.backdrop} onKeyDown={keys}>
      <div ref={panel} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.head}>
          <div>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy}>
            <Icon name="close" size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    host,
  )
}
