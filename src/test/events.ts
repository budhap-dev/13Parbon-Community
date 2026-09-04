import type { Event } from '@/domain/event'

/**
 * Events for tests to work against, rather than whatever the committee currently has on
 * the calendar. Covers every state the pages have to handle: several upcoming months, one
 * already past, one members-only and one still a draft.
 *
 * The site's own calendar lives in `src/lib/api/mock/fixtures.ts` and is content, not test
 * data. Adding or removing a real event should never break the suite.
 */
export const testEvents: Event[] = [
  {
    id: 'ev-mahalaya-2026',
    slug: 'mahalaya-cultural-programme-2026',
    title: 'Cultural programme',
    summary: 'Our Mahalaya Day: food, music, songs, dance and other cultural performances  to open the Puja season.',
    startsAt: '2026-10-10T13:30:00',
    endsAt: '2026-10-10T17:30:00',
    venue: 'The hall',
    venueAddress: 'Leeds, LS27 0JU',
    coordinates: { lat: 53.7397, lon: -1.6156 },
    festivalId: 'mahalaya',
    isPublic: true,
    registrationOpen: true,
    householdsRegistered: 31,
    theme: {
      bengali: 'দুর্গাপূজার সেকাল ও একাল',
      bengaliSubtitle: 'ঐতিহ্যের সাথে আধুনিকতা',
      english: 'Durga Puja: Then and Now — Tradition Meets Modernity',
    },
    performerCall:
      'The programme is made by members, so if you sing, dance, recite, act or play, there is a place for you on the stage. Children very much included. Tell us what you would like to do and roughly how long it runs, and we will fit it into the order of the day.',
    volunteerCall:
      'We warmly welcome volunteers for our Cultural Programme on Saturday, 10 October. If you would like to be part of making the day special, please let us know.',
    status: 'published',
  },
  {
    id: 'ev-saraswati-2027',
    slug: 'saraswati-puja-2027',
    title: 'Saraswati Puja',
    summary: "Morning pujo, children's hatekhori, and lunch.",
    startsAt: '2027-02-11T10:00:00',
    venue: 'The hall',
    festivalId: 'saraswati-puja',
    isPublic: true,
    registrationOpen: true,
    householdsRegistered: 0,
    status: 'published',
  },
  {
    id: 'ev-holi-2027',
    slug: 'holi-2027',
    title: 'Holi',
    summary: 'Colours, songs and a shared lunch.',
    startsAt: '2027-03-22T11:00:00',
    venue: 'The park',
    festivalId: 'holi',
    isPublic: true,
    registrationOpen: false,
    householdsRegistered: 0,
    status: 'published',
  },
  {
    id: 'ev-poila-2027',
    slug: 'poila-boishakh-cultural-programme-2027',
    title: 'Poila Boishakh cultural programme',
    summary: 'Bengali New Year evening of music, dance and drama.',
    startsAt: '2027-04-15T17:00:00',
    venue: 'The hall',
    festivalId: 'poila-boishakh',
    isPublic: true,
    registrationOpen: false,
    householdsRegistered: 0,
    status: 'published',
  },
  {
    id: 'ev-poila-2026',
    slug: 'poila-boishakh-cultural-programme-2026',
    title: 'Poila Boishakh cultural programme',
    summary: 'Already happened.',
    startsAt: '2026-04-15T17:00:00',
    venue: 'The hall',
    festivalId: 'poila-boishakh',
    isPublic: true,
    registrationOpen: false,
    householdsRegistered: 40,
    status: 'past',
  },
  {
    id: 'ev-committee',
    slug: 'committee-meeting',
    title: 'Committee meeting',
    summary: 'Members only.',
    startsAt: '2026-09-20T19:00:00',
    venue: 'Online',
    isPublic: false,
    registrationOpen: false,
    householdsRegistered: 0,
    status: 'published',
  },
  {
    id: 'ev-draft',
    slug: 'draft-picnic',
    title: 'Picnic (draft)',
    summary: 'Not announced yet.',
    startsAt: '2026-11-05T11:00:00',
    venue: 'TBC',
    isPublic: true,
    registrationOpen: false,
    householdsRegistered: 0,
    status: 'draft',
  },
]
