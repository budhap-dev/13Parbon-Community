import type { SiteText } from '@/domain/site-text'

/**
 * The wording the committee edits from the admin portal. These are the starting values:
 * once the portal saves a change, the saved version wins everywhere. Bracketed values are
 * placeholders to be filled in; nothing here is fabricated.
 */
export const defaultSiteText: SiteText = {
  town: '[Town]',
  bengaliTitleLead: 'বারো মাসে',
  groupName: '13 Parbon',
  tagline: 'Twelve months, thirteen festivals. The heart always finds another reason to celebrate.',
  mission:
    'A Bengali cultural association in [Town]. Every year we gather for Poila Boishakh, Saraswati Puja, Holi and a cultural programme at Mahalaya, keeping the songs, the food and the stage going for the families who live here now, and for the kids who will carry them on.',
  missionStatement: '[Mission and vision statement, two or three sentences from the committee.]',
  joinTitle: 'Come for one evening.',
  joinText:
    'Everyone is welcome at our programmes, member or not. Come along, say hello, and if you would like to stay, talk to the committee.',
  venue: '[Venue]',
  address: '[Street, Town, Postcode]',
  email: '[hello@example.org]',
  membershipFee: '[fee]',
}

/**
 * Facts about this community that do not change with the wording: the name, the artwork,
 * which home page sections are for whom, and the other tools the committee runs.
 */
export const site = {
  name: '13Parbon Community',
  wordmark: '13PARBON',
  /** Round emblem cut from the full logo; the full artwork is /brand/13parbon-logo.jpeg. */
  emblem: '/brand/13parbon-emblem.jpg',
  logo: '/brand/13parbon-logo.jpeg',
  /**
   * The member portal is built but parked for the MVP: the routes still work for anyone
   * who knows the address, they are simply not advertised. Set this to true to put the
   * sign-in back in the header and footer.
   */
  showMemberSignIn: false,
  /**
   * Who each home page section is for. Sections marked 'members' stay hidden until the
   * viewer has logged in (phase 2). For the public MVP, events and volunteering are members-only.
   */
  home: {
    nextEvent: 'public',
    upcoming: 'members',
    volunteer: 'public',
    yearStrip: 'public',
    photos: 'public',
  } satisfies Record<string, 'public' | 'members' | 'admins'>,
  /**
   * Other tools the committee runs. Separate apps with their own sign-in, linked from the
   * portal so nobody has to remember the address.
   */
  tools: [
    {
      name: 'Event planning',
      description: 'Tasks, teams and deadlines for putting an event on.',
      href: 'https://13parbon-event-management.vercel.app/',
    },
  ],
  social: [
    { name: 'Facebook', icon: 'facebook', href: '#' },
    { name: 'Instagram', icon: 'instagram', href: '#' },
    { name: 'WhatsApp', icon: 'whatsapp', href: '#' },
  ],
} as const

/**
 * Values above that the committee has not filled in yet are written in brackets.
 * Pages use this to avoid rendering a placeholder as a working link.
 */
export function isPlaceholder(value: string): boolean {
  return value.trim().startsWith('[')
}
