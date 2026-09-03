import { useId, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Icon } from '@/components/Icon'
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

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'close' : 'menu'} />
          <span className={styles.srOnly}>{open ? 'Close menu' : 'Open menu'}</span>
        </button>

        <nav id={menuId} className={open ? styles.navOpen : styles.nav} aria-label="Main">
          <ul className={styles.links}>
            {publicNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className={styles.actions}>
            <ThemeSwitcher />
            <Button to="/login" size="sm">
              Member sign-in
            </Button>
          </div>
        </nav>
      </Container>
    </header>
  )
}
