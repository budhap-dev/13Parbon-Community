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
  tagline: 'Twelve months, thirteen festivals. There is always something to cook too much for.',
  mission:
    'A Bengali cultural association in [Town]. Every year we gather for Poila Boishakh, Saraswati Puja, Holi and a cultural programme at Mahalaya, keeping the songs, the food and the stage going for the families who live here now, and for the kids who will carry them on.',
  missionStatement: '[Mission and vision statement, two or three sentences from the committee.]',
  membershipFee: '[fee]',
  social: [
    { name: 'Facebook', icon: 'facebook', href: '#' },
    { name: 'Instagram', icon: 'instagram', href: '#' },
    { name: 'WhatsApp', icon: 'whatsapp', href: '#' },
  ],
} as const
