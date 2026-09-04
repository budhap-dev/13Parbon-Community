import type { Event } from '@/domain/event'
import type { Festival } from '@/domain/festival'
import type { Album, Media } from '@/domain/gallery'
import type { Announcement, NewsPost, Newsletter } from '@/domain/news'
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
      summary: 'Our Mahalaya Day: food, music, songs, dance and other cultural performances  to open the Puja season.',
      startsAt: '2026-10-10T13:30:00',
      endsAt: '2026-10-10T21:30:00',
      venue: 'St Andrew’s Community Hall, Morley',
      festivalId: 'mahalaya',
      isPublic: true,
      registrationOpen: true,
      householdsRegistered: 31,
      theme: {
        bengali: 'দুর্গাপূজার সেকাল ও একাল',
        bengaliSubtitle: 'ঐতিহ্যের সাথে আধুনিকতা',
        english: 'Durga Puja: Then and Now — Tradition Meets Modernity',
      },
      volunteerCall: 'We warmly welcome volunteers for our Cultural Programme on Saturday, 10 October. If you would like to be part of making the day special, please indicate this when registering.',
      status: 'published',
    },
    /*
    {
      id: 'ev-saraswati-2027',
      slug: 'saraswati-puja-2027',
      title: 'Saraswati Puja',
      summary: "Morning pujo, children's hatekhori, and lunch.",
      startsAt: '2027-02-11T10:00:00',
      venue: 'St Andrew’s Community Hall',
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
      venue: 'St Andrew’s Community Hall',
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
      venue: 'St Andrew’s Community Hall',
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
      venue: 'St Andrew’s Community Hall',
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
  */
    ]

  /** The community's year, in Bengali-calendar order from Poila Boishakh. */
  const festivals: Festival[] = [
    {
      id: 'poila-boishakh',
      name: 'Poila Boishakh',
      bengaliName: 'পয়লা বৈশাখ',
      season: 'April',
      description: 'Bengali New Year. An evening of music, dance and drama, and a meal to start the year together.',
    },
    {
      id: 'mahalaya',
      name: 'Mahalaya programme',
      bengaliName: 'মহালয়া',
      season: 'September or October',
      description: 'The dawn that opens the Puja season. Our cultural programme: songs, recitation and the stage.',
    },
    {
      id: 'saraswati-puja',
      name: 'Saraswati Puja',
      bengaliName: 'সরস্বতী পূজা',
      season: 'January or February',
      description: 'Morning pujo for learning, the children’s hatekhori and their first letters, then lunch.',
    },
    {
      id: 'holi',
      name: 'Holi',
      bengaliName: 'দোল',
      season: 'March',
      description: 'Colours, songs and a shared lunch, outdoors when the weather allows it.',
    },
  ]

  const albums: Album[] = [
    { id: 'al-poila-2026', slug: 'poila-boishakh-2026', title: 'Poila Boishakh 2026', description: 'New year evening at St Andrew’s Community Hall, April 2026.', publishedAt: '2026-04-20T12:00:00', visibility: 'public' },
    { id: 'al-holi-2026', slug: 'holi-2026', title: 'Holi 2026', description: 'Colours in the park, March 2026.', publishedAt: '2026-03-10T12:00:00', visibility: 'public' },
    { id: 'al-saraswati-2026', slug: 'saraswati-puja-2026', title: 'Saraswati Puja 2026', description: 'Morning pujo and hatekhori, February 2026.', publishedAt: '2026-02-05T12:00:00', visibility: 'public' },
    { id: 'al-mahalaya-2025', slug: 'mahalaya-2025', title: 'Mahalaya 2025', description: 'Last year’s cultural programme.', publishedAt: '2025-09-25T12:00:00', visibility: 'public' },
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

  const announcements: Announcement[] = [
    {
      id: 'an-register',
      title: 'Registrations are open for the Mahalaya cultural programme',
      body: 'Tell us how many from your household are coming so we can plan the seating and the food.',
      pinned: true,
      audience: 'public',
      publishAt: '2026-08-28T09:00:00',
      expiresAt: '2026-10-10T17:00:00',
      link: { label: 'Register the family', to: '/events/mahalaya-cultural-programme-2026' },
    },
    {
      id: 'an-volunteers',
      title: 'A Festival is Best Shared',
      body: 'We warmly welcome volunteers for our Cultural Programme on Saturday, 10 October. If you would like to be part of making the day special, please indicate this when registering.',
      pinned: false,
      audience: 'public',
      publishAt: '2026-09-01T09:00:00',
      link: { label: 'Register and say so', to: '/events/mahalaya-cultural-programme-2026' },
    },
    {
      id: 'an-agm',
      title: 'Annual general meeting minutes are in the documents library',
      body: 'Members only.',
      pinned: false,
      audience: 'members',
      publishAt: '2026-08-20T09:00:00',
    },
    {
      id: 'an-expired',
      title: 'Poila Boishakh programme: doors open at five',
      body: 'Already over.',
      pinned: true,
      audience: 'public',
      publishAt: '2026-04-10T09:00:00',
      expiresAt: '2026-04-16T00:00:00',
    },
  ]

  const posts: NewsPost[] = [
    {
      id: 'np-mahalaya-lineup',
      slug: 'mahalaya-programme-what-to-expect',
      title: 'Mahalaya programme: what to expect on the night',
      excerpt: 'Songs, dance and a short play, with the children opening the evening. Here is how the night will run.',
      body: 'The evening opens at five with the children’s choir, followed by the dance group and a short play written by our own members.\n\nThere will be a break for tea and snacks halfway through. Dinner is served after the final act.\n\nIf your family would like a slot on the programme, speak to the cultural secretary before [DATE].',
      tags: ['Updates'],
      publishedAt: '2026-09-01T10:00:00',
      author: 'The committee',
    },
    {
      id: 'np-saraswati-thanks',
      slug: 'saraswati-puja-2026-thank-you',
      title: 'Saraswati Puja 2026: thank you',
      excerpt: 'Forty households came, twelve children had their hatekhori, and nobody went home hungry.',
      body: 'Thank you to everyone who came, cooked, decorated and cleared up.\n\nTwelve children had their hatekhori this year, the most we have ever had.\n\nPhotos are in the gallery.',
      tags: ['Success stories'],
      publishedAt: '2026-02-14T10:00:00',
      author: 'The committee',
    },
    {
      id: 'np-new-hall',
      slug: 'we-have-a-hall-for-the-year',
      title: 'We have a hall for the whole year',
      excerpt: 'After two years of moving between venues, every programme this year is booked in one place.',
      body: 'After two years of moving between venues, we have booked St Andrew’s Community Hall for every programme this year.\n\nThat means one address to remember, one parking arrangement, and a stage we can decorate the way we want.',
      tags: ['Success stories', 'Updates'],
      publishedAt: '2026-05-20T10:00:00',
      author: 'The committee',
    },
  ]

  const newsletters: Newsletter[] = [
    { id: 'nl-3', title: '[Newsletter title], Autumn 2026', fileUrl: '#', issuedOn: '2026-09-01' },
    { id: 'nl-2', title: '[Newsletter title], Spring 2026', fileUrl: '#', issuedOn: '2026-04-01' },
  ]

  return { events, festivals, albums, media, volunteerRoles, announcements, posts, newsletters }
}
