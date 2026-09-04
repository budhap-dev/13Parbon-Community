import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import styles from './PublicLayout.module.css'

export function PublicLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const isFirstRender = useRef(true)

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
