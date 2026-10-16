import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { Backdrop } from '../theme/backdrops'
import { useTheme } from '../theme/ThemeContext'
import { NextEventStrip } from '@/components/NextEventStrip'
import { publicNav } from '../nav'
import { site } from '../site'
import { versionLabel } from '../version'
import { useSettings } from '../SettingsContext'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useScrollHeader } from './useScrollHeader'
import { useSlidingPill } from './useSlidingPill'
import { useSwipeToClose } from './useSwipeToClose'
import styles from './PublicLayout.module.css'

const PHONE = '(max-width: 960px)'

/** Whether this is a phone-width screen, known on the first render so the bar never flashes. */
function usePhoneWidth(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const query = window.matchMedia(PHONE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(PHONE).matches,
  )
}

/**
 * Whether the row of links does not fit beside the name, whatever the width of the screen.
 *
 * How much room the row needs depends on which parts of the site the committee has switched on:
 * five links fitted on a laptop, nine and the sign-in ran into the name. So the bar is measured
 * rather than guessed at. When it overflows, the width it wanted is remembered and the menu folds
 * into the drawer, which cannot be measured as a row; it unfolds once the bar is that wide again.
 * Measured afresh whenever the links change. Run before paint, so neither state flashes.
 */
function useCrowded(bar: React.RefObject<HTMLDivElement | null>, row: React.RefObject<HTMLElement | null>, links: string): boolean {
  const [crowded, setCrowded] = useState(false)
  const wanted = useRef(0)
  useLayoutEffect(() => {
    const el = bar.current
    if (!el || typeof ResizeObserver === 'undefined') return
    wanted.current = 0
    setCrowded(false)
    const check = () => {
      if (wanted.current === 0) {
        if (el.scrollWidth > el.clientWidth + 1) {
          wanted.current = el.scrollWidth
          setCrowded(true)
        }
      } else if (el.clientWidth >= wanted.current) {
        wanted.current = 0
        setCrowded(false)
      }
    }
    const watch = new ResizeObserver(check)
    watch.observe(el)
    // The row too: it changes width when the fonts arrive, and the bar does not.
    if (row.current) watch.observe(row.current)
    return () => watch.disconnect()
  }, [bar, row, links])
  return crowded
}

export function SiteHeader() {
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const menuId = useId()
  const { scrolled, hidden } = useScrollHeader(open)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const swipe = useSwipeToClose({ panel: panelRef, shade: scrimRef, open, onClose: () => setOpen(false), side: 'right' })
  const isHome = pathname === '/'
  const { theme } = useTheme()
  const links = publicNav(settings)
  const barRef = useRef<HTMLDivElement>(null)
  const phone = usePhoneWidth()
  const crowded = useCrowded(barRef, panelRef, `${links.map((item) => item.to).join()}|${settings.showMemberSignIn}`)
  const compact = phone || crowded
  const linksRef = useRef<HTMLUListElement>(null)
  const pillReady = useSlidingPill(linksRef, `${pathname}|${compact}|${links.length}`)

  /*
   * While the drawer is open it owns the screen: Escape closes it, the page behind does not
   * scroll, and focus starts inside it rather than back at the top of the document.
   */
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [open])

  // Close the menu whenever the route changes, without an effect.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <header
      className={[styles.header, compact ? styles.compact : '', scrolled ? styles.headerScrolled : '', hidden ? styles.headerHidden : '']
        .filter(Boolean)
        .join(' ')}
      data-scrolled={scrolled || undefined}
      data-hidden={hidden || undefined}
    >
      <Container ref={barRef} className={styles.bar}>
        <Link to="/" className={styles.brand} aria-label={`${site.name} home`}>
          <img src={site.emblem} alt="" width={40} height={40} className={styles.emblem} />
          <span>{site.wordmark}</span>
        </Link>

        {!isHome ? (
          <Link to="/" className={styles.homeButton} aria-label="Back to the home page">
            <Icon name="home" size={22} />
          </Link>
        ) : null}

        <button
          ref={toggleRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name="menu" />
          <span className={styles.srOnly}>Open menu</span>
        </button>

        {/* Always there on a phone, so it can thin out under the finger as the drawer is
            pushed away, and fade rather than vanish when it shuts. */}
        <div
          ref={scrimRef}
          className={open ? styles.scrimOn : styles.scrim}
          aria-hidden="true"
          onClick={open ? () => setOpen(false) : undefined}
          {...swipe}
        />

        <nav
          id={menuId}
          ref={panelRef}
          className={open ? styles.navOpen : styles.nav}
          aria-label="Main"
          aria-hidden={undefined}
          {...swipe}
        >
          <div className={styles.drawerHead}>
            <span className={styles.drawerTitle}>Menu</span>
            <button type="button" className={styles.drawerClose} onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
              <span className={styles.srOnly}>Close menu</span>
            </button>
          </div>

          <ul ref={linksRef} className={styles.links} data-pill={pillReady || undefined}>
            {/* The line under the current page, sliding to the next one (useSlidingPill). */}
            <li aria-hidden="true" className={styles.pill} />
            {links.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <ThemeSwitcher stacked={compact} />
            {settings.showMemberSignIn ? (
              <Button to="/login" size="sm">
                Member sign-in
              </Button>
            ) : null}
          </div>

          {/* The theme's own motif, so the drawer looks like the page it came from and
              picking a theme shows you what you are picking. */}
          <Backdrop theme={theme} className={styles.drawerArt} />

          <p className={styles.drawerFoot}>
            {site.name} · {versionLabel}
          </p>
        </nav>
      </Container>
      {settings.showNextEventStrip && isHome ? <NextEventStrip /> : null}
    </header>
  )
}
