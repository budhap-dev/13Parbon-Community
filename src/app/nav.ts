import type { SiteSettings } from '@/domain/settings'

export type NavItem = {
  label: string
  to: string
  /** Match this route exactly, rather than as a prefix. Needed for the home page. */
  end?: boolean
}

/**
 * Functions rather than constants, because the navigation now depends on switches the committee
 * can throw while the site is running.
 *
 * As arrays they were built once, when the module was first imported — which was fine while the
 * answer lived in a file that only changed with a deploy. Turning the gallery off would have
 * left Gallery in the header until somebody reloaded the page, or longer.
 */
export function publicNav(settings: SiteSettings): NavItem[] {
  return [
    { label: 'Home', to: '/', end: true },
    { label: 'Events', to: '/events' },
    ...(settings.showPhotos ? [{ label: 'Gallery', to: '/gallery' }] : []),
    ...(settings.showNews ? [{ label: 'News', to: '/news' }] : []),
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ]
}

export function footerNav(settings: SiteSettings): NavItem[] {
  return [
    { label: 'Contact', to: '/contact' },
    { label: 'Privacy', to: '/privacy' },
    { label: 'Committee', to: '/about' },
    ...(settings.showMemberSignIn ? [{ label: 'Member sign-in', to: '/login' }] : []),
  ]
}
