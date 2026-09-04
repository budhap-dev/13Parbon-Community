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
  town: 'Leeds',
  /** The saying's first half, then the group's name on its own line. */
  bengaliTitleLead: 'বারো মাসে',
  groupName: '13 Parbon',
  tagline: 'Twelve months, thirteen festivals. The heart always finds another reason to celebrate.',
  mission:
    'A Bengali cultural association in Leeds. Every year we gather for celebrating Bengal, keeping the songs, the food and the stage going for the families who live here now, and for the kids who will carry them on.',
  missionStatement: '[Mission and vision statement, two or three sentences from the committee.]',
  /** Where to find us. Bracketed until the committee confirms. */
  venue: 'St Andrew’s Community Hall, Morley',
  address: 'Leeds, LS27 0JU',
  /**
   * Where the map centres, from OpenStreetMap's lookup of the postcode. Null hides the map
   * and shows a note instead, so an unconfirmed address never points somewhere wrong.
   */
  coordinates: { lat: 53.7397, lon: -1.6156 } as { lat: number; lon: number } | null,
  email: '[hello@example.org]',
  /**
   * Photographs of members are parked until everyone in them has been asked. This hides the
   * gallery from the navigation and the photo sections from the home page. The pages still
   * work for anyone who knows the address. Set it to true once consent is in hand.
   */
  showPhotos: false,
  /**
   * Photographs behind this year's theme, all the committee's own. They are shown in black
   * and white and come into colour as the seam passes: সেকাল to একাল, the past becoming the
   * present. Each caption names the old and the new the picture holds.
   *
   * Every one of these is a placeholder until the real files are in public/theme/.
   */
  themeImages: [
    {
      src: '/theme/camera.jpg',
      alt: 'A hand holding up a camera, its screen framing the lit idol behind it',
      caption: 'A clay goddess, met through a screen',
      // The camera sits right of centre, so the crop is held that way.
      focus: '62% 50%',
    },
    {
      src: '/theme/tram.jpg',
      alt: 'A tram on its rails on a misty morning, buses passing on the road alongside',
      caption: 'A tram still running, in the traffic that grew around it',
      focus: '62% 45%',
    },
    {
      src: '/theme/bridge.jpg',
      alt: 'A boatman on the Hooghly at sunset, beneath Vidyasagar Setu',
      caption: 'The oldest way across the river, under the newest bridge',
      focus: '50% 55%',
    },
    {
      src: '/theme/kumartuli.jpg',
      alt: 'A Kumartuli workshop crowded with unfinished idols, a phone held up among them',
      caption: 'Hands that have shaped her for generations, photographed',
      focus: '55% 50%',
    },
    {
      src: '/theme/idol.jpg',
      alt: 'The face of a finished Durga idol, lit warm against a blue wall',
      caption: 'The same face, year after year',
      focus: '55% 45%',
    },
    {
      src: '/theme/shiuli.jpg',
      alt: 'A single shiuli flower resting on a leaf',
      caption: 'The flower that says the season has turned',
      focus: '40% 50%',
    },
  ],
  themeImageCredit: 'Photographs by Budhaditya Pandit',
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
  /**
   * Where the community can be found. A channel with a null address is not shown at all,
   * so nothing on the page is ever a link that goes nowhere. Add a channel here and it
   * appears in the footer, on the contact page and wherever else we offer a way through.
   */
  social: [
    { name: 'Facebook', icon: 'facebook', href: 'https://www.facebook.com/groups/1337437436797813/' },
  ],
} as const

type SocialChannel = (typeof site.social)[number]

/** The channels with an address, which are the only ones worth putting on a page. */
export function activeSocial(): (SocialChannel & { href: string })[] {
  return site.social.filter((channel): channel is SocialChannel & { href: string } => Boolean(channel.href))
}

/**
 * Values above that the committee has not filled in yet are written in brackets.
 * Pages use this to avoid rendering a placeholder as a working link.
 */
export function isPlaceholder(value: string): boolean {
  return value.trim().startsWith('[')
}
