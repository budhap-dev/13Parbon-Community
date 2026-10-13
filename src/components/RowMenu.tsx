import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import styles from './RowMenu.module.css'

export type RowMenuItem = { label: string; href?: string; onSelect?: () => void }

/**
 * A row's less common actions, behind one "More" button, so a table row carries Edit and this
 * rather than four buttons the height of the row.
 *
 * `about` is what the row is, said to a screen reader only: forty buttons all called "More" are
 * no use to somebody tabbing down a list.
 */
export function RowMenu({ about, items }: { about: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  /*
   * Placed against the window rather than the row. The tables sit in boxes that clip and scroll,
   * and a menu positioned inside one was cut off at the last row — the one most likely to need it.
   */
  const [at, setAt] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    const shut = () => setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', keys)
    window.addEventListener('scroll', shut, true)
    window.addEventListener('resize', shut)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', keys)
      window.removeEventListener('scroll', shut, true)
      window.removeEventListener('resize', shut)
    }
  }, [open])

  if (items.length === 0) return null
  const item = (entry: RowMenuItem): ReactNode =>
    entry.href ? (
      <a href={entry.href} className={styles.item} onClick={() => setOpen(false)}>
        {entry.label}
      </a>
    ) : (
      <button
        type="button"
        className={styles.item}
        onClick={() => {
          setOpen(false)
          entry.onSelect?.()
        }}
      >
        {entry.label}
      </button>
    )

  return (
    <div className={styles.menu} ref={box}>
      <button
        type="button"
        ref={button}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          const rect = button.current?.getBoundingClientRect()
          if (rect) setAt({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
          setOpen(!open)
        }}
      >
        <span aria-hidden="true">⋯</span>
        <span className="sr-only">More for {about}</span>
      </button>
      {open ? (
        <ul id={id} className={styles.list} style={{ top: at.top, right: at.right }}>
          {items.map((entry) => (
            <li key={entry.label}>{item(entry)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
