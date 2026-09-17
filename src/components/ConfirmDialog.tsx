import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

/**
 * Asking before something is destroyed.
 *
 * The committee's screens used to ask in place: a first button swapped itself for a sentence
 * and a second button, a step away from the first one's own position. It works, but it is easy
 * to walk past — the page does not stop, nothing takes the focus, and on a long list the
 * question can open below the fold of what somebody is looking at.
 *
 * So the question is a modal. It takes the focus, it puts it on *Keep it* rather than on the
 * destructive answer, Escape and the backdrop both mean no, and focus goes back to whatever
 * raised it. A person who meant to click Edit cannot lose a notice by clicking twice.
 *
 * It is not the only way to ask, and deliberately so: RemoveHousehold makes somebody type the
 * household's name, because a dialog is a thing people click through and erasing a family's
 * record is not an action to lose to a reflex. This is for the ordinary ones.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Keep it',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  /** What is about to happen, and what cannot be undone about it. */
  children: ReactNode
  confirmLabel: string
  /** Shown on the confirm button while the write is in flight. */
  busyLabel?: string
  cancelLabel?: string
  busy?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const bodyId = useId()

  /*
   * Focus goes in, and comes back out to where it was. Without the second half, dismissing the
   * question drops somebody reading with a screen reader back at the top of the page, with no
   * word of what happened to the row they were on.
   */
  useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLButtonElement>('[data-confirm-cancel]')?.focus()
    return () => before?.focus?.()
  }, [open])

  if (!open) return null

  const keys = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Stopped here, or the photo viewer underneath takes an Escape meant for this as its own
      // and closes, answering a question nobody has answered yet.
      event.stopPropagation()
      if (!busy) onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? []
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

  return createPortal(
    <div
      className={styles.backdrop}
      onKeyDown={keys}
      // The backdrop only, not a click that started inside the panel and ended out here.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="line" size="sm" data-confirm-cancel onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
