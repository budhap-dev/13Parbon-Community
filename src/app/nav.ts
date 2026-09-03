export type NavItem = { label: string; to: string }

export const publicNav: NavItem[] = [
  { label: 'Events', to: '/events' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'News', to: '/news' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const footerNav: NavItem[] = [
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Committee', to: '/about' },
  { label: 'Member login', to: '/login' },
]
