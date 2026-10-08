import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { site } from '@/app/site'
import { useSettings } from '@/app/SettingsContext'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineNotice } from '@/components/OfflineNotice'
import { Icon, type IconName } from '@/components/Icon'
import { PortalSearch, SearchButton, type SearchScreen } from '@/features/admin/search/PortalSearch'
import { ThemeSwitcher } from './ThemeSwitcher'
import { useSwipeToClose } from './useSwipeToClose'
import { useThemeScope } from '@/app/theme/ThemeContext'
import { useGoogleSignIn } from '@/lib/auth/GoogleSignIn'
import { useNow } from '@/lib/clock'
import { useSession, useSignedIn } from '@/lib/auth/session'
import { useAllFeedback, useAllSuggestions, useHouseholds, useSignInAttempts, useViewer } from '@/lib/api'
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
  // Not "Polls and quizzes": that is the committee's screen for writing them, and two links of
  // one name in one menu left people guessing which was which. This is where you take part.
  { label: 'Vote and play', to: '/portal/play', icon: 'sparkle' },
  { label: 'Help', to: '/portal/help', icon: 'help' },
]

type Section = { label?: string; items: Item[] }

/**
 * The committee's screens, in sections by what they are about.
 *
 * Thirteen in one list was a column to read down every time, with the last of them under the
 * fold on a laptop. Grouped, somebody looking for where to put up a notice reads three headings,
 * not thirteen names. The two that are about everything — what needs a decision, and what has
 * been changed — sit at the top with no heading of their own.
 */
const committeeSections: Section[] = [
  {
    items: [
      { label: 'Overview', to: '/admin', icon: 'grid', end: true },
      { label: 'What has changed', to: '/admin/audit', icon: 'clock' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'People', to: '/admin/people', icon: 'users' },
      { label: 'Messages', to: '/admin/messages', icon: 'message' },
      { label: 'Feedback', to: '/admin/feedback', icon: 'heart' },
    ],
  },
  {
    label: 'What’s on',
    items: [
      { label: 'Events', to: '/admin/events', icon: 'calendar' },
      { label: 'Noticeboard', to: '/admin/notices', icon: 'megaphone' },
      { label: 'Polls and quizzes', to: '/admin/play', icon: 'sparkle' },
    ],
  },
  {
    label: 'The website',
    items: [
      { label: 'Writing', to: '/admin/writing', icon: 'book' },
      { label: 'Photographs', to: '/admin/media', icon: 'image' },
      { label: 'Sponsors', to: '/admin/sponsors', icon: 'badge' },
      { label: 'Pages and settings', to: '/admin/content', icon: 'layout' },
    ],
  },
]

const committeeScreens: Item[] = committeeSections.flatMap((section) => section.items)

/**
 * Which screen this is, and which part of the portal, for the header: the screen whose address
 * is the longest start of this one, so a quiz under /portal/play is still Vote and play.
 */
function whereIs(pathname: string): { group: string; label: string } {
  const groups = [
    { group: 'Committee', items: committeeScreens },
    { group: 'Your household', items: memberNav },
  ]
  let best = { group: 'Portal', label: 'Home', length: 0 }
  for (const { group, items } of groups) {
    for (const item of items) {
      const matches = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (matches && item.to.length > best.length) best = { group, label: item.label, length: item.to.length }
    }
  }
  return { group: best.group, label: best.label }
}

/** Every screen, for the search to jump to. The member ones say whose they are. */
const searchScreens: SearchScreen[] = [
  ...committeeScreens,
  ...memberNav,
]

