/**
 * Facts about this community that the committee owns.
 * Bracketed values are placeholders to be filled in; nothing here is fabricated.
 */
export const site = {
  name: '13Parbon Community',
  wordmark: '13PARBON',
  /** Round emblem cut from the full logo; the full artwork is /brand/13parbon-logo.jpeg. */
  emblem: '/brand/13parbon-emblem.jpg',
  logo: '/brand/13parbon-logo.jpeg',
  town: '[Town]',
  /** The saying's first half, then the group's name on its own line. */
  bengaliTitleLead: 'বারো মাসে',
  groupName: '13 Parbon',
  tagline: 'Twelve months, thirteen festivals. The heart always finds another reason to celebrate.',
  mission:
    'A Bengali cultural association in [Town]. Every year we gather for Poila Boishakh, Saraswati Puja, Holi and a cultural programme at Mahalaya, keeping the songs, the food and the stage going for the families who live here now, and for the kids who will carry them on.',
  missionStatement: '[Mission and vision statement, two or three sentences from the committee.]',
  membershipFee: '[fee]',
  /** Where to find us. Bracketed until the committee confirms. */
  venue: '[Venue]',
  address: '[Street, Town, Postcode]',
  email: '[hello@example.org]',
  /**
   * Where registering happens. A Google Form the committee runs, so there is no account to
   * make and nothing for us to build. Null until the committee has one, and while it is
   * null the site says registration opens shortly rather than offering a dead button.
   */
  registrationFormUrl: null as string | null,
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
