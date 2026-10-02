import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/Icon'
import { useTheme } from '../theme/ThemeContext'
import { type ThemeName } from '../theme/themes'
import styles from './ThemeSwitcher.module.css'

/**
 * Lets the viewer pick one of the community's colour schemes. The choice is remembered.
 *
 * `align` says which edge the list hangs from. The header puts the switcher at its right edge,
 * so the list hangs right and opens leftwards over the page; the portal's sidebar is narrower
 * than the list, so from there it has to hang left and open over the content instead.
 * `direction` is for a switcher near the foot of the screen, like the one at the bottom of
 * the portal's sidebar, where opening downward would put the list off the page.
 */
export function ThemeSwitcher({
  align = 'end',
  direction = 'down',
}: { align?: 'end' | 'start'; direction?: 'down' | 'up' } = {}) {
  // The list comes from the context, so this draws the festivals on the public site and the
  // committee's own quiet set inside the portal, without knowing which is which.
  const { theme, setTheme, options: themes } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const current = themes.find((t) => t.id === theme) ?? themes[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    // Where the list opens in the flow — a phone's menu drawer, near its foot — it can open below
    // the bottom of the screen, and a tap that seems to do nothing gets tapped again, shutting it.
    document.getElementById(panelId)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, panelId])

  const choose = (name: ThemeName) => {
    setTheme(name)
    setOpen(false)
    buttonRef.current?.focus({ preventScroll: true })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus({ preventScroll: true })
    }
  }

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="palette" size={20} />
        <span className={styles.triggerLabel}>Theme</span>
        <span className={styles.srOnly}>, currently {current.name}</span>
      </button>

      <div
        id={panelId}
        className={[styles.panel, align === 'start' && styles.panelStart, direction === 'up' && styles.panelUp]
          .filter(Boolean)
          .join(' ')}
        hidden={!open}
        role="radiogroup"
        aria-label="Theme"
      >
        {themes.map((option) => {
          const selected = option.id === theme
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={selected ? styles.optionSelected : styles.option}
              onClick={() => choose(option.id)}
            >
              <span
                className={styles.swatch}
                // Ringed in the portal's frame where a theme has one: that is what sets it apart.
                style={{ background: option.swatch[0], borderColor: option.frame ?? option.swatch[1] }}
                aria-hidden="true"
              >
                <span className={styles.swatchDot} style={{ background: option.swatch[1] }} />
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionName}>{option.name}</span>
                <span className={styles.optionDescription}>{option.description}</span>
              </span>
              {selected ? <Icon name="check" size={18} className={styles.check} /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
