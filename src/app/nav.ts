export type NavItem = {
  label: string
  to: string
  /** Match this route exactly, rather than as a prefix. Needed for the home page. */
  end?: boolean
}

export const publicNav: NavItem[] = [
  { label: 'Home', to: '/', end: true },
  { label: 'Events', to: '/events' },
  ...(site.showPhotos ? [{ label: 'Gallery', to: '/gallery' }] : []),
  ...(site.showNews ? [{ label: 'News', to: '/news' }] : []),
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

import { site } from './site'

export const footerNav: NavItem[] = [
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Committee', to: '/about' },
  ...(site.showMemberSignIn ? [{ label: 'Member sign-in', to: '/login' }] : []),
]
