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
