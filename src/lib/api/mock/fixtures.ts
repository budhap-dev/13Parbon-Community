import type { Event } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { Album, Media } from '@/domain/gallery'
import type { VolunteerRole } from '@/domain/volunteer'

/**
 * Sample data for the mock adapter, shaped around what this community actually does:
 * a cultural programme at Bengali New Year, Saraswati Puja, Holi, and a cultural
 * programme at Mahalaya, before Durga Puja.
 *
 * Confirmed: the Mahalaya programme on 10 October 2026.
 * To confirm with the committee: the 2027 dates, venues and headcounts below.
 */
export function buildFixtures() {
  const events: Event[] = [
    {
      id: 'ev-mahalaya-2026',
      slug: 'mahalaya-cultural-programme-2026',
      title: 'Cultural programme',
      summary: 'Our Mahalaya evening: songs, dance and drama to open the Puja season.',
      startsAt: '2026-10-10T17:00:00',
      endsAt: '2026-10-10T21:30:00',
      venue: '[Venue]',
      festivalId: 'mahalaya',
      isPublic: true,
      registrationOpen: true,
      householdsRegistered: 31,
      status: 'published',
    },
    {
      id: 'ev-saraswati-2027',
      slug: 'saraswati-puja-2027',
      title: 'Saraswati Puja',
      summary: "Morning pujo, children's hatekhori, and lunch.",
      startsAt: '2027-02-11T10:00:00',
      venue: '[Venue]',
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
      venue: '[Venue]',
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
      venue: '[Venue]',
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
      venue: '[Venue]',
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

  /** The community's year, in Bengali-calendar order from Poila Boishakh. */
  const festivals: Festival[] = [
    { id: 'poila-boishakh', name: 'Poila Boishakh', bengaliName: 'পয়লা বৈশাখ' },
    { id: 'mahalaya', name: 'Mahalaya programme', bengaliName: 'মহালয়া' },
    { id: 'saraswati-puja', name: 'Saraswati Puja', bengaliName: 'সরস্বতী পূজা' },
    { id: 'holi', name: 'Holi', bengaliName: 'দোল' },
  ]

  const albums: Album[] = [
    { id: 'al-poila-2026', slug: 'poila-boishakh-2026', title: 'Poila Boishakh 2026', publishedAt: '2026-04-20T12:00:00', visibility: 'public' },
    { id: 'al-holi-2026', slug: 'holi-2026', title: 'Holi 2026', publishedAt: '2026-03-10T12:00:00', visibility: 'public' },
    { id: 'al-saraswati-2026', slug: 'saraswati-puja-2026', title: 'Saraswati Puja 2026', publishedAt: '2026-02-05T12:00:00', visibility: 'public' },
    { id: 'al-mahalaya-2025', slug: 'mahalaya-2025', title: 'Mahalaya 2025', publishedAt: '2025-09-25T12:00:00', visibility: 'public' },
    { id: 'al-private', slug: 'committee-dinner', title: 'Committee dinner', publishedAt: '2026-06-01T12:00:00', visibility: 'members' },
  ]

  const photo = (id: string, albumId: string, slug: string, caption: string, approved = true): Media => ({
    id,
    albumId,
    type: 'photo',
    url: `/photos/${slug}.svg`,
    thumbnailUrl: `/photos/${slug}.svg`,
    caption,
    approved,
  })

  const media: Media[] = [
    photo('m-1', 'al-poila-2026', 'poila-boishakh', 'Rabindrasangeet at the Poila Boishakh programme'),
    photo('m-2', 'al-poila-2026', 'kids-on-stage', 'The kids take the stage'),
    photo('m-3', 'al-holi-2026', 'holi', 'Holi colours'),
    photo('m-4', 'al-saraswati-2026', 'saraswati-puja', 'Saraswati Puja morning'),
    photo('m-5', 'al-saraswati-2026', 'bhog', 'Lunch after the pujo'),
    photo('m-6', 'al-mahalaya-2025', 'mahalaya', 'The choir at last year’s Mahalaya programme'),
    photo('m-7', 'al-holi-2026', 'holi', 'Awaiting moderation', false),
    photo('m-8', 'al-private', 'bhog', 'Committee dinner'),
  ]

  const volunteerRoles: VolunteerRole[] = [
    {
      id: 'vr-stage',
      eventId: 'ev-mahalaya-2026',
      title: 'Stage and hall decorations',
      description: 'Dress the stage and hang the lights before the programme.',
      slots: 5,
      filled: 3,
      when: 'Saturday morning',
    },
    {
      id: 'vr-full',
      eventId: 'ev-mahalaya-2026',
      title: 'Sound desk',
      description: 'Run the microphones and music on the night.',
      slots: 2,
      filled: 2,
      when: 'Programme evening',
    },
  ]

  return { events, festivals, albums, media, volunteerRoles }
}
