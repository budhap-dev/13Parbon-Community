import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { site } from '@/app/site'
import { Icon, type IconName } from '@/components/Icon'
import { useSession, useSignedIn } from '@/lib/auth/session'
import { useSignInAttempts } from '@/lib/api'
import styles from './PortalLayout.module.css'

type Item = { label: string; to: string; icon: IconName; end?: boolean; count?: number }

const memberNav: Item[] = [
  { label: 'Dashboard', to: '/portal', icon: 'home', end: true },
  { label: 'My household', to: '/portal/household', icon: 'users' },
  { label: 'Directory', to: '/portal/directory', icon: 'book' },
  { label: 'Documents', to: '/portal/documents', icon: 'file' },
]

export function PortalLayout() {
  const who = useSignedIn()
  const { signOut } = useSession()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)
  const { data: attempts } = useSignInAttempts()

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // preventScroll matters: focusing an element scrolls it into view, which would push
    // the top of the page up behind the sticky header on every navigation.
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  if (!who) return null

  const committeeNav: Item[] = [
    { label: 'Overview', to: '/admin', icon: 'grid', end: true },
    { label: 'People', to: '/admin/people', icon: 'users', count: attempts?.length },
    { label: 'Events', to: '/admin/events', icon: 'calendar' },
    { label: 'Content', to: '/admin/content', icon: 'layout' },
    { label: 'Messages', to: '/admin/messages', icon: 'message' },
  ]

  const renderGroup = (label: string, items: Item[]) => (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? styles.linkOn : styles.link)}
        >
          <Icon name={item.icon} size={19} />
          {item.label}
          {item.count ? <span className={styles.count}>{item.count}</span> : null}
        </NavLink>
      ))}
    </div>
  )

  return (
    <div className={styles.shell}>
      <a href="#portal-main" className={styles.skip}>
        Skip to content
      </a>
      <aside className={styles.side}>
        <Link to="/" className={styles.brand}>
          <img src={site.emblem} alt="" className={styles.emblem} width={34} height={34} />
          <span>{site.wordmark}</span>
        </Link>
        <nav aria-label="Your household">{renderGroup('Your household', memberNav)}</nav>
        {who.role === 'admin' ? (
          <>
            <nav aria-label="Committee">{renderGroup('Committee', committeeNav)}</nav>
            <nav aria-label="Other tools">
              <div className={styles.group}>
                <span className={styles.groupLabel}>Other tools</span>
                {site.tools.map((tool) => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    title={tool.description}
                  >
                    <Icon name="calendar" size={19} />
                    {tool.name}
                    <Icon name="external" size={15} className={styles.externalMark} />
                    <span className={styles.srOnly}>opens in a new tab</span>
                  </a>
                ))}
              </div>
            </nav>
          </>
        ) : null}
        <div className={styles.who}>
          <span className={styles.whoName}>{who.name}</span>
          <span className={styles.whoDetail}>
            {who.householdName} · {who.email}
          </span>
          <span className={who.role === 'admin' ? styles.rolePillAdmin : styles.rolePill}>
            {who.role === 'admin' ? 'Admin' : 'Member'}
          </span>
          <button
            type="button"
            className={styles.signOut}
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main id="portal-main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <p className={styles.preview}>
          <span className={styles.previewStrong}>Preview</span>
          <span>
            You are signed in as a sample household. Everything here is made-up data, and nothing you change is
            saved yet.
          </span>
        </p>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
