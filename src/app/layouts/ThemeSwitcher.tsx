import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/Icon'
import { formatCivil } from '@/domain/bengaliDate'
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
  stacked = false,
}: {
  align?: 'end' | 'start'
  direction?: 'down' | 'up'
  /**
   * Full width, with the list opening in the flow beneath it: for the public menu once it is a
   * drawer, which it can be at any width when the links do not fit in a row (see SiteHeader).
   */
  stacked?: boolean
} = {}) {
  // The list comes from the context, so this draws the festivals on the public site and the
  // committee's own quiet set inside the portal, without knowing which is which.
  const { theme, setTheme, options: themes, scope, following, follow, season, seasonal, siteTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const current = themes.find((t) => t.id === theme) ?? themes[0]
  // On the public site the first choice is no choice: the committee's colours, and each
  // festival's own around its days.
  const offersCalendar = scope === 'public'
  const followingCalendar = offersCalendar && following
  // What following would wear today, for its swatch: not whatever the viewer has on now.
  const followed = themes.find((t) => t.id === siteTheme) ?? themes[0]
  const followHint = !seasonal
    ? 'The colours the committee has chosen'
    : season
      ? `${themes.find((t) => t.id === season.theme)?.name ?? season.theme} colours for ${season.name}, until ${formatCivil(season.end, { day: 'numeric', month: 'long' })}`
      : 'Our colours now, and each festival’s own around its days'

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

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus({ preventScroll: true })
  }

  const choose = (name: ThemeName) => {
    setTheme(name)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus({ preventScroll: true })
    }
  }

  return (
    <div ref={rootRef} className={stacked ? styles.rootStacked : styles.root} onKeyDown={onKeyDown}>
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
        <span className={styles.srOnly}>
          , currently {followingCalendar ? `following the ${seasonal ? 'calendar' : 'website'}, ` : ''}
          {current.name}
        </span>
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
        {offersCalendar ? (
          <button
            type="button"
            role="radio"
            aria-checked={followingCalendar}
            className={followingCalendar ? styles.optionSelected : styles.option}
            onClick={() => {
              follow()
              close()
            }}
          >
            <span
              className={`${styles.swatch} ${styles.swatchCalendar}`}
              style={{ background: followed.swatch[0], borderColor: followed.swatch[1], color: followed.swatch[1] }}
              aria-hidden="true"
            >
              <Icon name="calendar" size={18} />
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionName}>{seasonal ? 'Follow the calendar' : 'Follow the website'}</span>
              <span className={styles.optionDescription}>{followHint}</span>
            </span>
            {followingCalendar ? <Icon name="check" size={18} className={styles.check} /> : null}
          </button>
        ) : null}
        {themes.map((option) => {
          const selected = option.id === theme && !followingCalendar
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
