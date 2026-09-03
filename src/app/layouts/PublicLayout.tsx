import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
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
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}
