import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/Icon'
import { useTheme } from '../theme/ThemeContext'
import { themes, type ThemeName } from '../theme/themes'
import styles from './ThemeSwitcher.module.css'

/**
 * Lets the viewer pick one of the community's colour schemes. The choice is remembered.
 *
 * `align` says which edge the list hangs from. The header puts the switcher at its right edge,
 * so the list hangs right and opens leftwards over the page; the portal's sidebar is narrower
 * than the list, so from there it has to hang left and open over the content instead.
 */
export function ThemeSwitcher({ align = 'end' }: { align?: 'end' | 'start' } = {}) {
  const { theme, setTheme } = useTheme()
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
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

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
        className={align === 'start' ? `${styles.panel} ${styles.panelStart}` : styles.panel}
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
                style={{ background: option.swatch[0], borderColor: option.swatch[1] }}
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
