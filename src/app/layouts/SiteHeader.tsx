import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
import { NextEventStrip } from '@/components/NextEventStrip'
import { publicNav } from '../nav'
import { site } from '../site'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useScrollHeader } from './useScrollHeader'
import styles from './PublicLayout.module.css'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const menuId = useId()
  const { scrolled, hidden } = useScrollHeader(open)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const isHome = pathname === '/'

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
      className={[styles.header, scrolled ? styles.headerScrolled : '', hidden ? styles.headerHidden : '']
        .filter(Boolean)
        .join(' ')}
      data-scrolled={scrolled || undefined}
      data-hidden={hidden || undefined}
    >
      <Container className={styles.bar}>
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

        {open ? (
          <div className={styles.scrim} aria-hidden="true" onClick={() => setOpen(false)} />
        ) : null}

        <nav
          id={menuId}
          ref={panelRef}
          className={open ? styles.navOpen : styles.nav}
          aria-label="Main"
          aria-hidden={undefined}
        >
          <div className={styles.drawerHead}>
            <span className={styles.drawerTitle}>Menu</span>
            <button type="button" className={styles.drawerClose} onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
              <span className={styles.srOnly}>Close menu</span>
            </button>
          </div>

          <ul className={styles.links}>
            {publicNav.map((item) => (
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
            <ThemeSwitcher />
            {site.showMemberSignIn ? (
              <Button to="/login" size="sm">
                Member sign-in
              </Button>
            ) : null}
          </div>
        </nav>
      </Container>
      {pathname === '/' ? <NextEventStrip /> : null}
    </header>
  )
}
