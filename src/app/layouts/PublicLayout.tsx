import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useThemeScope } from '@/app/theme/ThemeContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineNotice } from '@/components/OfflineNotice'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import styles from './PublicLayout.module.css'

export function PublicLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const isFirstRender = useRef(true)
  // Said out loud, because a reload of a portal address starts in the portal's colours and may
  // land here instead — signed out, sent to the sign-in page — which wears the festivals.
  useThemeScope('public')

  // Move focus to the new page's content on client-side navigation.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // preventScroll matters: focusing an element scrolls it into view, which would push
    // the top of the page up behind the sticky header on every navigation.
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <OfflineNotice />
        {/* Keyed on the route: a page that threw should not keep the boundary tripped once
            the viewer navigates somewhere else. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
