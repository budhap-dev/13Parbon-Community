import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { site } from '@/app/site'
import { useSettings } from '@/app/SettingsContext'
import { Icon, type IconName } from '@/components/Icon'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useThemeScope } from '@/app/theme/ThemeContext'
import { useGoogleSignIn } from '@/lib/auth/GoogleSignIn'
import { useSession, useSignedIn } from '@/lib/auth/session'
import { previewAccounts } from '@/lib/auth/previewAccounts'
import { useAllFeedback, useAllSuggestions, useSignInAttempts, useViewer } from '@/lib/api'
import { waitingSuggestions } from '@/domain/suggestions'
import { can } from '@/lib/auth/permissions'
import { unresolved } from '@/domain/document'
import { waiting } from '@/domain/feedback'
import styles from './PortalLayout.module.css'

type Item = { label: string; to: string; icon: IconName; end?: boolean; count?: number }

/** Two letters for the avatar: first and last word of the name, or the first two of one word. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]
  return letters.toUpperCase()
}

const memberNav: Item[] = [
  { label: 'Dashboard', to: '/portal', icon: 'home', end: true },
  { label: 'My household', to: '/portal/household', icon: 'users' },
  { label: 'Polls and quizzes', to: '/portal/play', icon: 'sparkle' },
]

export function PortalLayout() {
  const who = useSignedIn()
  // The same answer that guards the routes, so the navigation cannot offer a door that shuts.
  const onTheCommittee = can(useViewer(), 'admin:enter')
  const { signOut } = useGoogleSignIn()
  const { enterPreview, leavePreview } = useSession()
  const { pathname } = useLocation()
  // Everything below here wears the committee's own looks, not the community's festivals.
  useThemeScope('portal')
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)
  const { data: attempts } = useSignInAttempts()
  const { tools } = useSettings()
  const { data: feedback } = useAllFeedback()
  const { data: suggestions } = useAllSuggestions()

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // preventScroll matters: focusing an element scrolls it into view, which would push
    // the top of the page up behind the sticky header on every navigation. Getting back to
    // the top is ScrollRestoration's job, below — and for a long time nothing did it here,
    // so every move inside the portal kept whatever scroll position you arrived with.
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  if (!who) return null

  const committeeNav: Item[] = [
    { label: 'Overview', to: '/admin', icon: 'grid', end: true },
    // The ones still wanting an answer, which is what the screen itself shows. Counting all
    // of them meant the badge never cleared once somebody had been dealt with.
    { label: 'People', to: '/admin/people', icon: 'users', count: unresolved(attempts).length },
    { label: 'Events', to: '/admin/events', icon: 'calendar' },
    { label: 'Content', to: '/admin/content', icon: 'layout' },
    { label: 'Photographs', to: '/admin/media', icon: 'image' },
    { label: 'Messages', to: '/admin/messages', icon: 'message' },
    // Only what is still waiting, the same as People: a badge counting everything ever sent
    // is a badge that never clears, and one that never clears stops being read.
    { label: 'Feedback', to: '/admin/feedback', icon: 'heart', count: waiting(feedback ?? []).length },
    { label: 'Polls and quizzes', to: '/admin/play', icon: 'sparkle', count: waitingSuggestions(suggestions ?? []).length },
    { label: 'What has changed', to: '/admin/audit', icon: 'clock' },
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
          <Icon name={item.icon} size={18} />
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
        <div className={styles.navs}>
        <nav aria-label="Your household">{renderGroup('Your household', memberNav)}</nav>
        {onTheCommittee ? (
          <>
            <nav aria-label="Committee">{renderGroup('Committee', committeeNav)}</nav>
            {/* A heading over an empty list is noise: with no tools saved there is no group. */}
            {tools.length > 0 ? (
            <nav aria-label="Other tools">
              <div className={styles.group}>
                <span className={styles.groupLabel}>Other tools</span>
                {tools.map((tool) => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    title={tool.description}
                  >
                    <Icon name="link" size={18} />
                    {tool.name}
                    <Icon name="external" size={14} className={styles.externalMark} />
                    <span className={styles.srOnly}>opens in a new tab</span>
                  </a>
                ))}
              </div>
            </nav>
            ) : null}
          </>
        ) : null}
        </div>
        <div className={styles.who}>
          <div className={styles.whoCard}>
            <span className={styles.avatar} aria-hidden="true">
              {initialsOf(who.name)}
            </span>
            <span className={styles.whoText}>
              <span className={styles.whoName}>{who.name}</span>
              <span className={styles.whoDetail}>{who.householdName}</span>
            </span>
            <span className={who.role === 'admin' ? styles.rolePillAdmin : styles.rolePill}>
              {who.role === 'admin' ? 'Admin' : 'Member'}
            </span>
          </div>
          <span className={styles.whoEmail}>{who.email}</span>
          {/*
            * The walkthrough, and only for the committee.
            *
            * It used to be reachable by putting `?preview` on the sign-in page, which meant
            * anybody who knew the trick could let themselves into the back office of the live
            * site. Not a way to anybody's data — the database answers to a token and a preview
            * carries none — but the committee's screens are not a public exhibit either.
            */}
          {onTheCommittee ? (
            <details className={styles.walkthrough}>
              <summary className={styles.walkthroughToggle}>Walk through sample data</summary>
              <p className={styles.walkthroughNote}>
                Made-up households, so you can look around without touching anything real.
              </p>
              {previewAccounts.map((account) => (
                <button
                  key={account.householdId}
                  type="button"
                  className={styles.walkthroughAccount}
                  onClick={() => enterPreview(account)}
                >
                  As {account.householdName} ({account.role})
                </button>
              ))}
            </details>
          ) : null}
          {/*
            * Down here with the person rather than under the brand: it is a preference of theirs,
            * like signing out, and the list opens upwards so it has the sidebar to open into.
            */}
          <div className={styles.whoActions}>
            <ThemeSwitcher align="start" direction="up" />
            <button type="button" className={styles.signOut} onClick={signOut}>
              <Icon name="logout" size={17} />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main id="portal-main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {/*
          * Three states, and they used to be told as one.
          *
          * The banner was unconditional, so somebody signed in with Google against the real
          * database was told their changes were not saved — and somebody the committee has not
          * recorded yet was told nothing at all, which is worse: the app falls back to treating
          * an unmatched address as an admin, so every screen loads, looks fine, and is empty,
          * because the database has no household for them and its policies answer accordingly.
          * An empty inbox is indistinguishable from a working one with no messages.
          */}
        {who.preview ? (
          <p className={styles.preview} role="status">
            <span className={styles.previewStrong}>Preview</span>
            <span>
              You are looking at {who.householdName}, a sample household. Everything here is made-up data and
              nothing you change is saved.
            </span>
            <button type="button" className={styles.leavePreview} onClick={leavePreview}>
              Leave preview
            </button>
          </p>
        ) : who.householdId === '' ? (
          <p className={styles.preview} role="status">
            <span className={styles.previewStrong}>No household yet</span>
            <span>
              You are signed in as {who.email}, but the committee has not recorded a household against that
              address — so the database has nothing to show you and these screens will stay empty. Set
              `google_email` on your household in Supabase, then reload.
            </span>
          </p>
        ) : null}
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
      <ScrollRestoration />
    </div>
  )
}