export function PortalLayout() {
  const who = useSignedIn()
  // The same answer that guards the routes, so the navigation cannot offer a door that shuts.
  const onTheCommittee = can(useViewer(), 'admin:enter')
  const { signOut } = useGoogleSignIn()
  const { leavePreview } = useSession()
  const { pathname, key } = useLocation()
  // Everything below here wears the committee's own looks, not the community's festivals.
  useThemeScope('portal')
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)
  const { data: attempts } = useSignInAttempts()
  const { data: households } = useHouseholds()
  const { tools, text } = useSettings()
  const year = useNow().getFullYear()
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
    //
    // Unless the screen arrived at has put the focus somewhere itself — the section the search
    // opened on Content, say. Taking it back to the top would lose exactly the place it was sent.
    const main = mainRef.current
    if (main && document.activeElement !== main && main.contains(document.activeElement)) return
    main?.focus({ preventScroll: true })
  }, [pathname])

  const [searching, setSearching] = useState(false)
  // Signing out asks first: it sits beside Theme, a thumb's width away on a phone.
  const [leaving, setLeaving] = useState(false)

  /*
   * On a phone the sidebar is a drawer, out from the left where it sits on a wider screen.
   *
   * It used to stack above the page instead, and on a phone that was the whole first screen:
   * fourteen links, the person and the theme, with the screen somebody had
   * just asked for starting below the fold. While the drawer is open it owns the screen —
   * Escape, the close button and a tap on the page behind all shut it, the page does not
   * scroll underneath, and nothing behind it can be tabbed to.
   */
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const drawerId = useId()
  /** Whether shutting it should put the focus back on the menu button: yes, unless by going somewhere. */
  const backToButton = useRef(false)
  const closeMenu = () => {
    backToButton.current = true
    setMenuOpen(false)
  }
  /*
   * Always from the top. Shut, the drawer is still in the page — that is how it slides — so it
   * kept wherever its own scroll was left, and opened again halfway down its list with the
   * name and the first screens out of sight. Put back before it moves, so it never shows it.
   */
  const openMenu = () => {
    if (sideRef.current) sideRef.current.scrollTop = 0
    setMenuOpen(true)
  }
  const scrimRef = useRef<HTMLDivElement>(null)
  const swipe = useSwipeToClose({ panel: sideRef, shade: scrimRef, open: menuOpen, onClose: closeMenu })

  // Shut by going anywhere, including to the screen you are already on: the key changes on
  // every navigation, where the pathname would not for a tap on the current screen's link.
  const [lastKey, setLastKey] = useState(key)
  if (lastKey !== key) {
    setLastKey(key)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) {
      // Only now: until this render the bar was inert, and an inert button cannot take the focus.
      if (backToButton.current) menuButton.current?.focus({ preventScroll: true })
      backToButton.current = false
      return
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      closeMenu()
    }
    // Widened past the phone layout with the drawer open, it would leave the page locked.
    const wide = window.matchMedia?.('(min-width: 901px)')
    const widened = () => {
      if (wide?.matches) setMenuOpen(false)
    }
    document.addEventListener('keydown', keys)
    wide?.addEventListener?.('change', widened)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    sideRef.current?.querySelector<HTMLElement>('[data-drawer-close]')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', keys)
      wide?.removeEventListener?.('change', widened)
      document.body.style.overflow = overflow
    }
  }, [menuOpen])

  if (!who) return null

  // The ones still wanting an answer, which is what each screen itself shows. Counting all of
  // them meant the badge never cleared once somebody had been dealt with — and a badge that
  // never clears stops being read.
  const counts: Record<string, number> = {
    '/admin/people': unresolved(attempts, households).length,
    '/admin/feedback': waiting(feedback ?? []).length,
    '/admin/play': waitingSuggestions(suggestions ?? []).length,
  }
  const where = whereIs(pathname)
  const inHousehold = memberNav.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  const renderLinks = (items: Item[]) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => (isActive ? styles.linkOn : styles.link)}
      >
        <Icon name={item.icon} size={18} />
        <span className={styles.linkText}>{item.label}</span>
        {counts[item.to] ? <span className={styles.count}>{counts[item.to]}</span> : null}
      </NavLink>
    ))
  const renderGroup = (label: string | undefined, items: Item[]) => (
    <div className={styles.group}>
      {label ? <span className={styles.groupLabel}>{label}</span> : null}
      {renderLinks(items)}
    </div>
  )

  return (
    <div className={styles.shell}>
      <a href="#portal-main" className={styles.skip}>
        Skip to content
      </a>
      {/* The header, in the frame's colours. On a phone it carries the menu and the name too. */}
      <header className={styles.bar} inert={menuOpen || undefined}>
        <button
          ref={menuButton}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          onClick={openMenu}
        >
          <Icon name="menu" size={24} />
          <span className={styles.srOnly}>Open menu</span>
        </button>
        <Link to="/" className={styles.barBrand}>
          <img src={site.emblem} alt="" className={styles.emblem} width={30} height={30} />
          <span>{site.wordmark}</span>
        </Link>
        <p className={styles.crumbs} aria-label="You are in">
          <span className={styles.crumbGroup}>{where.group}</span>
          <span className={styles.crumbSep} aria-hidden="true">
            /
          </span>
          <span className={styles.crumbHere}>{where.label}</span>
        </p>
        <div className={styles.barEnd}>
          {onTheCommittee ? <SearchButton className={styles.barSearch} onClick={() => setSearching(true)} /> : null}
          <a href="/" target="_blank" rel="noreferrer" className={styles.siteLink}>
            View the website
            <Icon name="external" size={14} />
            <span className={styles.srOnly}>, opens in a new tab</span>
          </a>
        </div>
      </header>
      {onTheCommittee ? <PortalSearch screens={searchScreens} open={searching} setOpen={setSearching} /> : null}

      <div
        ref={scrimRef}
        className={menuOpen ? styles.scrimOn : styles.scrim}
        aria-hidden="true"
        onClick={menuOpen ? closeMenu : undefined}
        {...swipe}
      />

      <aside
        id={drawerId}
        ref={sideRef}
        className={menuOpen ? styles.sideOpen : styles.side}
        aria-label="Portal menu"
        {...swipe}
      >
        <div className={styles.sideHead}>
          <Link to="/" className={styles.brand}>
            <img src={site.emblem} alt="" className={styles.emblem} width={34} height={34} />
            <span>{site.wordmark}</span>
          </Link>
          <button type="button" className={styles.drawerClose} data-drawer-close onClick={closeMenu}>
            <Icon name="close" size={22} />
            <span className={styles.srOnly}>Close menu</span>
          </button>
        </div>
        <div className={styles.navs}>
        {onTheCommittee ? (
          <>
            <nav aria-label="Committee" className={styles.sections}>
              {committeeSections.map((section) => (
                <div key={section.label ?? 'top'}>{renderGroup(section.label, section.items)}</div>
              ))}
            </nav>
            {/*
              * Their own household, folded away: on the committee it is the screen they visit
              * least, and open it was four more links between the committee's and the bottom.
              * Open whenever they are on one of its screens, so where they are is never hidden.
              */}
            <nav aria-label="Your household">
              <details key={inHousehold ? 'here' : 'away'} className={styles.fold} open={inHousehold || undefined}>
                <summary className={styles.foldHead}>
                  <span className={styles.groupLabel}>Your household</span>
                  <span className={styles.foldMark} aria-hidden="true">
                    ⌄
                  </span>
                </summary>
                <div className={styles.group}>{renderLinks(memberNav)}</div>
              </details>
            </nav>
            {/* A heading over an empty list is noise: with no tools saved there is no group. */}
            {tools.length > 0 ? (
            <nav aria-label="Other tools" className={styles.toolsNav}>
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
        ) : (
          <nav aria-label="Your household">{renderGroup('Your household', memberNav)}</nav>
        )}
        </div>
        <div className={styles.who}>
          {/*
            * The name has the width to itself: the role sat beside it and took a third of the
            * room, so "Budhaditya Pandit" read "Budhaditya Pa…". It wraps to a second line before
            * it is ever cut, and the whole of it is in the title for anything longer still.
            */}
          <div className={styles.whoCard}>
            <span className={styles.avatar} aria-hidden="true">
              {initialsOf(who.name)}
            </span>
            <span className={styles.whoText}>
              <span className={styles.whoName} title={who.name}>
                {who.name}
              </span>
              <span className={styles.whoDetail} title={who.householdName}>
                {who.householdName}
              </span>
              <span className={who.role === 'admin' ? styles.rolePillAdmin : styles.rolePill}>
                {who.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </span>
          </div>
          <span className={styles.whoEmail}>{who.email}</span>
          {/*
            * Down here with the person rather than under the brand: it is a preference of theirs,
            * like signing out, and the list opens upwards so it has the sidebar to open into.
            */}
          <div className={styles.whoActions}>
            <ThemeSwitcher align="start" direction="up" />
            <button type="button" className={styles.signOut} onClick={() => setLeaving(true)}>
              <Icon name="logout" size={17} />
              Sign out
            </button>
            <ConfirmDialog
              open={leaving}
              title="Sign out?"
              confirmLabel="Sign out"
              cancelLabel="Stay signed in"
              onCancel={() => setLeaving(false)}
              onConfirm={() => {
                setLeaving(false)
                signOut()
              }}
            >
              {who.preview
                ? 'This leaves the sample household and signs you out of the portal.'
                : 'You will need your Google account to get back into the portal. Anything you have not saved on this screen will be lost.'}
            </ConfirmDialog>
          </div>
        </div>
      </aside>
      <main id="portal-main" ref={mainRef} tabIndex={-1} className={styles.main} inert={menuOpen || undefined}>
        <OfflineNotice />
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
              address yet, so these screens will stay empty.{' '}
              <Link to="/contact" className={styles.previewLink}>
                Ask the committee to add it
              </Link>
              , then sign in again.
            </span>
          </p>
        ) : null}
        <div className={styles.content}>
          {/* A screen that throws takes only itself down: the menu stays, so there is a way out.
              Keyed on the route so moving to another screen clears it. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      {/* Outside main, so it is the page's own footer to a screen reader rather than a box in the content. */}
      <footer className={styles.foot} inert={menuOpen || undefined}>
        <span>
          © {year} {site.name}
          {text.town ? ` · ${text.town}` : ''}
        </span>
        <span className={styles.footLinks}>
          <span>Portal v{__APP_VERSION__}</span>
          <Link to="/privacy">Privacy notice</Link>
          <a href="/" target="_blank" rel="noreferrer">
            The website<span className={styles.srOnly}>, opens in a new tab</span>
          </a>
        </span>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
