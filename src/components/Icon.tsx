import type { ReactElement, SVGProps } from 'react'

export type IconName =
  | 'users'
  | 'megaphone'
  | 'menu'
  | 'close'
  | 'chevronLeft'
  | 'chevronRight'
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'palette'
  | 'check'
  | 'home'
  | 'book'
  | 'file'
  | 'grid'
  | 'calendar'
  | 'layout'
  | 'message'
  | 'external'
  | 'pin'
  | 'clock'
  | 'mic'
  | 'door'
  | 'heart'
  | 'sparkle'
  | 'badge'

const paths: Record<IconName, ReactElement> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 11v2a1 1 0 0 0 1 1h2l5 4V6L7 10H5a1 1 0 0 0-1 1z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </>
  ),
  whatsapp: <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 21l2.2-5.4A8.5 8.5 0 1 1 21 11.5z" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h2.5A6.5 6.5 0 0 0 12 3z" />
      <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" />
      <circle cx="10" cy="6.5" r="1.2" fill="currentColor" />
      <circle cx="15" cy="7" r="1.2" fill="currentColor" />
    </>
  ),
  check: <path d="M5 12l4 4L19 6" />,
  pin: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3M9 21h6" />
    </>
  ),
  door: (
    <>
      <path d="M4 21h16" />
      <path d="M14 21V4L6 6v15" />
      <path d="M18 21V8l-4-2" />
      <circle cx="11" cy="13" r="1" fill="currentColor" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />,
  /* A rosette: the medal and its two ribbon tails. */
  badge: (
    <>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M8.4 13.1 6.4 21l5.6-2.7 5.6 2.7-2-7.9" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3c.7 4.2 2.1 5.6 6.3 6.3-4.2.7-5.6 2.1-6.3 6.3-.7-4.2-2.1-5.6-6.3-6.3C9.9 8.6 11.3 7.2 12 3z" />
      <path d="M18.5 15.5c.35 2 1 2.65 3 3-2 .35-2.65 1-3 3-.35-2-1-2.65-3-3 2-.35 2.65-1 3-3z" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  book: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  file: (
    <>
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
  layout: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16M9 10v9" />
    </>
  ),
  message: <path d="M4 5h16v12H8l-4 4z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </>
  ),
}

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: IconName; size?: number }

/** Stroke icons on a 24px grid. Decorative by default; pass `aria-label` to make one meaningful. */
export function Icon({ name, size = 24, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={rest['aria-label'] ? undefined : true}
      data-icon={name}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
